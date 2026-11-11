"use client";

import { useState } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { Chrome } from "@/components/Chrome";
import { api } from "@/lib/client";

export default function ForgotPage() {
  const [portal, setPortal] = useState<"student" | "admin">("student");
  const [phone, setPhone] = useState("");
  const [studentNo, setStudentNo] = useState("");
  const [account, setAccount] = useState("");
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Chrome title="找回密码">
      <AuthPanel title="找回密码" note="核对学生信息或管理员口令后，重设密码。">
        <div className="tabs">
          <button type="button" aria-pressed={portal === "student"} onClick={() => setPortal("student")}>学生</button>
          <button type="button" aria-pressed={portal === "admin"} onClick={() => setPortal("admin")}>管理员</button>
        </div>
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            setOk("");
            try {
              const data = await api<{ message: string }>("/api/auth/forgot", {
                method: "POST",
                body: JSON.stringify(portal === "admin"
                  ? { portal, account, phrase, password, confirm }
                  : { portal, phone, studentNo, password, confirm }),
              });
              setOk(data.message);
            } catch (err) {
              setError(err instanceof Error ? err.message : "没有改成");
            } finally {
              setBusy(false);
            }
          }}
        >
          {portal === "student" ? (
            <>
              <label className="field"><span>手机号</span><input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
              <label className="field"><span>学号</span><input value={studentNo} onChange={(event) => setStudentNo(event.target.value)} /></label>
            </>
          ) : (
            <>
              <label className="field"><span>管理员账号</span><input value={account} onChange={(event) => setAccount(event.target.value)} /></label>
              <label className="field"><span>找回口令</span><input value={phrase} onChange={(event) => setPhrase(event.target.value)} /></label>
            </>
          )}
          <label className="field"><span>新密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label className="field"><span>确认新密码</span><input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></label>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="ok">{ok}</p> : null}
          <div className="row-actions">
            <button className="primary" disabled={busy} type="submit">更新密码</button>
            <a href={portal === "admin" ? "/admin/login" : "/login"}>去登录</a>
          </div>
        </form>
      </AuthPanel>
    </Chrome>
  );
}
