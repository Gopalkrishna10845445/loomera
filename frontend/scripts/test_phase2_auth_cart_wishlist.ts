import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { users, sessions, carts, cartItems, wishlists, wishlistItems } from "../src/db/schema";
import {
  normalizeEmail,
  validateEmail,
  validatePasswordStrength,
  hashPassword,
  verifyPassword,
} from "../src/lib/auth/password";
import {
  createSession,
  validateSession,
  hashSessionToken,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth/session";
import { getSessionCookieOptions } from "../src/lib/auth/cookies";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "../src/lib/auth/rate-limit";
import {
  getUserCart,
  addItemToUserCart,
  clearUserCart,
  mergeAnonymousCart,
} from "../src/lib/cart";
import {
  addToUserWishlist,
} from "../src/lib/wishlist";

// Import Next.js Route Handlers
import { POST as registerHandler } from "../src/app/api/auth/register/route";
import { POST as loginHandler } from "../src/app/api/auth/login/route";
import { POST as logoutHandler } from "../src/app/api/auth/logout/route";
import { GET as meHandler } from "../src/app/api/auth/me/route";
import {
  GET as cartGetHandler,
  POST as cartPostHandler,
  PATCH as cartPatchHandler,
  DELETE as cartDeleteHandler,
} from "../src/app/api/cart/route";
import { POST as cartMergeHandler } from "../src/app/api/cart/merge/route";
import {
  GET as wishlistGetHandler,
  POST as wishlistPostHandler,
  DELETE as wishlistDeleteHandler,
} from "../src/app/api/wishlist/route";
import { POST as wishlistMergeHandler } from "../src/app/api/wishlist/merge/route";

let passed = 0;
let total = 0;

function assert(condition: boolean, title: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${title}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${title} - ${detail || ""}`);
    process.exitCode = 1;
  }
}

// Helper to construct NextRequest
function createRequest(
  url: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
    cookie?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, cookie, headers = {} } = options;
  const reqHeaders = new Headers(headers);
  if (cookie) {
    reqHeaders.set("cookie", `${SESSION_COOKIE_NAME}=${cookie}`);
  }
  if (body) {
    reqHeaders.set("content-type", "application/json");
  }

  const reqInit = {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  };

  return new NextRequest(new URL(url, "http://localhost:3000"), reqInit);
}

// Clean up test patrons
async function cleanupTestUser(email: string) {
  const norm = normalizeEmail(email);
  const found = await db.select({ id: users.id }).from(users).where(eq(users.email, norm));
  for (const u of found) {
    await db.delete(sessions).where(eq(sessions.userId, u.id));
    const userCarts = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, u.id));
    for (const c of userCarts) {
      await db.delete(cartItems).where(eq(cartItems.cartId, c.id));
    }
    await db.delete(carts).where(eq(carts.userId, u.id));
    const userWishlists = await db.select({ id: wishlists.id }).from(wishlists).where(eq(wishlists.userId, u.id));
    for (const w of userWishlists) {
      await db.delete(wishlistItems).where(eq(wishlistItems.wishlistId, w.id));
    }
    await db.delete(wishlists).where(eq(wishlists.userId, u.id));
    await db.delete(users).where(eq(users.id, u.id));
  }
}

async function runTestSuite() {
  console.log("======================================================================");
  console.log("LOOMERA AUTOMATED TEST SUITE: PHASE 2 AUTH, SESSIONS & CART/WISHLIST");
  console.log("======================================================================");

  const testEmailA = "patron.carrington@loomera-test.com";
  const testEmailB = "lord.sterling@loomera-test.com";
  const testPassword = "Loomera@Secure2026!";

  // Pre-test cleanup
  await cleanupTestUser(testEmailA);
  await cleanupTestUser(testEmailB);
  resetRateLimit(`client-local:${normalizeEmail(testEmailA)}`);
  resetRateLimit(`client-local:${normalizeEmail(testEmailB)}`);

  console.log("\n--- SECTION 1: PASSWORD SECURITY & NORMALIZATION ---");
  {
    assert(normalizeEmail("  Patron@LOOMERA.Com  ") === "patron@loomera.com", "Normalizes email trimming and lowercasing");
    assert(validateEmail("patron@loomera.com"), "Validates RFC 5322 standard email");
    assert(!validateEmail("invalid-email"), "Rejects invalid email format without @/domain");
    assert(!validateEmail(""), "Rejects empty email");

    assert(!validatePasswordStrength("short").isValid, "Rejects short password (< 8 chars)");
    assert(!validatePasswordStrength("alllowercase123!").isValid, "Rejects password without uppercase");
    assert(!validatePasswordStrength("ALLUPPERCASE123!").isValid, "Rejects password without lowercase");
    assert(!validatePasswordStrength("NoNumbersOrSpecial").isValid, "Rejects password without numbers or symbols");
    assert(validatePasswordStrength("LuxuryPassword123!").isValid, "Accepts strong password meeting all criteria");

    const hashVal = await hashPassword(testPassword);
    assert(hashVal.startsWith("$argon2id$"), "Hashes password using Argon2id algorithm");
    assert(await verifyPassword(testPassword, hashVal), "Verifies valid password against Argon2id hash");
    assert(!(await verifyPassword("WrongPassword123!", hashVal)), "Rejects incorrect password against Argon2id hash");
  }

  console.log("\n--- SECTION 2: SESSION MANAGEMENT & COOKIE POLICIES ---");
  {
    const cookieOpts = getSessionCookieOptions();
    assert(cookieOpts.httpOnly === true, "Session cookie enforces HttpOnly: true");
    assert(cookieOpts.sameSite === "lax", "Session cookie enforces SameSite: lax");
    assert(cookieOpts.path === "/", "Session cookie path is root /");
    assert(cookieOpts.maxAge > 0, "Session cookie maxAge is set (30 days in seconds)");

    const rawToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const hashed = hashSessionToken(rawToken);
    assert(hashed.length === 64, "Session token is hashed to 64-char SHA-256 hex digest");
    assert(hashed !== rawToken, "Plaintext session token is never stored directly");
  }

  console.log("\n--- SECTION 3: RATE LIMITING & BRUTE FORCE DEFENSE ---");
  {
    const rateKey = "test-rate-key";
    resetRateLimit(rateKey);
    assert(!checkRateLimit(rateKey).isLimited, "Initial rate status is not limited");

    for (let i = 0; i < 4; i++) {
      recordFailedAttempt(rateKey);
    }
    assert(!checkRateLimit(rateKey).isLimited, "4 failed attempts remain under lockout threshold");

    recordFailedAttempt(rateKey); // 5th attempt
    const status = checkRateLimit(rateKey);
    assert(status.isLimited === true, "5th failed attempt triggers rate lockout");
    assert(typeof status.retryAfterSeconds === "number" && status.retryAfterSeconds > 0, "Provides retryAfterSeconds countdown");

    resetRateLimit(rateKey);
    assert(!checkRateLimit(rateKey).isLimited, "Successful auth resets rate limit key");
  }

  let sessionTokenA = "";
  let userIdA = "";
  let sessionTokenB = "";
  let userIdB = "";

  console.log("\n--- SECTION 4: CUSTOMER REGISTRATION API ---");
  {
    // 4.1 Missing full name
    const reqNoName = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { email: testEmailA, password: testPassword, passwordConfirmation: testPassword },
    });
    const resNoName = await registerHandler(reqNoName);
    assert(resNoName.status === 400, "Rejects registration without full name (HTTP 400)");

    // 4.2 Invalid email
    const reqBadEmail = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { fullName: "Lord Carrington", email: "invalid-email", password: testPassword, passwordConfirmation: testPassword },
    });
    const resBadEmail = await registerHandler(reqBadEmail);
    assert(resBadEmail.status === 400, "Rejects registration with invalid email format (HTTP 400)");

    // 4.3 Password confirmation mismatch
    const reqMismatch = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { fullName: "Lord Carrington", email: testEmailA, password: testPassword, passwordConfirmation: "DifferentPass123!" },
    });
    const resMismatch = await registerHandler(reqMismatch);
    assert(resMismatch.status === 400, "Rejects registration when passwords do not match (HTTP 400)");

    // 4.4 Weak password
    const reqWeak = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { fullName: "Lord Carrington", email: testEmailA, password: "weak", passwordConfirmation: "weak" },
    });
    const resWeak = await registerHandler(reqWeak);
    assert(resWeak.status === 400, "Rejects registration with weak password (HTTP 400)");

    // 4.5 Successful registration for Customer A
    const reqValid = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { fullName: "Lord Carrington", email: testEmailA, password: testPassword, passwordConfirmation: testPassword },
    });
    const resValid = await registerHandler(reqValid);
    assert(resValid.status === 201, "Creates customer account successfully (HTTP 201)");
    const dataValid = await resValid.json();
    assert(dataValid.user.email === testEmailA, "Returns registered customer email");
    assert(dataValid.user.fullName === "Lord Carrington", "Returns registered customer full name");
    assert(!("passwordHash" in dataValid.user), "API response never returns password hash");

    const cookieHeader = resValid.headers.get("set-cookie") || "";
    assert(cookieHeader.includes(SESSION_COOKIE_NAME), "Sets session cookie upon registration");
    assert(cookieHeader.includes("HttpOnly"), "Set-Cookie includes HttpOnly directive");

    // Extract session token
    const tokenMatch = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    sessionTokenA = tokenMatch ? tokenMatch[1] : "";
    userIdA = dataValid.user.id;
    assert(sessionTokenA.length > 30, "Generated cryptographically secure session token");

    // 4.6 Duplicate registration prevention
    const reqDuplicate = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { fullName: "Lord Carrington", email: testEmailA.toUpperCase(), password: testPassword, passwordConfirmation: testPassword },
    });
    const resDuplicate = await registerHandler(reqDuplicate);
    assert(resDuplicate.status === 409, "Rejects duplicate registration with 409 Conflict");

    // Register Customer B for customer isolation testing
    const reqRegB = createRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: { fullName: "Lady Sterling", email: testEmailB, password: testPassword, passwordConfirmation: testPassword },
    });
    const resRegB = await registerHandler(reqRegB);
    assert(resRegB.status === 201, "Registers second customer (Customer B) successfully");
    const dataRegB = await resRegB.json();
    userIdB = dataRegB.user.id;
    const cookieB = resRegB.headers.get("set-cookie") || "";
    const matchB = cookieB.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    sessionTokenB = matchB ? matchB[1] : "";
  }

  console.log("\n--- SECTION 5: CUSTOMER LOGIN & AUTHENTICATION API ---");
  {
    // 5.1 Invalid password
    const reqBadPass = createRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: { email: testEmailA, password: "IncorrectPassword123!" },
    });
    const resBadPass = await loginHandler(reqBadPass);
    assert(resBadPass.status === 401, "Rejects wrong password with HTTP 401");
    const dataBadPass = await resBadPass.json();
    assert(dataBadPass.error === "Invalid email or password.", "Returns generic security error message");

    // 5.2 Non-existent user
    const reqUnknown = createRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: { email: "nonexistent.patron@loomera-test.com", password: testPassword },
    });
    const resUnknown = await loginHandler(reqUnknown);
    assert(resUnknown.status === 401, "Rejects unknown account with HTTP 401 generic message");

    // 5.3 Successful login
    const reqGoodLogin = createRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: { email: testEmailA.toUpperCase(), password: testPassword },
    });
    const resGoodLogin = await loginHandler(reqGoodLogin);
    assert(resGoodLogin.status === 200, "Logs in successfully with HTTP 200");
    const dataGoodLogin = await resGoodLogin.json();
    assert(dataGoodLogin.user.id === userIdA, "Authenticated user identity matches registered ID");

    // Update session token A to latest rotated token
    const newCookie = resGoodLogin.headers.get("set-cookie") || "";
    const newMatch = newCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
    if (newMatch) sessionTokenA = newMatch[1];
  }

  console.log("\n--- SECTION 6: SESSION VALIDATION & REVOCATION (/api/auth/me & logout) ---");
  {
    // 6.1 Validate valid session
    const reqMe = createRequest("http://localhost:3000/api/auth/me", {
      cookie: sessionTokenA,
    });
    const resMe = await meHandler(reqMe);
    assert(resMe.status === 200, "Valid session returns HTTP 200 on /api/auth/me");
    const dataMe = await resMe.json();
    assert(dataMe.authenticated === true, "Reports authenticated: true");
    assert(dataMe.user.email === testEmailA, "Returns correct user profile");

    // 6.2 Missing session cookie
    const reqMeAnon = createRequest("http://localhost:3000/api/auth/me");
    const resMeAnon = await meHandler(reqMeAnon);
    assert(resMeAnon.status === 401, "Unauthenticated request returns HTTP 401 on /api/auth/me");

    // 6.3 Fake session token
    const reqMeFake = createRequest("http://localhost:3000/api/auth/me", {
      cookie: "fake-session-token-000000000000000000000000000000",
    });
    const resMeFake = await meHandler(reqMeFake);
    assert(resMeFake.status === 401, "Fake/forged session token rejected with HTTP 401");

    // 6.4 Session expiration check
    const expiredToken = "expired-token-for-testing-purposes-1234567890abcdef";
    const expiredHash = hashSessionToken(expiredToken);
    await db.insert(sessions).values({
      userId: userIdA,
      tokenHash: expiredHash,
      expiresAt: new Date(Date.now() - 1000 * 60 * 60), // Expired 1 hour ago
    });
    const expiredValidation = await validateSession(expiredToken);
    assert(expiredValidation === null, "Expired session rejected by server session validator");
    await db.delete(sessions).where(eq(sessions.tokenHash, expiredHash));

    // 6.5 Logout revocation
    const reqLogout = createRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      cookie: sessionTokenA,
    });
    const resLogout = await logoutHandler(reqLogout);
    assert(resLogout.status === 200, "Logout endpoint returns HTTP 200");
    const logoutCookie = resLogout.headers.get("set-cookie") || "";
    assert(logoutCookie.includes("Max-Age=0"), "Logout response clears session cookie (Max-Age=0)");

    // Verify revoked session is invalid in DB
    const postLogoutMe = createRequest("http://localhost:3000/api/auth/me", {
      cookie: sessionTokenA,
    });
    const resPostLogout = await meHandler(postLogoutMe);
    assert(resPostLogout.status === 401, "Revoked session immediately rejected upon subsequent request");

    // Log Customer A back in to continue cart/wishlist tests
    const reAuth = await createSession(userIdA);
    sessionTokenA = reAuth.token;
  }

  console.log("\n--- SECTION 7: PERSISTENT CART API & SERVER-AUTHORITATIVE PRICING ---");
  {
    // Clear Customer A's cart first
    await clearUserCart(userIdA);

    // 7.1 Retrieve initial empty cart
    const reqCartInit = createRequest("http://localhost:3000/api/cart", {
      cookie: sessionTokenA,
    });
    const resCartInit = await cartGetHandler(reqCartInit);
    assert(resCartInit.status === 200, "Retrieves customer cart (HTTP 200)");
    const dataCartInit = await resCartInit.json();
    assert(dataCartInit.items.length === 0, "Initial cart is empty");
    assert(dataCartInit.subtotal === 0, "Initial subtotal is 0");

    // 7.2 Add product to persistent cart
    const reqAdd = createRequest("http://localhost:3000/api/cart", {
      method: "POST",
      cookie: sessionTokenA,
      body: {
        productId: "classic-linen-shirt",
        size: "M",
        color: "Cream",
        quantity: 2,
        price: 1, // Tampered client price (should be ignored!)
      },
    });
    const resAdd = await cartPostHandler(reqAdd);
    assert(resAdd.status === 200, "Adds item to persistent cart (HTTP 200)");
    const dataAdd = await resAdd.json();
    assert(dataAdd.items.length === 1, "Cart now contains 1 item line");
    assert(dataAdd.items[0].quantity === 2, "Cart line quantity is 2");
    assert(dataAdd.items[0].price === 2499, "Authoritative price ₹2,499 overrides client tampered price ₹1");
    assert(dataAdd.subtotal === 4998, "Authoritative subtotal calculates 2 x 2499 = ₹4,998");

    // 7.3 Increment existing variant in cart
    const reqInc = createRequest("http://localhost:3000/api/cart", {
      method: "POST",
      cookie: sessionTokenA,
      body: {
        productId: "classic-linen-shirt",
        size: "M",
        color: "Cream",
        quantity: 1,
      },
    });
    const resInc = await cartPostHandler(reqInc);
    const dataInc = await resInc.json();
    assert(dataInc.items.length === 1, "Duplicate variant does not create duplicate row");
    assert(dataInc.items[0].quantity === 3, "Duplicate variant increments existing quantity (2 + 1 = 3)");
    assert(dataInc.subtotal === 7497, "Recalculates authoritative subtotal (3 x 2499 = ₹7,497)");

    // 7.4 Reject invalid / non-existent variant
    const reqBadVariant = createRequest("http://localhost:3000/api/cart", {
      method: "POST",
      cookie: sessionTokenA,
      body: {
        productId: "classic-linen-shirt",
        size: "XXXXXL-INVALID",
        color: "Neon-Purple-Invalid",
        quantity: 1,
      },
    });
    const resBadVariant = await cartPostHandler(reqBadVariant);
    assert(resBadVariant.status === 400, "Rejects non-existent variant (HTTP 400)");

    // 7.5 Reject invalid product ID
    const reqBadProd = createRequest("http://localhost:3000/api/cart", {
      method: "POST",
      cookie: sessionTokenA,
      body: {
        productId: "non-existent-product-id",
        size: "M",
        color: "Cream",
        quantity: 1,
      },
    });
    const resBadProd = await cartPostHandler(reqBadProd);
    assert(resBadProd.status === 400, "Rejects non-existent product ID (HTTP 400)");

    // 7.6 Reject negative quantity
    const reqNegQty = createRequest("http://localhost:3000/api/cart", {
      method: "POST",
      cookie: sessionTokenA,
      body: {
        productId: "classic-linen-shirt",
        size: "M",
        color: "Cream",
        quantity: -5,
      },
    });
    const resNegQty = await cartPostHandler(reqNegQty);
    assert(resNegQty.status === 400, "Rejects negative quantity (HTTP 400)");

    // 7.7 Update quantity via PATCH
    const reqPatch = createRequest("http://localhost:3000/api/cart", {
      method: "PATCH",
      cookie: sessionTokenA,
      body: {
        productId: "classic-linen-shirt",
        size: "M",
        color: "Cream",
        quantity: 5,
      },
    });
    const resPatch = await cartPatchHandler(reqPatch);
    assert(resPatch.status === 200, "Updates cart quantity (HTTP 200)");
    const dataPatch = await resPatch.json();
    assert(dataPatch.items[0].quantity === 5, "Quantity updated to 5");

    // 7.8 Remove item via DELETE
    const reqDelete = createRequest("http://localhost:3000/api/cart?productId=classic-linen-shirt&size=M&color=Cream", {
      method: "DELETE",
      cookie: sessionTokenA,
    });
    const resDelete = await cartDeleteHandler(reqDelete);
    assert(resDelete.status === 200, "Removes specific item line via DELETE (HTTP 200)");
    const dataDelete = await resDelete.json();
    assert(dataDelete.items.length === 0, "Cart item successfully deleted");
  }

  console.log("\n--- SECTION 8: ANONYMOUS CART MERGE & IDEMPOTENCY ---");
  {
    await clearUserCart(userIdA);

    // Initial user cart state: 1 Linen Trouser (Khaki, 32)
    await addItemToUserCart(userIdA, {
      productId: "linen-trousers",
      size: "32",
      color: "Khaki",
      quantity: 1,
    });

    const guestPayload = {
      items: [
        { productId: "classic-linen-shirt", size: "M", color: "Cream", quantity: 2 },
        { productId: "linen-trousers", size: "32", color: "Khaki", quantity: 2 }, // Exists in user cart with qty 1
        { productId: "non-existent-product", size: "S", color: "Black", quantity: 1 }, // Invalid, should be skipped
      ],
    };

    // First merge call
    const reqMerge1 = createRequest("http://localhost:3000/api/cart/merge", {
      method: "POST",
      cookie: sessionTokenA,
      body: guestPayload,
    });
    const resMerge1 = await cartMergeHandler(reqMerge1);
    assert(resMerge1.status === 200, "Anonymous cart merge succeeds (HTTP 200)");
    const dataMerge1 = await resMerge1.json();
    assert(dataMerge1.items.length === 2, "Merged cart contains exactly 2 valid item lines");
    const shirtLine1 = dataMerge1.items.find((i: { productId: string }) => i.productId === "classic-linen-shirt");
    const trouserLine1 = dataMerge1.items.find((i: { productId: string }) => i.productId === "linen-trousers");
    assert(shirtLine1 && shirtLine1.quantity === 2, "New guest item inserted with quantity 2");
    assert(trouserLine1 && trouserLine1.quantity === 2, "Overlapping item reconciled to target quantity (2)");

    // Second merge call (retried network request / refresh) -> MUST BE 100% IDEMPOTENT
    const reqMerge2 = createRequest("http://localhost:3000/api/cart/merge", {
      method: "POST",
      cookie: sessionTokenA,
      body: guestPayload,
    });
    const resMerge2 = await cartMergeHandler(reqMerge2);
    const dataMerge2 = await resMerge2.json();
    assert(dataMerge2.items.length === 2, "Second merge call preserves exact item count");
    const shirtLine2 = dataMerge2.items.find((i: { productId: string }) => i.productId === "classic-linen-shirt");
    const trouserLine2 = dataMerge2.items.find((i: { productId: string }) => i.productId === "linen-trousers");
    assert(shirtLine2 && shirtLine2.quantity === 2, "Idempotent: shirt quantity remains 2 (not duplicated to 4)");
    assert(trouserLine2 && trouserLine2.quantity === 2, "Idempotent: trouser quantity remains 2 (not duplicated to 4)");

    // Third merge call (concurrent or repeated invocation)
    const dataMerge3 = await mergeAnonymousCart(userIdA, guestPayload.items);
    assert(dataMerge3.length === 2, "Direct library merge call maintains exact item count");
    const shirtLine3 = dataMerge3.find((i) => i.productId === "classic-linen-shirt");
    assert(shirtLine3?.quantity === 2, "Direct library merge maintains strictly idempotent quantity");
  }

  console.log("\n--- SECTION 9: PERSISTENT WISHLIST API & MERGE ---");
  {
    // 9.1 Add item to wishlist
    const reqWishAdd = createRequest("http://localhost:3000/api/wishlist", {
      method: "POST",
      cookie: sessionTokenA,
      body: { productTitle: "Classic Linen Shirt" },
    });
    const resWishAdd = await wishlistPostHandler(reqWishAdd);
    assert(resWishAdd.status === 200, "Adds item to persistent wishlist (HTTP 200)");
    const dataWishAdd = await resWishAdd.json();
    assert(dataWishAdd.wishlist.includes("Classic Linen Shirt"), "Wishlist includes added garment");

    // 9.2 Duplicate wishlist addition prevention
    const reqWishDup = createRequest("http://localhost:3000/api/wishlist", {
      method: "POST",
      cookie: sessionTokenA,
      body: { productTitle: "Classic Linen Shirt" },
    });
    const resWishDup = await wishlistPostHandler(reqWishDup);
    const dataWishDup = await resWishDup.json();
    const count = dataWishDup.wishlist.filter((t: string) => t === "Classic Linen Shirt").length;
    assert(count === 1, "Duplicate wishlist item is prevented (idempotent addition)");

    // 9.3 Merge anonymous wishlist upon login
    const reqWishMerge = createRequest("http://localhost:3000/api/wishlist/merge", {
      method: "POST",
      cookie: sessionTokenA,
      body: { items: ["Handloom Kurta", "Classic Linen Shirt", "Non-Existent Product"] },
    });
    const resWishMerge = await wishlistMergeHandler(reqWishMerge);
    assert(resWishMerge.status === 200, "Anonymous wishlist merge succeeds (HTTP 200)");
    const dataWishMerge = await resWishMerge.json();
    assert(dataWishMerge.wishlist.includes("Handloom Kurta"), "Merged guest item 'Handloom Kurta' added");
    assert(dataWishMerge.wishlist.includes("Classic Linen Shirt"), "Existing item 'Classic Linen Shirt' retained");
    assert(!dataWishMerge.wishlist.includes("Non-Existent Product"), "Invalid product skipped gracefully");

    // 9.4 Remove item from wishlist
    const reqWishDel = createRequest("http://localhost:3000/api/wishlist", {
      method: "DELETE",
      cookie: sessionTokenA,
      body: { productTitle: "Handloom Kurta" },
    });
    const resWishDel = await wishlistDeleteHandler(reqWishDel);
    assert(resWishDel.status === 200, "Removes item from wishlist (HTTP 200)");
    const dataWishDel = await resWishDel.json();
    assert(!dataWishDel.wishlist.includes("Handloom Kurta"), "Garment successfully removed from wishlist");
  }

  console.log("\n--- SECTION 10: STRICT CUSTOMER DATA ISOLATION AUDIT ---");
  {
    // Customer A has items in their cart: classic-linen-shirt, linen-trousers
    // Customer B sets up their cart: boys-linen-shirt
    await clearUserCart(userIdB);
    await addItemToUserCart(userIdB, {
      productId: "boys-linen-shirt",
      size: "8 YRS",
      color: "Teal",
      quantity: 1,
    });
    await addToUserWishlist(userIdB, "Boys Linen Shirt");

    // 10.1 Customer B requests /api/cart with Customer B's session
    const reqCartB = createRequest("http://localhost:3000/api/cart", {
      cookie: sessionTokenB,
    });
    const resCartB = await cartGetHandler(reqCartB);
    const dataCartB = await resCartB.json();
    assert(dataCartB.items.length === 1, "Customer B only sees 1 cart item");
    assert(dataCartB.items[0].productId === "boys-linen-shirt", "Customer B sees their own product");
    assert(
      !dataCartB.items.some((i: { productId: string }) => i.productId === "classic-linen-shirt"),
      "Customer B cannot view Customer A's cart items"
    );

    // 10.2 Customer B attempts to tamper with Customer A's cart by supplying Customer A's userId in body
    const reqTamperBody = createRequest("http://localhost:3000/api/cart", {
      method: "POST",
      cookie: sessionTokenB,
      body: {
        userId: userIdA, // Malicious injection of Customer A's ID
        productId: "handloom-kurta",
        size: "40",
        color: "Rust",
        quantity: 1,
      },
    });
    await cartPostHandler(reqTamperBody);

    // Verify Customer A's cart was NOT modified by Customer B's request
    const cartAAfterTamper = await getUserCart(userIdA);
    assert(
      !cartAAfterTamper.some((i) => i.productId === "handloom-kurta"),
      "Injected userId in payload is ignored; Customer A's cart remains completely untouched"
    );

    // 10.3 Customer B attempts to delete Customer A's cart by supplying Customer A's userId
    const reqTamperDel = createRequest(`http://localhost:3000/api/cart?userId=${userIdA}`, {
      method: "DELETE",
      cookie: sessionTokenB,
    });
    await cartDeleteHandler(reqTamperDel);

    // Verify Customer A's cart items were NOT deleted
    const cartAAfterDel = await getUserCart(userIdA);
    assert(cartAAfterDel.length > 0, "Customer A's cart cannot be cleared or modified by Customer B");

    // 10.4 Customer B requests /api/wishlist
    const reqWishB = createRequest("http://localhost:3000/api/wishlist", {
      cookie: sessionTokenB,
    });
    const resWishB = await wishlistGetHandler(reqWishB);
    const dataWishB = await resWishB.json();
    assert(dataWishB.wishlist.includes("Boys Linen Shirt"), "Customer B sees their own wishlist");
    assert(
      !dataWishB.wishlist.includes("Classic Linen Shirt"),
      "Customer B cannot view Customer A's wishlist items"
    );

    // 10.5 Session isolation: Customer B's token cannot access Customer A's profile
    const reqMeB = createRequest("http://localhost:3000/api/auth/me", {
      cookie: sessionTokenB,
    });
    const resMeB = await meHandler(reqMeB);
    const dataMeB = await resMeB.json();
    assert(dataMeB.user.id === userIdB, "Session strictly maps to Customer B's own identity");
    assert(dataMeB.user.id !== userIdA, "Customer B's session cannot access Customer A's identity");
  }

  console.log("\n--- SECTION 11: CSRF & CROSS-SITE REQUEST DEFENSE ---");
  {
    // State-changing request with cross-site origin
    const reqCsrf = createRequest("http://localhost:3000/api/cart", {
      method: "POST",
      cookie: sessionTokenA,
      headers: {
        origin: "https://malicious-attacker-site.com",
        "sec-fetch-site": "cross-site",
      },
      body: {
        productId: "classic-linen-shirt",
        size: "M",
        color: "Cream",
        quantity: 1,
      },
    });
    const resCsrf = await cartPostHandler(reqCsrf);
    assert(resCsrf.status === 403, "Cross-site request rejected with HTTP 403 Forbidden");

    // State-changing request with valid same-origin
    const reqValidOrigin = createRequest("http://localhost:3000/api/cart", {
      method: "POST",
      cookie: sessionTokenA,
      headers: {
        origin: "http://localhost:3000",
        host: "localhost:3000",
      },
      body: {
        productId: "classic-linen-shirt",
        size: "M",
        color: "Cream",
        quantity: 1,
      },
    });
    const resValidOrigin = await cartPostHandler(reqValidOrigin);
    assert(resValidOrigin.status === 200, "Same-origin request accepted with HTTP 200");
  }

  // Final cleanup of test patrons
  await cleanupTestUser(testEmailA);
  await cleanupTestUser(testEmailB);

  console.log("\n======================================================================");
  console.log(`PHASE 2 TEST RESULTS: ${passed}/${total} PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log("======================================================================");

  if (passed !== total) {
    process.exitCode = 1;
  }

  await pool.end();
}

runTestSuite().catch(async (err) => {
  console.error("Test execution encountered an unhandled error:", err);
  await pool.end();
  process.exit(1);
});
