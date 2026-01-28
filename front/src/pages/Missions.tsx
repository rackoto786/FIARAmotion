import React, { useState } from 'react';
import { Mission, Vehicle, Driver } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Eye, Check, X, MoreHorizontal, Calendar, Clock, Route, Play, Plus, Pencil, Trash2, User as UserIcon, History, Filter, CheckCircle, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn, formatDateFr } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '@/components/dashboard/StatsCard';


const Missions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasPermission = (permission: string) => {
    if (!user?.role) return false;
    if (user.role === 'admin') return true;
    const userPermissions = (user as any)?.permissions || [];
    return userPermissions.includes(permission);
  };

  const canViewHistory = user?.role === 'admin' || user?.role === 'technician';

  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Helper to convert float hour to HH:MM string
  const floatHourToString = (h: number | undefined): string => {
    if (h === undefined || h === null) return '';
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Helper to convert HH:MM string to float
  const stringToFloatHour = (s: string): number => {
    if (!s) return 0;
    const [hours, minutes] = s.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const [formState, setFormState] = useState<{
    missionnaire: string;
    vehiculeId: string;
    conducteurId: string;
    dateDebut: string; // YYYY-MM-DD
    dateFin: string; // YYYY-MM-DD
    heureDepart: string; // HH:MM
    heureRetour: string; // HH:MM
    lieuDepart: string;
    lieuDestination: string;
    kilometrageDepart: string;
    kilometrageRetour: string;
    state: Mission['state'];
  }>({
    missionnaire: '',
    vehiculeId: '',
    conducteurId: '',
    dateDebut: '',
    dateFin: '',
    heureDepart: '',
    heureRetour: '',
    lieuDepart: 'CAMPUS',
    lieuDestination: '',
    kilometrageDepart: '',
    kilometrageRetour: '',
    state: 'nouveau',
  });

  const queryClient = useQueryClient();

  const { data: missions = [], isLoading } = useQuery<Mission[]>({
    queryKey: ['missions'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:5000/api/missions');
      if (!res.ok) throw new Error('Failed to fetch missions');
      return res.json();
    },
  });

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:5000/api/vehicles');
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      return res.json();
    },
  });

  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:5000/api/drivers');
      if (!res.ok) throw new Error('Failed to fetch drivers');
      return res.json();
    },
  });

  // Filters State
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTime, setFilterTime] = useState<string>('');

  // Filter Logic
  const filteredMissions = missions.filter(mission => {
    const matchesStatus = filterStatus === 'all' || mission.state === filterStatus;

    // Date match (assuming ISO format YYYY-MM-DD or similar start)
    const matchesDate = !filterDate || (mission.dateDebut && mission.dateDebut.toString().startsWith(filterDate));

    // Time match (exact match on HH:MM)
    const matchesTime = !filterTime || floatHourToString(mission.heureDepart) === filterTime;

    return matchesStatus && matchesDate && matchesTime;
  });

  // Export to PDF function


  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      setSubmitError(null);
      const isUpdate = !!data.id;
      const url = isUpdate
        ? `http://127.0.0.1:5000/api/missions/${data.id}/`
        : 'http://127.0.0.1:5000/api/missions/';

      const method = isUpdate ? 'PUT' : 'POST';

      // Transform backend payload
      const payload = {
        ...data,
        kilometrageDepart: parseInt(data.kilometrageDepart || '0'),
        kilometrageRetour: parseInt(data.kilometrageRetour || '0'),
        heureDepart: stringToFloatHour(data.heureDepart),
        heureRetour: stringToFloatHour(data.heureRetour),
      };

      const fleetUser = localStorage.getItem('fiara_user');
      const token = fleetUser ? JSON.parse(fleetUser).token : '';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast({
        title: 'Succès',
        description: variables.id ? 'Mission mise à jour' : 'Mission créée',
        variant: "default",
        className: "bg-green-500 text-white"
      });
      setIsEditOpen(false);
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (missionId: string) => {
      const fleetUser = localStorage.getItem('fiara_user');
      const token = fleetUser ? JSON.parse(fleetUser).token : '';

      const res = await fetch(`http://127.0.0.1:5000/api/missions/${missionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast({ title: 'Succès', description: 'Mission supprimée', variant: "default", className: "bg-green-500 text-white" });
    },
  });

  const updateStatus = async (mission: Mission, newState: Mission['state']) => {
    try {
      await createOrUpdateMutation.mutateAsync({
        ...mission,
        state: newState,
        // Keep other float/date conversions if passing whole object back?
        // Or better, just PATCH state? api/missions supports PATCH? 
        // The mutation uses PUT usually.
        heureDepart: floatHourToString(mission.heureDepart),
        heureRetour: floatHourToString(mission.heureRetour),
      });
    } catch (e) {
      // Toast handled by mutation
    }
  };


  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormState({
      missionnaire: '',
      vehiculeId: '',
      conducteurId: '',
      dateDebut: today,
      dateFin: today,
      heureDepart: '08:00',
      heureRetour: '18:00',
      lieuDepart: 'CAMPUS',
      lieuDestination: '',
      kilometrageDepart: '',
      kilometrageRetour: '',
      state: 'nouveau',
    });
    setEditingMission(null);
    setSubmitError(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditOpen(true);
  };

  const openEditDialog = (mission: Mission) => {
    setEditingMission(mission);
    setSubmitError(null);
    setFormState({
      missionnaire: mission.missionnaire || '',
      vehiculeId: mission.vehiculeId,
      conducteurId: mission.conducteurId,
      dateDebut: mission.dateDebut ? new Date(mission.dateDebut).toISOString().split('T')[0] : '',
      dateFin: mission.dateFin ? new Date(mission.dateFin).toISOString().split('T')[0] : '',
      heureDepart: floatHourToString(mission.heureDepart),
      heureRetour: floatHourToString(mission.heureRetour),
      lieuDepart: mission.lieuDepart,
      lieuDestination: mission.lieuDestination,
      kilometrageDepart: mission.kilometrageDepart?.toString() || '',
      kilometrageRetour: mission.kilometrageRetour?.toString() || '',
      state: mission.state,
    });
    setIsEditOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate({
      ...formState,
      id: editingMission?.id
    });
  };

  const columns = [
    {
      key: 'reference',
      header: 'Référence',
      cell: (mission: Mission) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Route className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{mission.reference}</p>
            <p className="text-sm text-muted-foreground">{mission.missionnaire}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'vehicule',
      header: 'Véhicule',
      cell: (mission: Mission) => {
        const v = vehicles.find(v => v.id === mission.vehiculeId);
        return v ? (
          <div>
            <p className="font-medium">{v.immatriculation}</p>
            <p className="text-xs text-muted-foreground">{v.marque} {v.modele}</p>
          </div>
        ) : 'Inconnu';
      },
    },
    {
      key: 'trajet',
      header: 'Trajet',
      cell: (mission: Mission) => (
        <div className="flex flex-col text-sm">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {mission.lieuDepart}</span>
          <span className="text-muted-foreground ml-4">↓</span>
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {mission.lieuDestination}</span>
        </div>
      )
    },
    {
      key: 'date',
      header: 'Période',
      cell: (mission: Mission) => (
        <div className="flex flex-col text-sm">
          <span>{formatDateFr(mission.dateDebut)}</span>
          <span className="text-xs text-muted-foreground">
            {floatHourToString(mission.heureDepart)} - {floatHourToString(mission.heureRetour)}
          </span>
        </div>
      ),
    },
    {
      key: 'state',
      header: 'Statut',
      cell: (mission: Mission) => <StatusBadge status={mission.state} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (mission: Mission) => {
        const isOwner = user?.id === mission.createdById;
        const isAdminOrTech = user?.role === 'admin' || user?.role === 'technician';
        const canEdit = isAdminOrTech || isOwner;
        const canDelete = isAdminOrTech || isOwner;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setSelectedMission(mission); setIsViewOpen(true); }}>
                <Eye className="mr-2 h-4 w-4" /> Détails
              </DropdownMenuItem>
              {canEdit && (
                <DropdownMenuItem onClick={() => openEditDialog(mission)}>
                  <Pencil className="mr-2 h-4 w-4" /> Modifier
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem className="text-destructive" onClick={() => {
                  if (confirm('Supprimer cette mission ?')) deleteMutation.mutate(mission.id);
                }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        description="Suivi des ordres de mission et déplacements"
        icon={MapPin}
        actions={
          <div className="flex gap-2">
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> Nouvelle mission
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <StatsCard
          title="En attente"
          value={missions.filter(m => m.state === 'nouveau').length.toString()}
          subtitle="Nouveaux logs"
          icon={Clock}
          variant="primary"
          onClick={canViewHistory ? () => navigate('/missions/history?status=nouveau') : undefined}
          className="cursor-pointer"
        />
        <StatsCard
          title="Planifiées"
          value={missions.filter(m => m.state === 'planifie').length.toString()}
          subtitle="En agenda"
          icon={Calendar}
          variant="info"
          onClick={canViewHistory ? () => navigate('/missions/history?status=planifie') : undefined}
          className="cursor-pointer"
        />
        <StatsCard
          title="En cours"
          value={missions.filter(m => m.state === 'en_cours').length.toString()}
          subtitle="Missions actives"
          icon={Play}
          variant="warning"
          onClick={canViewHistory ? () => navigate('/missions/history?status=en_cours') : undefined}
          className="cursor-pointer"
        />
        <StatsCard
          title="Terminées"
          value={missions.filter(m => m.state === 'termine').length.toString()}
          subtitle="Historique"
          icon={CheckCircle}
          variant="success"
          onClick={canViewHistory ? () => navigate('/missions/history?status=termine') : undefined}
          className="cursor-pointer"
        />
        <StatsCard
          title="Rejetées"
          value={missions.filter(m => m.state === 'rejeter').length.toString()}
          subtitle="Annulées"
          icon={AlertCircle}
          variant="default"
          onClick={canViewHistory ? () => navigate('/missions/history?status=rejeter') : undefined}
          className="cursor-pointer"
        />
      </div>


      <DataTable
        data={filteredMissions}
        columns={columns}
        searchPlaceholder="Rechercher une mission..."
        searchKeys={['reference', 'missionnaire', 'lieuDestination']}
        extraFilters={
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(
                  "rounded-full border-primary/10 gap-2 px-4 h-10",
                  (filterStatus !== 'all' || filterDate !== '' || filterTime !== '') && "bg-primary/5 border-primary/20"
                )}>
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Filtrer</span>
                  {(filterStatus !== 'all' || filterDate !== '' || filterTime !== '') && (
                    <Badge variant="glow" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                      {(filterStatus !== 'all' ? 1 : 0) + (filterDate !== '' ? 1 : 0) + (filterTime !== '' ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 border-primary/10 bg-background/95 backdrop-blur-xl" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold leading-none">Filtres Missions</h4>
                    {(filterStatus !== 'all' || filterDate !== '' || filterTime !== '') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setFilterStatus('all'); setFilterDate(''); setFilterTime(''); }}
                        className="h-8 pr-2 pl-2 text-xs text-muted-foreground hover:text-primary"
                      >
                        Effacer
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase opacity-50">Statut</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9 bg-muted/30 border-primary/5">
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="nouveau">Nouveau</SelectItem>
                          <SelectItem value="planifie">Planifié</SelectItem>
                          <SelectItem value="en_cours">En cours</SelectItem>
                          <SelectItem value="termine">Terminé</SelectItem>
                          <SelectItem value="rejeter">Rejeté</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase opacity-50">Date</Label>
                        <Input
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="h-9 bg-muted/30 border-primary/5 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase opacity-50">Heure</Label>
                        <Input
                          type="time"
                          value={filterTime}
                          onChange={(e) => setFilterTime(e.target.value)}
                          className="h-9 bg-muted/30 border-primary/5 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {(filterStatus !== 'all' || filterDate !== '' || filterTime !== '') && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setFilterStatus('all'); setFilterDate(''); setFilterTime(''); }}
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        }
      />

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMission ? 'Modifier' : 'Nouvelle Mission'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && <div className="text-destructive text-sm">{submitError}</div>}

            <div className="space-y-2">
              <Label>Missionnaire(s)</Label>
              <Input
                value={formState.missionnaire}
                onChange={e => setFormState({ ...formState, missionnaire: e.target.value })}
                placeholder="Noms des missionnaires"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Véhicule</Label>
                <Select value={formState.vehiculeId} onValueChange={v => setFormState({ ...formState, vehiculeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.immatriculation} - {v.marque}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Conducteur</Label>
                <Select value={formState.conducteurId} onValueChange={v => setFormState({ ...formState, conducteurId: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lieu Départ</Label>
                <Input value={formState.lieuDepart} onChange={e => setFormState({ ...formState, lieuDepart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input value={formState.lieuDestination} onChange={e => setFormState({ ...formState, lieuDestination: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Début</Label>
                <Input type="date" value={formState.dateDebut} onChange={e => setFormState({ ...formState, dateDebut: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date Fin</Label>
                <Input type="date" value={formState.dateFin} onChange={e => setFormState({ ...formState, dateFin: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Heure Départ</Label>
                <Input type="time" value={formState.heureDepart} onChange={e => setFormState({ ...formState, heureDepart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Heure Retour</Label>
                <Input type="time" value={formState.heureRetour} onChange={e => setFormState({ ...formState, heureRetour: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Km Départ</Label>
                <Input type="number" value={formState.kilometrageDepart} onChange={e => setFormState({ ...formState, kilometrageDepart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Km Retour</Label>
                <Input type="number" value={formState.kilometrageRetour} onChange={e => setFormState({ ...formState, kilometrageRetour: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMission?.reference}</DialogTitle>
          </DialogHeader>
          {selectedMission && (
            <div className="space-y-4">
              <StatusBadge status={selectedMission.state} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Missionnaire</Label>
                  <p>{selectedMission.missionnaire}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Véhicule</Label>
                  <p>{vehicles.find(v => v.id === selectedMission.vehiculeId)?.immatriculation || 'Inconnu'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Départ</Label>
                  <p>{selectedMission.lieuDepart} le {formatDateFr(selectedMission.dateDebut)} à {floatHourToString(selectedMission.heureDepart)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Retour</Label>
                  <p>{selectedMission.lieuDestination} le {formatDateFr(selectedMission.dateFin)} à {floatHourToString(selectedMission.heureRetour)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Distance</Label>
                  <p>{selectedMission.kilometreParcouru || 0} km</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                {(hasPermission('missions:update') || selectedMission.createdById === user?.id) && selectedMission.state === 'nouveau' && (
                  <>
                    <Button variant="destructive" onClick={() => {
                      updateStatus(selectedMission, 'rejeter');
                      setIsViewOpen(false);
                    }}>
                      Rejeter
                    </Button>
                    <Button onClick={() => {
                      updateStatus(selectedMission, 'planifie');
                      setIsViewOpen(false);
                    }}>
                      Planifier
                    </Button>
                  </>
                )}

                {(hasPermission('missions:update') || selectedMission.createdById === user?.id) && selectedMission.state === 'planifie' && (
                  <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => {
                    updateStatus(selectedMission, 'en_cours');
                    setIsViewOpen(false);
                  }}>
                    <Play className="mr-2 h-4 w-4" /> Démarrer
                  </Button>
                )}

                {(hasPermission('missions:update') || selectedMission.createdById === user?.id) && selectedMission.state === 'en_cours' && (
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                    updateStatus(selectedMission, 'termine');
                    setIsViewOpen(false);
                  }}>
                    <Check className="mr-2 h-4 w-4" /> Terminer
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Missions;
