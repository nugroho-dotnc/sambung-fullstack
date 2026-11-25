import { apiClient } from "@/lib/api/client";

export interface NotificationItem {
  id: string;
  category: "kontrak" | "pasar" | "sistem";
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  linkText?: string;
  linkHref?: string;
  iconType: "kontrak" | "sukses" | "peringatan" | "sistem";
  createdAt?: string;
  contractId?: string;
}

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const res = (await apiClient("/notifications")) as { data: NotificationItem[] };
    return res.data;
  },

  async markAsRead(id: string): Promise<{ success: boolean; id: string; isRead: boolean }> {
    const res = (await apiClient(`/notifications/${id}/read`, {
      method: "POST",
      json: {},
    })) as { data: { success: boolean; id: string; isRead: boolean } };
    return res.data;
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    return (await apiClient("/notifications/read-all", {
      method: "POST",
      json: {},
    })) as { success: boolean };
  },
};
