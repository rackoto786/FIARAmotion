import React, { useState } from 'react';
import { mockDrivers } from '@/data/mockData';
import { Vehicle } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { VehicleStatusBadge } from '@/components/common/VehicleStatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Car, Eye, Edit, Trash2, MoreHorizontal, FileText, Activity, Wrench, CreditCard, Users, Image as ImageIcon, CheckCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDateFr } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/common/ImageUpload';
import { MaintenanceRecapTable } from '@/components/vehicles/MaintenanceRecapTable';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { apiClient } from '@/lib/api';


// Initial form state matching the new Vehicle interface
const initialFormState: Partial<Vehicle> = {
  image_128: '',
  immatriculation: '',
  marque: '',
  modele: '',
  type_vehicule: 'voiture',
  autre_type_vehicule: '',
  puissance: 0,
  date_acquisition: '',
  date_mise_circulation: '',
  kilometrage_actuel: 0,
  numero_chassis: '',
  couleur: '',
  annee_fabrication: new Date().getFullYear(),
  carburant: 'essence',
  statut: 'principale',
  sous_statut_principale: '',
  sous_statut_technique: '',
  sous_statut_exceptionnel: '',
  capacite_reservoir: 0,
  ref_pneu_av: '',
  ref_pneu_ar: '',
  numero_moteur: '',
  compteur_huile: 0,
  compteur_filtre: 0,
  detenteur: '',
  numero_serie_type: '',
  valeur_acquisition: 0,
  anciennete: '',
  cout_entretien_annuel: 0,
  observations: '',
  num_ancienne_carte_carburant: '',
  num_nouvelle_carte_carburant: '',
  code_nouvelle_carte_carburant: '',
  porteur_carte_carburant: '',
  card_holder_name: '',
  date_expiration_carburant: '',
  conducteur_id: '',
  service_id: '',
  notes: '',
  vidange_interval_km: 1000,
  last_vidange_km: 0,
  filtre_interval_km: 1000,
  last_filtre_km: 0,
};

