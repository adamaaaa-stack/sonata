import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app", "/account", "/auth/", "/api/"],
      },
    ],
    sitemap: "https://learnwithsonata.com/sitemap.xml",
    host: "https://learnwithsonata.com",
  };
}
