import React, { useState } from 'react';
import { MissionCard } from '@/components/missions/MissionCard';
import { Search } from 'lucide-react';
import { Mission, Vehicle, Driver } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Eye, Check, X, MoreHorizontal, Calendar, Clock, Route, Play, Plus, Pencil, Trash2, User as UserIcon, History, Filter, CheckCircle, AlertCircle, Truck, FileText, ArrowRight } from 'lucide-react';
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
  DialogFooter,
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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MissionKPI } from '@/components/missions/MissionKPI';
import { CheckCircle2, XCircle, ClipboardList, Layers, Activity } from 'lucide-react';
import { apiClient } from '@/lib/api';
const Missions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasPermission = (permission: string) => {
    if (!user?.role) return false;
    if (user.role === 'admin') return true;
    const userPermissions = (user as any)?.permissions || [];
    return userPermissions.includes(permission);
  };

  const canViewHistory = ['admin', 'technician', 'collaborator', 'direction', 'driver'].includes(user?.role || '');

  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // CR Mission State
  const [isCROpen, setIsCROpen] = useState(false);
  const [crMission, setCrMission] = useState<Mission | null>(null);
  const [crForm, setCrForm] = useState({
    kilometrageRetour: 0,
    missionnaireRetour: '',
    heureRetour: ''
  });

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
    titre: string;
    priorite: 'Haute' | 'Moyenne' | 'Basse' | 'Critique';
    distancePrevue: number;
    trajet: string;
    destinations: string[];
    numeroOm: string;
    zone: 'ville' | 'periferie';
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
    titre: '',
    priorite: 'Moyenne',
    distancePrevue: 0,
    trajet: '',
    destinations: [''],
    numeroOm: '',
    zone: 'ville',
  });

  const queryClient = useQueryClient();

  const { data: missions = [], isLoading } = useQuery<Mission[]>({
    queryKey: ['missions'],
    queryFn: async () => {
      const res = await apiClient.get<Mission[]>('/missions');
      return res.data;
    },
  });

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await apiClient.get<Vehicle[]>('/vehicles');
      return res.data;
    },
  });

  const { data: drivers = [], isLoading: isLoadingDrivers } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await apiClient.get<Driver[]>('/drivers');
      return res.data;
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (data: any) => {
      setSubmitError(null);
      const isUpdate = !!data.id;

      // Transform backend payload
      const payload = {
        ...data,
        kilometrageDepart: parseInt(data.kilometrageDepart || '0'),
        kilometrageRetour: parseInt(data.kilometrageRetour || '0'),
        heureDepart: stringToFloatHour(data.heureDepart),
        heureRetour: stringToFloatHour(data.heureRetour),
        priorite: data.priorite,
        distancePrevue: data.distancePrevue,
        trajet: data.trajet || (Array.isArray(data.destinations) ? [data.lieuDepart, ...data.destinations.filter((d: string) => d.trim())].join(' --> ') : data.trajet),
        lieuDestination: data.lieuDestination || (Array.isArray(data.destinations) ? data.destinations[data.destinations.length - 1] : data.lieuDestination),
        numeroOm: data.zone === 'periferie' ? data.numeroOm : '',
        zone: data.zone,
      };

      const url = isUpdate
        ? `/missions/${data.id}`
        : '/missions';

      const res = isUpdate
        ? await apiClient.put(url, payload)
        : await apiClient.post(url, payload);

      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
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
      await apiClient.delete(`/missions/${missionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({ title: 'Succès', description: 'Mission supprimée', variant: "default", className: "bg-green-500 text-white" });
    },
  });

  const handleStart = async (mission: Mission) => {
    try {
      await apiClient.patch(`/missions/${mission.id}`, { state: 'en_cours' });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Mission démarrée',
        description: `La mission ${mission.reference} est maintenant en cours.`,
        className: "bg-blue-500 text-white"
      });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  const handleFinish = async (mission: Mission) => {
    try {
      await apiClient.patch(`/missions/${mission.id}`, { state: 'termine' });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast({
        title: 'Mission terminée',
        description: `La mission ${mission.reference} est marquée comme terminée.`,
        className: "bg-green-500 text-white"
      });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

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

  const handleOpenCR = (mission: Mission) => {
    setCrMission(mission);
    setCrForm({
      kilometrageRetour: mission.kilometrageRetour || 0,
      missionnaireRetour: mission.missionnaireRetour || mission.missionnaire || '',
      heureRetour: floatHourToString(mission.heureRetour)
    });
    setIsCROpen(true);
  };

  const generateMissionPDF = (mission: Mission, vehicle?: Vehicle) => {
    const doc = new jsPDF();
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.text("RAPPORT DE MISSION", 105, 25, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    const startY = 50;

    autoTable(doc, {
      startY: startY,
      head: [['Détails de la Mission', '']],
      body: [
        ['Référence', mission.reference],
        ['État', mission.state.toUpperCase()],
        ['Missionnaire', mission.missionnaire || '-'],
        ['Missionnaire (Retour)', mission.missionnaireRetour || '-'],
        ['Date de Début', `${formatDateFr(mission.dateDebut)} à ${floatHourToString(mission.heureDepart)}`],
        ['Date de Fin', `${formatDateFr(mission.dateFin)} à ${floatHourToString(mission.heureRetour)}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Véhicule et Trajet', '']],
      body: [
        ['Véhicule', vehicle ? `${vehicle.marque} ${vehicle.modele} (${vehicle.immatriculation})` : 'Inconnu'],
        ['Lieu de Départ', mission.lieuDepart],
        ['Destination', mission.lieuDestination],
        ['Kilométrage Départ', `${mission.kilometrageDepart} km`],
        ['Kilométrage Retour', `${mission.kilometrageRetour || '-'} km`],
        ['Distance Parcourue', `${mission.kilometreParcouru || 0} km`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 10, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} / ${pageCount}`, 105, 287, { align: "center" });
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 200, 287, { align: "right" });
    }
    doc.save(`Mission_${mission.reference}.pdf`);
  };

  const handleSaveAndExport = async () => {
    if (!crMission) return;
    const kmDepart = crMission.kilometrageDepart || 0;
    if (crForm.kilometrageRetour < kmDepart) {
      toast({
        title: 'Erreur',
        description: `Le kilométrage retour (${crForm.kilometrageRetour} km) ne peut pas être inférieur au kilométrage de départ (${kmDepart} km).`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await createOrUpdateMutation.mutateAsync({
        id: crMission.id,
        kilometrageRetour: crForm.kilometrageRetour.toString(),
        missionnaireRetour: crForm.missionnaireRetour,
        // The mutation expects specific conversion for hours if we pass whole object, 
        // but since we pass strings for kms and it transforms them, it should be fine.
        // Wait, the mutation transforms data.kilometrageRetour = parseInt(data.kilometrageRetour)
        // and data.heureDepart = stringToFloatHour(data.heureDepart).
        // Since we are not passing hours here, stringToFloatHour(undefined) will be 0.
        // That's bad. I should probably use a dedicated CR update call or fix the mutation.
        // For now, let's pass the necessary fields.
        heureDepart: floatHourToString(crMission.heureDepart),
        heureRetour: crForm.heureRetour,
        dateDebut: crMission.dateDebut,
        dateFin: crMission.dateFin,
        state: 'archive',
      });

      const updatedMission = {
        ...crMission,
        kilometrageRetour: crForm.kilometrageRetour,
        missionnaireRetour: crForm.missionnaireRetour,
        heureRetour: stringToFloatHour(crForm.heureRetour),
        kilometreParcouru: crForm.kilometrageRetour - kmDepart
      };
      generateMissionPDF(updatedMission, vehicles.find(v => v.id === crMission.vehiculeId));
      setIsCROpen(false);
    } catch (e) {
      // Toast handled by mutation
    }
  };

  const handleCancelMission = async (mission: Mission) => {
    if (!confirm('Voulez-vous vraiment annuler cette mission ?')) return;
    try {
      await createOrUpdateMutation.mutateAsync({
        ...mission,
        state: 'annule',
        heureDepart: floatHourToString(mission.heureDepart),
        heureRetour: floatHourToString(mission.heureRetour),
      });
    } catch (e) {
      // Toast handled by mutation
    }
  };


  const addDestination = () => {
    setFormState(prev => ({ ...prev, destinations: [...prev.destinations, ''] }));
  };

  const removeDestination = (index: number) => {
    setFormState(prev => {
      const newDest = [...prev.destinations];
      newDest.splice(index, 1);
      return { ...prev, destinations: newDest.length > 0 ? newDest : [''] };
    });
  };

  const updateDestination = (index: number, val: string) => {
    setFormState(prev => {
      const newDest = [...prev.destinations];
      newDest[index] = val;
      return { ...prev, destinations: newDest };
    });
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
      titre: '',
      priorite: 'Moyenne',
      distancePrevue: 0,
      trajet: '',
      destinations: [''],
      numeroOm: '',
      zone: 'ville',
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
      titre: mission.titre || '',
      priorite: mission.priorite || 'Moyenne',
      distancePrevue: mission.distancePrevue || 0,
      trajet: mission.trajet || '',
      destinations: mission.trajet ? mission.trajet.split(' --> ') : [mission.lieuDestination || ''],
      numeroOm: mission.numeroOm || '',
      zone: mission.zone || 'ville',
    });
    setIsEditOpen(true);
  };

  const handleTitleChange = (title: string) => {
    let priority: 'Haute' | 'Moyenne' | 'Basse' | 'Critique' | 'Faible' = 'Moyenne';
    const lowerTitle = title.toLowerCase();

    // Priority 5: Faible (The long list)
    const faibleKeywords = [
      'edp', 'ort', 'dvp', 'visite stagiaire',
      'visite personne ressource', 'forum de metier', 'mission tana',
      'achat', 'intervenant', 'aller en ville', 'urgent', 'depannage', 'dépannage'
    ];

    if (lowerTitle.includes('bailleur') || lowerTitle.includes('bayeur')) {
      priority = 'Critique';
    } else if (lowerTitle.includes('ca')) {
      priority = 'Haute';
    } else if (lowerTitle.includes('dmm')) {
      priority = 'Moyenne';
    } else if (lowerTitle.includes('visiteur')) {
      priority = 'Basse';
    } else if (faibleKeywords.some(k => lowerTitle.includes(k))) {
      priority = 'Faible';
    }

    setFormState(prev => ({
      ...prev,
      titre: title,
      priorite: priority
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrUpdateMutation.mutate({
      ...formState,
      id: editingMission?.id
    });
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterTime, setFilterTime] = useState<string>('');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');

  // Role-based flags
  const isDriver = user?.role === 'driver';
  const isCollaborator = user?.role === 'collaborator';
  const isAdmin = user?.role === 'admin';
  const isDirection = user?.role === 'direction';
  const isTechnician = user?.role === 'technician';
  const isAdminOrTech = isAdmin || isTechnician;

  // Reset pagination when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, filterDate, filterTime, filterVehicle]);

  // Filter Logic
  const filteredMissions = missions.filter(mission => {
    // 1. Role-based filtering (Sync with KPIs)
    if (isDriver && mission.conducteurId !== user?.id) return false;
    if (isCollaborator && mission.createdById !== user?.id) return false;

    // 2. Status/Tab filtering
    const matchesStatus = filterStatus === 'all'
      ? true
      : filterStatus === 'historique'
        ? mission.state === 'archive'
        : filterStatus === 'nouveau'
          ? ['nouveau', 'planifie'].includes(mission.state)
          : mission.state === filterStatus;

    // 3. Other filters
    const matchesDate = !filterDate || (mission.dateDebut && mission.dateDebut.toString().startsWith(filterDate));
    const matchesTime = !filterTime || floatHourToString(mission.heureDepart) === filterTime;
    const matchesVehicle = filterVehicle === 'all' || mission.vehiculeId === filterVehicle;

    return matchesStatus && matchesDate && matchesTime && matchesVehicle;
  }).filter(mission => {
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    // Search in ref, missionnaire, destination, or vehicle license
    const v = vehicles.find(v => v.id === mission.vehiculeId);
    return (
      mission.reference.toLowerCase().includes(lower) ||
      (mission.missionnaire || '').toLowerCase().includes(lower) ||
      (mission.lieuDestination || '').toLowerCase().includes(lower) ||
      (v?.immatriculation || '').toLowerCase().includes(lower)
    );
  });

  const [sortBy, setSortBy] = useState<'createdAt' | 'dateDebut' | 'reference' | 'titre'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Calculate pagination
  const sortedMissions = [...filteredMissions].sort((a, b) => {
    let valA: any, valB: any;

    switch (sortBy) {
      case 'createdAt':
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      case 'dateDebut':
        valA = new Date(a.dateDebut).getTime();
        valB = new Date(b.dateDebut).getTime();
        break;
      case 'reference':
        valA = a.reference.toLowerCase();
        valB = b.reference.toLowerCase();
        break;
      case 'titre':
        valA = (a.titre || '').toLowerCase();
        valB = (b.titre || '').toLowerCase();
        break;
      default:
        valA = 0;
        valB = 0;
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedMissions.length / itemsPerPage);
  const currentMissions = sortedMissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Tabs structure
  // Tabs structure with icons
  const tabs = [
    { id: 'all', label: 'Toutes', icon: Layers },
    { id: 'nouveau', label: 'En attente', icon: Clock },
    { id: 'en_cours', label: 'En cours', icon: Activity },
    { id: 'termine', label: 'Terminées', icon: CheckCircle2 },
    { id: 'annule', label: 'Annulées', icon: XCircle },
    { id: 'rejeter', label: 'Rejetées', icon: XCircle },
    { id: 'historique', label: 'Archives', icon: History },
  ];

  // KPI Calculations based on role (using flags defined above)
  const missionsForStats = missions.filter(m => {
    if (isDriver) return m.conducteurId === user?.id;
    if (isCollaborator) return m.createdById === user?.id;
    return true; // admin, technician, direction see all
  });

  const stats = {
    pending: missionsForStats.filter(m => ['nouveau', 'planifie'].includes(m.state)).length,
    accepted: missionsForStats.filter(m => ['en_cours', 'termine', 'archive'].includes(m.state)).length,
    rejected: missionsForStats.filter(m => ['annule', 'rejeter'].includes(m.state)).length,
    total: missionsForStats.length
  };

  const kpiLabels = {
    pending: isDriver ? "Mes missions en attente" : isCollaborator ? "Mes demandes en attente" : "Demandes en attente",
    accepted: isDriver ? "Mes missions acceptées" : isCollaborator ? "Mes demandes acceptées" : "Demandes acceptées",
    rejected: isDriver ? "Mes missions rejetées/annulées" : isCollaborator ? "Mes demandes rejetées/annulées" : "Demandes rejetées/annulées",
    total: isDriver ? "Mes missions totales" : isCollaborator ? "Mes demandes totales" : "Total des demandes",
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border/50">
        <PageHeader title="Missions" description="Suivi et planification des déplacements" icon={Truck} />
        {(user?.role === 'admin' || user?.role === 'collaborator') && (
          <Button
            onClick={openCreateDialog}
            variant="outline"
            className="gap-2 rounded-full border-2 border-[#43B02A] text-[#43B02A] hover:bg-[#43B02A] hover:text-white transition-all duration-300 font-bold px-6 shadow-sm bg-transparent"
          >
            <Plus className="h-4 w-4" /> Nouvelle mission
          </Button>
        )}
      </div>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MissionKPI
          title={kpiLabels.pending}
          value={stats.pending}
          subtitle="À valider"
          icon={Clock}
          variant="pending"
        />
        <MissionKPI
          title={kpiLabels.accepted}
          value={stats.accepted}
          subtitle="Validées"
          icon={CheckCircle2}
          variant="accepted"
        />
        <MissionKPI
          title={kpiLabels.rejected}
          value={stats.rejected}
          subtitle="Annulées"
          icon={XCircle}
          variant="rejected"
        />
        <MissionKPI
          title={kpiLabels.total}
          value={stats.total}
          subtitle="Archives"
          icon={ClipboardList}
          variant="total"
        />
      </div>

      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl p-1.5 rounded-2xl border-0 shadow-2xl shadow-black/5 dark:shadow-none transition-all duration-500 vision-3d">
        {/* Custom Tabs - Exceptional Redesign (Slightly smaller) */}
        <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-xl">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = filterStatus === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-xs font-bold capitalize rounded-xl transition-all duration-500 relative overflow-hidden group border-0 outline-none",
                  isActive
                    ? "bg-slate-900 text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.4)] dark:bg-white dark:text-slate-900 dark:shadow-[0_8px_20px_-6px_rgba(255,255,255,0.1)] scale-105 z-10"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/60 hover:scale-105"
                )}
              >
                <Icon className={cn(
                  "h-3.5 w-3.5 transition-all duration-500",
                  isActive ? "scale-110 rotate-3" : "group-hover:rotate-6 text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white"
                )} />

                <span className="relative z-10">{tab.label}</span>

                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -rotate-45 translate-x-[-100%] animate-[shimmer_2s_infinite] pointer-events-none" />
                )}

                {!isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary/40 rounded-full transition-all duration-500 group-hover:w-1/2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="N° Mission, chauffeur..."
              className="pl-9 h-10 bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-900 transition-colors rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className={cn(
                "h-10 w-10 rounded-lg border-slate-200 dark:border-zinc-700 text-slate-500 hover:text-primary hover:border-primary/50 dark:hover:border-primary/50 dark:bg-zinc-800",
                (filterDate !== '' || filterTime !== '' || filterVehicle !== 'all') && "bg-primary/5 border-primary/20 text-primary"
              )}>
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              {/* Reusing existing filter content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold leading-none">Filtres Avancés</h4>
                  <Button variant="ghost" size="sm" onClick={() => { setFilterDate(''); setFilterTime(''); setFilterVehicle('all'); }} className="h-8 text-xs">
                    Effacer
                  </Button>
                </div>
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase opacity-50">Véhicule</Label>
                    <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Tous" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {vehicles.map(v => (<SelectItem key={v.id} value={v.id}>{v.immatriculation}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase opacity-50">Date</Label>
                      <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase opacity-50">Heure</Label>
                      <Input type="time" value={filterTime} onChange={(e) => setFilterTime(e.target.value)} className="h-9" />
                    </div>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter hidden sm:inline">Tri:</span>
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-7 border-0 bg-transparent shadow-none focus:ring-0 text-xs font-bold w-[140px] px-1">
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt" className="text-xs">Date de création</SelectItem>
                <SelectItem value="dateDebut" className="text-xs">Date de mission</SelectItem>
                <SelectItem value="reference" className="text-xs">Référence</SelectItem>
                <SelectItem value="titre" className="text-xs">Titre</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-slate-400 hover:text-primary"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            >
              <ArrowRight className={cn("h-3.5 w-3.5 transition-transform duration-300", sortOrder === 'desc' ? "rotate-90" : "-rotate-90")} />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {currentMissions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-slate-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">Aucune mission trouvée</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">Essayez de modifier vos filtres ou créez une nouvelle mission.</p>
          </div>
        ) : (
          currentMissions.map((mission) => {
            // Permission Check
            const isCreator = user?.id === mission.createdById;
            const canManage = isAdminOrTech || isCreator;

            // DEBUG: Log user role
            console.log('[MISSION DEBUG] User role:', user?.role, 'isAdminOrTech:', isAdminOrTech, 'Mission state:', mission.state);

            return (
              <MissionCard
                key={mission.id}
                mission={mission}
                vehicle={vehicles.find(v => v.id === mission.vehiculeId)}
                driver={drivers.find(d => d.id === mission.conducteurId)}
                onDetails={() => { setSelectedMission(mission); setIsViewOpen(true); }}
                onEdit={canManage ? () => openEditDialog(mission) : undefined}
                onDelete={canManage ? (m) => { if (confirm('Supprimer ?')) deleteMutation.mutate(m.id); } : undefined}
                onCR={mission.state === 'termine' ? (m) => handleOpenCR(m) : undefined}
                onCancel={canManage ? (m) => handleCancelMission(m) : undefined}
                onStart={isAdminOrTech && mission.state === 'planifie' ? handleStart : undefined}
                onFinish={isAdminOrTech && mission.state === 'en_cours' ? handleFinish : undefined}
              />
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center gap-3 pt-4">
          <div className="flex items-center gap-4 order-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-4 bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-slate-200"
            >
              Précédent
            </Button>
            <span className="text-xs text-muted-foreground order-2 font-medium">Page {currentPage} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-4 bg-white dark:bg-zinc-900 dark:border-zinc-800 dark:text-slate-200 order-3"
            >
              Suivant
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground order-1 opacity-50">
            {filteredMissions.length} missions au total
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-zinc-950">
          <DialogHeader className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-900 dark:to-purple-900 text-white rounded-t-lg">
            <DialogTitle className="text-xl font-bold flex flex-col gap-1">
              <span>{editingMission ? 'Modifier la mission' : 'Nouvelle Mission'}</span>
              <DialogDescription className="text-sm font-normal opacity-90 text-blue-100">
                {editingMission ? 'Mettez à jour les informations de la mission' : 'Créez une nouvelle mission de livraison'}
              </DialogDescription>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {submitError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{submitError}</div>}

            {/* Section 1: Informations */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/20 space-y-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold border-b border-blue-100 dark:border-blue-900/20 pb-2">
                <AlertCircle className="h-4 w-4" /> <span>Informations de la mission</span>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Titre de la mission *</Label>
                  <Select value={formState.titre} onValueChange={handleTitleChange}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                      <SelectValue placeholder="Sélectionner le titre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bailleur">Bailleur</SelectItem>
                      <SelectItem value="EDP">EDP</SelectItem>
                      <SelectItem value="ORT">ORT</SelectItem>
                      <SelectItem value="DVP">DVP</SelectItem>
                      <SelectItem value="VISITE STAGIAIRE">VISITE STAGIAIRE</SelectItem>
                      <SelectItem value="VISITE personne ressource">VISITE personne ressource</SelectItem>
                      <SelectItem value="FORUM DE METIER">FORUM DE METIER</SelectItem>
                      <SelectItem value="MISSION TANA">MISSION TANA</SelectItem>
                      <SelectItem value="Achat">Achat</SelectItem>
                      <SelectItem value="Intervenant">Intervenant</SelectItem>
                      <SelectItem value="Aller en ville">Aller en ville</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="Dépannage">Dépannage</SelectItem>
                      <SelectItem value="CA">CA</SelectItem>
                      <SelectItem value="DMM">DMM</SelectItem>
                      <SelectItem value="Visiteur">Visiteur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Priorité (Automatique)</Label>
                  <Select value={formState.priorite} disabled>
                    <SelectTrigger className="bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-800 text-slate-500 opacity-100 cursor-not-allowed">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Haute">Haute</SelectItem>
                      <SelectItem value="Moyenne">Moyenne</SelectItem>
                      <SelectItem value="Basse">Basse</SelectItem>
                      <SelectItem value="Faible">Faible</SelectItem>
                      <SelectItem value="Critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Zone *</Label>
                  <Select
                    value={formState.zone}
                    onValueChange={(val: 'ville' | 'periferie') => setFormState({ ...formState, zone: val })}
                  >
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                      <SelectValue placeholder="Sélectionner la zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ville">En ville</SelectItem>
                      <SelectItem value="periferie">Périphérie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formState.zone === 'periferie' && (
                  <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <Label className="text-xs font-semibold text-slate-500 uppercase">Numéro OM * (Max 15 carac.)</Label>
                    <Input
                      value={formState.numeroOm}
                      onChange={e => setFormState({ ...formState, numeroOm: e.target.value.slice(0, 15) })}
                      placeholder="Ex: OM-2024-001"
                      maxLength={15}
                      className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Missionnaire(s) *</Label>
                  <Input
                    value={formState.missionnaire || ''}
                    onChange={e => setFormState({ ...formState, missionnaire: e.target.value })}
                    placeholder="Ex: Jean Dupont, Marie Martin"
                    className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Véhicule & Chauffeur */}
            <div className="bg-green-50/50 dark:bg-green-900/10 p-5 rounded-xl border border-green-100 dark:border-green-900/20 space-y-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold border-b border-green-100 dark:border-green-900/20 pb-2">
                <Truck className="h-4 w-4" /> <span>Véhicule & Chauffeur</span>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Véhicule *</Label>
                  <Select value={formState.vehiculeId} onValueChange={v => setFormState({ ...formState, vehiculeId: v })}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (<SelectItem key={v.id} value={v.id}>{v.immatriculation} - {v.marque}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Chauffeur *</Label>
                  <Select value={formState.conducteurId} onValueChange={v => setFormState({ ...formState, conducteurId: v })}>
                    <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {drivers.map(d => (<SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Téléphone du chauffeur</Label>
                  <Input
                    value={drivers.find(d => d.id === formState.conducteurId)?.telephone || ''}
                    readOnly
                    className="bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-800 text-slate-500"
                    placeholder="+261 34 ..."
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Itinéraire */}
            <div className="bg-orange-50/50 dark:bg-orange-900/10 p-5 rounded-xl border border-orange-100 dark:border-orange-900/20 space-y-4">
              <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-semibold border-b border-orange-100 dark:border-orange-900/20 pb-2">
                <MapPin className="h-4 w-4" /> <span>Itinéraire</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Point de départ *</Label>
                  <Input
                    value={formState.lieuDepart}
                    onChange={e => setFormState({ ...formState, lieuDepart: e.target.value })}
                    className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                    required
                  />
                </div>

                <div className="space-y-3 md:col-span-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                    Destinations / Étapes *
                  </Label>

                  <div className="space-y-3">
                    {formState.destinations.map((dest, index) => (
                      <div key={index} className="flex gap-2 group animate-in slide-in-from-left-2 duration-200">
                        <div className="relative flex-1">
                          <Input
                            value={dest}
                            onChange={(e) => updateDestination(index, e.target.value)}
                            placeholder={index === 0 ? "Première destination" : `Destination ${index + 1}`}
                            className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 pr-10"
                            required
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono opacity-30 select-none">
                            {index === formState.destinations.length - 1 ? 'Destination finale' : `Destination ${index + 1}`}
                          </div>
                        </div>

                        <div className="flex gap-1">
                          {formState.destinations.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeDestination(index)}
                              className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border-slate-200 dark:border-zinc-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={addDestination}
                            className="h-10 w-10 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 border-slate-200 dark:border-zinc-800 shadow-sm"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Distance Totale (km) *</Label>
                  <Input
                    type="number"
                    value={formState.distancePrevue || ''}
                    onChange={e => setFormState({ ...formState, distancePrevue: parseFloat(e.target.value) || 0 })}
                    className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                    placeholder="Ex: 225"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Kilométrage de départ *</Label>
                  <Input
                    type="number"
                    value={formState.kilometrageDepart || ''}
                    onChange={e => setFormState({ ...formState, kilometrageDepart: e.target.value })}
                    className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                    placeholder="Ex: 45000"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Planification */}
            <div className="bg-purple-50/50 dark:bg-purple-900/10 p-5 rounded-xl border border-purple-100 dark:border-purple-900/20 space-y-4">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-semibold border-b border-purple-100 dark:border-purple-900/20 pb-2">
                <Clock className="h-4 w-4" /> <span>Planification</span>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Date de départ *</Label>
                  <Input type="date" value={formState.dateDebut} onChange={e => setFormState({ ...formState, dateDebut: e.target.value })} className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Heure de départ *</Label>
                  <Input type="time" value={formState.heureDepart} onChange={e => setFormState({ ...formState, heureDepart: e.target.value })} className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Date de retour *</Label>
                  <Input type="date" value={formState.dateFin} onChange={e => setFormState({ ...formState, dateFin: e.target.value })} className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Arrivée estimée *</Label>
                  <Input type="time" value={formState.heureRetour} onChange={e => setFormState({ ...formState, heureRetour: e.target.value })} className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800" required />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <Button type="button" variant="outline" className="h-11 px-6 rounded-lg border-slate-200" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              <Button type="submit" className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/20">
                {editingMission ? 'Modifier la mission' : 'Créer la mission'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMission?.reference}</DialogTitle>
            <DialogDescription>
              Détails complets de la mission #{selectedMission?.reference}
            </DialogDescription>
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
                  <Label className="text-muted-foreground">Destination Finale</Label>
                  <p>{selectedMission.lieuDestination} le {formatDateFr(selectedMission.dateFin)} à {floatHourToString(selectedMission.heureRetour)}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Itinéraire / Trajet</Label>
                  <div className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-lg border border-slate-100 dark:border-zinc-800 mt-1">
                    <p className="text-sm font-medium whitespace-pre-wrap">{selectedMission.trajet || "Non spécifié"}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Km Départ</Label>
                  <p>{selectedMission.kilometrageDepart || 0} km</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Distance</Label>
                  <p>{selectedMission.kilometreParcouru || 0} km</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                {isAdminOrTech && selectedMission.state === 'nouveau' && (
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

                {['admin', 'technician'].includes(user?.role || '') && selectedMission.state === 'planifie' && (
                  <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => {
                    updateStatus(selectedMission, 'en_cours');
                    setIsViewOpen(false);
                  }}>
                    <Play className="mr-2 h-4 w-4" /> Démarrer
                  </Button>
                )}

                {['admin', 'technician'].includes(user?.role || '') && selectedMission.state === 'en_cours' && (
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

      {/* CR Modal */}
      <Dialog open={isCROpen} onOpenChange={setIsCROpen}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950">
          <DialogHeader className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span>Rapport de Mission - {crMission?.reference}</span>
            </DialogTitle>
            <DialogDescription className="text-purple-100 opacity-90">
              Saisissez les informations finales pour clôturer le rapport de mission
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="kilometrageRetour" className="text-xs font-semibold uppercase text-slate-500">
                Kilométrage retour (Km) *
              </Label>
              <Input
                id="kilometrageRetour"
                type="number"
                value={crForm.kilometrageRetour}
                onChange={(e) => setCrForm({ ...crForm, kilometrageRetour: parseInt(e.target.value) || 0 })}
                className="h-11 border-slate-200 dark:border-zinc-800 focus:ring-purple-500 text-lg font-mono"
              />
              <p className="text-[10px] text-slate-400">
                Le kilométrage de départ était de <span className="font-bold">{crMission?.kilometrageDepart || 0} km</span>
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heureRetour" className="text-xs font-semibold uppercase text-slate-500">
                Heure de retour exacte *
              </Label>
              <Input
                id="heureRetour"
                type="time"
                value={crForm.heureRetour}
                onChange={(e) => setCrForm({ ...crForm, heureRetour: e.target.value })}
                className="h-11 border-slate-200 dark:border-zinc-800 focus:ring-purple-500"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="missionnaireRetour" className="text-xs font-semibold uppercase text-slate-500">
                Missionnaire au retour
              </Label>
              <Input
                id="missionnaireRetour"
                value={crForm.missionnaireRetour}
                onChange={(e) => setCrForm({ ...crForm, missionnaireRetour: e.target.value })}
                placeholder="Noms des missionnaires au retour"
                className="h-11 border-slate-200 dark:border-zinc-800"
              />
              <p className="text-[10px] text-slate-400 italic">Laisser identique si pas de changement</p>
            </div>
          </div>
          <DialogFooter className="p-6 pt-2 border-t border-slate-100 dark:border-zinc-900 flex gap-2">
            <Button variant="outline" onClick={() => setIsCROpen(false)} className="flex-1 h-11">
              Annuler
            </Button>
            <Button
              onClick={handleSaveAndExport}
              disabled={createOrUpdateMutation.isPending}
              className="flex-1 h-11 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20"
            >
              {createOrUpdateMutation.isPending ? 'Enregistrement...' : 'Valider & Archiver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default Missions;
