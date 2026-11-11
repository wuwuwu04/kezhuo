"use client";

import { useEffect, useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { Chrome } from "@/components/Chrome";
import { api } from "@/lib/client";

export default function LoginPage() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState("/");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const back = params.get("next") || "/";
    setNext(back.startsWith("/") ? back : "/");
    const saved = localStorage.getItem("phone");
    if (saved) {
      setAccount(saved);
      setRemember(true);
    }
  }, []);

  return (
    <Chrome title="登录">
      <AuthPanel title="登录" note="用手机号进入货架，和同校同学当面成交。">
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const data = await api<{ user: { role: string } }>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ account, password, portal: "student" }),
              });
              if (remember) localStorage.setItem("phone", account);
              else localStorage.removeItem("phone");
              location.href = data.user.role === "admin" ? "/admin" : next;
            } catch (err) {
              setError(err instanceof Error ? err.message : "没有登录");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>手机号</span>
            <input value={account} onChange={(event) => setAccount(event.target.value)} autoComplete="username" />
          </label>
          <label className="field">
            <span>密码</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </label>
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            记住手机号
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="row-actions">
            <button className="primary" disabled={busy} type="submit">登录</button>
            <a href="/register">注册</a>
            <a href="/forgot">忘记密码</a>
          </div>
        </form>
      </AuthPanel>
    </Chrome>
  );
}
