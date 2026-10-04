import type { Prisma } from "@prisma/client";
import { prisma } from "@/data/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export async function notify(
  db: Db,
  input: { userId: string; type: string; title: string; body: string; href?: string },
) {
  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
}
