/** Shared state shape for the auth server actions + their client forms. */
export type AuthFormState = { error?: string };

/** State for the forgot/reset password actions (carries a success message). */
export type ResetFormState = { error?: string; success?: string };
