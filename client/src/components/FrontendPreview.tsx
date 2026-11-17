pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import { isFrontendPreview } from "@/lib/frontendPreview";

export function FrontendPreviewBanner() {
  if (!isFrontendPreview) return null;
  return (
    <aside role="status" data-testid="frontend-preview-banner" className="shrink-0 border-b border-amber-300 bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">
      <strong>Frontend preview — server features unavailable</strong>
      <p className="mt-1 text-xs">Browse the interface. Live data, registration, submissions, and chat are unavailable.</p>
    </aside>
  );
}

export function PreviewUnavailable({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section data-testid="preview-unavailable" className="m-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Unavailable in this frontend preview. This feature requires the application server.</p>
      {children}
    </section>
  );
}
