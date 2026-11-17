pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
export const isFrontendPreview = import.meta.env.VITE_FRONTEND_PREVIEW === "true";

export const frontendPreviewQueryOptions = isFrontendPreview
  ? { enabled: false as const, refetchInterval: false as const, retry: false as const }
  : {};

export function requireBackend() {
  if (isFrontendPreview) {
    throw new Error("Server features are unavailable in this frontend preview.");
  }
}
