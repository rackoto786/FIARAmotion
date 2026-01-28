import React, { useState } from 'react';
import { Maintenance as MaintenanceType, Vehicle } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Eye, Check, MoreHorizontal, Clock, DollarSign, Car, X, Filter, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { formatDateFr, cn } from '@/lib/utils';
import { ImageUpload } from '@/components/common/ImageUpload';
import { StatsCard } from '@/components/dashboard/StatsCard';


const typeLabels: Record<MaintenanceType['type'], string> = {
  revision: 'Révision',
  vidange: 'Vidange',
  freins: 'Freins',
  pneus: 'Pneus',
  autre: 'Autre',
};

const Maintenance: React.FC = () => {
  const { permissions, user } = useAuth();
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceType | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    vehiculeId: '',
    type: 'revision' as MaintenanceType['type'],
    description: '',
    date: '',
    kilometrage: '',
    cout: '',
    prestataire: '',
    statut: 'en_attente' as MaintenanceType['statut'],
    demandeurId: '',
    imageFacture: '',
  });

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const queryClient = useQueryClient();

  const { data: maintenances = [], isLoading, isError } = useQuery<MaintenanceType[]>({
    queryKey: ['maintenances', user?.role, user?.id],
    queryFn: async () => {
      const res = await apiClient.get<MaintenanceType[]>(`/maintenance?role=${user?.role}&userId=${user?.id}`);
      return res.data;
    },
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await apiClient.get<Vehicle[]>('/vehicles');
      return res.data;
    },
  });

  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/drivers');
      return res.data;
    },
  });

  const resetForm = () => {
    setEditingMaintenance(null);
    setSubmitError(null);
    setFormState({
      vehiculeId: '',
      type: 'revision',
      description: '',
      date: '',
      kilometrage: '',
      cout: '',
      prestataire: '',
      statut: 'en_attente',
      demandeurId: user?.id || '',
      imageFacture: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditOpen(true);
  };

  const openEditDialog = (m: MaintenanceType) => {
    setEditingMaintenance(m);
    setSubmitError(null);
    setFormState({
      vehiculeId: m.vehiculeId,
      type: m.type,
      description: m.description,
      date: m.date,
      kilometrage: String(m.kilometrage),
      cout: m.cout ? String(m.cout) : '',
      prestataire: m.prestataire || '',
      statut: m.statut,
      demandeurId: m.demandeurId,
      imageFacture: m.imageFacture || '',
    });
    setIsEditOpen(true);
  };

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null);
      const payload = {
        // ID is optional in backend now, but good to include if updating
        ...(editingMaintenance?.id ? { id: editingMaintenance.id } : {}),
        vehiculeId: formState.vehiculeId,
        type: formState.type,
        description: formState.description,
        date: formState.date,
        kilometrage: Number(formState.kilometrage || 0),
        cout: formState.cout ? Number(formState.cout) : null,
        prestataire: formState.prestataire || null,
        statut: formState.statut,
        demandeurId: editingMaintenance?.demandeurId || user?.id || '1',
      };

      // Ensure date is YYYY-MM-DD
      const formattedPayload = {
        ...payload,
        date: new Date(payload.date).toISOString().split('T')[0]
      };

      if (editingMaintenance) {
        const res = await apiClient.put(`/maintenance/${editingMaintenance.id}`, formattedPayload);
        return res.data;
      } else {
        const res = await apiClient.post('/maintenance', formattedPayload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-recap'] });
      setIsEditOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Erreur inconnue');
    },
  });

  const { isPending: isDeleting, mutate: deleteMutation } = useMutation({
    mutationFn: async (m: MaintenanceType) => {
      await apiClient.delete(`/maintenance/${m.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      const payload = {
        vehiculeId: formState.vehiculeId,
        type: formState.type,
        description: formState.description,
        date: new Date(formState.date).toISOString().split('T')[0],
        kilometrage: Number(formState.kilometrage || 0),
        cout: formState.cout ? Number(formState.cout) : null,
        prestataire: formState.prestataire || null,
        statut: formState.statut,
        demandeurId: editingMaintenance?.demandeurId || user?.id || '1',
        imageFacture: formState.imageFacture || null,
      };

      if (editingMaintenance) {
        await apiClient.put(`/maintenance/${editingMaintenance.id}`, payload);
      } else {
        await apiClient.post('/maintenance', payload);
      }

      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-recap'] });
      setIsEditOpen(false);
      resetForm();
      toast({
        title: "Succès",
        description: "La demande a été enregistrée avec succès.",
        className: "bg-green-500 text-white"
      });
    } catch (error: any) {
      setSubmitError(error?.response?.data?.error || error.message || 'Erreur inconnue');
    }
  };

  const handleApprove = async (maintenance: MaintenanceType) => {
    try {
      await apiClient.patch(`/maintenance/${maintenance.id}`, { statut: 'accepte' });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      toast({
        title: 'Demande acceptée',
        description: `L'entretien pour ${maintenance.vehiculeId} a été approuvé.`,
        className: "bg-green-500 text-white"
      });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (maintenance: MaintenanceType) => {
    try {
      await apiClient.patch(`/maintenance/${maintenance.id}`, { statut: 'rejete' });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      toast({
        title: 'Demande rejetée',
        description: `L'entretien a été rejeté.`,
        variant: 'destructive',
      });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleClose = async (maintenance: MaintenanceType) => {
    try {
      await apiClient.patch(`/maintenance/${maintenance.id}`, { statut: 'cloture' });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-recap'] });
      toast({
        title: 'Entretien clôturé',
        description: `L'entretien pour ${maintenance.vehiculeId} a été marqué comme terminé.`,
        className: "bg-green-500 text-white"
      });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const columns = [
    {
      key: 'vehicule',
      header: 'Véhicule',
      cell: (maintenance: MaintenanceType) => {
        const vehicle = vehicles.find(v => v.id === maintenance.vehiculeId);
        return (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Wrench className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium">{vehicle?.immatriculation}</p>
              <p className="text-xs text-muted-foreground">
                {vehicle?.marque} {vehicle?.modele}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      cell: (maintenance: MaintenanceType) => (
        <Badge variant="outline">{typeLabels[maintenance.type]}</Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (maintenance: MaintenanceType) => (
        <span className="text-sm max-w-[200px] truncate block">
          {maintenance.description}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      cell: (maintenance: MaintenanceType) => (
        <span className="text-sm">{formatDateFr(maintenance.date)}</span>
      ),
    },
    {
      key: 'cout',
      header: 'Coût',
      cell: (maintenance: MaintenanceType) => (
        maintenance.cout ? (
          <span className="font-mono font-medium">
            {maintenance.cout.toLocaleString()} Ar
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      cell: (maintenance: MaintenanceType) => <StatusBadge status={maintenance.statut} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (maintenance: MaintenanceType) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedMaintenance(maintenance);
              setIsViewOpen(true);
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Voir détails
            </DropdownMenuItem>
            {permissions?.canApproveRequests && maintenance.statut === 'en_attente' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleApprove(maintenance)} className="text-success">
                  <Check className="h-4 w-4 mr-2" />
                  Accepter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReject(maintenance)} className="text-destructive">
                  <X className="h-4 w-4 mr-2" />
                  Rejeter
                </DropdownMenuItem>
              </>
            )}
            {/* Action pour clôturer une demande acceptée/en cours */}
            {permissions?.canApproveRequests && (maintenance.statut === 'accepte' || maintenance.statut === 'en_cours') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleClose(maintenance)} className="text-success">
                  <Check className="h-4 w-4 mr-2" />
                  Clôturer
                </DropdownMenuItem>
              </>
            )}

            {permissions?.canManageMaintenance && (
              <>
                <DropdownMenuItem onClick={() => openEditDialog(maintenance)}>
                  <Wrench className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    if (confirm("Supprimer cette maintenance ?")) {
                      try {
                        await apiClient.delete(`/maintenance/${maintenance.id}`);
                        queryClient.invalidateQueries({ queryKey: ['maintenances'] });
                        queryClient.invalidateQueries({ queryKey: ['global-summary'] });
                        queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-recap'] });
                      } catch (error: any) {
                        console.error('Erreur lors de la suppression:', error);
                        toast({
                          title: 'Erreur',
                          description: error.message || 'Erreur lors de la suppression',
                          variant: 'destructive',
                        });
                      }
                    }
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const vehicle = selectedMaintenance
    ? vehicles.find(v => v.id === selectedMaintenance.vehiculeId)
    : null;
  const demandeur = null;

  // Filtered data
  const filteredMaintenances = maintenances.filter(maintenance => {
    // Status Filter
    if (statusFilter !== 'all' && maintenance.statut !== statusFilter) return false;

    // Vehicle Type Filter
    if (vehicleTypeFilter !== 'all') {
      const v = vehicles.find(veh => veh.id === maintenance.vehiculeId);
      if (!v) return false;
      // Normalisation pour comparaison (ex: "Voiture" vs "voiture")
      const type = v.type_vehicule?.toLowerCase();
      if (vehicleTypeFilter === 'moto' && type !== 'moto') return false;
      if (vehicleTypeFilter === 'voiture' && type !== 'voiture') return false;
    }

    // Date Filter
    if (dateFilter) {
      const maintenanceDate = new Date(maintenance.date).toISOString().split('T')[0];
      if (maintenanceDate !== dateFilter) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entretien"
        description="Gestion des maintenances et réparations"
        icon={Wrench}
        actions={
          <Button className="gap-2" onClick={openCreateDialog}>
            <Wrench className="h-4 w-4" />
            Nouvelle demande
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="py-10 text-center text-sm text-destructive">
          Impossible de charger les maintenances. Vérifiez que l’API est démarrée.
        </div>
      ) : (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatsCard
              title="En attente"
              value={maintenances.filter(m => m.statut === 'en_attente').length.toString()}
              subtitle="Nouveaux rapports"
              icon={Clock}
              variant="warning"
            />
            <StatsCard
              title="En cours"
              value={maintenances.filter(m => m.statut === 'en_cours').length.toString()}
              subtitle="Interventions"
              icon={Wrench}
              variant="info"
            />
            <StatsCard
              title="Clôturés"
              value={maintenances.filter(m => m.statut === 'cloture').length.toString()}
              subtitle="Historique"
              icon={CheckCircle}
              variant="success"
            />
            <StatsCard
              title="Total (Ar)"
              value={`${(maintenances.reduce((acc, m) => acc + (m.cout || 0), 0) / 1000).toFixed(0)}k`}
              subtitle="Coût total"
              icon={DollarSign}
              variant="primary"
            />
          </div>


          <DataTable
            data={filteredMaintenances}
            columns={columns}
            searchPlaceholder="Rechercher une description..."
            searchKeys={['description']}
            extraFilters={
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn(
                      "rounded-full border-primary/10 gap-2 px-4 h-10",
                      (statusFilter !== 'all' || vehicleTypeFilter !== 'all' || dateFilter !== '') && "bg-primary/5 border-primary/20"
                    )}>
                      <Filter className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Filtrer</span>
                      {(statusFilter !== 'all' || vehicleTypeFilter !== 'all' || dateFilter !== '') && (
                        <Badge variant="glow" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {(statusFilter !== 'all' ? 1 : 0) + (vehicleTypeFilter !== 'all' ? 1 : 0) + (dateFilter !== '' ? 1 : 0)}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 border-primary/10 bg-background/95 backdrop-blur-xl" align="end">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold leading-none">Filtres Maintenance</h4>
                        {(statusFilter !== 'all' || vehicleTypeFilter !== 'all' || dateFilter !== '') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setStatusFilter('all'); setVehicleTypeFilter('all'); setDateFilter(''); }}
                            className="h-8 pr-2 pl-2 text-xs text-muted-foreground hover:text-primary"
                          >
                            Effacer
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase opacity-50">Statut</Label>
                          <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-9 bg-muted/30 border-primary/5">
                              <SelectValue placeholder="Tous les statuts" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les statuts</SelectItem>
                              <SelectItem value="en_attente">En attente</SelectItem>
                              <SelectItem value="en_cours">En cours</SelectItem>
                              <SelectItem value="accepte">Acceptée</SelectItem>
                              <SelectItem value="rejete">Rejetée</SelectItem>
                              <SelectItem value="cloture">Clôturée</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase opacity-50">Type de véhicule</Label>
                          <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                            <SelectTrigger className="h-9 bg-muted/30 border-primary/5">
                              <SelectValue placeholder="Tous les types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les types</SelectItem>
                              <SelectItem value="voiture">Voiture</SelectItem>
                              <SelectItem value="moto">Moto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase opacity-50">Date</Label>
                          <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="h-9 bg-muted/30 border-primary/5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {(statusFilter !== 'all' || vehicleTypeFilter !== 'all' || dateFilter !== '') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setStatusFilter('all'); setVehicleTypeFilter('all'); setDateFilter(''); }}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            }
          />
        </>
      )}

      {/* Maintenance Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Détails de l'entretien
            </DialogTitle>
            <DialogDescription>
              {typeLabels[selectedMaintenance?.type || 'autre']}
            </DialogDescription>
          </DialogHeader>

          {selectedMaintenance && (
            <div className="space-y-4">
              {/* Boutons d'action en haut pour visibilité */}
              {permissions?.canApproveRequests && selectedMaintenance.statut === 'en_attente' && (
                <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border-2 border-dashed border-warning">
                  <Button variant="success" className="flex-1 gap-2" onClick={() => {
                    handleApprove(selectedMaintenance);
                    setIsViewOpen(false);
                  }}>
                    <Check className="h-4 w-4" />
                    Accepter
                  </Button>
                  <Button variant="destructive" className="flex-1 gap-2" onClick={() => {
                    handleReject(selectedMaintenance);
                    setIsViewOpen(false);
                  }}>
                    <X className="h-4 w-4" />
                    Rejeter
                  </Button>
                </div>
              )}

              {/* Bouton pour clôturer dans le détail */}
              {permissions?.canApproveRequests && (selectedMaintenance.statut === 'accepte' || selectedMaintenance.statut === 'en_cours') && (
                <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border-2 border-dashed border-success">
                  <Button variant="success" className="flex-1 gap-2 w-full" onClick={() => {
                    handleClose(selectedMaintenance);
                    setIsViewOpen(false);
                  }}>
                    <Check className="h-4 w-4" />
                    Clôturer l'entretien
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{vehicle?.immatriculation}</p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle?.marque} {vehicle?.modele}
                    </p>
                  </div>
                </div>
                <StatusBadge status={selectedMaintenance.statut} />
              </div>

              <Card variant="outline">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{selectedMaintenance.description}</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card variant="outline">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{formatDateFr(selectedMaintenance.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kilométrage</span>
                      <span className="font-mono">{selectedMaintenance.kilometrage.toLocaleString()} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Demandeur</span>
                      <span className="font-medium">{demandeur?.name || '-'}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card variant="outline">
                  <CardContent className="p-4 space-y-2">
                    {selectedMaintenance.cout && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coût</span>
                        <span className="font-mono font-medium">
                          {selectedMaintenance.cout.toLocaleString()} Ar
                        </span>
                      </div>
                    )}
                    {selectedMaintenance.prestataire && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Prestataire</span>
                        <span className="font-medium">{selectedMaintenance.prestataire}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Image de la facture */}
              {selectedMaintenance.imageFacture && (
                <Card variant="outline">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Facture
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-center">
                      <img
                        src={selectedMaintenance.imageFacture}
                        alt="Facture"
                        className="max-h-96 rounded-lg border-2 border-border object-contain"
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Maintenance Create / Edit Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {editingMaintenance ? 'Modifier une maintenance' : 'Nouvelle demande'}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations d'entretien.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehiculeId">Véhicule</Label>
              <select
                id="vehiculeId"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formState.vehiculeId}
                onChange={(e) => setFormState({ ...formState, vehiculeId: e.target.value })}
                required
              >
                <option value="">Sélectionner</option>
                {vehicles
                  .filter(v => {
                    if (user?.role !== 'collaborator') return true;
                    // Find the driver corresponding to the user email
                    const currentDriver = drivers?.find((d: any) => d.email.toLowerCase() === user?.email.toLowerCase());
                    return v.id === currentDriver?.vehiculeAssigne;
                  })
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation} — {v.marque} {v.modele}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formState.type}
                onChange={(e) =>
                  setFormState({ ...formState, type: e.target.value as MaintenanceType['type'] })
                }
              >
                <option value="revision">Révision</option>
                <option value="vidange">Vidange</option>
                <option value="freins">Freins</option>
                <option value="pneus">Pneus</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formState.date}
                  onChange={(e) => setFormState({ ...formState, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kilometrage">Kilométrage</Label>
                <Input
                  id="kilometrage"
                  type="number"
                  value={formState.kilometrage}
                  onChange={(e) => setFormState({ ...formState, kilometrage: e.target.value })}
                  min={0}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cout">Coût (Ar)</Label>
                <Input
                  id="cout"
                  type="number"
                  value={formState.cout}
                  onChange={(e) => setFormState({ ...formState, cout: e.target.value })}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prestataire">Prestataire</Label>
                <Input
                  id="prestataire"
                  value={formState.prestataire}
                  onChange={(e) => setFormState({ ...formState, prestataire: e.target.value })}
                />
              </div>
            </div>

            {/* Image de facture */}
            <div className="space-y-2">
              <ImageUpload
                label="Image de la facture"
                value={formState.imageFacture}
                onChange={(base64) => setFormState({ ...formState, imageFacture: base64 })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {submitError && (
                <div className="text-sm text-destructive flex-1">{submitError}</div>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  resetForm();
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : editingMaintenance ? 'Enregistrer' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;
