"use client";

import { useEffect, useState } from "react";
import { Chrome } from "@/components/Chrome";
import { api, uploadImages, useSession } from "@/lib/client";
import { CAMPUSES, CATEGORIES } from "@/lib/labels";

type Form = {
  title: string;
  category: string;
  campus: string;
  price: string;
  description: string;
  images: string[];
};

const empty: Form = { title: "", category: "", campus: "", price: "", description: "", images: [] };

export default function SellPage() {
  const user = useSession();
  const [id, setId] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState<Form>(empty);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const goodsId = Number(new URLSearchParams(location.search).get("id") || 0);
    if (!goodsId) return;
    setId(goodsId);
    api<{ goods: Form & { status: string; priceFen: number; images: string[] } }>("/api/goods/" + goodsId)
      .then((data) => {
        setStatus(data.goods.status);
        setForm({
          title: data.goods.title === "未命名" ? "" : data.goods.title,
          category: data.goods.category,
          campus: data.goods.campus,
          price: data.goods.priceFen ? String(data.goods.priceFen / 100) : "",
          description: data.goods.description,
          images: data.goods.images,
        });
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function save(asDraft: boolean) {
    setBusy(true);
    setError("");
    setOk("");
    try {
      const path = id ? "/api/goods/" + id : "/api/goods";
      await api(path, {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify({ ...form, asDraft }),
      });
      setOk(asDraft ? "已存成草稿，别人看不到。" : "已提交审核。通过之前，别人搜不到。");
      if (!id) setTimeout(() => { location.href = "/me"; }, 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "没有保存");
    } finally {
      setBusy(false);
    }
  }

  if (user === null) {
    return <Chrome title="发布"><p>先<a href="/login?next=/sell">登录</a>再发布。</p></Chrome>;
  }

  return (
    <Chrome title={id ? "编辑商品" : "发布"} current="sell">
      <h1>{id ? "编辑商品" : "发布"}</h1>
      <p className="lede">发布后先审核。单张图片不超过 5MB，最多 5 张。</p>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault();
          save(false);
        }}
      >
        <label className="field"><span>名称</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
        <label className="field">
          <span>分类</span>
          <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="">选择分类</option>
            {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="field">
          <span>校区</span>
          <select value={form.campus} onChange={(event) => setForm({ ...form, campus: event.target.value })}>
            <option value="">选择校区</option>
            {CAMPUSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="field"><span>价格</span><input inputMode="decimal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
        <label className="field"><span>描述</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
        <label className="field">
          <span>图片</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            multiple
            onChange={async (event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = "";
              if (!files.length) return;
              if (form.images.length + files.length > 5) {
                setError("最多 5 张图片");
                return;
              }
              setBusy(true);
              setError("");
              try {
                const paths = await uploadImages(files);
                if (!paths?.length) throw new Error("图片没有传上去");
                setForm((prev) => ({ ...prev, images: prev.images.concat(paths) }));
              } catch (err) {
                setError(err instanceof Error ? err.message : "图片没有传上去");
              } finally {
                setBusy(false);
              }
            }}
          />
          <span className="meta">支持 jpg / png / webp，选完后稍等预览出现再点发布。</span>
          <span className="uploads">
            {form.images.map((src) => (
              <figure key={src}>
                <img src={src} alt="" />
                <button type="button" aria-label="移除" onClick={() => setForm({ ...form, images: form.images.filter((item) => item !== src) })}>×</button>
              </figure>
            ))}
          </span>
        </label>
        {error ? <p className="error">{error}</p> : null}
        {ok ? <p className="ok">{ok}</p> : null}
        <div className="row-actions">
          <button className="primary" disabled={busy} type="submit">发布</button>
          <button className="ghost" disabled={busy} type="button" onClick={() => save(true)}>保存草稿</button>
          <a href="/me">放弃</a>
        </div>
        {id && status !== "trading" && status !== "sold" && status !== "off" && (
          <button
            className="danger"
            type="button"
            onClick={async () => {
              setBusy(true);
              try {
                await api("/api/goods/" + id + "/off", { method: "POST" });
                location.href = "/me";
              } catch (err) {
                setError(err instanceof Error ? err.message : "没有下架");
                setBusy(false);
              }
            }}
          >
            下架
          </button>
        )}
        {id && (status === "off" || status === "rejected" || status === "draft") && (
          <button
            className="ghost"
            type="button"
            onClick={async () => {
              setBusy(true);
              try {
                await api("/api/goods/" + id + "/resubmit", { method: "POST" });
                setOk("已重新提交审核，通过前不会出现在货架上。");
                setStatus("pending");
              } catch (err) {
                setError(err instanceof Error ? err.message : "没有提交");
              } finally {
                setBusy(false);
              }
            }}
          >
            重新提交审核
          </button>
        )}
      </form>
    </Chrome>
  );
}
