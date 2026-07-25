import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Dot Meet（ドットミート）｜待ち合わせの位置共有をURLひとつで";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [notoSansJP600, notoSansJP400] = await Promise.all([
    readFile(join(process.cwd(), "app/fonts/NotoSansJP-600-subset.ttf")),
    readFile(join(process.cwd(), "app/fonts/NotoSansJP-400-subset.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        {/* components/Logo.tsx と同じ意匠(棒人間+ブランドカラーの2ドット) */}
        <svg width="160" height="119" viewBox="0 0 140 104">
          <g stroke="#0f172a" strokeWidth="6" strokeLinecap="round" fill="none">
            <circle cx="38" cy="22" r="10.5" fill="#0f172a" stroke="none" />
            <path d="M39 38 L43 66" />
            <path d="M40 47 L25 60" />
            <path d="M40 47 L60 36" />
            <path d="M43 66 L33 92" />
            <path d="M43 66 L54 90" />
            <circle cx="102" cy="22" r="10.5" fill="#0f172a" stroke="none" />
            <path d="M101 38 L97 66" />
            <path d="M100 47 L115 60" />
            <path d="M100 47 L80 36" />
            <path d="M97 66 L107 92" />
            <path d="M97 66 L86 90" />
          </g>
          <circle cx="66.5" cy="33" r="3.5" fill="#2563eb" />
          <circle cx="73.5" cy="33" r="3.5" fill="#f97316" />
        </svg>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 56,
            fontWeight: 600,
            color: "#0f172a",
            fontFamily: "Noto Sans JP",
          }}
        >
          dot meet
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 24,
            fontSize: 30,
            fontWeight: 400,
            color: "#94a3b8",
            fontFamily: "Noto Sans JP",
          }}
        >
          <span>待ち合わせのときだけ、お互いの位置を共有。</span>
          <span style={{ marginTop: 6 }}>合流したら自動で消えます。登録不要。</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Noto Sans JP",
          data: notoSansJP600,
          style: "normal",
          weight: 600,
        },
        {
          name: "Noto Sans JP",
          data: notoSansJP400,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
}
