import type { MetadataRoute } from "next";

// ログイン必須ページ・一時的なセッションURLは含めない。
// 公開・恒久的なページ(トップページ)のみを掲載する。
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://dot-meet.com",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
