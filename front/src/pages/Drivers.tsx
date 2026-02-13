import React, { useState } from 'react';
import { Driver, Vehicle } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Eye, Edit, Trash2, MoreHorizontal, Phone, Mail, Car, CheckCircle, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { apiClient } from '@/lib/api';

type DriverFormState = {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  permis: string;
  dateEmbauche: string;
  statut: Driver['statut'];
  vehiculeAssigne?: string;
};

const Drivers: React.FC = () => {
  const { permissions } = useAuth();
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formState, setFormState] = useState<DriverFormState>({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    permis: '',
    dateEmbauche: '',
    statut: 'actif',
    vehiculeAssigne: undefined,
  });

  const queryClient = useQueryClient();

  const { data: drivers = [], isLoading, isError } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await apiClient.get<Driver[]>('/drivers');
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

  const resetForm = () => {
    setEditingDriver(null);
    setSubmitError(null);
    setFormState({
      nom: '',
      prenom: '',
      telephone: '',
      email: '',
      permis: '',
      dateEmbauche: '',
      statut: 'actif',
      vehiculeAssigne: undefined,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditOpen(true);
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);
    setSubmitError(null);
    setFormState({
      nom: driver.nom,
      prenom: driver.prenom,
      telephone: driver.telephone,
      email: driver.email,
      permis: driver.permis,
      dateEmbauche: driver.dateEmbauche,
      statut: driver.statut,
      vehiculeAssigne: driver.vehiculeAssigne,
    });
    setIsEditOpen(true);
  };

  const createOrUpdateMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null);

      const payload = {
        id: editingDriver?.id ?? crypto.randomUUID(),
        nom: formState.nom,
        prenom: formState.prenom,
        telephone: formState.telephone,
        email: formState.email,
        permis: formState.permis,
        dateEmbauche: formState.dateEmbauche,
        statut: formState.statut,
        vehiculeAssigne: formState.vehiculeAssigne || null,
      };

      const url = editingDriver
        ? `/drivers/${editingDriver.id}`
        : '/drivers';

      const res = editingDriver
        ? await apiClient.put(url, payload)
        : await apiClient.post(url, payload);

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsEditOpen(false);
      resetForm();
      toast({
        title: "Succès",
        description: "Le chauffeur a été enregistré avec succès.",
        variant: "default",
        className: "bg-green-500 text-white"
      });
    },
    onError: (err: any) => {
      setSubmitError(err?.message || 'Erreur inconnue');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (driver: Driver) => {
      await apiClient.delete(`/drivers/${driver.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast({
        title: "Succès",
        description: "Le chauffeur a été supprimé avec succès.",
        variant: "default",
        className: "bg-green-500 text-white"
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate();
  };

  const columns = [
    {
      key: 'nom',
      header: 'Chauffeur',
      cell: (driver: Driver) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center text-sm font-bold text-primary-foreground">
            {driver.prenom[0]}{driver.nom[0]}
          </div>
          <div>
            <p className="font-medium">{driver.prenom} {driver.nom}</p>
            <p className="text-xs text-muted-foreground">{driver.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'telephone',
      header: 'Téléphone',
      cell: (driver: Driver) => (
        <span className="font-mono text-sm">{driver.telephone}</span>
      ),
    },
    {
      key: 'permis',
      header: 'Permis',
      cell: (driver: Driver) => (
        <div className="flex gap-1">
          {driver.permis.split(', ').map(p => (
            <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'vehicule',
      header: 'Véhicule assigné',
      cell: (driver: Driver) => {
        const vehicle = vehicles.find(v => v.id === driver.vehiculeAssigne);
        return vehicle ? (
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{vehicle.immatriculation}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Non assigné</span>
        );
      },
    },
    {
      key: 'statut',
      header: 'Statut',
      cell: (driver: Driver) => <StatusBadge status={driver.statut} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (driver: Driver) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedDriver(driver);
              setIsViewOpen(true);
            }}>
              <Eye className="h-4 w-4 mr-2" />
              Voir détails
            </DropdownMenuItem>
            {permissions?.canManageDrivers && (
              <>
                <DropdownMenuItem onClick={() => openEditDialog(driver)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm('Supprimer ce chauffeur ?')) {
                      deleteMutation.mutate(driver);
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

  const assignedVehicle = selectedDriver
    ? vehicles.find(v => v.id === selectedDriver.vehiculeAssigne)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chauffeurs"
        description="Gestion des conducteurs"
        icon={Users}
        actions={
          permissions?.canManageDrivers && (
            <Button className="gap-2" onClick={openCreateDialog}>
              <Users className="h-4 w-4" />
              Ajouter un chauffeur
            </Button>
          )
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Chauffeurs"
          value={drivers.length.toString()}
          subtitle="Effectif total"
          icon={Users}
          variant="primary"
        />
        <StatsCard
          title="Actifs"
          value={drivers.filter(d => d.statut === 'actif').length.toString()}
          subtitle="En service"
          icon={CheckCircle}
          variant="success"
        />
        <StatsCard
          title="En Congé"
          value={drivers.filter(d => d.statut === 'en_conge').length.toString()}
          subtitle="Absents"
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="Assignés"
          value={drivers.filter(d => !!d.vehiculeAssigne).length.toString()}
          subtitle="Avec véhicule"
          icon={Car}
          variant="info"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="py-10 text-center text-sm text-destructive">
          Impossible de charger les chauffeurs. Vérifiez que l’API est démarrée.
        </div>
      ) : (
        <DataTable
          data={drivers}
          columns={columns}
          searchPlaceholder="Rechercher par nom, email..."
          searchKeys={['nom', 'prenom', 'email']}
        />
      )}

      {/* Driver Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Profil du chauffeur
            </DialogTitle>
            <DialogDescription>
              {selectedDriver?.prenom} {selectedDriver?.nom}
            </DialogDescription>
          </DialogHeader>

          {selectedDriver && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center text-xl font-bold text-primary-foreground">
                  {selectedDriver.prenom[0]}{selectedDriver.nom[0]}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {selectedDriver.prenom} {selectedDriver.nom}
                  </h3>
                  <StatusBadge status={selectedDriver.statut} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card variant="outline">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">{selectedDriver.telephone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedDriver.email}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="outline">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Informations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Permis</span>
                      <div className="flex gap-1">
                        {selectedDriver.permis.split(', ').map(p => (
                          <Badge key={p} variant="outline">{p}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Embauche</span>
                      <span className="font-medium">{selectedDriver.dateEmbauche}</span>
                    </div>
                    {assignedVehicle && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Véhicule</span>
                        <span className="font-medium">{assignedVehicle.immatriculation}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Driver Create / Edit Dialog */}
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
              <Users className="h-5 w-5 text-primary" />
              {editingDriver ? 'Modifier un chauffeur' : 'Ajouter un chauffeur'}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations du chauffeur.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={formState.prenom}
                  onChange={(e) => setFormState({ ...formState, prenom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={formState.nom}
                  onChange={(e) => setFormState({ ...formState, nom: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formState.telephone}
                  onChange={(e) =>
                    setFormState({ ...formState, telephone: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formState.email}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="permis">Permis (ex: B, C)</Label>
                <Input
                  id="permis"
                  value={formState.permis}
                  onChange={(e) => setFormState({ ...formState, permis: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateEmbauche">Date d'embauche</Label>
                <Input
                  id="dateEmbauche"
                  type="date"
                  value={formState.dateEmbauche}
                  onChange={(e) =>
                    setFormState({ ...formState, dateEmbauche: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="statut">Statut</Label>
                <select
                  id="statut"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.statut}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      statut: e.target.value as Driver['statut'],
                    })
                  }
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="en_conge">En congé</option>
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="vehicule">Véhicule assigné</Label>
                <select
                  id="vehicule"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formState.vehiculeAssigne || ''}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      vehiculeAssigne: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">Aucun</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation} — {v.marque} {v.modele}
                    </option>
                  ))}
                </select>
              </div>
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
              <Button type="submit" disabled={createOrUpdateMutation.isPending}>
                {createOrUpdateMutation.isPending
                  ? 'Enregistrement...'
                  : editingDriver
                    ? 'Enregistrer'
                    : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Drivers;
