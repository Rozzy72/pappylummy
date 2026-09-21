"use client";

import { useActionState, useRef } from "react";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { resetPassword } from "@/app/reset-password/actions";
import type { AuthState } from "@/lib/auth/validation";

const initialState: AuthState = { status: "idle", message: "" };

export function PasswordRecoveryForm({ mode }: { mode: "request" | "reset" }) {
  const passwordRef = useRef<HTMLInputElement>(null);
  const reset = mode === "reset";
  const [state, action, pending] = useActionState(async (previous: AuthState, form: FormData) => {
    try { return await (reset ? resetPassword : requestPasswordReset)(previous, form); }
    finally { if (passwordRef.current) passwordRef.current.value = ""; }
  }, initialState);
  const inputStyle = "mt-2 block min-h-11 w-full rounded-md border border-neutral-300 px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <form action={action} aria-busy={pending} className="mt-6 space-y-5">
      {reset ? <div>
        <label htmlFor="new-password" className="font-medium">New password</label>
        <input ref={passwordRef} id="new-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="password-help" className={inputStyle} />
        <p id="password-help" className="mt-2 text-sm text-neutral-600">Use 12–128 characters. Additional password security requirements may apply.</p>
      </div> : <div>
        <label htmlFor="recovery-email" className="font-medium">Email address</label>
        <input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={254} className={inputStyle} />
      </div>}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={!reset && state.status === "success"
          ? "rounded-md border border-neutral-300 border-l-4 border-l-neutral-950 bg-neutral-100 p-4 font-medium leading-relaxed text-neutral-950"
          : undefined}
      >
        {state.message}
      </p>
      <button type="submit" disabled={pending} className="min-h-11 rounded-md bg-neutral-950 px-4 py-3 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60">
        {pending ? "Please wait…" : reset ? "Save new password" : "Send reset instructions"}
      </button>
    </form>
  );
}
