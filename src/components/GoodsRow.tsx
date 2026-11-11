import { GOODS_STATUS, yuan } from "@/lib/labels";
import type { GoodsCard } from "@/lib/client";

export function GoodsRow({ goods, href }: { goods: GoodsCard; href?: string }) {
  const body = (
    <>
      {goods.cover ? <img src={goods.cover} alt="" /> : <span className="ph" />}
      <span>
        <strong>{goods.title}</strong>
        <p className="meta">
          {[goods.category, goods.campus, goods.seller.nickname].filter(Boolean).join("，")}
          {goods.status !== "on_sale" ? "，" + (GOODS_STATUS[goods.status] || goods.status) : ""}
        </p>
        {goods.rejectReason ? <p className="meta stamp-ink">驳回：{goods.rejectReason}</p> : null}
      </span>
      <span className="stamp">{yuan(goods.priceFen)}</span>
    </>
  );
  if (href) return <a className="row" href={href}>{body}</a>;
  return <div className="row">{body}</div>;
}
