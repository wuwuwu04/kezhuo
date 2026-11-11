"use client";

import { useEffect, useState } from "react";

export type SessionUser = {
  id: number;
  role: string;
  studentNo: string;
  phone: string;
  account: string;
  nickname: string;
  campus: string;
  bio: string;
  status: string;
  warning: string;
};

export type GoodsCard = {
  id: number;
  title: string;
  category: string;
  campus: string;
  priceFen: number;
  status: string;
  rejectReason: string;
  warning: string;
  cover: string;
  favCount?: number;
  seller: { id: number; nickname: string };
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(path, { ...init, headers, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "没有完成");
  return data as T;
}

export async function uploadImages(files: File[]) {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));
  const res = await fetch("/api/upload", { method: "POST", body, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "图片没有传上去");
  return data.paths as string[];
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  useEffect(() => {
    api<{ user: SessionUser | null }>("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);
  return user;
}

export async function logout() {
  await api("/api/auth/logout", { method: "POST" });
  location.href = "/";
}
