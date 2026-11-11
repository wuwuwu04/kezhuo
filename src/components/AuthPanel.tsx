import { Logo } from "@/components/Logo";

export function AuthPanel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="auth">
      <section className="auth-card">
        <aside className="auth-side">
          <Logo className="logo logo-auth" />
          <p className="auth-brand">课桌集市</p>
          <p className="auth-copy">{note || "用手机号进入货架，和同校同学当面成交。"}</p>
          <ul className="auth-points">
            <li>同校当面看货</li>
            <li>校区可筛选</li>
            <li>不在这里付款</li>
          </ul>
        </aside>
        <div className="auth-main">
          <h1>{title}</h1>
          {children}
        </div>
      </section>
    </div>
  );
}
