"use client";

import { useEffect } from "react";
import { captureClientAttribution } from "@/lib/analytics/attribution-client";

export function AttributionTracker() {
  useEffect(() => {
    // Non-blocking capture of UTM parameters and session state
    try {
      captureClientAttribution();
    } catch {
      // Fail silently to avoid interrupting rendering
    }
  }, []);

  return null;
}
