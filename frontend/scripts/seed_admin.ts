/**
 * LOOMERA — Administrative Account Provisioning Seed Script
 * Provisions or elevates the primary SUPER_ADMIN atelier account.
 */

import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword, normalizeEmail } from "../src/lib/auth/password";

async function seedAdmin() {
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL || "admin@loomera.com");
  const adminPassword = process.env.ADMIN_PASSWORD || "LoomeraAdmin2026!";
  const adminName = "Loomera Atelier Administrator";

  console.log(`Checking admin user: ${adminEmail}...`);

  const [existing] = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing) {
    if (existing.role !== "SUPER_ADMIN") {
      await db
        .update(users)
        .set({ role: "SUPER_ADMIN", updatedAt: new Date() })
        .where(eq(users.id, existing.id));
      console.log(`[UPDATED] User ${adminEmail} elevated to SUPER_ADMIN.`);
    } else {
      console.log(`[EXISTS] User ${adminEmail} is already SUPER_ADMIN.`);
    }
  } else {
    const passwordHash = await hashPassword(adminPassword);
    const [created] = await db
      .insert(users)
      .values({
        email: adminEmail,
        fullName: adminName,
        passwordHash,
        role: "SUPER_ADMIN",
      })
      .returning({ id: users.id, email: users.email, role: users.role });

    console.log(`[CREATED] Created SUPER_ADMIN user: ${created.email} (ID: ${created.id})`);
  }
}

seedAdmin()
  .then(() => {
    console.log("Admin provisioning completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Admin provisioning error:", err);
    process.exit(1);
  });
