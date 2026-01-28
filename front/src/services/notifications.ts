import { apiClient } from '@/lib/api';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
    timestamp: string;
    isRead: boolean;
}

export const notificationsService = {
    async getAll() {
        const response = await apiClient.get<Notification[]>('/notifications');
        return response.data;
    },

    async markAsRead(id: string) {
        const response = await apiClient.post<{ success: boolean }>(`/notifications/${id}/read`);
        return response.data;
    }
};
