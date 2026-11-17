import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { clearSession, currentUser, setSession, signUser } from "@/lib/auth";
import { CAMPUSES, CATEGORIES, orderNo } from "@/lib/labels";
import { Fail } from "./http";

type Body = Record<string, unknown>;

const goodsInclude = {
  images: { orderBy: { sort: "asc" as const } },
  seller: true,
  _count: { select: { favorites: true } },
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function checkPassword(password: string) {
  if (!password) throw new Fail(400, "请输入密码");
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,16}$/.test(password)) {
    throw new Fail(400, "密码需要 6 到 16 位，并且同时包含字母和数字");
  }
}

function parsePrice(value: unknown) {
  const raw = text(value);
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new Fail(400, "价格要是大于 0 的数字，最多两位小数");
  }
  const yuan = Number(raw);
  if (!(yuan > 0)) throw new Fail(400, "价格要大于 0");
  if (yuan > 99999) throw new Fail(400, "价格太高了，请核对一下");
  return Math.round(yuan * 100);
}

function publicUser(user: {
  id: number;
  role: string;
  studentNo: string | null;
  phone: string | null;
  account: string | null;
  nickname: string;
  campus: string;
  bio: string;
  status: string;
  warning: string;
}) {
  return {
    id: user.id,
    role: user.role,
    studentNo: user.studentNo || "",
    phone: user.phone || "",
    account: user.account || "",
    nickname: user.nickname || "未命名",
    campus: user.campus,
    bio: user.bio,
    status: user.status,
    warning: user.warning,
  };
}

function card(
  goods: {
    id: number;
    title: string;
    category: string;
    campus: string;
    priceFen: number;
    status: string;
    rejectReason: string;
    warning: string;
    images: { path: string }[];
    seller: { id: number; nickname: string };
    _count?: { favorites: number };
  }
) {
  return {
    id: goods.id,
    title: goods.title || "未命名",
    category: goods.category,
    campus: goods.campus,
    priceFen: goods.priceFen,
    status: goods.status,
    rejectReason: goods.rejectReason,
    warning: goods.warning,
    cover: goods.images[0]?.path || "",
    favCount: goods._count?.favorites ?? 0,
    seller: { id: goods.seller.id, nickname: goods.seller.nickname || "未命名" },
  };
}

async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Fail(401, "请先登录");
  if (user.status === "banned") throw new Fail(403, "账号已封禁");
  return user;
}

async function requireStudent() {
  const user = await requireUser();
  if (user.role !== "student") throw new Fail(403, "没有这个权限");
  return user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") throw new Fail(403, "没有后台权限");
  return user;
}

function cleanImages(value: unknown) {
  if (!Array.isArray(value)) return [];
  const paths = value.map((item) => text(item)).filter(Boolean);
  if (paths.length > 5) throw new Fail(400, "最多 5 张图片");
  for (const path of paths) {
    if (
      !path.startsWith("/api/uploads/") &&
      !path.startsWith("/uploads/") &&
      !path.startsWith("/seed/") &&
      !path.startsWith("/photos/")
    ) {
      throw new Fail(400, "图片地址不对");
    }
  }
  return paths;
}

