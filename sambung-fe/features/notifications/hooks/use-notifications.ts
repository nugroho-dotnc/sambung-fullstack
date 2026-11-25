"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService, type NotificationItem } from "../services/notification.service";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationQueryKeys.all,
    queryFn: () => notificationService.getNotifications(),
    refetchInterval: 10000, // Polling setiap 10 detik agar pembaruan transaksi dari perangkat lawan muncul
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<NotificationItem[]>(notificationQueryKeys.all, (old) => {
        if (!old) return [];
        return old.map((n) => (n.id === updated.id ? { ...n, isRead: true } : n));
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.setQueryData<NotificationItem[]>(notificationQueryKeys.all, (old) => {
        if (!old) return [];
        return old.map((n) => ({ ...n, isRead: true }));
      });
    },
  });
}
