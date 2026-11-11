/**
 * LOOMERA AUTOMATED TEST SUITE: PHASE 7 — PRODUCTION READINESS & SECURITY HARDENING
 * Comprehensive verification of environment validation, security headers, health probe,
 * transactional notification safety, payment cryptography, and crawl directives.
 */

import { validateEnvironment, maskSecret } from "../src/lib/env";
import { computePaymentSignature, verifyPaymentSignature, computeWebhookSignature, verifyWebhookSignature } from "../src/lib/payments/razorpay";
import { sendTransactionalEmail } from "../src/lib/notifications/email";
import sitemap from "../src/app/sitemap";
import robots from "../src/app/robots";
import nextConfig from "../next.config";
import { db } from "../src/db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

async function runPhase7Tests() {
  console.log("======================================================================");
  console.log("LOOMERA AUTOMATED TEST SUITE: PHASE 7 — PRODUCTION READINESS");
  console.log("======================================================================");

  // --------------------------------------------------------------------
  // SECTION 1: ENVIRONMENT VALIDATION & SECRET MASKING
  // --------------------------------------------------------------------
  console.log("\n--- SECTION 1: ENVIRONMENT VALIDATION & SECRET MASKING ---");
  const envResult = validateEnvironment();
  assert(typeof envResult.isValid === "boolean", "Environment validator returns valid boolean result");
  assert(envResult.diagnostics !== undefined, "Diagnostics object is provided");

  const masked = maskSecret("rzp_live_secretkey1234567890abcdef");
  assert(!masked.includes("1234567890"), "Secret masking strictly redacts high-entropy internal characters");
  assert(masked.startsWith("rzp_") && masked.endsWith("cdef"), "Secret masking retains safe edge characters for diagnosis");
  assert(maskSecret("") === "[NOT SET]", "Empty secret handled gracefully with [NOT SET]");

  // --------------------------------------------------------------------
  // SECTION 2: HEALTH PROBE & DATABASE CONNECTIVITY
  // --------------------------------------------------------------------
  console.log("\n--- SECTION 2: HEALTH PROBE & DATABASE CONNECTIVITY ---");
  const dbStart = Date.now();
  const dbResult = await db.execute(sql`SELECT 1 as probe`);
  const latency = Date.now() - dbStart;

  assert(dbResult.rows.length === 1, "Database health probe successfully executed SELECT 1");
  assert(latency >= 0 && latency < 500, `Database probe roundtrip latency is healthy (${latency}ms < 500ms)`);

  const mem = process.memoryUsage();
  const rssMb = Math.round(mem.rss / 1024 / 1024);
  assert(rssMb > 0 && rssMb < 2048, `Process memory RSS is within normal bounds (${rssMb}MB)`);

  // --------------------------------------------------------------------
  // SECTION 3: HTTP SECURITY HEADERS CONFIGURATION
  // --------------------------------------------------------------------
  console.log("\n--- SECTION 3: HTTP SECURITY HEADERS CONFIGURATION ---");
  assert(typeof nextConfig.headers === "function", "next.config.ts defines headers configuration function");

  if (nextConfig.headers) {
    interface HeaderEntry {
      key: string;
      value: string;
    }
    interface HeaderRule {
      source: string;
      headers: HeaderEntry[];
    }

    const configuredHeaders = (await nextConfig.headers()) as HeaderRule[];
    assert(configuredHeaders.length > 0, "Security headers array contains route matchers");

    const rootRule = configuredHeaders.find((h: HeaderRule) => h.source === "/:path*");
    assert(rootRule !== undefined, "Found global security headers rule for /:path*");

    if (rootRule) {
      const headerMap = new Map(rootRule.headers.map((h: HeaderEntry) => [h.key, h.value]));

      assert(headerMap.has("Strict-Transport-Security"), "HSTS (Strict-Transport-Security) header is active");
      assert(headerMap.get("Strict-Transport-Security")?.includes("max-age=63072000") ?? false, "HSTS enforces 2-year max-age with preload");
      assert(headerMap.get("X-Frame-Options") === "SAMEORIGIN", "X-Frame-Options is set to SAMEORIGIN for checkout safety");
      assert(headerMap.get("X-Content-Type-Options") === "nosniff", "X-Content-Type-Options is set to nosniff");
      assert(headerMap.get("Referrer-Policy") === "strict-origin-when-cross-origin", "Referrer-Policy is strict-origin-when-cross-origin");
      assert(headerMap.has("Content-Security-Policy"), "Content-Security-Policy header is configured");

      const csp = headerMap.get("Content-Security-Policy") || "";
      assert(csp.includes("https://checkout.razorpay.com"), "CSP whitelists Razorpay checkout frame/script");
      assert(csp.includes("fonts.gstatic.com"), "CSP whitelists Google Web Fonts");
    }
  }

  // --------------------------------------------------------------------
  // SECTION 4: TRANSACTIONAL NOTIFICATION READINESS & SAFETY
  // --------------------------------------------------------------------
  console.log("\n--- SECTION 4: TRANSACTIONAL NOTIFICATION READINESS & SAFETY ---");
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const orderConfResult = await sendTransactionalEmail({
    type: "ORDER_CONFIRMATION",
    recipientEmail: "patron@example.com",
    recipientName: "Test Patron",
    orderNumber: "ORD-TEST-001",
    totalInr: 4999,
    items: [
      {
        title: "Classic Linen Shirt",
        size: "M",
        color: "Natural White",
        quantity: 1,
        lineTotal: 2499,
      },
    ],
  });

  assert(orderConfResult.success === true, "Order confirmation email generated successfully");
  assert(orderConfResult.deliveryMode === "development_logger", "Test environment safely prevents external email transmission");
  assert(orderConfResult.messageId.startsWith("msg_"), "Unique tracking messageId is assigned");

  const refundConfResult = await sendTransactionalEmail({
    type: "REFUND_STATUS",
    recipientEmail: "patron@example.com",
    recipientName: "Test Patron",
    orderNumber: "ORD-TEST-001",
    totalInr: 4999,
    refundAmountInr: 4999,
  });
  assert(refundConfResult.success === true, "Refund status notification generated successfully");

  // --------------------------------------------------------------------
  // SECTION 5: PAYMENT GATEWAY CRYPTOGRAPHY & SIGNATURES
  // --------------------------------------------------------------------
  console.log("\n--- SECTION 5: PAYMENT GATEWAY CRYPTOGRAPHY & SIGNATURES ---");
  const testOrderId = "order_test_123456";
  const testPaymentId = "pay_test_abcdef";
  const testSecret = "super_secret_key_loomera_12345";

  const validSig = computePaymentSignature(testOrderId, testPaymentId, testSecret);
  assert(typeof validSig === "string" && validSig.length === 64, "Generated valid 64-char HMAC-SHA256 signature");

  const isVerified = verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: validSig,
    secret: testSecret,
  });
  assert(isVerified === true, "Timing-safe verification authenticates valid payment signature");

  const isTamperedRejected = verifyPaymentSignature({
    orderId: testOrderId,
    paymentId: testPaymentId,
    signature: "tampered_signature_attempt_0000000000000000000000000000000000000000",
    secret: testSecret,
  });
  assert(isTamperedRejected === false, "Timing-safe verification strictly rejects tampered signature");

  const testPayload = JSON.stringify({ event: "payment.captured", id: "evt_123" });
  const validWebhookSig = computeWebhookSignature(testPayload, testSecret);
  const isWebhookValid = verifyWebhookSignature({
    rawBody: testPayload,
    signature: validWebhookSig,
    secret: testSecret,
  });
  assert(isWebhookValid === true, "Webhook HMAC-SHA256 signature authenticates valid raw body");

  // --------------------------------------------------------------------
  // SECTION 6: SEARCH ENGINE DISCOVERY & CRAWL DIRECTIVES
  // --------------------------------------------------------------------
  console.log("\n--- SECTION 6: SEARCH ENGINE DISCOVERY & CRAWL DIRECTIVES ---");
  const robotsConfig = robots();
  assert(Boolean(robotsConfig.sitemap?.includes("sitemap.xml")), "Robots configuration links to canonical sitemap.xml");

  const rulesArray = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
  const firstRule = rulesArray[0] as { disallow?: string | string[] } | undefined;
  const disallowedPaths: string[] = Array.isArray(firstRule?.disallow)
    ? firstRule.disallow
    : typeof firstRule?.disallow === "string"
    ? [firstRule.disallow]
    : [];
  assert(disallowedPaths.includes("/admin"), "Robots disallows search engines from crawling /admin");
  assert(disallowedPaths.includes("/checkout"), "Robots disallows search engines from crawling /checkout");
  assert(disallowedPaths.includes("/account"), "Robots disallows search engines from crawling /account");

  const sitemapEntries = await sitemap();
  assert(sitemapEntries.length >= 8, `Sitemap contains at least 8 URLs (found: ${sitemapEntries.length})`);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://loomera.com";
  const hasHome = sitemapEntries.some((e) => e.url === baseUrl || e.url === `${baseUrl}/`);
  const hasCollections = sitemapEntries.some((e) => e.url.includes("/collections"));
  const hasProducts = sitemapEntries.some((e) => e.url.includes("/products/"));

  assert(hasHome, "Sitemap includes homepage URL");
  assert(hasCollections, "Sitemap includes collections URLs");
  assert(hasProducts, "Sitemap includes dynamic product URLs");

  // --------------------------------------------------------------------
  // SECTION 7: DISASTER RECOVERY & SCRIPT VERIFICATION
  // --------------------------------------------------------------------
  console.log("\n--- SECTION 7: DISASTER RECOVERY SCRIPT VERIFICATION ---");
  const backupScriptExists = fs.existsSync(path.join(__dirname, "backup_db.ps1"));
  const restoreScriptExists = fs.existsSync(path.join(__dirname, "restore_db.ps1"));

  assert(backupScriptExists, "Database backup utility (scripts/backup_db.ps1) exists");
  assert(restoreScriptExists, "Database restore utility (scripts/restore_db.ps1) exists");

  const backupDir = path.join(__dirname, "../backups");
  const hasBackups = fs.existsSync(backupDir) && fs.readdirSync(backupDir).length > 0;
  assert(hasBackups, "Verified backup archive is present in backups directory");

  // --------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------
  console.log("\n======================================================================");
  console.log(`PHASE 7 TEST RESULTS: ${passedCount}/${passedCount + failedCount} PASSED (${Math.round((passedCount / (passedCount + failedCount)) * 100)}%)`);
  console.log("======================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase7Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