const Vehicles: React.FC = () => {
  const { permissions } = useAuth();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formState, setFormState] = useState<Partial<Vehicle>>(initialFormState);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const queryClient = useQueryClient();

  const { data: vehicles = [], isLoading, isError } = useQuery<Vehicle[]>({
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

  const filteredVehicles = vehicles.filter(vehicle => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'disponible') {
      return vehicle.statut === 'principale' && vehicle.sous_statut_principale === 'disponible';
    }
    if (statusFilter === 'maintenance') {
      return vehicle.statut === 'technique';
    }
    if (statusFilter === 'mission') {
      return ['en_deplacement', 'occupee', 'reservee'].includes(vehicle.sous_statut_principale || '');
    }
    return true;
  });

  const resetForm = () => {
    setEditingVehicle(null);
    setFormState(initialFormState);
    setSubmitError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditOpen(true);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormState({
      ...initialFormState, // Ensure defaults first
      ...vehicle,
      // Overwrite specific fields that might be null/undefined to ensure they are controlled
      image_128: vehicle.image_128 || '',
      puissance: vehicle.puissance || 0,
      kilometrage_actuel: vehicle.kilometrage_actuel || 0,
      capacite_reservoir: vehicle.capacite_reservoir || 0,
      valeur_acquisition: vehicle.valeur_acquisition || 0,
      cout_entretien_annuel: vehicle.cout_entretien_annuel || 0,
      annee_fabrication: vehicle.annee_fabrication || new Date().getFullYear(),
      compteur_huile: vehicle.compteur_huile || 0,
      compteur_filtre: vehicle.compteur_filtre || 0,
      autre_type_vehicule: vehicle.autre_type_vehicule || '',
      numero_chassis: vehicle.numero_chassis || '',
      couleur: vehicle.couleur || '',
      carburant: vehicle.carburant || 'essence',
      sous_statut_principale: vehicle.sous_statut_principale || '',
      sous_statut_technique: vehicle.sous_statut_technique || '',
      sous_statut_exceptionnel: vehicle.sous_statut_exceptionnel || '',
      ref_pneu_av: vehicle.ref_pneu_av || '',
      ref_pneu_ar: vehicle.ref_pneu_ar || '',
      numero_moteur: vehicle.numero_moteur || '',
      detenteur: vehicle.detenteur || '',
      numero_serie_type: vehicle.numero_serie_type || '',
      anciennete: vehicle.anciennete || '',
      observations: vehicle.observations || '',
      num_ancienne_carte_carburant: vehicle.num_ancienne_carte_carburant || '',
      num_nouvelle_carte_carburant: vehicle.num_nouvelle_carte_carburant || '',
      code_nouvelle_carte_carburant: vehicle.code_nouvelle_carte_carburant || '',
      porteur_carte_carburant: vehicle.porteur_carte_carburant || '',
      card_holder_name: vehicle.card_holder_name || '',
      date_expiration_carburant: vehicle.date_expiration_carburant || '',
      conducteur_id: vehicle.conducteur_id || '',
      service_id: vehicle.service_id || '',
      notes: vehicle.notes || '',
      vidange_interval_km: vehicle.vidange_interval_km || 1000,
      last_vidange_km: vehicle.last_vidange_km || 0,
      vidange_alert_sent: vehicle.vidange_alert_sent || false,
      filtre_interval_km: vehicle.filtre_interval_km || 1000,
      last_filtre_km: vehicle.last_filtre_km || 0,
      filtre_alert_sent: vehicle.filtre_alert_sent || false,
    });
    setIsEditOpen(true);
  };

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null);

      // Manual Validation
      const requiredFields = [
        { key: 'immatriculation', label: 'Immatriculation' },
        { key: 'marque', label: 'Marque' },
        { key: 'modele', label: 'Modèle' },
        { key: 'date_acquisition', label: "Date d'acquisition" },
        { key: 'date_mise_circulation', label: 'Mise en circulation' },
      ];

      const missing = requiredFields.filter(f => !formState[f.key as keyof Vehicle]);

      if (missing.length > 0) {
        throw new Error(`Veuillez remplir les champs obligatoires : ${missing.map(f => f.label).join(', ')}`);
      }

      // Prepare payload
      const payload = {
        ...formState,
        id: editingVehicle?.id ?? crypto.randomUUID(),
        // Ensure conversions if inputs are strings
        puissance: Number(formState.puissance),
        kilometrage_actuel: Number(formState.kilometrage_actuel),
        capacite_reservoir: Number(formState.capacite_reservoir),
        valeur_acquisition: Number(formState.valeur_acquisition),
        cout_entretien_annuel: Number(formState.cout_entretien_annuel),
        annee_fabrication: Number(formState.annee_fabrication),
        compteur_huile: Number(formState.compteur_huile),
        compteur_filtre: Number(formState.compteur_filtre),
      };

      const url = editingVehicle
        ? `/vehicles/${editingVehicle.id}`
        : '/vehicles';

      const res = editingVehicle
        ? await apiClient.put(url, payload)
        : await apiClient.post(url, payload);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsEditOpen(false);
      resetForm();
      toast({
        title: "Succès",
        description: "Le véhicule a été enregistré avec succès.",
        variant: "default",
        className: "bg-green-500 text-white"
      });
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Erreur inconnue');
      toast({
        title: "Erreur de validation",
        description: err?.message || 'Vérifiez le formulaire',
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      await apiClient.delete(`/vehicles/${vehicle.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: "Succès",
        description: "Le véhicule a été supprimé avec succès.",
        variant: "default",
        className: "bg-green-500 text-white"
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de supprimer le véhicule",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate();
  };

  const columns = [
    {
      key: 'immatriculation',
      header: 'Immatriculation',
      cell: (vehicle: Vehicle) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 has-tooltip rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
            {vehicle.image_128 ? (
              <img src={vehicle.image_128} alt={vehicle.modele} className="h-full w-full object-cover" />
            ) : (
              <Car className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium">{vehicle.immatriculation}</p>
            <p className="text-xs text-muted-foreground">
              {vehicle.marque} {vehicle.modele}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type_vehicule',
      header: 'Type',
      cell: (vehicle: Vehicle) => (
        <Badge variant="outline">{vehicle.type_vehicule}</Badge>
      ),
    },
    {
      key: 'kilometrage_actuel',
      header: 'Kilométrage',
      cell: (vehicle: Vehicle) => (
        <span className="font-mono">{vehicle.kilometrage_actuel?.toLocaleString()} km</span>
      ),
    },
    {
      key: 'statut',
      header: 'Statut',
      cell: (vehicle: Vehicle) => <VehicleStatusBadge vehicle={vehicle} />,
    },
    {
      key: 'detenteur',
      header: 'Détenteur',
      cell: (vehicle: Vehicle) => (
        <span className="text-muted-foreground">{vehicle.detenteur || '-'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (vehicle: Vehicle) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedVehicle(vehicle);
              setIsViewOpen(true);
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Voir détails
            </DropdownMenuItem>
            {permissions?.canManageVehicles && (
              <>
                <DropdownMenuItem
                  onClick={() => openEditDialog(vehicle)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm('Supprimer ce véhicule ?')) {
                      deleteMutation.mutate(vehicle);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const updateField = (field: keyof Vehicle, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Véhicules"
        description="Gestion complète du parc automobile"
        icon={Car}
        actions={
          permissions?.canManageVehicles && (
            <Button className="gap-2" onClick={openCreateDialog}>
              <Car className="h-4 w-4" />
              Ajouter un véhicule
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Véhicules"
          value={vehicles.length.toString()}
          subtitle="Flotte totale"
          icon={Car}
          variant="primary"
        />
        <StatsCard
          title="Disponibles"
          value={vehicles.filter(v => v.statut === 'principale' && v.sous_statut_principale === 'disponible').length.toString()}
          subtitle="Prêts à partir"
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="En Maintenance"
          value={vehicles.filter(v => v.statut === 'technique').length.toString()}
          subtitle="Indisponibles technique"
          icon={Wrench}
          variant="warning"
        />
        <StatsCard
          title="En Mission"
          value={vehicles.filter(v => ['en_deplacement', 'occupee', 'reservee'].includes(v.sous_statut_principale || '')).length.toString()}
          subtitle="Sur la route"
          icon={Activity}
          variant="info"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="py-10 text-center text-sm text-destructive">
          Impossible de charger les véhicules.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="w-[200px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les véhicules</SelectItem>
                  <SelectItem value="disponible">Disponibles</SelectItem>
                  <SelectItem value="maintenance">En Maintenance</SelectItem>
                  <SelectItem value="mission">En Mission</SelectItem>
                </SelectContent>
              </Select >
            </div >
          </div >
          <DataTable
            data={filteredVehicles}
            columns={columns}
            searchPlaceholder="Rechercher par immatriculation..."
            searchKeys={['immatriculation', 'marque', 'modele']}
          />
        </div >
      )}

      {/* View Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-primary" />
              Fiche Véhicule: {selectedVehicle?.immatriculation}
            </DialogTitle>
            <DialogDescription>
              {selectedVehicle?.marque} {selectedVehicle?.modele} ({selectedVehicle?.annee_fabrication})
            </DialogDescription>
          </DialogHeader>

          {selectedVehicle && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="status">Statut</TabsTrigger>
                <TabsTrigger value="technical">Technique</TabsTrigger>
                <TabsTrigger value="maintenance">Entretien</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="card">Carte</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                {/* Vehicle Image */}
                {selectedVehicle.image_128 && (
                  <div className="flex justify-center">
                    <img
                      src={selectedVehicle.image_128}
                      alt={`${selectedVehicle.marque} ${selectedVehicle.modele}`}
                      className="max-h-64 rounded-lg border-2 border-border object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Card><CardHeader><CardTitle>Détails</CardTitle></CardHeader><CardContent className="space-y-2">
                    <p><strong>Immatriculation:</strong> {selectedVehicle.immatriculation}</p>
                    <p><strong>Marque:</strong> {selectedVehicle.marque}</p>
                    <p><strong>Modèle:</strong> {selectedVehicle.modele}</p>
                    <p><strong>Type:</strong> {selectedVehicle.type_vehicule}</p>
                    {selectedVehicle.autre_type_vehicule && (
                      <p><strong>Autre type:</strong> {selectedVehicle.autre_type_vehicule}</p>
                    )}
                    <p><strong>Carburant:</strong> {selectedVehicle.carburant || '-'}</p>
                    <p><strong>Couleur:</strong> {selectedVehicle.couleur || '-'}</p>
                    <p><strong>N° Châssis:</strong> {selectedVehicle.numero_chassis || '-'}</p>
                  </CardContent></Card>
                  <Card><CardHeader><CardTitle>Dates</CardTitle></CardHeader><CardContent className="space-y-2">
                    <p><strong>Acquisition:</strong> {formatDateFr(selectedVehicle.date_acquisition)}</p>
                    <p><strong>Mise en circulation:</strong> {formatDateFr(selectedVehicle.date_mise_circulation)}</p>
                    <p><strong>Année fabrication:</strong> {selectedVehicle.annee_fabrication || '-'}</p>
                  </CardContent></Card>
                </div>
              </TabsContent>

              <TabsContent value="status" className="space-y-4 mt-4">
                <Card>
                  <CardHeader><CardTitle>Statut du véhicule</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <strong>Statut actuel:</strong>
                      <div className="mt-2">
                        <VehicleStatusBadge vehicle={selectedVehicle} />
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-2">Détails:</p>
                      <div className="space-y-1">
                        <p><strong>Catégorie:</strong> {
                          selectedVehicle.statut === 'principale' ? 'Principale' :
                            selectedVehicle.statut === 'technique' ? 'Technique' :
                              selectedVehicle.statut === 'exceptionnel' ? 'Exceptionnel' : '-'
                        }</p>
                        {selectedVehicle.sous_statut_principale && (
                          <p><strong>État:</strong> {
                            selectedVehicle.sous_statut_principale === 'disponible' ? 'Disponible' :
                              selectedVehicle.sous_statut_principale === 'reservee' ? 'Réservée' :
                                selectedVehicle.sous_statut_principale === 'en_deplacement' ? 'En déplacement' :
                                  selectedVehicle.sous_statut_principale === 'occupee' ? 'Occupée' :
                                    selectedVehicle.sous_statut_principale
                          }</p>
                        )}
                        {selectedVehicle.sous_statut_technique && (
                          <p><strong>Raison:</strong> {
                            selectedVehicle.sous_statut_technique === 'en_reparation' ? 'En réparation' :
                              selectedVehicle.sous_statut_technique === 'entretien_periodique' ? 'Entretien périodique' :
                                selectedVehicle.sous_statut_technique
                          }</p>
                        )}
                        {selectedVehicle.sous_statut_exceptionnel && (
                          <p><strong>Situation:</strong> {
                            selectedVehicle.sous_statut_exceptionnel === 'vole' ? 'Volé' :
                              selectedVehicle.sous_statut_exceptionnel === 'vendu' ? 'Vendu' :
                                selectedVehicle.sous_statut_exceptionnel === 'detruit' ? 'Détruit' :
                                  selectedVehicle.sous_statut_exceptionnel === 'reforme' ? 'Réformé' :
                                    selectedVehicle.sous_statut_exceptionnel
                          }</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="technical" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Informations Techniques
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Kilométrage actuel</p>
                        <p className="font-medium">{selectedVehicle.kilometrage_actuel?.toLocaleString() || 0} km</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Puissance</p>
                        <p className="font-medium">{selectedVehicle.puissance || '-'} CV</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Capacité de réservoir (L)</p>
                        <p className="font-medium">{selectedVehicle.capacite_reservoir || '-'} L</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">N° Moteur</p>
                        <p className="font-medium">{selectedVehicle.numero_moteur || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pneus Avant (Ref)</p>
                        <p className="font-medium">{selectedVehicle.ref_pneu_av || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pneus Arrière (Ref)</p>
                        <p className="font-medium">{selectedVehicle.ref_pneu_ar || '-'}</p>
                      </div>
                      <div className="col-span-2 mt-4 pt-4 border-t border-border/50">
                        <p className="text-sm font-bold text-primary mb-3">Seuils de Maintenance (Kilométrage)</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20">
                            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400">VIDANGE</p>
                            <p className="text-lg font-bold">{(selectedVehicle.last_vidange_km || 0) + (selectedVehicle.vidange_interval_km || 1000)} km</p>
                            <p className="text-xs text-yellow-600">Intervalle : {selectedVehicle.vidange_interval_km} km</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20">
                            <p className="text-xs font-bold text-blue-800 dark:text-blue-400">FILTRE</p>
                            <p className="text-lg font-bold">{(selectedVehicle.last_filtre_km || 0) + (selectedVehicle.filtre_interval_km || 1000)} km</p>
                            <p className="text-xs text-blue-600">Intervalle : {selectedVehicle.filtre_interval_km} km</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="admin" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Informations Administratives
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Détenteur</p>
                        <p className="font-medium">{selectedVehicle.detenteur || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">N° Série Type</p>
                        <p className="font-medium">{selectedVehicle.numero_serie_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valeur d'acquisition</p>
                        <p className="font-medium">{selectedVehicle.valeur_acquisition ? `${selectedVehicle.valeur_acquisition.toLocaleString()} Ar` : '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Coût entretien annuel</p>
                        <p className="font-medium">{selectedVehicle.cout_entretien_annuel ? `${selectedVehicle.cout_entretien_annuel.toLocaleString()} Ar` : '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Ancienneté</p>
                        <p className="font-medium">{selectedVehicle.anciennete || '-'}</p>
                      </div>
                      {selectedVehicle.observations && (
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground">Observations</p>
                          <p className="font-medium whitespace-pre-wrap">{selectedVehicle.observations}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="card" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Carte Carburant
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">N° Ancienne carte</p>
                        <p className="font-medium">{selectedVehicle.num_ancienne_carte_carburant || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">N° Nouvelle carte</p>
                        <p className="font-medium">{selectedVehicle.num_nouvelle_carte_carburant || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Code carte</p>
                        <p className="font-medium">{selectedVehicle.code_nouvelle_carte_carburant || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Porteur carte</p>
                        <p className="font-medium">{selectedVehicle.porteur_carte_carburant || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Card Holder Name</p>
                        <p className="font-medium">{selectedVehicle.card_holder_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date d'expiration</p>
                        <p className="font-medium">{selectedVehicle.date_expiration_carburant ? formatDateFr(selectedVehicle.date_expiration_carburant) : '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="maintenance" className="mt-4">
                {selectedVehicle && <MaintenanceRecapTable vehicleId={selectedVehicle.id} />}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Modifier le véhicule' : 'Nouveau véhicule'}
            </DialogTitle>
            <DialogDescription>Remplissez les informations ci-dessous.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-6 mb-4">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="status">Statut</TabsTrigger>
                <TabsTrigger value="technical">Technique</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="card">Carte</TabsTrigger>
                <TabsTrigger value="relations">Relations</TabsTrigger>
              </TabsList>

              {/* === TAB: GENERAL === */}
              <TabsContent value="general" className="space-y-4">
                {/* Image Upload - Full width */}
                <div className="col-span-3">
                  <ImageUpload
                    label="Image du véhicule"
                    value={formState.image_128}
                    onChange={(base64) => updateField('image_128', base64)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Immatriculation *</Label>
                    <Input required value={formState.immatriculation} onChange={e => updateField('immatriculation', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Marque *</Label>
                    <Input required value={formState.marque} onChange={e => updateField('marque', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Modèle *</Label>
                    <Input required value={formState.modele} onChange={e => updateField('modele', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formState.type_vehicule} onValueChange={v => updateField('type_vehicule', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voiture">Voiture</SelectItem>
                        <SelectItem value="utilitaire">Utilitaire</SelectItem>
                        <SelectItem value="moto">Moto</SelectItem>
                        <SelectItem value="camion">Camion</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formState.type_vehicule === 'autre' && (
                    <div className="space-y-2">
                      <Label>Précision type</Label>
                      <Input value={formState.autre_type_vehicule} onChange={e => updateField('autre_type_vehicule', e.target.value)} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Carburant</Label>
                    <Select value={formState.carburant} onValueChange={v => updateField('carburant', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="essence">Essence</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="hybride">Hybride</SelectItem>
                        <SelectItem value="electrique">Électrique</SelectItem>
                        <SelectItem value="gpl">GPL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Couleur</Label>
                    <Input value={formState.couleur} onChange={e => updateField('couleur', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Année fab.</Label>
                    <Input type="number" value={formState.annee_fabrication} onChange={e => updateField('annee_fabrication', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro Châssis</Label>
                    <Input value={formState.numero_chassis} onChange={e => updateField('numero_chassis', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date Acquisition</Label>
                    <Input type="date" required value={formState.date_acquisition} onChange={e => updateField('date_acquisition', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mise en circulation</Label>
                    <Input type="date" required value={formState.date_mise_circulation} onChange={e => updateField('date_mise_circulation', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              {/* === TAB: STATUT === */}
              <TabsContent value="status" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Statut Principal</Label>
                    <Select
                      value={formState.statut}
                      onValueChange={v => {
                        updateField('statut', v);
                        // Reset sub-statuses when main status changes
                        updateField('sous_statut_principale', '');
                        updateField('sous_statut_technique', '');
                        updateField('sous_statut_exceptionnel', '');
                      }}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="principale">Principale (En service)</SelectItem>
                        <SelectItem value="technique">Technique (Maintenance)</SelectItem>
                        <SelectItem value="exceptionnel">Exceptionnel (Hors service)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formState.statut === 'principale' && (
                    <div className="space-y-2">
                      <Label>État (Principale)</Label>
                      <Select value={formState.sous_statut_principale} onValueChange={v => updateField('sous_statut_principale', v)}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner l'état" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="reservee">Réservée</SelectItem>
                          <SelectItem value="en_deplacement">En déplacement</SelectItem>
                          <SelectItem value="occupee">Occupée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formState.statut === 'technique' && (
                    <div className="space-y-2">
                      <Label>État (Technique)</Label>
                      <Select value={formState.sous_statut_technique} onValueChange={v => updateField('sous_statut_technique', v)}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner la raison" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en_reparation">En réparation</SelectItem>
                          <SelectItem value="entretien_periodique">Entretien périodique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formState.statut === 'exceptionnel' && (
                    <div className="space-y-2">
                      <Label>Situation (Exceptionnel)</Label>
                      <Select value={formState.sous_statut_exceptionnel} onValueChange={v => updateField('sous_statut_exceptionnel', v)}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner la situation" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vole">Volé</SelectItem>
                          <SelectItem value="vendu">Vendu</SelectItem>
                          <SelectItem value="detruit">Détruit</SelectItem>
                          <SelectItem value="reforme">Réformé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* === TAB: TECHNIQUE === */}
              <TabsContent value="technical" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kilométrage Actuel</Label>
                    <Input type="number" value={formState.kilometrage_actuel} onChange={e => updateField('kilometrage_actuel', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Puissance (CV)</Label>
                    <Input type="number" value={formState.puissance} onChange={e => updateField('puissance', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Capacité de réservoir (L)</Label>
                    <Input type="number" value={formState.capacite_reservoir} onChange={e => updateField('capacite_reservoir', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>N° Moteur</Label>
                    <Input value={formState.numero_moteur} onChange={e => updateField('numero_moteur', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pneus Avant (Ref)</Label>
                    <Input value={formState.ref_pneu_av} onChange={e => updateField('ref_pneu_av', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Pneus Arrière (Ref)</Label>
                    <Input value={formState.ref_pneu_ar} onChange={e => updateField('ref_pneu_ar', e.target.value)} />
                  </div>
                  <div className="space-y-2 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                    <Label className="text-yellow-800 dark:text-yellow-400 font-bold">Vidange (Intervalle km)</Label>
                    <Input type="number"
                      value={formState.vidange_interval_km}
                      onChange={e => updateField('vidange_interval_km', e.target.value)}
                    />
                    <p className="text-[10px] text-yellow-600">Dernière à : {formState.last_vidange_km} km</p>
                  </div>
                  <div className="space-y-2 bg-blue-50 dark:bg-blue-900/10 p-2 rounded-lg border border-blue-100 dark:border-blue-900/20">
                    <Label className="text-blue-800 dark:text-blue-400 font-bold">Filtre (Intervalle km)</Label>
                    <Input type="number"
                      value={formState.filtre_interval_km}
                      onChange={e => updateField('filtre_interval_km', e.target.value)}
                    />
                    <p className="text-[10px] text-blue-600">Dernière à : {formState.last_filtre_km} km</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Compteur Huile</Label>
                    <Input type="number" value={formState.compteur_huile} onChange={e => updateField('compteur_huile', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Compteur Filtre</Label>
                    <Input type="number" value={formState.compteur_filtre} onChange={e => updateField('compteur_filtre', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              {/* === TAB: ADMIN === */}
              <TabsContent value="admin" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Détenteur</Label>
                    <Input value={formState.detenteur} onChange={e => updateField('detenteur', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro Série Type</Label>
                    <Input value={formState.numero_serie_type} onChange={e => updateField('numero_serie_type', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Valeur Acquisition</Label>
                    <Input type="number" value={formState.valeur_acquisition} onChange={e => updateField('valeur_acquisition', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Coût Entretien Annuel Est.</Label>
                    <Input type="number" value={formState.cout_entretien_annuel} onChange={e => updateField('cout_entretien_annuel', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observations</Label>
                  <Textarea value={formState.observations} onChange={e => updateField('observations', e.target.value)} />
                </div>
              </TabsContent>

              {/* === TAB: CARTE === */}
              <TabsContent value="card" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Numéro Carte (Nouveau)</Label>
                    <Input value={formState.num_nouvelle_carte_carburant} onChange={e => updateField('num_nouvelle_carte_carburant', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Code Carte</Label>
                    <Input value={formState.code_nouvelle_carte_carburant} onChange={e => updateField('code_nouvelle_carte_carburant', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Porteur Carte</Label>
                    <Input value={formState.porteur_carte_carburant} onChange={e => updateField('porteur_carte_carburant', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Expiration</Label>
                    <Input type="date" value={formState.date_expiration_carburant} onChange={e => updateField('date_expiration_carburant', e.target.value)} />
                  </div>
                </div>
              </TabsContent>

              {/* === TAB: RELATIONS === */}
              <TabsContent value="relations" className="space-y-4">
                <div className="space-y-2">
                  <Label>Conducteur Affecté</Label>
                  <Select value={formState.conducteur_id} onValueChange={v => updateField('conducteur_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir un conducteur" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {drivers.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Service Affecté (ID/Nom)</Label>
                  <Input value={formState.service_id} onChange={e => updateField('service_id', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Notes libres</Label>
                  <Textarea value={formState.notes} onChange={e => updateField('notes', e.target.value)} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              {submitError && (
                <div className="text-sm text-destructive flex-1">{submitError}</div>
              )}
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createOrUpdateMutation.isPending}>
                {createOrUpdateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Vehicles;
