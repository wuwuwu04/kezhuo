import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "kezhuo-dev-secret");
}

export async function signUser(userId: number) {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());
}

export async function currentUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const id = Number(payload.uid);
    if (!id) return null;
    return db.user.findUnique({ where: { id } });
  } catch {
    return null;
  }
}

export function setSession(token: string) {
  cookies().set("token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSession() {
  cookies().set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
