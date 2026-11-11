"use client";

import { useEffect, useState } from "react";
import { Chrome } from "@/components/Chrome";
import { Shelf } from "@/components/Shelf";
import { api, type GoodsCard } from "@/lib/client";

export default function SellerPage({ params }: { params: { id: string } }) {
  const [goods, setGoods] = useState<GoodsCard[]>([]);
  const [name, setName] = useState("卖家");

  useEffect(() => {
    api<{ goods: GoodsCard[] }>("/api/goods?seller=" + params.id).then((data) => {
      setGoods(data.goods);
      if (data.goods[0]) setName(data.goods[0].seller.nickname);
    });
  }, [params.id]);

  return (
    <Chrome title={name + "的在售"}>
      <h1>{name}的在售</h1>
      {goods.length === 0 ? <p>现在没有在售的东西。<a href="/">回货架看看</a></p> : <div className="catalog"><Shelf goods={goods} /></div>}
    </Chrome>
  );
}
