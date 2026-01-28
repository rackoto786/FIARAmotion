import { apiClient } from '@/lib/api';
import { User, UserRole } from '@/types';

export const userService = {
    async getAll() {
        const response = await apiClient.get<User[]>('/users');
        return response.data;
    },

    async delete(id: string) {
        await apiClient.delete(`/users/${id}`);
    },

    async updateRole(id: string, role: string) {
        await apiClient.put(`/users/${id}/role`, { role });
    },

    // Future methods for update etc.
};
