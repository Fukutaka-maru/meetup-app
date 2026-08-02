"use client";

import { useEffect } from "react";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from "@/lib/adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdUnitProps = {
  slot: string;
  className?: string;
  format?: string;
  fullWidthResponsive?: boolean;
};

export default function AdUnit({
  slot,
  className,
  format = "auto",
  fullWidthResponsive = true,
}: AdUnitProps) {
  useEffect(() => {
    if (!ADSENSE_ENABLED) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error(err);
    }
  }, []);

  if (!ADSENSE_ENABLED) return null;

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block" }}
      data-ad-client={ADSENSE_CLIENT_ID}
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
    />
  );
}
