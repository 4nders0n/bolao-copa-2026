import { randomBytes } from "crypto";

/**
 * Generate a CUID-like random ID.
 */
export function randomId(): string {
  return randomBytes(12).toString("hex");
}
