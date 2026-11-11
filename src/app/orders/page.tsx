"use client";

import { useEffect, useState } from "react";
import { Chrome } from "@/components/Chrome";
import { api, useSession } from "@/lib/client";
import { ORDER_STATUS, yuan } from "@/lib/labels";

type Order = {
  id: number;
  no: string;
  priceFen: number;
  status: string;
  side: "buy" | "sell";
  goods: { id: number; title: string; cover: string };
  buyer: { nickname: string };
  seller: { nickname: string };
};

export default function OrdersPage() {
  const user = useSession();
  const [side, setSide] = useState("");
  const [status, setStatus] = useState("");
  const [no, setNo] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");

  function load(next?: { side?: string; status?: string; no?: string }) {
    const state = { side, status, no, ...next };
    const params = new URLSearchParams();
    if (state.side) params.set("side", state.side);
    if (state.status) params.set("status", state.status);
    if (state.no) params.set("no", state.no);
    api<{ orders: Order[] }>("/api/orders?" + params.toString())
      .then((data) => {
        setOrders(data.orders);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    if (user?.role === "student") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (user === null) return <Chrome title="订单"><p>先<a href="/login?next=/orders">登录</a>。</p></Chrome>;

  async function act(id: number, action: "cancel" | "finish") {
    setError("");
    try {
      await api("/api/orders/" + id + "/" + action, { method: "POST" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "没有完成");
    }
  }

  return (
    <Chrome title="订单" current="orders">
      <h1>订单</h1>
      <div className="filters">
        {[
          ["", "全部"],
          ["buy", "买入"],
          ["sell", "卖出"],
        ].map(([value, label]) => (
          <button key={label} type="button" aria-pressed={side === value} onClick={() => { setSide(value); load({ side: value }); }}>{label}</button>
        ))}
        {[
          ["pending", "待交易"],
          ["done", "已完成"],
          ["cancelled", "已取消"],
        ].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={status === value} onClick={() => { const next = status === value ? "" : value; setStatus(next); load({ status: next }); }}>{label}</button>
        ))}
      </div>
      <form
        className="searchline"
        onSubmit={(event) => {
          event.preventDefault();
          load();
        }}
      >
        <input value={no} onChange={(event) => setNo(event.target.value)} placeholder="订单编号，例如 D001" aria-label="订单编号" />
        <button className="primary" type="submit">查询</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <div className="list">
        {orders.length === 0 ? <p className="count">没有订单。</p> : orders.map((order) => (
          <article className="order" key={order.id}>
            {order.goods.cover ? <img src={order.goods.cover} alt="" /> : <span className="ph" />}
            <div>
              <strong>{order.no} {order.goods.title}</strong>
              <p className="meta">
                {order.side === "buy" ? "买自 " + order.seller.nickname : "卖给 " + order.buyer.nickname}
                ，{ORDER_STATUS[order.status]}，{yuan(order.priceFen)}
              </p>
            </div>
            {order.status === "pending" ? (
              <span>
                <button className="ghost" type="button" onClick={() => act(order.id, "finish")}>确认完成</button>
                <button className="danger" type="button" onClick={() => act(order.id, "cancel")}>取消订单</button>
              </span>
            ) : <span />}
          </article>
        ))}
      </div>
    </Chrome>
  );
}