async function saveGoods(
  userId: number,
  goodsId: number | null,
  body: Body,
  mode: "draft" | "publish"
) {
  const existing = goodsId
    ? await db.goods.findUnique({ where: { id: goodsId }, include: { images: true } })
    : null;
  if (goodsId && (!existing || existing.sellerId !== userId)) {
    throw new Fail(403, "无权修改这件商品");
  }
  if (existing && (existing.status === "trading" || existing.status === "sold")) {
    throw new Fail(400, "这件商品正在交易或已经卖出，不能再改");
  }

  const title = "title" in body ? text(body.title) : existing?.title || "";
  const category = "category" in body ? text(body.category) : existing?.category || "";
  const campus = "campus" in body ? text(body.campus) : existing?.campus || "";
  const description = "description" in body ? text(body.description) : existing?.description || "";
  const images = "images" in body ? cleanImages(body.images) : existing?.images.map((img) => img.path) || [];
  let priceFen = existing?.priceFen || 0;
  if ("price" in body && text(body.price) !== "") priceFen = parsePrice(body.price);

  if (mode === "draft" && !title) throw new Fail(400, "草稿至少写个名称");

  if (mode === "publish") {
    if (!title) throw new Fail(400, "名称不能为空");
    if (title.length > 40) throw new Fail(400, "名称最多 40 个字");
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) throw new Fail(400, "请选择分类");
    if (!CAMPUSES.includes(campus as (typeof CAMPUSES)[number])) throw new Fail(400, "请选择校区");
    if (!description) throw new Fail(400, "请填写描述");
    if (description.length > 500) throw new Fail(400, "描述最多 500 个字");
    if (!("price" in body) && !priceFen) throw new Fail(400, "请填写价格");
    if ("price" in body) priceFen = parsePrice(body.price);
    if (images.length < 1) throw new Fail(400, "请至少上传 1 张图片");
  }

  const status = mode === "draft" ? "draft" : "pending";
  const data = {
    title,
    category,
    campus,
    description,
    priceFen,
    status,
    rejectReason: "",
  };

  const saved = existing
    ? await db.goods.update({ where: { id: existing.id }, data })
    : await db.goods.create({ data: { ...data, sellerId: userId } });

  if ("images" in body || !existing) {
    await db.goodsImage.deleteMany({ where: { goodsId: saved.id } });
    if (images.length) {
      await db.goodsImage.createMany({
        data: images.map((path, sort) => ({ goodsId: saved.id, path, sort })),
      });
    }
  }

  const full = await db.goods.findUniqueOrThrow({ where: { id: saved.id }, include: goodsInclude });
  return card(full);
}

