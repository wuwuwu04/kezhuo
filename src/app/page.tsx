"use client";

import { useEffect, useState } from "react";
import { Chrome } from "@/components/Chrome";
import { Logo } from "@/components/Logo";
import { Shelf } from "@/components/Shelf";
import { api, type GoodsCard } from "@/lib/client";
import { CAMPUSES, CATEGORIES } from "@/lib/labels";

export default function HomePage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [campus, setCampus] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("");
  const [goods, setGoods] = useState<GoodsCard[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function load(next?: { q?: string; category?: string; campus?: string; min?: string; max?: string; sort?: string }) {
    const state = { q, category, campus, min, max, sort, ...next };
    const params = new URLSearchParams();
    if (state.q) params.set("q", state.q);
    if (state.category) params.set("category", state.category);
    if (state.campus) params.set("campus", state.campus);
    if (state.min) params.set("min", state.min);
    if (state.max) params.set("max", state.max);
    if (state.sort) params.set("sort", state.sort);
    setLoading(true);
    setError("");
    api<{ goods: GoodsCard[] }>("/api/goods?" + params.toString())
      .then((data) => setGoods(data.goods))
      .catch((err: Error) => {
        setGoods([]);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // 只在第一次打开时取默认货架
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearAll() {
    setQ("");
    setCategory("");
    setCampus("");
    setMin("");
    setMax("");
    setSort("");
    load({ q: "", category: "", campus: "", min: "", max: "", sort: "" });
  }

  return (
    <Chrome current="home">
      <div className="market">
        <aside className="rail">
          <form
            className="rail-search"
            onSubmit={(event) => {
              event.preventDefault();
              load();
            }}
          >
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="搜高等数学、球拍、水杯"
              aria-label="关键词"
            />
            <button className="primary" type="submit">搜索</button>
          </form>
          <div>
            <p className="rail-label">分类</p>
            <div className="rail-list">
              <button type="button" aria-pressed={category === ""} onClick={() => { setCategory(""); load({ category: "" }); }}>
                全部
              </button>
              {CATEGORIES.map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={category === item}
                  onClick={() => { setCategory(item); load({ category: item }); }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>校区</span>
            <select
              value={campus}
              aria-label="校区"
              onChange={(event) => {
                setCampus(event.target.value);
                load({ campus: event.target.value });
              }}
            >
              <option value="">全部校区</option>
              {CAMPUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <div className="price-pair">
            <label className="field">
              <span>最低价</span>
              <input
                inputMode="decimal"
                aria-label="最低价"
                value={min}
                onChange={(event) => setMin(event.target.value)}
                onBlur={() => load()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    load();
                  }
                }}
              />
            </label>
            <label className="field">
              <span>最高价</span>
              <input
                inputMode="decimal"
                aria-label="最高价"
                value={max}
                onChange={(event) => setMax(event.target.value)}
                onBlur={() => load()}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    load();
                  }
                }}
              />
            </label>
          </div>
          <button className="ghost" type="button" onClick={clearAll}>清空条件</button>
        </aside>
        <section className="catalog">
          <div className="catalog-banner">
            <div>
              <p className="catalog-title">今天的闲置</p>
              <p className="lede">逛一逛同校货架，价格在红字上。</p>
            </div>
            <Logo className="logo logo-banner" />
          </div>
          <div className="catalog-head">
            <p className="count">{error ? "" : loading ? "正在加载" : goods.length ? goods.length + " 件在售" : "没有找到"}</p>
            <div className="toolbar">
              <div className="sorts">
                <button type="button" aria-pressed={sort === ""} onClick={() => { setSort(""); load({ sort: "" }); }}>新上架</button>
                <button type="button" aria-pressed={sort === "price_asc"} onClick={() => { setSort("price_asc"); load({ sort: "price_asc" }); }}>低价</button>
                <button type="button" aria-pressed={sort === "price_desc"} onClick={() => { setSort("price_desc"); load({ sort: "price_desc" }); }}>高价</button>
              </div>
            </div>
          </div>
          {error ? <p className="error catalog-note">{error}</p> : null}
          {loading && goods.length === 0 ? (
            <div className="shelf shelf-skeleton" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, index) => <div className="tile skeleton" key={index} />)}
            </div>
          ) : null}
          {!error && !loading && goods.length === 0 ? <p className="catalog-note">换个词，或者清空左侧条件。</p> : null}
          {goods.length > 0 && <Shelf goods={goods} />}
        </section>
      </div>
    </Chrome>
  );
}
