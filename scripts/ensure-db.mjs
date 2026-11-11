import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

execSync("npx prisma db push", { stdio: "inherit" });

const db = new PrismaClient();
try {
  const count = await db.user.count();
  if (count === 0) {
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
  }
} finally {
  await db.$disconnect();
}
