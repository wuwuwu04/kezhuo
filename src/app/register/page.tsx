"use client";

import { useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { Chrome } from "@/components/Chrome";
import { api } from "@/lib/client";

const empty = { studentNo: "", phone: "", password: "", confirm: "" };

export default function RegisterPage() {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof empty, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Chrome title="注册">
      <AuthPanel title="注册" note="登记学号和手机号，之后用手机号登录。">
        <p className="lede">密码 6 到 16 位，要同时有字母和数字。</p>
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
              location.href = "/";
            } catch (err) {
              setError(err instanceof Error ? err.message : "没有注册成功");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field"><span>学号</span><input value={form.studentNo} onChange={(event) => set("studentNo", event.target.value)} /></label>
          <label className="field"><span>手机号</span><input value={form.phone} onChange={(event) => set("phone", event.target.value)} /></label>
          <label className="field"><span>密码</span><input type="password" value={form.password} onChange={(event) => set("password", event.target.value)} /></label>
          <label className="field"><span>确认密码</span><input type="password" value={form.confirm} onChange={(event) => set("confirm", event.target.value)} /></label>
          {error ? <p className="error">{error}</p> : null}
          <div className="row-actions">
            <button className="primary" disabled={busy} type="submit">完成</button>
            <button className="ghost" type="button" onClick={() => { setForm(empty); setError(""); }}>清空</button>
            <a href="/login">去登录</a>
          </div>
        </form>
      </AuthPanel>
    </Chrome>
  );
}
