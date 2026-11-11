"use client";

import { useEffect } from "react";
import { logout, useSession } from "@/lib/client";
import { Logo } from "@/components/Logo";

export function Chrome({
  title,
  current,
  children,
}: {
  title?: string;
  current?: string;
  children: React.ReactNode;
}) {
  const user = useSession();
  useEffect(() => {
    document.title = title ? title + " · 课桌集市" : "课桌集市";
  }, [title]);

  return (
    <>
      <header className="mast">
        <div className="mast-inner">
          <a className="brand-link" href="/">
            <Logo />
            <span className="brand-block">
              <span className="brand">课桌集市</span>
              <span className="brand-note">同校闲置，当面成交</span>
            </span>
          </a>
          <nav className="nav">
            <a href="/" aria-current={current === "home" ? "page" : undefined}>逛一逛</a>
            {user?.role === "student" && (
              <a href="/sell" aria-current={current === "sell" ? "page" : undefined}>发布</a>
            )}
            {user?.role === "student" && (
              <a href="/orders" aria-current={current === "orders" ? "page" : undefined}>订单</a>
            )}
            {user?.role === "student" && (
              <a href="/me" aria-current={current === "me" ? "page" : undefined}>我的</a>
            )}
            {user?.role === "admin" && (
              <a href="/admin" aria-current={current === "admin" ? "page" : undefined}>后台</a>
            )}
            {user ? (
              <>
                <span className="nav-user">{user.nickname || "同学"}</span>
                <button type="button" onClick={() => logout()}>退出</button>
              </>
            ) : user === null ? (
              <a className="nav-login" href="/login">登录</a>
            ) : null}
          </nav>
        </div>
      </header>
      <div className="wrap">{children}</div>
      <footer className="foot">
        <div className="foot-inner">
          <Logo className="logo logo-sm" />
          <div>
            <p className="foot-brand">课桌集市</p>
            <p className="foot-note">教材、台灯、球拍，留给下一届。</p>
          </div>
        </div>
      </footer>
    </>
  );
}
