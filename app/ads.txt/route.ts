import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from "@/lib/adsense";

export function GET() {
  const body = ADSENSE_ENABLED
    ? `google.com, ${ADSENSE_CLIENT_ID.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n`
    : "";

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
}
