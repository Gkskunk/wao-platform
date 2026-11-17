pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isFrontendPreview } from "@/lib/frontendPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WorkspaceAccount() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false), [register, setRegister] = useState(false), [error, setError] = useState("");
  const { data } = useQuery<{ user: { username: string } | null }>({ queryKey: ["/api/workspace/me"], enabled: !isFrontendPreview });
  if (isFrontendPreview) return null;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { await apiRequest("POST", `/api/workspace/auth/${register ? "register" : "login"}`, values); await queryClient.invalidateQueries(); setOpen(false); }
    catch (error) { setError(error instanceof Error ? error.message : "Sign in failed"); }
  }
  return <section className="mb-3 pb-3 border-b border-sidebar-border text-xs">
    {data?.user ? <><p className="font-semibold mb-2">Signed in: {data.user.username}</p><a href="/workspace" className="text-primary hover:underline">Open Workflow Studio →</a><button className="block mt-2 text-muted-foreground underline" onClick={async () => { await apiRequest("POST", "/api/workspace/auth/logout", {}); await queryClient.invalidateQueries(); }}>Sign out</button></> : <><Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(!open)}>Sign in / create account</Button>{open && <form onSubmit={submit} className="space-y-2 mt-3"><label className="block">Username<Input name="username" aria-label="Username" required minLength={3} maxLength={40} autoComplete="username" className="mt-1 text-xs" /></label><label className="block">Password<Input name="password" type="password" aria-label="Password" required minLength={10} maxLength={128} autoComplete={register ? "new-password" : "current-password"} className="mt-1 text-xs" /></label><Button type="submit" size="sm" className="w-full">{register ? "Create local account" : "Sign in"}</Button><button type="button" className="text-primary underline" onClick={() => setRegister(!register)}>{register ? "Use existing account" : "Create a new account"}</button>{error && <p role="alert" className="text-red-400 break-words">{error}</p>}</form>}</>}
  </section>;
}
