// Social platforms a worker can share on their tip receipt.

export type SocialPlatform = "tiktok" | "instagram" | "facebook" | "x";

export const SOCIAL_PLATFORMS: {
  key: SocialPlatform;
  label: string;
  base: string;
  placeholder: string;
}[] = [
  { key: "tiktok", label: "TikTok", base: "https://www.tiktok.com/@", placeholder: "@username" },
  { key: "instagram", label: "Instagram", base: "https://www.instagram.com/", placeholder: "@username" },
  { key: "facebook", label: "Facebook", base: "https://www.facebook.com/", placeholder: "username or page" },
  { key: "x", label: "X", base: "https://x.com/", placeholder: "@username" },
];

// Turn a stored handle or full URL into an https link. Accepts either
// "@name", "name", or a pasted "https://..." URL.
export function socialUrl(platform: SocialPlatform, value: string | undefined): string {
  const v = (value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@+/, "").replace(/^\/+/, "");
  const cfg = SOCIAL_PLATFORMS.find((p) => p.key === platform);
  return cfg ? cfg.base + handle : "";
}
