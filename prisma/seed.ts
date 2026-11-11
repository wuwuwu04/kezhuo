import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const password = bcrypt.hashSync("Abc12345", 10);

async function main() {
  await db.report.deleteMany();
  await db.message.deleteMany();
  await db.favorite.deleteMany();
  await db.order.deleteMany();
  await db.goodsImage.deleteMany();
  await db.goods.deleteMany();
  await db.user.deleteMany();

  const xiaoman = await db.user.create({
    data: { role: "student", studentNo: "20230001", phone: "13800001001", passwordHash: password, nickname: "小满", campus: "东区", bio: "找教材，周末在食堂门口。" },
  });
  const he = await db.user.create({
    data: { role: "student", studentNo: "20230002", phone: "13800001002", passwordHash: password, nickname: "阿禾", campus: "东区", bio: "毕业出闲置。" },
  });
  await db.user.create({
    data: { role: "student", studentNo: "20230003", phone: "13800001003", passwordHash: password, nickname: "老周", campus: "东区", status: "banned", warning: "多次发布广告" },
  });
  await db.user.create({
    data: { role: "student", studentNo: "20230004", phone: "13800001004", passwordHash: password, nickname: "丁一", campus: "南区" },
  });
  const zhou = await db.user.create({
    data: { role: "student", studentNo: "20230005", phone: "13800001005", passwordHash: password, nickname: "小周", campus: "南区", bio: "南区 3 栋。" },
  });
  const lin = await db.user.create({
    data: { role: "student", studentNo: "20230006", phone: "13800001006", passwordHash: password, nickname: "小林", campus: "西区" },
  });
  await db.user.create({
    data: { role: "admin", account: "admin", passwordHash: bcrypt.hashSync("Admin123", 10), nickname: "管理员" },
  });

  async function goods(sellerId: number, title: string, category: string, price: number, description: string, campus: string, status: string, image: string | string[], extra?: { rejectReason?: string; warning?: string }) {
    const row = await db.goods.create({
      data: {
        sellerId,
        title,
        category,
        priceFen: price * 100,
        description,
        campus,
        status,
        rejectReason: extra?.rejectReason || "",
        warning: extra?.warning || "",
      },
    });
    const paths = Array.isArray(image) ? image : [image];
    for (let i = 0; i < paths.length; i++) {
      await db.goodsImage.create({ data: { goodsId: row.id, path: paths[i], sort: i } });
    }
    return row;
  }

  const book = await goods(he.id, "高等数学 同济第七版", "教材教辅", 25, "下册，有少量铅笔笔记，不缺页。东区食堂门口可以看。", "东区", "on_sale", "/photos/book.jpg");
  const lamp = await goods(he.id, "金属台灯", "生活用品", 15, "三档亮度，线是好的。宿舍用了一学期。", "东区", "on_sale", "/photos/lamp.jpg");
  await goods(zhou.id, "羽毛球拍 两支", "文体器材", 40, "拍套还在，球拍没有断线。", "南区", "on_sale", "/photos/racket.jpg");
  const calc = await goods(zhou.id, "卡西欧计算器", "电子产品", 35, "考试可以用的型号，按键都灵。", "南区", "on_sale", "/photos/calc.jpg");
  await goods(lin.id, "无线键盘", "电子产品", 45, "薄键盘配了一只鼠标，西区当面看。", "西区", "on_sale", "/photos/keyboard.jpg");
  await goods(lin.id, "不锈钢水杯", "生活用品", 9, "杯盖还在，西区可以看。", "西区", "on_sale", "/photos/thermos.jpg");
  await goods(lin.id, "创业书八本", "教材教辅", 30, "八本商业入门，有少量笔记。西区当面。", "西区", "on_sale", "/photos/book2.jpg");
  await goods(he.id, "蓝牙耳机", "电子产品", 20, "充电盒都在，左右都能响。", "东区", "on_sale", "/photos/ear.jpg");
  await goods(he.id, "英语词汇书", "教材教辅", 10, "几乎全新，等审核。", "东区", "pending", "/photos/book.jpg");
  await goods(he.id, "练习册", "教材教辅", 8, "封面有折痕。", "东区", "rejected", "/photos/book.jpg", { rejectReason: "图片不清晰" });
  await goods(he.id, "机械键盘", "电子产品", 80, "青轴，已经下架。", "东区", "off", "/photos/mech.jpg");
  const oldLamp = await goods(he.id, "旧台灯", "生活用品", 10, "已经成交。", "东区", "sold", "/photos/lamp.jpg");

  await db.order.create({
    data: { buyerId: xiaoman.id, sellerId: he.id, goodsId: oldLamp.id, priceFen: 1000, status: "done" },
  });
  await db.message.create({
    data: { goodsId: book.id, userId: xiaoman.id, content: "还在吗，今晚东区食堂门口可以看吗" },
  });
  await db.favorite.createMany({
    data: [
      { userId: xiaoman.id, goodsId: calc.id },
      { userId: xiaoman.id, goodsId: lamp.id },
    ],
  });
  await db.report.create({
    data: { reporterId: xiaoman.id, goodsId: book.id, reason: "虚假描述", detail: "笔记比描述里多", status: "open" },
  });
  await db.report.create({
    data: { reporterId: xiaoman.id, goodsId: lamp.id, reason: "其他", detail: "灯管闪，等卖家补充", status: "hold", note: "等卖家补充" },
  });
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
