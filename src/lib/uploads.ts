import path from "path";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export function uploadPublicPath(name: string) {
  return "/api/uploads/" + name;
}

export function isUploadPath(value: string) {
  return value.startsWith("/api/uploads/") || value.startsWith("/uploads/");
}

export function uploadFileName(value: string) {
  const raw = value.replace(/^\/api\/uploads\//, "").replace(/^\/uploads\//, "");
  if (!/^[a-z0-9]+\.(jpg|png|webp)$/i.test(raw)) return "";
  return raw;
}
