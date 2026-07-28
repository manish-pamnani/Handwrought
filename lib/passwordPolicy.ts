export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT =
  "At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.";

const SYMBOL_PATTERN = /[^a-zA-Z0-9]/;

/** Returns a friendly error message if the password is too weak, or null if it's acceptable. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!SYMBOL_PATTERN.test(password)) {
    return "Password must include at least one symbol.";
  }
  return null;
}
