import type { PrismaClient, Prisma } from "@prisma/client";
import { ApiError } from "../../shared/api-error.ts";

export interface CreateNotificationInput {
  accountId: string;
  type: "kontrak" | "pasar" | "sistem";
  title: string;
  description: string;
  linkHref?: string;
  contractId?: string;
}

export async function createNotification(
  client: PrismaClient | Prisma.TransactionClient,
  input: CreateNotificationInput
) {
  return client.notification.create({
    data: {
      accountId: input.accountId,
      type: input.type,
      title: input.title,
      description: input.description,
      linkHref: input.linkHref ?? null,
      contractId: input.contractId ?? null,
    },
  });
}

export async function getUserNotifications(db: PrismaClient, accountId: string) {
  const items = await db.notification.findMany({
    where: { accountId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return items.map((item) => ({
    id: item.id,
    type: item.type,
    category: item.type,
    title: item.title,
    description: item.description,
    linkHref: item.linkHref,
    linkText: item.type === "kontrak" ? "Buka Kontrak" : "Buka Detail",
    isRead: item.isRead,
    createdAt: item.createdAt.toISOString(),
    time: formatTimeAgo(item.createdAt),
    contractId: item.contractId,
    iconType:
      item.type === "kontrak"
        ? "kontrak"
        : item.type === "pasar"
        ? "peringatan"
        : item.title.includes("Selesai") || item.title.includes("Setuju")
        ? "sukses"
        : "sistem",
  }));
}

export async function markAsRead(db: PrismaClient, accountId: string, notificationId: string) {
  const notif = await db.notification.findFirst({
    where: { id: notificationId, accountId },
  });
  if (!notif) {
    throw new ApiError(404, "NOT_FOUND", "Pesan notifikasi tidak ditemukan.");
  }

  const updated = await db.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return { success: true, id: updated.id, isRead: updated.isRead };
}

export async function markAllAsRead(db: PrismaClient, accountId: string) {
  await db.notification.updateMany({
    where: { accountId, isRead: false },
    data: { isRead: true },
  });

  return { success: true };
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Baru saja";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari yang lalu`;
}
