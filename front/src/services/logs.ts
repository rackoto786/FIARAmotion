import { apiClient } from '@/lib/api';

export interface Log {
    id: string;
    action: string;
    entite: string;
    entiteId: string;
    details: string;
    timestamp: string;
    userId: string;
    user: {
        name: string;
        avatar: string | null;
    };
}

export const logsService = {
    async getAll(filters?: { startDate?: string; endDate?: string, startHour?: string, endHour?: string, userId?: string }) {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.startHour) params.append('startHour', filters.startHour);
        if (filters?.endHour) params.append('endHour', filters.endHour);
        if (filters?.userId) params.append('userId', filters.userId);
        const response = await apiClient.get<Log[]>(`/logs?${params.toString()}`);
        return response.data;
    },
};