async function countStats(preset: string, from: string, to: string) {
  let start: Date | null = null;
  let end: Date | null = null;
  const now = new Date();
  if (from || to) {
    if (from) start = new Date(from + "T00:00:00");
    if (to) end = new Date(to + "T23:59:59");
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
      throw new Fail(400, "日期不合法");
    }
    if (start && end && start > end) throw new Fail(400, "开始日期不能晚于结束日期");
  } else if (preset === "day") {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (preset === "week") {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else if (preset === "month") {
    start = new Date(now);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
  }
  const createdAt = start || end ? { gte: start || undefined, lte: end || undefined } : undefined;
  const where = createdAt ? { createdAt } : {};
  const [users, goods, orders] = await Promise.all([
    db.user.count({ where: { ...where, role: "student" } }),
    db.goods.count({ where }),
    db.order.count({ where }),
  ]);
  return { users, goods, orders };
}

export async function handle(req: Request, path: string[]) {
  const method = req.method.toUpperCase();
  const url = new URL(req.url);
  const query = url.searchParams;
  let body: Body = {};
  if (method !== "GET") {
    const raw = await req.text();
    if (raw) {
      try {
        body = JSON.parse(raw) as Body;
      } catch {
        throw new Fail(400, "请求格式不对");
      }
    }
  }

  const [a, b, c] = path;

  if (a === "auth" && b === "register" && method === "POST") {
    const studentNo = text(body.studentNo);
    const phone = text(body.phone);
    const password = text(body.password);
    const confirm = text(body.confirm);
    if (!studentNo) throw new Fail(400, "学号不能为空");
    if (!/^\d{8}$/.test(studentNo)) throw new Fail(400, "学号需要 8 位数字");
    if (!phone) throw new Fail(400, "手机号不能为空");
    if (!/^1\d{10}$/.test(phone)) throw new Fail(400, "手机号需要 11 位，以 1 开头");
    checkPassword(password);
    if (password !== confirm) throw new Fail(400, "两次密码不一致");
    if (await db.user.findUnique({ where: { phone } })) throw new Fail(400, "这个手机号已经注册过");
    if (await db.user.findUnique({ where: { studentNo } })) throw new Fail(400, "这个学号已经注册过");
    const user = await db.user.create({
      data: {
        role: "student",
        studentNo,
        phone,
        passwordHash: bcrypt.hashSync(password, 10),
        nickname: "同学" + phone.slice(-4),
      },
    });
    setSession(await signUser(user.id));
    return { user: publicUser(user) };
  }

  if (a === "auth" && b === "login" && method === "POST") {
    const account = text(body.account);
    const password = text(body.password);
    const portal = text(body.portal) || "student";
    if (!account) throw new Fail(400, "请输入账号");
    if (!password) throw new Fail(400, "请输入密码");
    const user = account.startsWith("1")
      ? await db.user.findUnique({ where: { phone: account } })
      : await db.user.findUnique({ where: { account } });
    if (!user) throw new Fail(400, "账号不存在");
    if (!bcrypt.compareSync(password, user.passwordHash)) throw new Fail(400, "密码错误");
    if (user.status === "banned") throw new Fail(403, "账号已封禁");
    if (portal === "admin" && user.role !== "admin") throw new Fail(403, "没有后台权限");
    if (portal === "student" && user.role !== "student") throw new Fail(403, "请从后台入口登录");
    setSession(await signUser(user.id));
    return { user: publicUser(user) };
  }

  if (a === "auth" && b === "logout" && method === "POST") {
    clearSession();
    return { ok: true };
  }

  if (a === "auth" && b === "me" && method === "GET") {
    const user = await currentUser();
    return { user: user ? publicUser(user) : null };
  }

  if (a === "auth" && b === "forgot" && method === "POST") {
    const password = text(body.password);
    const confirm = text(body.confirm);
    checkPassword(password);
    if (password !== confirm) throw new Fail(400, "两次密码不一致");
    if (text(body.portal) === "admin") {
      const account = text(body.account);
      const phrase = text(body.phrase);
      const user = await db.user.findUnique({ where: { account } });
      if (!user || user.role !== "admin") throw new Fail(400, "账号不存在");
      if (phrase !== (process.env.RECOVER_CODE || "kezhuo-admin")) throw new Fail(400, "找回口令不对");
      await db.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hashSync(password, 10) } });
      return { message: "密码已更新，去登录" };
    }
    const phone = text(body.phone);
    const studentNo = text(body.studentNo);
    const user = await db.user.findUnique({ where: { phone } });
    if (!user || user.studentNo !== studentNo) throw new Fail(400, "手机号和学号对不上");
    if (user.status === "banned") throw new Fail(403, "账号已封禁，不能找回");
    await db.user.update({ where: { id: user.id }, data: { passwordHash: bcrypt.hashSync(password, 10) } });
    return { message: "密码已更新，去登录" };
  }

  if (a === "me" && method === "PATCH") {
    const user = await requireStudent();
    const data: { nickname?: string; campus?: string; bio?: string } = {};
    if ("nickname" in body) {
      const nickname = text(body.nickname);
      if (!nickname) throw new Fail(400, "昵称不能为空");
      if (nickname.length > 20) throw new Fail(400, "昵称最多 20 个字");
      data.nickname = nickname;
    }
    if ("campus" in body) {
      const campus = text(body.campus);
      if (!CAMPUSES.includes(campus as (typeof CAMPUSES)[number])) throw new Fail(400, "请选择校区");
      data.campus = campus;
    }
    if ("bio" in body) {
      const bio = text(body.bio);
      if (bio.length > 200) throw new Fail(400, "简介最多 200 个字");
      data.bio = bio;
    }
    const saved = await db.user.update({ where: { id: user.id }, data });
    return { user: publicUser(saved) };
  }

  if (a === "goods" && method === "GET" && !b) {
    const min = query.get("min");
    const max = query.get("max");
    const minFen = min ? parsePrice(min) : null;
    const maxFen = max ? parsePrice(max) : null;
    if (minFen != null && maxFen != null && minFen > maxFen) {
      throw new Fail(400, "最低价不能高于最高价");
    }
    const seller = Number(query.get("seller") || 0);
    const where: {
      status: string;
      sellerId?: number;
      category?: string;
      campus?: string;
      title?: { contains: string };
      priceFen?: { gte?: number; lte?: number };
    } = { status: "on_sale" };
    if (seller) where.sellerId = seller;
    const category = text(query.get("category"));
    const campus = text(query.get("campus"));
    const q = text(query.get("q"));
    if (category) where.category = category;
    if (campus) where.campus = campus;
    if (q) where.title = { contains: q };
    if (minFen != null || maxFen != null) {
      where.priceFen = {};
      if (minFen != null) where.priceFen.gte = minFen;
      if (maxFen != null) where.priceFen.lte = maxFen;
    }
    const sort = text(query.get("sort"));
    const orderBy =
      sort === "price_asc" ? { priceFen: "asc" as const } :
      sort === "price_desc" ? { priceFen: "desc" as const } :
      { createdAt: "desc" as const };
    const rows = await db.goods.findMany({
      where,
      include: goodsInclude,
      orderBy,
      take: 60,
    });
    return { goods: rows.map(card) };
  }

  if (a === "goods" && b && method === "GET" && !c) {
    const id = Number(b);
    const goods = await db.goods.findUnique({ where: { id }, include: goodsInclude });
    if (!goods) throw new Fail(404, "商品不存在");
    const viewer = await currentUser();
    const open = goods.status === "on_sale" || goods.status === "trading" || goods.status === "sold";
    const allowed = open || viewer?.id === goods.sellerId || viewer?.role === "admin";
    if (!allowed) throw new Fail(404, "商品不存在或已下架");
    const favorited = viewer
      ? !!(await db.favorite.findUnique({ where: { userId_goodsId: { userId: viewer.id, goodsId: id } } }))
      : false;
    const messages = await db.message.findMany({
      where: { goodsId: id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    const revealPhone = !!viewer;
    return {
      goods: {
        ...card(goods),
        description: goods.description,
        images: goods.images.map((img) => img.path),
        seller: {
          id: goods.seller.id,
          nickname: goods.seller.nickname || "未命名",
          campus: goods.seller.campus,
          phone: revealPhone ? goods.seller.phone || "" : "",
        },
        favorited,
        mine: viewer?.id === goods.sellerId,
      },
      messages: messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        mine: viewer?.id === msg.userId,
        user: msg.user.nickname || "未命名",
        createdAt: msg.createdAt.toISOString(),
      })),
    };
  }

  if (a === "goods" && method === "POST" && !b) {
    const user = await requireStudent();
    const mode = body.asDraft ? "draft" : "publish";
    const goods = await saveGoods(user.id, null, body, mode);
    return { goods };
  }

  if (a === "goods" && b && method === "PATCH" && !c) {
    const user = await requireStudent();
    const goods = await saveGoods(user.id, Number(b), body, body.asDraft ? "draft" : "publish");
    return { goods };
  }

  if (a === "goods" && b && c === "off" && method === "POST") {
    const user = await requireStudent();
    const goods = await db.goods.findUnique({ where: { id: Number(b) } });
    if (!goods || goods.sellerId !== user.id) throw new Fail(403, "无权修改这件商品");
    if (goods.status === "trading") throw new Fail(400, "这件商品正在交易，先处理订单再下架");
    if (goods.status === "sold") throw new Fail(400, "已经卖出的商品不用下架");
    if (goods.status === "off") throw new Fail(400, "已经下架了");
    await db.goods.update({ where: { id: goods.id }, data: { status: "off" } });
    return { ok: true };
  }

  if (a === "goods" && b && c === "resubmit" && method === "POST") {
    const user = await requireStudent();
    const goods = await db.goods.findUnique({ where: { id: Number(b) } });
    if (!goods || goods.sellerId !== user.id) throw new Fail(403, "无权修改这件商品");
    if (goods.status !== "off" && goods.status !== "rejected" && goods.status !== "draft") {
      throw new Fail(400, "这件商品不用重新提交");
    }
    const imageCount = await db.goodsImage.count({ where: { goodsId: goods.id } });
    if (!goods.title || !goods.description || !goods.category || !goods.campus || !goods.priceFen || !imageCount) {
      throw new Fail(400, "信息还不全，补完再提交审核");
    }
    await db.goods.update({ where: { id: goods.id }, data: { status: "pending", rejectReason: "" } });
    return { ok: true };
  }

  if (a === "mine" && b === "goods" && method === "GET") {
    const user = await requireStudent();
    const rows = await db.goods.findMany({
      where: { sellerId: user.id },
      include: goodsInclude,
      orderBy: { createdAt: "desc" },
    });
    return { goods: rows.map(card) };
  }

  if (a === "favorites" && method === "GET") {
    const user = await requireStudent();
    const rows = await db.favorite.findMany({
      where: { userId: user.id },
      include: { goods: { include: goodsInclude } },
      orderBy: { id: "desc" },
    });
    return { favorites: rows.map((row) => ({ id: row.id, goods: card(row.goods) })) };
  }

  if (a === "favorites" && method === "POST") {
    const user = await requireStudent();
    const goodsId = Number(body.goodsId);
    const goods = await db.goods.findUnique({ where: { id: goodsId } });
    if (!goods || goods.status !== "on_sale") throw new Fail(400, "这件商品现在不能收藏");
    const exists = await db.favorite.findUnique({ where: { userId_goodsId: { userId: user.id, goodsId } } });
    if (exists) return { message: "已经收藏过了", favorited: true };
    await db.favorite.create({ data: { userId: user.id, goodsId } });
    return { favorited: true };
  }

  if (a === "favorites" && method === "DELETE") {
    const user = await requireStudent();
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
    const goodsId = Number(body.goodsId || 0);
    if (goodsId) {
      await db.favorite.deleteMany({ where: { userId: user.id, goodsId } });
    } else if (ids.length) {
      await db.favorite.deleteMany({ where: { userId: user.id, id: { in: ids } } });
    }
    return { ok: true };
  }

  if (a === "orders" && method === "GET" && !b) {
    const user = await requireUser();
    const side = text(query.get("side"));
    const status = text(query.get("status"));
    const no = text(query.get("no")).replace(/^D/i, "");
    const where: {
      OR?: Array<{ buyerId: number } | { sellerId: number }>;
      buyerId?: number;
      sellerId?: number;
      status?: string;
      id?: number;
    } = {};
    if (user.role !== "admin") {
      if (side === "buy") where.buyerId = user.id;
      else if (side === "sell") where.sellerId = user.id;
      else where.OR = [{ buyerId: user.id }, { sellerId: user.id }];
    }
    if (status) where.status = status;
    if (no) {
      const id = Number(no);
      if (!id) return { orders: [] };
      where.id = id;
    }
    const rows = await db.order.findMany({
      where,
      include: {
        goods: { include: { images: { orderBy: { sort: "asc" } } } },
        buyer: true,
        seller: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      orders: rows.map((order) => ({
        id: order.id,
        no: orderNo(order.id),
        priceFen: order.priceFen,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        side: order.buyerId === user.id ? "buy" : "sell",
        goods: {
          id: order.goods.id,
          title: order.goods.title,
          cover: order.goods.images[0]?.path || "",
        },
        buyer: { id: order.buyer.id, nickname: order.buyer.nickname },
        seller: { id: order.seller.id, nickname: order.seller.nickname },
      })),
    };
  }

  if (a === "orders" && method === "POST" && !b) {
    const user = await requireStudent();
    const goodsId = Number(body.goodsId);
    const created = await db.$transaction(async (tx) => {
      const goods = await tx.goods.findUnique({ where: { id: goodsId } });
      if (!goods || goods.status !== "on_sale") throw new Fail(400, "这件商品现在不能买");
      if (goods.sellerId === user.id) throw new Fail(400, "不能买自己的商品");
      const locked = await tx.goods.updateMany({
        where: { id: goodsId, status: "on_sale" },
        data: { status: "trading" },
      });
      if (locked.count !== 1) throw new Fail(400, "这件商品刚被别人下单了");
      return tx.order.create({
        data: {
          buyerId: user.id,
          sellerId: goods.sellerId,
          goodsId,
          priceFen: goods.priceFen,
          status: "pending",
        },
      });
    });
    return { order: { id: created.id, no: orderNo(created.id) } };
  }

  if (a === "orders" && b && c === "cancel" && method === "POST") {
    const user = await requireStudent();
    const order = await db.order.findUnique({ where: { id: Number(b) } });
    if (!order || (order.buyerId !== user.id && order.sellerId !== user.id)) {
      throw new Fail(403, "无权查看这张订单");
    }
    if (order.status !== "pending") throw new Fail(400, "这张订单不能取消");
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status: "cancelled" } }),
      db.goods.updateMany({ where: { id: order.goodsId, status: "trading" }, data: { status: "on_sale" } }),
    ]);
    return { ok: true };
  }

  if (a === "orders" && b && c === "finish" && method === "POST") {
    const user = await requireStudent();
    const order = await db.order.findUnique({ where: { id: Number(b) } });
    if (!order || (order.buyerId !== user.id && order.sellerId !== user.id)) {
      throw new Fail(403, "无权查看这张订单");
    }
    if (order.status !== "pending") throw new Fail(400, "这张订单不能确认完成");
    await db.$transaction([
      db.order.update({ where: { id: order.id }, data: { status: "done" } }),
      db.goods.update({ where: { id: order.goodsId }, data: { status: "sold" } }),
    ]);
    return { ok: true };
  }

  if (a === "messages" && method === "GET") {
    const user = await requireStudent();
    const goodsId = Number(query.get("goodsId") || 0);
    const rows = await db.message.findMany({
      where: goodsId ? { goodsId } : { userId: user.id },
      include: { goods: true, user: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      messages: rows.map((msg) => ({
        id: msg.id,
        content: msg.content,
        goodsId: msg.goodsId,
        goodsTitle: msg.goods.title,
        mine: msg.userId === user.id,
        user: msg.user.nickname,
        createdAt: msg.createdAt.toISOString(),
      })),
    };
  }

  if (a === "messages" && method === "POST") {
    const user = await requireStudent();
    const content = text(body.content);
    const goodsId = Number(body.goodsId);
    if (!content) throw new Fail(400, "请输入留言");
    if (content.length > 500) throw new Fail(400, "留言最多 500 字");
    const goods = await db.goods.findUnique({ where: { id: goodsId } });
    if (!goods || (goods.status !== "on_sale" && goods.status !== "trading" && goods.sellerId !== user.id)) {
      throw new Fail(400, "这件商品现在不能留言");
    }
    const msg = await db.message.create({ data: { goodsId, userId: user.id, content } });
    return { id: msg.id };
  }

  if (a === "messages" && b && method === "DELETE") {
    const user = await requireStudent();
    const msg = await db.message.findUnique({ where: { id: Number(b) } });
    if (!msg || msg.userId !== user.id) throw new Fail(403, "只能删除自己的留言");
    await db.message.delete({ where: { id: msg.id } });
    return { ok: true };
  }

  if (a === "reports" && method === "POST") {
    const user = await requireStudent();
    const goodsId = Number(body.goodsId);
    const reason = text(body.reason);
    const detail = text(body.detail);
    const image = text(body.image);
    if (!REPORT_OK(reason)) throw new Fail(400, "请选择举报原因");
    const goods = await db.goods.findUnique({ where: { id: goodsId } });
    if (!goods) throw new Fail(404, "商品不存在");
    if (image && !image.startsWith("/api/uploads/") && !image.startsWith("/uploads/") && !image.startsWith("/seed/")) {
      throw new Fail(400, "图片地址不对");
    }
    const report = await db.report.create({
      data: { reporterId: user.id, goodsId, reason, detail, image, status: "open" },
    });
    return { id: report.id };
  }

  if (a === "admin" && b === "goods" && method === "GET") {
    await requireAdmin();
    const status = text(query.get("status")) || "pending";
    const rows = await db.goods.findMany({
      where: { status },
      include: goodsInclude,
      orderBy: { createdAt: "asc" },
    });
    return { goods: rows.map(card) };
  }

  if (a === "admin" && b === "goods" && c === "approve" && method === "POST") {
    await requireAdmin();
    const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [Number(path[3] || body.id)];
    const result = await db.goods.updateMany({
      where: { id: { in: ids.filter(Boolean) }, status: "pending" },
      data: { status: "on_sale", rejectReason: "" },
    });
    return { count: result.count };
  }

  if (a === "admin" && b === "goods" && path[3] === "reject" && method === "POST") {
    await requireAdmin();
    const reason = text(body.reason);
    if (!reason) throw new Fail(400, "请填写驳回原因");
    const goods = await db.goods.findUnique({ where: { id: Number(c) } });
    if (!goods) throw new Fail(404, "商品不存在");
    if (goods.status !== "pending") throw new Fail(400, "只有待审核的商品可以驳回");
    await db.goods.update({ where: { id: goods.id }, data: { status: "rejected", rejectReason: reason } });
    return { ok: true };
  }

  if (a === "admin" && b === "goods" && path[3] === "warn" && method === "POST") {
    await requireAdmin();
    const note = text(body.note);
    if (!note) throw new Fail(400, "请填写警告说明");
    const goods = await db.goods.findUnique({ where: { id: Number(c) } });
    if (!goods) throw new Fail(404, "商品不存在");
    await db.goods.update({ where: { id: goods.id }, data: { warning: note } });
    return { ok: true };
  }

  if (a === "admin" && b === "goods" && path[3] === "takedown" && method === "POST") {
    await requireAdmin();
    const goods = await db.goods.findUnique({ where: { id: Number(c) } });
    if (!goods) throw new Fail(404, "商品不存在");
    if (goods.status === "off") throw new Fail(400, "已经下架了");
    if (goods.status === "sold") throw new Fail(400, "已经卖出，不用下架");
    const note = text(body.note) || "违规下架";
    await db.$transaction([
      db.goods.update({ where: { id: goods.id }, data: { status: "off", warning: note } }),
      db.order.updateMany({ where: { goodsId: goods.id, status: "pending" }, data: { status: "cancelled" } }),
    ]);
    return { ok: true };
  }

  if (a === "admin" && b === "goods" && path[3] === "restore" && method === "POST") {
    await requireAdmin();
    const goods = await db.goods.findUnique({ where: { id: Number(c) } });
    if (!goods) throw new Fail(404, "商品不存在");
    if (goods.status !== "off") throw new Fail(400, "只有已下架的商品可以恢复");
    await db.goods.update({ where: { id: goods.id }, data: { status: "on_sale" } });
    return { ok: true };
  }

  if (a === "admin" && b === "reports" && method === "GET") {
    await requireAdmin();
    const rows = await db.report.findMany({
      include: { goods: true, reporter: true },
      orderBy: { createdAt: "desc" },
    });
    return {
      reports: rows.map((report) => ({
        id: report.id,
        reason: report.reason,
        detail: report.detail,
        image: report.image,
        status: report.status,
        note: report.note,
        goodsId: report.goodsId,
        goodsTitle: report.goods.title,
        reporter: report.reporter.nickname,
        createdAt: report.createdAt.toISOString(),
      })),
    };
  }

  if (a === "admin" && b === "reports" && path[3] && method === "POST") {
    await requireAdmin();
    const action = path[3];
    const note = text(body.note);
    const report = await db.report.findUnique({ where: { id: Number(c) } });
    if (!report) throw new Fail(404, "工单不存在");
    if (action === "close" || action === "dismiss") {
      if (!note) throw new Fail(400, "请填写处理说明");
      await db.report.update({
        where: { id: report.id },
        data: { status: action === "close" ? "closed" : "dismissed", note },
      });
      return { ok: true };
    }
    if (action === "hold") {
      await db.report.update({
        where: { id: report.id },
        data: { status: "hold", note: note || report.note },
      });
      return { ok: true };
    }
  }

  if (a === "admin" && b === "users" && method === "GET") {
    await requireAdmin();
    const q = text(query.get("q"));
    const rows = await db.user.findMany({
      where: {
        role: "student",
        ...(q
          ? {
              OR: [
                { studentNo: { contains: q } },
                { phone: { contains: q } },
                { nickname: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { id: "asc" },
    });
    return { users: rows.map(publicUser) };
  }

  if (a === "admin" && b === "users" && path[3] && method === "POST") {
    await requireAdmin();
    const user = await db.user.findUnique({ where: { id: Number(c) } });
    if (!user || user.role !== "student") throw new Fail(404, "没有这个人");
    const action = path[3];
    if (action === "ban") {
      await db.user.update({ where: { id: user.id }, data: { status: "banned" } });
      return { ok: true };
    }
    if (action === "unban") {
      await db.user.update({ where: { id: user.id }, data: { status: "normal" } });
      return { ok: true };
    }
    if (action === "warn") {
      const note = text(body.note);
      if (!note) throw new Fail(400, "请填写警告说明");
      await db.user.update({ where: { id: user.id }, data: { warning: note } });
      return { ok: true };
    }
    if (action === "password") throw new Fail(403, "不能修改用户密码");
  }

  if (a === "admin" && b === "orders" && method === "GET") {
    await requireAdmin();
    const status = text(query.get("status"));
    const no = text(query.get("no")).replace(/^D/i, "");
    const where: { status?: string; id?: number } = {};
    if (status) where.status = status;
    if (no) {
      const id = Number(no);
      if (!id) return { orders: [] };
      where.id = id;
    }
    const rows = await db.order.findMany({
      where,
      include: {
        goods: { include: { images: { orderBy: { sort: "asc" } } } },
        buyer: true,
        seller: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      orders: rows.map((order) => ({
        id: order.id,
        no: orderNo(order.id),
        priceFen: order.priceFen,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        goods: {
          id: order.goods.id,
          title: order.goods.title,
          cover: order.goods.images[0]?.path || "",
        },
        buyer: {
          id: order.buyer.id,
          nickname: order.buyer.nickname,
          phone: order.buyer.phone || "",
          studentNo: order.buyer.studentNo || "",
        },
        seller: {
          id: order.seller.id,
          nickname: order.seller.nickname,
          phone: order.seller.phone || "",
          studentNo: order.seller.studentNo || "",
        },
      })),
    };
  }

  if (a === "admin" && b === "stats" && method === "GET") {
    await requireAdmin();
    try {
      return await countStats(text(query.get("preset")) || "all", text(query.get("from")), text(query.get("to")));
    } catch (error) {
      if (error instanceof Fail) throw error;
      throw new Fail(500, "加载失败");
    }
  }

  if (a === "admin" && b === "export" && method === "GET") {
    await requireAdmin();
    const preset = text(query.get("preset")) || "all";
    const stats = await countStats(preset, "", "");
    const csv = "项目,数量\n用户," + stats.users + "\n商品," + stats.goods + "\n订单," + stats.orders + "\n";
    return { csv: "\uFEFF" + csv };
  }

  throw new Fail(404, "没有这个功能");
}

function REPORT_OK(reason: string) {
  return reason === "虚假描述" || reason === "疑似广告" || reason === "其他";
}
