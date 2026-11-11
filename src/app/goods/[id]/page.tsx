"use client";

import { useEffect, useState } from "react";
import { Chrome } from "@/components/Chrome";
import { api, uploadImages, useSession } from "@/lib/client";
import { GOODS_STATUS, REPORT_REASONS, yuan } from "@/lib/labels";

type Detail = {
  goods: {
    id: number;
    title: string;
    category: string;
    campus: string;
    description: string;
    priceFen: number;
    status: string;
    warning: string;
    favCount?: number;
    images: string[];
    favorited: boolean;
    mine: boolean;
    seller: { id: number; nickname: string; campus: string; phone: string };
  };
  messages: { id: number; content: string; mine: boolean; user: string; createdAt: string }[];
};

export default function GoodsPage({ params }: { params: { id: string } }) {
  const user = useSession();
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [content, setContent] = useState("");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [shot, setShot] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api<Detail>("/api/goods/" + params.id)
      .then((next) => {
        setData(next);
        setPhoto(next.goods.images[0] || "");
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }

  useEffect(() => { load(); }, [params.id]);

  function goLogin() {
    location.href = "/login?next=" + encodeURIComponent("/goods/" + params.id);
  }

  if (error) {
    return <Chrome title="商品"><p className="error">{error}</p></Chrome>;
  }
  if (!data) return <Chrome title="商品"><p className="count">正在加载</p></Chrome>;

  const goods = data.goods;
  const canBuy = goods.status === "on_sale" && !goods.mine;

  return (
    <Chrome title={goods.title}>
      <div className="split">
        <div>
          <div className="stage">
            {photo ? <img className="photo" src={photo} alt={goods.title} /> : <div className="photo" />}
          </div>
          {goods.images.length > 1 && (
            <div className="thumbs">
              {goods.images.map((src) => (
                <button type="button" key={src} aria-pressed={photo === src} onClick={() => setPhoto(src)}>
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="sheet">
          <p className="sheet-price">{yuan(goods.priceFen)}</p>
          <h1>{goods.title}</h1>
          <dl className="facts">
            <dt>分类</dt>
            <dd>{goods.category || "未填"}</dd>
            <dt>校区</dt>
            <dd>{goods.campus || "未填"}</dd>
            <dt>收藏</dt>
            <dd>{(goods.favCount || 0) + " 人"}</dd>
            <dt>卖家</dt>
            <dd>
              <a href={"/seller/" + goods.seller.id}>{goods.seller.nickname}</a>
              {goods.seller.phone ? "，" + goods.seller.phone : user ? "" : "，登录后看联系方式"}
            </dd>
            {goods.status !== "on_sale" ? (
              <>
                <dt>状态</dt>
                <dd>{GOODS_STATUS[goods.status] || goods.status}</dd>
              </>
            ) : null}
          </dl>
          <p>{goods.description}</p>
          {goods.warning ? <p className="note">管理员提示：{goods.warning}</p> : null}
          <div className="row-actions">
            {goods.status === "on_sale" && (
              <button
                className="ghost"
                type="button"
                onClick={async () => {
                  if (!user) return goLogin();
                  setBusy(true);
                  setNotice("");
                  try {
                    if (goods.favorited) {
                      await api("/api/favorites", { method: "DELETE", body: JSON.stringify({ goodsId: goods.id }) });
                    } else {
                      await api("/api/favorites", { method: "POST", body: JSON.stringify({ goodsId: goods.id }) });
                    }
                    load();
                  } catch (err) {
                    setNotice(err instanceof Error ? err.message : "没有完成");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {goods.favorited ? "取消收藏" : "收藏"}
              </button>
            )}
            {canBuy && !confirming && (
              <button className="primary" type="button" onClick={() => (user ? setConfirming(true) : goLogin())}>
                提交订单
              </button>
            )}
            {goods.mine && <a className="ghost" href={"/sell?id=" + goods.id}>编辑</a>}
          </div>
          {confirming && (
            <div className="box">
              <p>向{goods.seller.nickname}表达购买意向。见面交易，不用在这里付款。提交后这件东西先留给你。</p>
              <div className="row-actions">
                <button
                  className="primary"
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setNotice("");
                    try {
                      const result = await api<{ order: { no: string } }>("/api/orders", {
                        method: "POST",
                        body: JSON.stringify({ goodsId: goods.id }),
                      });
                      setNotice("已提交，订单 " + result.order.no);
                      setConfirming(false);
                      load();
                    } catch (err) {
                      setNotice(err instanceof Error ? err.message : "没有提交");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  确认提交
                </button>
                <button className="ghost" type="button" onClick={() => setConfirming(false)}>取消</button>
              </div>
            </div>
          )}
          {notice ? <p className={notice.startsWith("已提交") ? "ok" : "error"}>{notice}</p> : null}
          {notice.startsWith("已提交") ? <p><a href="/orders">去看订单</a></p> : null}
        </div>
      </div>

      <section className="panel">
        <h2>留言</h2>
        <div className="list">
          {data.messages.length === 0 ? <p className="meta">还没有留言。问一句见面地点就行。</p> : data.messages.map((msg) => (
            <div className="msg" key={msg.id}>
              <div>
                <strong>{msg.user}</strong>
                <p className="meta">{msg.content}</p>
              </div>
              {msg.mine ? (
                <button
                  className="danger"
                  type="button"
                  onClick={async () => {
                    await api("/api/messages/" + msg.id, { method: "DELETE" });
                    load();
                  }}
                >
                  删除
                </button>
              ) : null}
            </div>
          ))}
        </div>
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!user) return goLogin();
            setBusy(true);
            try {
              await api("/api/messages", { method: "POST", body: JSON.stringify({ goodsId: goods.id, content }) });
              setContent("");
              load();
            } catch (err) {
              setNotice(err instanceof Error ? err.message : "没有发出去");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>写给卖家</span>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} />
          </label>
          <div className="row-actions">
            <button className="primary" disabled={busy} type="submit">发表</button>
            <button className="ghost" type="button" onClick={() => setContent("")}>取消</button>
          </div>
        </form>
      </section>

      <details>
        <summary>举报这件商品</summary>
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!user) return goLogin();
            setBusy(true);
            setNotice("");
            try {
              await api("/api/reports", {
                method: "POST",
                body: JSON.stringify({ goodsId: goods.id, reason, detail, image: shot }),
              });
              setNotice("已提交举报，管理员会看到。");
              setReason("");
              setDetail("");
              setShot("");
            } catch (err) {
              setNotice(err instanceof Error ? err.message : "没有提交");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>原因</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)}>
              <option value="">选择原因</option>
              {REPORT_REASONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="field">
            <span>说明，可以不填</span>
            <textarea value={detail} onChange={(event) => setDetail(event.target.value)} />
          </label>
          <label className="field">
            <span>截图，可以不传</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (!user) return goLogin();
                try {
                  const paths = await uploadImages([file]);
                  setShot(paths[0] || "");
                } catch (err) {
                  setNotice(err instanceof Error ? err.message : "图片没有传上去");
                }
              }}
            />
          </label>
          <div className="row-actions">
            <button className="primary" disabled={busy} type="submit">提交举报</button>
          </div>
        </form>
      </details>
    </Chrome>
  );
}
