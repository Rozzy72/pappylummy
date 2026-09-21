"use client";

import { useActionState, useRef } from "react";
import { signIn, signUp } from "@/app/login/actions";
import type { AuthState } from "@/lib/auth/validation";

const initialState: AuthState = { status: "idle", message: "" };
const inputStyle = "mt-2 block min-h-11 w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const signup = mode === "signup";
  const passwordRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(async (previous: AuthState, form: FormData) => {
    try { return await (signup ? signUp : signIn)(previous, form); }
    finally { if (passwordRef.current) passwordRef.current.value = ""; }
  }, initialState);
  const title = signup ? "Create account" : "Sign in";
  return (
    <section aria-labelledby={`${mode}-heading`} className="rounded-xl border border-neutral-200 p-6 sm:p-8">
      <h2 id={`${mode}-heading`} className="text-xl font-semibold">{title}</h2>
      <form action={action} aria-busy={pending} className="mt-6 space-y-5">
        <div>
          <label htmlFor={`${mode}-email`} className="text-sm font-medium">Email address</label>
          <input id={`${mode}-email`} name="email" type="email" autoComplete="email" required maxLength={254} className={inputStyle} />
        </div>
        <div>
          <label htmlFor={`${mode}-password`} className="text-sm font-medium">Password</label>
          <input ref={passwordRef} id={`${mode}-password`} name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 12 : 1} maxLength={128} aria-describedby={signup ? `${mode}-help` : undefined} className={inputStyle} />
          {signup && <p id={`${mode}-help`} className="mt-2 text-sm text-neutral-600">Use 12–128 characters. Additional password security requirements may apply.</p>}
        </div>
        <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-neutral-700">{state.message}</p>
        <button type="submit" disabled={pending} className="min-h-11 w-full rounded-md bg-neutral-950 px-4 py-3 font-medium text-white hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:cursor-wait disabled:opacity-60">
          {pending ? "Please wait…" : title}
        </button>
      </form>
    </section>
  );
}
