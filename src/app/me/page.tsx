"use client";

import { useEffect, useState } from "react";
import { Chrome } from "@/components/Chrome";
import { GoodsRow } from "@/components/GoodsRow";
import { api, useSession, type GoodsCard, type SessionUser } from "@/lib/client";
import { CAMPUSES } from "@/lib/labels";

type Fav = { id: number; goods: GoodsCard };
type Msg = { id: number; content: string; goodsId: number; goodsTitle: string };

export default function MePage() {
  const session = useSession();
  const [tab, setTab] = useState<"profile" | "goods" | "fav" | "msg">("profile");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [nickname, setNickname] = useState("");
  const [campus, setCampus] = useState("");
  const [bio, setBio] = useState("");
  const [goods, setGoods] = useState<GoodsCard[]>([]);
  const [favs, setFavs] = useState<Fav[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function loadGoods() {
    api<{ goods: GoodsCard[] }>("/api/mine/goods").then((data) => setGoods(data.goods)).catch((err: Error) => setError(err.message));
  }
  function loadFavs() {
    api<{ favorites: Fav[] }>("/api/favorites").then((data) => setFavs(data.favorites)).catch((err: Error) => setError(err.message));
  }
  function loadMsgs() {
    api<{ messages: Msg[] }>("/api/messages").then((data) => setMsgs(data.messages)).catch((err: Error) => setError(err.message));
  }

  useEffect(() => {
    if (!session) return;
    if (session.role !== "student") {
      location.href = "/admin";
      return;
    }
    setUser(session);
    setNickname(session.nickname);
    setCampus(session.campus);
    setBio(session.bio);
    loadGoods();
    loadFavs();
    loadMsgs();
  }, [session]);

  if (session === undefined) return <Chrome title="我的"><p className="count">正在加载</p></Chrome>;
  if (session === null) return <Chrome title="我的"><p>先<a href="/login?next=/me">登录</a>。</p></Chrome>;

  return (
    <Chrome title="我的" current="me">
      <h1>{user?.nickname || "我的"}</h1>
      {user?.warning ? <p className="note">管理员提示：{user.warning}</p> : null}
      <div className="tabs">
        <button type="button" aria-pressed={tab === "profile"} onClick={() => setTab("profile")}>资料</button>
        <button type="button" aria-pressed={tab === "goods"} onClick={() => setTab("goods")}>我的商品</button>
        <button type="button" aria-pressed={tab === "fav"} onClick={() => setTab("fav")}>收藏</button>
        <button type="button" aria-pressed={tab === "msg"} onClick={() => setTab("msg")}>留言</button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {ok ? <p className="ok">{ok}</p> : null}

      {tab === "profile" && (
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setOk("");
            try {
              const data = await api<{ user: SessionUser }>("/api/me", {
                method: "PATCH",
                body: JSON.stringify({ nickname, campus, bio }),
              });
              setUser(data.user);
              setOk("已保存");
            } catch (err) {
              setError(err instanceof Error ? err.message : "没有保存");
            }
          }}
        >
          <label className="field"><span>昵称</span><input value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
          <label className="field">
            <span>校区</span>
            <select value={campus} onChange={(event) => setCampus(event.target.value)}>
              <option value="">选择校区</option>
              {CAMPUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="field"><span>简介</span><textarea value={bio} onChange={(event) => setBio(event.target.value)} /></label>
          <div className="row-actions">
            <button className="primary" type="submit">保存</button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setNickname(user?.nickname || "");
                setCampus(user?.campus || "");
                setBio(user?.bio || "");
                setOk("");
                setError("");
              }}
            >
              取消
            </button>
          </div>
        </form>
      )}

      {tab === "goods" && (
        <div className="list">
          {goods.length === 0 ? <p>还没有发布。<a href="/sell">去发布一件</a></p> : goods.map((item) => (
            <GoodsRow key={item.id} goods={item} href={"/sell?id=" + item.id} />
          ))}
        </div>
      )}

      {tab === "fav" && (
        <>
          <div className="list">
            {favs.length === 0 ? <p>还没有收藏。去货架上看看。</p> : favs.map((item) => (
              <div className="person" key={item.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={picked.includes(item.id)}
                    onChange={(event) => {
                      setPicked(event.target.checked ? picked.concat(item.id) : picked.filter((id) => id !== item.id));
                    }}
                  />
                  <a href={"/goods/" + item.goods.id}>{item.goods.title}</a>
                </label>
                <button
                  className="danger"
                  type="button"
                  onClick={async () => {
                    await api("/api/favorites", { method: "DELETE", body: JSON.stringify({ ids: [item.id] }) });
                    loadFavs();
                  }}
                >
                  取消
                </button>
              </div>
            ))}
          </div>
          {picked.length > 0 && (
            <button
              className="danger"
              type="button"
              onClick={async () => {
                await api("/api/favorites", { method: "DELETE", body: JSON.stringify({ ids: picked }) });
                setPicked([]);
                loadFavs();
              }}
            >
              取消所选
            </button>
          )}
        </>
      )}

      {tab === "msg" && (
        <div className="list">
          {msgs.length === 0 ? <p>还没有留言。</p> : msgs.map((msg) => (
            <div className="row" key={msg.id} style={{ gridTemplateColumns: "1fr auto" }}>
              <a href={"/goods/" + msg.goodsId}>
                <strong>{msg.goodsTitle}</strong>
                <p className="meta">{msg.content}</p>
              </a>
              <button
                className="danger"
                type="button"
                onClick={async () => {
                  await api("/api/messages/" + msg.id, { method: "DELETE" });
                  loadMsgs();
                }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </Chrome>
  );
}
