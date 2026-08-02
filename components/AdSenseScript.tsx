import Script from "next/script";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from "@/lib/adsense";

export default function AdSenseScript() {
  if (!ADSENSE_ENABLED) return null;

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
