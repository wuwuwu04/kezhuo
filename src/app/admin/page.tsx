"use client";

import { useEffect, useState } from "react";
import { Chrome } from "@/components/Chrome";
import { api, useSession, type GoodsCard } from "@/lib/client";
import { GOODS_STATUS, ORDER_STATUS, REPORT_STATUS, yuan } from "@/lib/labels";

type Report = {
  id: number;
  reason: string;
  detail: string;
  image: string;
  status: string;
  note: string;
  goodsId: number;
  goodsTitle: string;
  reporter: string;
};
type Person = {
  id: number;
  nickname: string;
  studentNo: string;
  phone: string;
  status: string;
  warning: string;
};
type AdminOrder = {
  id: number;
  no: string;
  priceFen: number;
  status: string;
  createdAt: string;
  goods: { id: number; title: string; cover: string };
  buyer: { id: number; nickname: string; phone: string; studentNo: string };
  seller: { id: number; nickname: string; phone: string; studentNo: string };
};
type Stats = { users: number; goods: number; orders: number };

const panels = [
  ["audit", "审核"],
  ["shelf", "在售"],
  ["orders", "订单"],
  ["reports", "举报"],
  ["users", "用户"],
  ["stats", "统计"],
] as const;

export default function AdminPage() {
  const session = useSession();
  const [panel, setPanel] = useState<(typeof panels)[number][0]>("audit");
  const [goods, setGoods] = useState<GoodsCard[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderStatus, setOrderStatus] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [q, setQ] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [preset, setPreset] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function fail(err: unknown) {
    setOk("");
    setError(err instanceof Error ? err.message : "没有完成");
  }

  function loadGoods(status: string) {
    api<{ goods: GoodsCard[] }>("/api/admin/goods?status=" + status)
      .then((data) => { setGoods(data.goods); setError(""); })
      .catch(fail);
  }
  function loadReports() {
    api<{ reports: Report[] }>("/api/admin/reports").then((data) => setReports(data.reports)).catch(fail);
  }
  function loadUsers(keyword = q) {
    api<{ users: Person[] }>("/api/admin/users?q=" + encodeURIComponent(keyword)).then((data) => setPeople(data.users)).catch(fail);
  }
  function loadOrders(next?: { status?: string; no?: string }) {
    const state = { status: orderStatus, no: orderNo, ...next };
    const params = new URLSearchParams();
    if (state.status) params.set("status", state.status);
    if (state.no) params.set("no", state.no);
    api<{ orders: AdminOrder[] }>("/api/admin/orders?" + params.toString())
      .then((data) => { setOrders(data.orders); setError(""); })
      .catch(fail);
  }
  function loadStats(nextPreset = preset, nextFrom = from, nextTo = to) {
    const params = new URLSearchParams();
    if (nextFrom || nextTo) {
      if (nextFrom) params.set("from", nextFrom);
      if (nextTo) params.set("to", nextTo);
    } else {
      params.set("preset", nextPreset);
    }
    setStats(null);
    api<Stats>("/api/admin/stats?" + params.toString())
      .then((data) => { setStats(data); setError(""); })
      .catch((err) => { setStats(null); fail(err); });
  }

  useEffect(() => {
    if (!session) return;
    if (session.role !== "admin") {
      location.href = "/admin/login";
    }
  }, [session]);

  useEffect(() => {
    if (session?.role !== "admin") return;
    setError("");
    setOk("");
    setPicked([]);
    if (panel === "audit") loadGoods("pending");
    if (panel === "shelf") loadGoods("on_sale");
    if (panel === "orders") {
      setOrderStatus("");
      setOrderNo("");
      loadOrders({ status: "", no: "" });
    }
    if (panel === "reports") loadReports();
    if (panel === "users") loadUsers("");
    if (panel === "stats") loadStats("all", "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, session]);

  if (session?.role !== "admin") return <Chrome title="后台"><p className="count">正在确认身份</p></Chrome>;

  return (
    <Chrome title="后台" current="admin">
      <h1>后台</h1>
      <div className="admin-grid">
        <div className="side">
          {panels.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={panel === id} onClick={() => setPanel(id)}>{label}</button>
          ))}
        </div>
        <div>
          {error ? <p className="error">{error}</p> : null}
          {ok ? <p className="ok">{ok}</p> : null}

          {(panel === "audit" || panel === "shelf") && (
            <>
              {panel === "audit" && picked.length > 0 && (
                <button
                  className="primary"
                  type="button"
                  onClick={async () => {
                    try {
                      const data = await api<{ count: number }>("/api/admin/goods/approve", {
                        method: "POST",
                        body: JSON.stringify({ ids: picked }),
                      });
                      setOk("已通过 " + data.count + " 件");
                      setPicked([]);
                      loadGoods("pending");
                    } catch (err) { fail(err); }
                  }}
                >
                  批量通过
                </button>
              )}
              <div className="list">
                {goods.length === 0 ? <p>这里空着。</p> : goods.map((item) => (
                  <article className="order" key={item.id}>
                    {panel === "audit" ? (
                      <input
                        type="checkbox"
                        aria-label={"选择" + item.title}
                        checked={picked.includes(item.id)}
                        onChange={(event) => setPicked(event.target.checked ? picked.concat(item.id) : picked.filter((id) => id !== item.id))}
                      />
                    ) : item.cover ? <img src={item.cover} alt="" /> : <span className="ph" />}
                    <div>
                      <a href={"/goods/" + item.id}><strong>{item.title}</strong></a>
                      <p className="meta">#{item.id}，{item.seller.nickname}，{yuan(item.priceFen)}，{GOODS_STATUS[item.status]}</p>
                    </div>
                    <span className="row-actions">
                      {panel === "audit" && (
                        <>
                          <button className="ghost" type="button" onClick={async () => {
                            try {
                              await api("/api/admin/goods/approve", { method: "POST", body: JSON.stringify({ ids: [item.id] }) });
                              setOk(item.title + " 已通过");
                              loadGoods("pending");
                            } catch (err) { fail(err); }
                          }}>通过</button>
                          <NoteButton label="驳回" required onSubmit={async (reason) => {
                            await api("/api/admin/goods/" + item.id + "/reject", { method: "POST", body: JSON.stringify({ reason }) });
                            setOk(item.title + " 已驳回");
                            loadGoods("pending");
                          }} onFail={fail} />
                        </>
                      )}
                      <NoteButton label="警告" required onSubmit={async (note) => {
                        await api("/api/admin/goods/" + item.id + "/warn", { method: "POST", body: JSON.stringify({ note }) });
                        setOk("已记下警告");
                      }} onFail={fail} />
                      <NoteButton label="下架" placeholder="下架说明" onSubmit={async (note) => {
                        await api("/api/admin/goods/" + item.id + "/takedown", { method: "POST", body: JSON.stringify({ note: note || "违规下架" }) });
                        setOk(item.title + " 已下架");
                        loadGoods(panel === "audit" ? "pending" : "on_sale");
                      }} onFail={fail} />
                    </span>
                  </article>
                ))}
              </div>
              {panel === "shelf" && <p className="meta">已下架的商品，卖家申诉通过后可以恢复。到商品页看状态，或在下面输入编号。</p>}
              <Restore onDone={(message) => { setOk(message); setError(""); }} onFail={fail} />
            </>
          )}

          {panel === "orders" && (
            <>
              <div className="filters">
                {[
                  ["", "全部"],
                  ["pending", "待交易"],
                  ["done", "已完成"],
                  ["cancelled", "已取消"],
                ].map(([value, label]) => (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={orderStatus === value}
                    onClick={() => {
                      setOrderStatus(value);
                      loadOrders({ status: value });
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <form
                className="searchline"
                onSubmit={(event) => {
                  event.preventDefault();
                  loadOrders();
                }}
              >
                <input
                  value={orderNo}
                  onChange={(event) => setOrderNo(event.target.value)}
                  placeholder="订单编号，例如 D001"
                  aria-label="订单编号"
                />
                <button className="primary" type="submit">查询</button>
              </form>
              <div className="list">
                {orders.length === 0 ? (
                  <p>没有订单。</p>
                ) : (
                  orders.map((order) => (
                    <article className="order" key={order.id}>
                      {order.goods.cover ? <img src={order.goods.cover} alt="" /> : <span className="ph" />}
                      <div>
                        <a href={"/goods/" + order.goods.id}>
                          <strong>{order.no} {order.goods.title}</strong>
                        </a>
                        <p className="meta">
                          {ORDER_STATUS[order.status] || order.status}，{yuan(order.priceFen)}
                          ，{new Date(order.createdAt).toLocaleString("zh-CN", { hour12: false })}
                        </p>
                        <p className="meta">
                          买家 {order.buyer.nickname}
                          {order.buyer.studentNo ? "（" + order.buyer.studentNo + "）" : ""}
                          {order.buyer.phone ? " " + order.buyer.phone : ""}
                          {" · "}
                          卖家 {order.seller.nickname}
                          {order.seller.studentNo ? "（" + order.seller.studentNo + "）" : ""}
                          {order.seller.phone ? " " + order.seller.phone : ""}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </>
          )}

          {panel === "reports" && (
            <div className="list">
              {reports.length === 0 ? <p>没有举报。</p> : reports.map((report) => (
                <article key={report.id} className="row" style={{ gridTemplateColumns: "1fr" }}>
                  <div>
                    <strong>{report.goodsTitle}</strong>
                    <p className="meta">{report.reporter}举报，{report.reason}。{report.detail} {REPORT_STATUS[report.status]}{report.note ? "。" + report.note : ""}</p>
                    {report.image ? <p><a href={report.image}>查看截图</a></p> : null}
                    {report.status === "open" || report.status === "hold" ? (
                      <div className="row-actions">
                        <NoteButton label="关闭" tone="primary" required onSubmit={async (note) => {
                          await api("/api/admin/reports/" + report.id + "/close", { method: "POST", body: JSON.stringify({ note }) });
                          loadReports();
                        }} onFail={fail} />
                        <NoteButton label="暂缓" placeholder="暂缓说明" onSubmit={async (note) => {
                          await api("/api/admin/reports/" + report.id + "/hold", { method: "POST", body: JSON.stringify({ note }) });
                          loadReports();
                        }} onFail={fail} />
                        <NoteButton label="驳回" required onSubmit={async (note) => {
                          await api("/api/admin/reports/" + report.id + "/dismiss", { method: "POST", body: JSON.stringify({ note }) });
                          loadReports();
                        }} onFail={fail} />
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}

          {panel === "users" && (
            <>
              <form className="searchline" onSubmit={(event) => { event.preventDefault(); loadUsers(); }}>
                <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="学号、手机号或昵称" aria-label="查找用户" />
                <button className="primary" type="submit">查询</button>
              </form>
              <div className="list">
                {people.length === 0 ? <p>没有这个人。</p> : people.map((person) => (
                  <article className="person" key={person.id}>
                    <div>
                      <strong>{person.nickname}</strong>
                      <p className="meta">{person.studentNo}，{person.phone}，{person.status === "banned" ? "已封禁" : "正常"}{person.warning ? "。警告：" + person.warning : ""}</p>
                    </div>
                    <span>
                      {person.status === "banned" ? (
                        <button className="ghost" type="button" onClick={async () => {
                          try { await api("/api/admin/users/" + person.id + "/unban", { method: "POST" }); loadUsers(); } catch (err) { fail(err); }
                        }}>解封</button>
                      ) : (
                        <button className="danger" type="button" onClick={async () => {
                          try { await api("/api/admin/users/" + person.id + "/ban", { method: "POST" }); loadUsers(); } catch (err) { fail(err); }
                        }}>封禁</button>
                      )}
                      <NoteButton label="警告" required onSubmit={async (note) => {
                        await api("/api/admin/users/" + person.id + "/warn", { method: "POST", body: JSON.stringify({ note }) });
                        loadUsers();
                      }} onFail={fail} />
                    </span>
                  </article>
                ))}
              </div>
            </>
          )}

          {panel === "stats" && (
            <>
              <div className="filters">
                {[
                  ["all", "全部"],
                  ["day", "今日"],
                  ["week", "近 7 天"],
                  ["month", "近 30 天"],
                ].map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={preset === value && !from && !to} onClick={() => { setPreset(value); setFrom(""); setTo(""); loadStats(value, "", ""); }}>{label}</button>
                ))}
              </div>
              <form className="filters" onSubmit={(event) => { event.preventDefault(); loadStats(preset, from, to); }}>
                <input className="narrow" style={{ width: 150 }} type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="开始日期" />
                <input className="narrow" style={{ width: 150 }} type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="结束日期" />
                <button className="ghost" type="submit">按日期看</button>
                <a href={"/api/admin/export?preset=" + preset}>导出</a>
              </form>
              {stats ? (
                <div className="stats">
                  <div><b>{stats.users}</b><span>用户</span></div>
                  <div><b>{stats.goods}</b><span>商品</span></div>
                  <div><b>{stats.orders}</b><span>订单</span></div>
                </div>
              ) : !error ? <p className="count">正在加载</p> : null}
            </>
          )}
        </div>
      </div>
    </Chrome>
  );
}

function NoteButton({
  label,
  required,
  placeholder,
  tone,
  onSubmit,
  onFail,
}: {
  label: string;
  required?: boolean;
  placeholder?: string;
  tone?: "primary";
  onSubmit: (note: string) => Promise<void>;
  onFail: (err: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  if (!open) {
    return (
      <button className={tone === "primary" ? "primary" : label === "驳回" || label === "下架" ? "danger" : "ghost"} type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="row-actions">
      <input className="narrow" style={{ width: 180 }} value={note} placeholder={placeholder || (required ? "请填写" : "可以不填")} onChange={(event) => setNote(event.target.value)} />
      <button
        className="primary"
        type="button"
        onClick={async () => {
          if (required && !note.trim()) return;
          try {
            await onSubmit(note.trim());
            setOpen(false);
            setNote("");
          } catch (err) {
            onFail(err);
          }
        }}
      >
        确定
      </button>
      <button className="ghost" type="button" onClick={() => setOpen(false)}>取消</button>
    </span>
  );
}

function Restore({ onDone, onFail }: { onDone: (message: string) => void; onFail: (err: unknown) => void }) {
  const [id, setId] = useState("");
  return (
    <form
      className="searchline"
      style={{ marginTop: 16 }}
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await api("/api/admin/goods/" + Number(id) + "/restore", { method: "POST" });
          onDone("已恢复到货架");
          setId("");
        } catch (err) { onFail(err); }
      }}
    >
      <input value={id} onChange={(event) => setId(event.target.value)} placeholder="要恢复的商品编号" aria-label="商品编号" />
      <button className="ghost" type="submit">恢复展示</button>
    </form>
  );
}
