/**
 * Authentication and Session Constants for LOOMERA
 * Safe for both Edge Middleware and Node.js Runtimes
 */

export const SESSION_COOKIE_NAME = "loomera_session";
export const ANONYMOUS_COOKIE_NAME = "loomera_anon_id";
export const SESSION_TTL_DAYS = 30;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
