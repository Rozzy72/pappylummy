export type AuthState = { status: "idle" | "error" | "success"; message: string };

export function readEmail(form: FormData) {
  const value = form.get("email");
  if (form.getAll("email").length !== 1 || typeof value !== "string" || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function readPassword(form: FormData, minimum = 12) {
  const password = form.get("password");
  if (form.getAll("password").length !== 1 || typeof password !== "string" || password.length < minimum || password.length > 128) return null;
  return password; // Never trim or echo passwords.
}

export function readCredentials(form: FormData, signup: boolean) {
  const email = readEmail(form);
  const password = readPassword(form, signup ? 12 : 1);
  return email && password ? { email, password } : null;
}

export function readRecoveryCode(params: URLSearchParams) {
  const code = params.get("code");
  if (params.getAll("code").length !== 1 || [...params.keys()].some(key => key !== "code") ||
      !code || code.length > 2048 || !/^[\x21-\x7e]+$/.test(code)) return null;
  return code; // Opaque SDK code, passed unchanged; not a token hash.
}

export function readConfirmation(params: URLSearchParams) {
  const token = params.get("token_hash");
  if (params.getAll("token_hash").length !== 1 || params.getAll("type").length !== 1 ||
      params.get("type") !== "email" || !token || !/^(?:pkce_)?[a-f0-9]{56}$/.test(token)) return null;
  return { token_hash: token, type: "email" as const };
}
