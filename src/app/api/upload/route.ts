import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { currentUser } from "@/lib/auth";
import { UPLOAD_DIR, uploadPublicPath } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function kind(buf: Buffer) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return "";
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user || user.status === "banned") {
    return Response.json({ message: "请先登录" }, { status: 401 });
  }
  const form = await req.formData();
  const files = form.getAll("files").filter((item): item is File => item instanceof File);
  if (!files.length) return Response.json({ message: "请选择图片" }, { status: 400 });
  if (files.length > 5) return Response.json({ message: "最多 5 张图片" }, { status: 400 });
  await mkdir(UPLOAD_DIR, { recursive: true });
  const saved: string[] = [];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ message: "图片超过 5MB" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const ext = kind(buf);
    if (!ext) return Response.json({ message: "只能上传 jpg / png / webp 图片" }, { status: 400 });
    const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 8) + "." + ext;
    await writeFile(path.join(UPLOAD_DIR, name), buf);
    saved.push(uploadPublicPath(name));
  }
  return Response.json({ paths: saved });
}
