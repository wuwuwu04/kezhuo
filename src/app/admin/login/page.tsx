"use client";

import { useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { Chrome } from "@/components/Chrome";
import { api } from "@/lib/client";

export default function AdminLoginPage() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Chrome title="后台登录">
      <AuthPanel title="后台登录" note="管理员入口。学生账号从这里进不了后台。">
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ account, password, portal: "admin" }),
              });
              location.href = "/admin";
            } catch (err) {
              setError(err instanceof Error ? err.message : "没有登录");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field"><span>账号</span><input value={account} onChange={(event) => setAccount(event.target.value)} /></label>
          <label className="field"><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error ? <p className="error">{error}</p> : null}
          <div className="row-actions">
            <button className="primary" disabled={busy} type="submit">登录</button>
            <a href="/forgot">忘记密码</a>
            <a href="/">回集市</a>
          </div>
        </form>
      </AuthPanel>
    </Chrome>
  );
}
