import { NextRequest, NextResponse } from "next/server";
import { processCartRecoveryToken } from "@/lib/marketing/cart-recovery-service";
import { checkAssistantRateLimit } from "@/lib/ai/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rate = checkAssistantRateLimit(`cart-recover-${ip}`, 20, 60000);
    if (!rate.allowed) {
      return NextResponse.redirect(new URL("/collections/men?error=rate_limited", req.url));
    }

    const { token } = await params;
    if (!token) {
      return NextResponse.redirect(new URL("/collections/men", req.url));
    }

    const result = await processCartRecoveryToken(token);
    if (!result.valid) {
      return NextResponse.redirect(
        new URL("/collections/men?error=recovery_link_expired", req.url)
      );
    }

    const discountParam = result.discountCode ? `&coupon=${encodeURIComponent(result.discountCode)}` : "";
    return NextResponse.redirect(
      new URL(`/checkout?recovered=true${discountParam}`, req.url)
    );
  } catch (error: unknown) {
    console.error("GET /api/cart/recover/[token] error:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
