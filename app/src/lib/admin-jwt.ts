/**
 * admin-jwt.ts — Firma y verificación de JWT para sesiones de admin.
 *
 * La clave de firma se deriva del ADMIN_SECRET usando un prefijo para
 * separar el dominio: mismo secreto, diferente uso.
 * Compatible con el Edge Runtime de Next.js (usa jose, no jsonwebtoken).
 */

import { SignJWT, jwtVerify } from "jose";

const ISSUER = "revisor-arq-admin";
const AUDIENCE = "admin-panel";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

function getSigningKey(adminSecret: string): Uint8Array {
  return new TextEncoder().encode(`jwt:${adminSecret}`);
}

/**
 * Genera un JWT firmado válido por 8 horas.
 * Llamar solo desde el route handler POST /api/admin/login.
 */
export async function signAdminJwt(adminSecret: string): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSigningKey(adminSecret));
}

/**
 * Verifica un JWT de sesión de admin.
 * Retorna true si el token es válido, false si expiró o fue manipulado.
 */
export async function verifyAdminJwt(
  token: string,
  adminSecret: string
): Promise<boolean> {
  try {
    await jwtVerify(token, getSigningKey(adminSecret), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return true;
  } catch {
    return false;
  }
}

export { MAX_AGE_SECONDS };
