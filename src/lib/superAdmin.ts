import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET_KEY || "default_secret_key",
);
const ADMIN_COOKIE = "minnal_super_admin";

export function getAdminCredentials() {
  return {
    email: process.env.SUPER_ADMIN_EMAIL?.toLowerCase().trim(),
    pin: process.env.SUPER_ADMIN_PIN,
  };
}

export async function createAdminSession(email: string) {
  const token = await new SignJWT({
    subject: "super-admin",
    email,
    role: "super-admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(SECRET_KEY);

  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 8,
    path: "/",
  });
}

export async function verifyAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload.role === "super-admin" && typeof payload.email === "string"
      ? payload.email
      : null;
  } catch {
    return null;
  }
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "••••••";
  if (local.length <= 4) return `${local.slice(0, 1)}••@${domain}`;
  return `${local.slice(0, 2)}${"•".repeat(Math.max(2, local.length - 4))}${local.slice(-2)}@${domain}`;
}

export function maskPin(pin: string) {
  if (pin.length <= 2) return "••";
  return `${pin.slice(0, 1)}${"•".repeat(Math.max(2, pin.length - 2))}${pin.slice(-1)}`;
}

export function maskEndpoint(endpoint: string) {
  if (endpoint.length <= 28) return "••••••••";
  return `${endpoint.slice(0, 18)}••••${endpoint.slice(-8)}`;
}
