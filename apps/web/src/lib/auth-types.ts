/** Shared state shape for the auth server actions + their client forms. */
export type AuthFormState = { error?: string };

/**
 * State for the forgot/reset password actions. `step` drives which half of the
 * forgot form is on screen, `email` carries the address across the two steps so
 * the candidate does not retype it, and `cooldownSec` is how long the resend
 * button stays disabled.
 */
export type ResetFormState = {
  error?: string;
  success?: string;
  step?: "email" | "code";
  email?: string;
  cooldownSec?: number;
};
