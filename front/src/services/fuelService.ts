import { apiClient } from '@/lib/api';
import { FuelEntry } from '@/types';

export const fuelService = {
  async getAll(role?: string, email?: string, status?: string) {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (email) params.append('email', email);
    if (status && status !== 'all') params.append('status', status);

    const response = await apiClient.get<FuelEntry[]>(`/fuel?${params.toString()}`);
    return response.data;
  },

  async getById(id: string) {
    const response = await apiClient.get<FuelEntry>(`/fuel/${id}`);
    return response.data;
  },

  async create(data: Omit<FuelEntry, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      // Formatage des données avant envoi
      const formattedData = {
        ...data,
        volume: Number(data.volume),
        cout: Number(data.cout),
        kilometrage: Number(data.kilometrage),
        date: data.date.includes('T') ? data.date.split('T')[0] : data.date // Gestion des deux formats de date
      };

      console.log('Données envoyées au serveur:', formattedData);

      const response = await apiClient.post<FuelEntry>('/fuel', formattedData);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Erreur inconnue';
      console.error('Erreur création entrée carburant:', {
        message: errorMessage,
        response: error.response?.data,
        status: error.response?.status,
        dataSent: data
      });
      throw new Error(errorMessage);
    }
  },

  async update(id: string, data: Partial<Omit<FuelEntry, 'id' | 'createdAt' | 'updatedAt'>>) {
    try {
      const response = await apiClient.put<FuelEntry>(`/fuel/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating fuel entry:', error);
      throw new Error(error.response?.data?.error || 'Erreur lors de la mise à jour de l\'entrée de carburant');
    }
  },

  async delete(id: string) {
    await apiClient.delete(`/fuel/${id}`);
  },

  async getByVehicle(vehicleId: string) {
    const response = await apiClient.get<FuelEntry[]>(`/fuel/vehicle/${vehicleId}`);
    return response.data;
  },

  async getByDriver(driverId: string) {
    const response = await apiClient.get<FuelEntry[]>(`/fuel/driver/${driverId}`);
    return response.data;
  },

  async import(file: File) {
    // Basic client-side validation
    const allowed = ['.xlsx', '.xls'];
    const name = file.name || '';
    const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      throw new Error('Format de fichier non supporté. Utilisez .xlsx ou .xls');
    }
    if (file.size === 0) throw new Error('Le fichier est vide');
    if (file.size > 10 * 1024 * 1024) throw new Error('Fichier trop volumineux (max 10MB)');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // IMPORTANT: the axios instance has a default Content-Type = application/json.
      // For FormData we must allow the browser to set the proper multipart boundary.
      // Passing Content-Type: undefined removes the default so the browser sets the header.
      const response = await apiClient.post('/fuel/import', formData, { headers: { 'Content-Type': undefined } });
      return response.data;
    } catch (err: any) {
      // Surface backend payload (if any) for better diagnostics upstream
      console.error('fuelService.import error response:', err?.response?.data || err.message || err);
      throw err;
    }
  },
};
