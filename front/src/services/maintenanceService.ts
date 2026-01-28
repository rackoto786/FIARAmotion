import { apiClient } from '@/lib/api';
import { Maintenance } from '@/types';

export const maintenanceService = {
  async getAll() {
    const response = await apiClient.get<Maintenance[]>('/maintenance');
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<Maintenance>(`/maintenance/${id}`);
    return response.data;
  },

  async create(data: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>) {
    const response = await apiClient.post<Maintenance>('/maintenance', data);
    return response.data;
  },

  async update(id: string, data: Partial<Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>>) {
    const response = await apiClient.put<Maintenance>(`/maintenance/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    await apiClient.delete(`/maintenance/${id}`);
  },

  async getByVehicle(vehicleId: string) {
    const response = await apiClient.get<Maintenance[]>(`/maintenance/vehicle/${vehicleId}`);
    return response.data;
  },

  async updateStatus(id: string, statut: Maintenance['statut'], description?: string) {
    const response = await apiClient.patch<Maintenance>(`/maintenance/${id}`, { statut, description });
    return response.data;
  },

  async getByStatus(statut: Maintenance['statut']) {
    const response = await apiClient.get<Maintenance[]>(`/maintenance?statut=${statut}`);
    return response.data;
  },
};
