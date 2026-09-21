export type AuthState = { status: "idle" | "error" | "success"; message: string };

export function readCredentials(form: FormData, signup: boolean) {
  const emailValue = form.get("email");
  const password = form.get("password");
  if (typeof emailValue !== "string" || typeof password !== "string" ||
      form.getAll("email").length !== 1 || form.getAll("password").length !== 1 ||
      emailValue.length > 254 || password.length > 128) return null;
  const email = emailValue.trim().toLowerCase();
  // Input bounds only; Supabase's configured password rules remain authoritative.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < (signup ? 12 : 1)) return null;
  return { email, password }; // Password is never trimmed or returned to the UI.
}

export function readConfirmation(params: URLSearchParams) {
  const token = params.get("token_hash");
  if (params.getAll("token_hash").length !== 1 || params.getAll("type").length !== 1 ||
      params.get("type") !== "email" || !token || !/^(?:pkce_)?[a-f0-9]{56}$/.test(token)) return null;
  return { token_hash: token, type: "email" as const };
}
