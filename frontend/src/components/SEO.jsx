import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_NAME = "GhanaJersey.co";
const DEFAULT_TITLE = "Ghana Jersey Shop | Black Stars Jersey, Ghana Football Jerseys & News";
const DEFAULT_DESCRIPTION = "Shop Ghana jersey styles, Black Stars jersey releases, retro Ghana football shirts, and designer Ghana jerseys. Discover authentic Ghana jersey news, collections, and worldwide delivery.";
const DEFAULT_IMAGE = "https://customer-assets.emergentagent.com/job_kente-market-1/artifacts/5rjkj9m0_Hero%20Banner.jpg";

const ensureMetaTag = (selector, attributes) => {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    document.head.appendChild(tag);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      tag.setAttribute(key, value);
    }
  });
  return tag;
};

const ensureLinkTag = (selector, attributes) => {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("link");
    document.head.appendChild(tag);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      tag.setAttribute(key, value);
    }
  });
  return tag;
};

const SEO = ({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  keywords = "ghana jersey, black stars jersey, ghana football jersey, ghana soccer jersey, buy ghana jersey, black stars football shirt",
  image = DEFAULT_IMAGE,
  type = "website",
  canonicalPath,
  jsonLd,
  robots = "index,follow"
}) => {
  const location = useLocation();

  useEffect(() => {
    const baseUrl = (process.env.REACT_APP_SITE_URL || window.location.origin).replace(/\/+$/, "");
    const path = canonicalPath || `${location.pathname}${location.search}`;
    const canonicalUrl = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

    document.title = fullTitle;

    ensureMetaTag('meta[name="description"]', { name: "description", content: description });
    ensureMetaTag('meta[name="keywords"]', { name: "keywords", content: keywords });
    ensureMetaTag('meta[name="robots"]', { name: "robots", content: robots });
    ensureMetaTag('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    ensureMetaTag('meta[property="og:description"]', { property: "og:description", content: description });
    ensureMetaTag('meta[property="og:type"]', { property: "og:type", content: type });
    ensureMetaTag('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    ensureMetaTag('meta[property="og:image"]', { property: "og:image", content: image });
    ensureMetaTag('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });
    ensureMetaTag('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    ensureMetaTag('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    ensureMetaTag('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    ensureMetaTag('meta[name="twitter:image"]', { name: "twitter:image", content: image });
    ensureLinkTag('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });

    const existingScript = document.getElementById("seo-json-ld");
    if (existingScript) {
      existingScript.remove();
    }

    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = "seo-json-ld";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const script = document.getElementById("seo-json-ld");
      if (script) {
        script.remove();
      }
    };
  }, [canonicalPath, description, image, jsonLd, keywords, location.pathname, location.search, robots, title, type]);

  return null;
};

export default SEO;
