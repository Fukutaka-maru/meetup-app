import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // www は正規URL(https://dot-meet.com)へ恒久リダイレクト。
      // Vercel側のドメインリダイレクト設定と併用すると二重リダイレクトの
      // 原因になるため、www→apex の向きはこの設定のみで行うこと。
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.dot-meet.com" }],
        destination: "https://dot-meet.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
