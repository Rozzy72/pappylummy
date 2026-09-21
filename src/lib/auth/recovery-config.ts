import "server-only";

/** Operator configuration only. Never derive email destinations from Host/input. */
export function recoveryRedirectUrl() {
  const configured = process.env.APP_ORIGIN || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");
  const origin = new URL(configured);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/" ||
      (origin.protocol !== "https:" && !(process.env.NODE_ENV === "development" && local && origin.protocol === "http:"))) {
    throw new Error("Invalid application origin configuration.");
  }
  return `${origin.origin}/auth/recovery`;
}
