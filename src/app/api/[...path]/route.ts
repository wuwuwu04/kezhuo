import { handle } from "@/server/market";
import { Fail } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: Request, context: { params: { path: string[] } }) {
  try {
    const result = await handle(req, context.params.path || []);
    if (result && typeof result === "object" && "csv" in result) {
      return new Response(String((result as { csv: string }).csv), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=stats.csv",
        },
      });
    }
    return Response.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof Fail) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    console.error(error);
    return Response.json({ message: "系统没有完成这次操作" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
export const PATCH = run;
export const DELETE = run;
