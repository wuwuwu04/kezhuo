import { yuan } from "@/lib/labels";
import type { GoodsCard } from "@/lib/client";

export function Shelf({ goods }: { goods: GoodsCard[] }) {
  return (
    <div className="shelf">
      {goods.map((item) => (
        <a className="tile" key={item.id} href={"/goods/" + item.id}>
          <span className="frame">
            {item.cover ? <img src={item.cover} alt="" /> : <span className="ph" />}
            {item.category ? <span className="tile-tag">{item.category}</span> : null}
          </span>
          <span className="tile-copy">
            <span className="tile-title">{item.title}</span>
            <span className="tile-price">{yuan(item.priceFen)}</span>
            <span className="tile-meta">
              {[item.campus, item.seller.nickname].filter(Boolean).join(" · ")}
              {item.favCount ? " · " + item.favCount + " 人收藏" : ""}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}
