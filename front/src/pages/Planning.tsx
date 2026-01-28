import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pencil, Search, Check, X, Archive, Clock, MapPin, Wrench, Calendar, Car } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PLANNING_STATUS_LABELS, PlanningStatus } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const typeConfig: any = {
  mission: { label: 'Mission', color: 'bg-success/20 text-success border-success/30', icon: MapPin },
  maintenance: { label: 'Maintenance', color: 'bg-warning/20 text-warning border-warning/30', icon: Wrench },
  disponible: { label: 'Disponible', color: 'bg-info/20 text-info border-info/30', icon: Clock },
  reserve: { label: 'Réservé', color: 'bg-primary/20 text-primary border-primary/30', icon: Calendar },
};

const Planning: React.FC = () => {
  const { user, permissions } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    vehiculeId: '',
    conducteurId: '',
    dateDebut: '',
    dateFin: '',
    type: 'mission',
    description: ''
  });

  // Queries
  const { data: planningItems = [] } = useQuery({
    queryKey: ['planning'],
    queryFn: async () => (await apiClient.get<any[]>('/planning')).data
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => (await apiClient.get<any[]>('/vehicles')).data
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => (await apiClient.get<any[]>('/drivers')).data
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiClient.post('/planning', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
      toast({
        title: "Succès",
        description: "Réservation créée avec succès",
        variant: "default",
        className: "bg-green-500 text-white"
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.response?.data?.error || "Erreur lors de la création", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => await apiClient.patch(`/planning/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
      toast({
        title: "Succès",
        description: "Réservation mise à jour",
        variant: "default",
        className: "bg-green-500 text-white"
      });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.response?.data?.error || "Erreur de mise à jour", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => await apiClient.delete(`/planning/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning'] });
      toast({
        title: "Succès",
        description: "Réservation supprimée",
        variant: "default",
        className: "bg-green-500 text-white"
      });
      setIsDialogOpen(false);
      resetForm();
    }
  });

  // Handlers
  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      vehiculeId: '',
      conducteurId: '',
      dateDebut: '',
      dateFin: '',
      type: 'mission',
      description: ''
    });
  };

  const handleCreateClick = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setFormData({
      vehiculeId: item.vehiculeId,
      conducteurId: item.conducteurId || '',
      dateDebut: item.dateDebut.split('T')[0],
      dateFin: item.dateFin.split('T')[0],
      type: item.type,
      description: item.description
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (editingItem && confirm("Êtes-vous sûr de vouloir supprimer cette réservation ?")) {
      deleteMutation.mutate(editingItem.id);
    }
  };

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');

  // Derived State
  const today = new Date().toISOString().split('T')[0];
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + i);
    return {
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      dayNum: date.getDate(),
    };
  });

  const getPlanningForDate = (vehicleId: string, date: string) => {
    return planningItems.find((p: any) =>
      p.vehiculeId === vehicleId &&
      date >= p.dateDebut.split('T')[0] &&
      date <= p.dateFin.split('T')[0]
    );
  };

  const filteredVehicles = vehicles.filter((v: any) => {
    const term = searchTerm.toLowerCase();
    const driver = drivers.find((d: any) => d.vehiculeAssigne === v.id);
    const driverName = driver ? `${driver.prenom} ${driver.nom}`.toLowerCase() : '';

    // Search filter
    const matchesSearch = (
      (v.matricule?.toLowerCase() || '').includes(term) ||
      (v.marque?.toLowerCase() || '').includes(term) ||
      driverName.includes(term)
    );

    // Vehicle type filter
    const matchesType = vehicleTypeFilter === 'all' ||
      (v.type_vehicule?.toLowerCase() || '') === vehicleTypeFilter.toLowerCase();

    return matchesSearch && matchesType;
  });

  const planningByVehicle = filteredVehicles.map((vehicle: any) => ({
    vehicle,
    driver: drivers.find((d: any) => d.vehiculeAssigne === vehicle.id),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning"
        description="Vue d'ensemble des planifications"
        icon={Calendar}
        actions={
          <Button className="gap-2" onClick={handleCreateClick}>
            <Plus className="h-4 w-4" />
            Nouvelle réservation
          </Button>
        }
      />

      {/* Search Toolbar */}
      <Card variant="glass">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher véhicule ou chauffeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="voiture">Voiture</SelectItem>
                <SelectItem value="moto">Moto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Semaine du :</span>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full md:w-auto"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedDate(today)}
              title="Aujourd'hui"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Week Calendar Header */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="grid grid-cols-8 gap-2">
            <div className="text-sm font-medium text-muted-foreground">Véhicule</div>
            {weekDays.map(day => (
              <div
                key={day.date}
                className={`text-center p-2 rounded-lg ${day.date === today ? 'bg-primary/10 text-primary' : ''
                  }`}
              >
                <p className="text-xs text-muted-foreground capitalize">{day.day}</p>
                <p className="text-lg font-bold">{day.dayNum}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Planning Grid */}
      <Card variant="glass">
        <CardContent className="p-4 space-y-2">
          {planningByVehicle.length > 0 ? (
            planningByVehicle.map(({ vehicle, driver }: any) => (
              <div key={vehicle.id} className="grid grid-cols-8 gap-2 py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                    <Car className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{vehicle.matricule}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {vehicle.marque}
                    </p>
                  </div>
                </div>

                {weekDays.map(day => {
                  const planning = getPlanningForDate(vehicle.id, day.date);
                  const config = planning ? typeConfig[planning.type] : null;
                  const Icon = config?.icon || Clock;

                  return (
                    <div
                      key={day.date}
                      onClick={() => planning && handleEditClick(planning)}
                      className={`rounded-lg p-2 min-h-[60px] transition-all relative group ${planning
                        ? `${config?.color} border cursor-pointer hover:opacity-80`
                        : 'bg-secondary/30 hover:bg-secondary/50'
                        }`}
                    >
                      {planning && (
                        <div className="flex flex-col h-full">
                          <div className="flex justify-between items-start">
                            <Icon className="h-4 w-4 mb-1" />
                            <div className={`h-2 w-2 rounded-full ${planning.status === 'en_attente' ? 'bg-yellow-500' :
                              planning.status === 'acceptee' ? 'bg-green-500' :
                                planning.status === 'rejetee' ? 'bg-red-500' :
                                  'bg-gray-500'
                              }`} title={PLANNING_STATUS_LABELS[planning.status as PlanningStatus]} />
                          </div>
                          <p className="text-xs font-medium truncate">
                            {config?.label}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucun résultat trouvé pour votre recherche.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Modifier la réservation' : 'Nouvelle réservation'}</DialogTitle>
            <DialogDescription>Remplissez les détails ci-dessous.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Véhicule</Label>
              <Select
                value={formData.vehiculeId}
                onValueChange={(val) => setFormData({ ...formData, vehiculeId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un véhicule" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>{v.marque} {v.modele} ({v.matricule})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conducteur (Optionnel)</Label>
              <Select
                value={formData.conducteurId}
                onValueChange={(val) => setFormData({ ...formData, conducteurId: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un conducteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Début</Label>
                <Input
                  type="date"
                  value={formData.dateDebut}
                  onChange={e => setFormData({ ...formData, dateDebut: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date Fin</Label>
                <Input
                  type="date"
                  value={formData.dateFin}
                  onChange={e => setFormData({ ...formData, dateFin: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => setFormData({ ...formData, type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mission">Mission</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="reserve">Réservé</SelectItem>
                  <SelectItem value="disponible">Disponible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:justify-between flex-col sm:flex-row">
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                {editingItem && (user?.role === 'admin' || user?.role === 'technician' || user?.id === editingItem.createdById) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                )}

                {editingItem && permissions?.canManagePlanning && (
                  <>
                    {editingItem.status === 'en_attente' && (
                      <>
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => {
                            updateMutation.mutate({ id: editingItem.id, data: { ...formData, status: 'acceptee' } });
                          }}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accepter
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            updateMutation.mutate({ id: editingItem.id, data: { ...formData, status: 'rejetee' } });
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Rejeter
                        </Button>
                      </>
                    )}
                    {(editingItem.status === 'acceptee') && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          updateMutation.mutate({ id: editingItem.id, data: { ...formData, status: 'cloturee' } });
                        }}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Clôturer
                      </Button>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-2 justify-center sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                {(!editingItem || user?.role === 'admin' || user?.role === 'technician' || user?.id === editingItem.createdById) && (
                  <Button type="submit">Enregistrer</Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Planning;
