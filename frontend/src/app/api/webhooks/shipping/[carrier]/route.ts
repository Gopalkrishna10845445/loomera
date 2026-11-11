import { NextRequest, NextResponse } from "next/server";
import { processShippingWebhook } from "@/lib/shipping/shipping-service";
import { ShippingCarrier } from "@/lib/shipping/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ carrier: string }> }
) {
  try {
    const { carrier: rawCarrier } = await params;
    const carrier = rawCarrier.toUpperCase() as ShippingCarrier;

    const validCarriers: ShippingCarrier[] = ["DELHIVERY", "SHIPROCKET", "BLUEDART", "LOOMERA_EXPRESS"];
    if (!validCarriers.includes(carrier)) {
      return NextResponse.json({ error: `Unsupported shipping carrier: ${rawCarrier}` }, { status: 400 });
    }

    const rawBody = await req.text();
    const signature =
      req.headers.get("x-delhivery-signature") ||
      req.headers.get("x-shiprocket-signature") ||
      req.headers.get("x-bluedart-signature") ||
      req.headers.get("x-shipping-signature") ||
      undefined;

    let parsedBody: Record<string, unknown>;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON webhook payload" }, { status: 400 });
    }

    const result = await processShippingWebhook({
      carrier,
      rawBody,
      signature,
      parsedBody,
    });

    return NextResponse.json({ success: true, message: result.message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    console.error("Shipping webhook error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
