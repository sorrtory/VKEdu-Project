const BACKEND_URL = process.env.FRONTEND_INTERNAL_BACKEND_URL;

export function getBackendUrl(path = ""): string {
  if (!BACKEND_URL) {
    throw new Error("FRONTEND_INTERNAL_BACKEND_URL is not configured");
  }

  const normalizedBaseUrl = BACKEND_URL.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");

  return normalizedPath
    ? `${normalizedBaseUrl}/${normalizedPath}`
    : normalizedBaseUrl;
}
