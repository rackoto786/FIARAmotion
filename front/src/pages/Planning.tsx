import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Pencil, Search, Check, X, Archive, Clock, MapPin, Wrench, Calendar, Car, ChevronLeft, ChevronRight, LayoutList, CalendarDays, Library, Zap, Settings, Code, GraduationCap, UserCheck, ShoppingCart, Users, RefreshCw, AlertCircle, Truck, FileText, ArrowRight, Hash, Info, User, History } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PLANNING_STATUS_LABELS, PlanningStatus } from '@/types';
import { cn, formatDateFr } from "@/lib/utils";
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
import { YearView } from '@/components/planning/YearView';
import { MonthView } from '@/components/planning/MonthView';
import { DayTimelineView } from '@/components/planning/DayTimelineView';
import KanbanView from '@/components/planning/KanbanView';

export const typeConfig: any = {
  bibliotheque_mobile: { label: 'Déploiement bibliothèque mobile', icon: Library },
  edp: { label: 'EDP', icon: Zap },
  ort: { label: 'ORT', icon: Settings },
  dvp: { label: 'DVP', icon: Code },
  visite_stagiaire: { label: 'VISITE STAGIAIRE', icon: GraduationCap },
  visite_personne_ressource: { label: 'VISITE personne ressource', icon: UserCheck },
  achat: { label: 'Achat', icon: ShoppingCart },
  visiteur: { label: 'Visiteur', icon: Users },
  maintenance: { label: 'Maintenance', icon: Wrench },
  mission: { label: 'Mission', icon: FileText },
};

// Status Tabs Component
const StatusTabs = ({ activeTab, onTabChange }: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) => {
  const tabs = [
    { id: 'all', label: 'Toutes', icon: LayoutList, color: 'text-blue-500' },
    { id: 'en_attente', label: 'En Attente', icon: Clock, color: 'text-amber-500' },
    { id: 'acceptee', label: 'Acceptées', icon: Check, color: 'text-emerald-500' },
    { id: 'rejetee', label: 'Rejetées', icon: X, color: 'text-rose-500' },
    { id: 'historique', label: 'Archives', icon: Archive, color: 'text-purple-500' },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto p-1 bg-gray-100/50 dark:bg-black/20 backdrop-blur-sm rounded-xl w-fit custom-scrollbar border border-gray-200 dark:border-white/5 shadow-inner">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300 whitespace-nowrap",
              isActive
                ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-md ring-1 ring-black/5 dark:ring-white/10 scale-105"
                : "text-gray-500 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200"
            )}
          >
            <Icon className={cn("w-3.5 h-3.5 transition-colors", isActive ? tab.color : "opacity-50")} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

const Planning: React.FC = () => {
  const { user, permissions } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Annual View specific state
  const [isDriverDialogOpen, setIsDriverDialogOpen] = useState(false);
  const [driverFilter, setDriverFilter] = useState<string | null>(null);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'en_attente' | 'acceptee' | 'annulee' | 'rejetee' | 'historique'>('all');

  const [formData, setFormData] = useState({
    vehiculeId: '',
    conducteurId: '',
    dateDebut: '',
    dateFin: '',
    type: 'mission',
    description: '',
    status: 'en_attente' as PlanningStatus,
    // Mission fields
    missionnaire: '',
    lieuDepart: 'CAMPUS',
    lieuDestination: '',
    kilometrageDepart: '',
    titre: '',
    priorite: 'Moyenne' as any,
    distancePrevue: 0,
    distancePrevue: 0,
    destinations: [''] as string[],
    numeroOm: '',
    zone: 'ville' as 'ville' | 'periferie'
  });

  // Queries
  const { data: planningItems = [], isFetching: isPlanningFetching, refetch: refetchPlanning } = useQuery({
    queryKey: ['planning'],
    queryFn: async () => (await apiClient.get<any[]>(`/planning?t=${Date.now()}`)).data,
    refetchInterval: 5000, // Reduced to 5s for better responsiveness
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => (await apiClient.get<any[]>('/vehicles')).data,
    refetchInterval: 60000 // Refresh every minute
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => (await apiClient.get<any[]>('/drivers')).data,
    refetchInterval: 60000 // Refresh every minute
  });

  console.log('🔄 Rendering Planning component with', planningItems.length, 'items');

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => await apiClient.post('/planning', data),
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ['planning'] });
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
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ['planning'] });
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
    onSuccess: async () => {
      await queryClient.resetQueries({ queryKey: ['planning'] });
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
      description: '',
      status: 'en_attente' as PlanningStatus,
      missionnaire: '',
      lieuDepart: 'CAMPUS',
      lieuDestination: '',
      kilometrageDepart: '',
      titre: '',
      priorite: 'Moyenne',
      distancePrevue: 0,
      distancePrevue: 0,
      destinations: [''],
      numeroOm: '',
      zone: 'ville'
    });
  };

  const handleCreateClick = () => {
    resetForm();
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleCreateForDate = (vehicleId: string, date: string) => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      vehiculeId: vehicleId,
      dateDebut: `${date}T08:00`,
      dateFin: `${date}T18:00`
    }));
    setIsViewMode(false);
    setIsDialogOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setFormData({
      vehiculeId: item.vehiculeId,
      conducteurId: item.conducteurId || '',
      dateDebut: item.dateDebut.slice(0, 16),
      dateFin: item.dateFin.slice(0, 16),
      type: item.type,
      description: item.description,
      status: item.status,
      // Handle potential existing mission data if linked
      missionnaire: item.missionnaire || '',
      lieuDepart: item.lieuDepart || 'CAMPUS',
      lieuDestination: item.lieuDestination || '',
      kilometrageDepart: item.kilometrage_depart?.toString() || item.kilometrageDepart?.toString() || '',
      titre: item.titre || '',
      priorite: item.priorite_label || 'Moyenne',
      distancePrevue: item.distancePrevue || 0,
      distancePrevue: item.distancePrevue || 0,
      destinations: item.trajet ? item.trajet.split(' --> ') : [item.lieuDestination || ''],
      numeroOm: item.numeroOm || '',
      zone: item.zone || 'ville'
    });
    setIsViewMode(true);
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

    setFormData(prev => ({
      ...prev,
      titre: title,
      priorite: priority
    }));
  };

  const addDestination = () => {
    setFormData(prev => ({ ...prev, destinations: [...prev.destinations, ''] }));
  };

  const removeDestination = (index: number) => {
    setFormData(prev => {
      const newDest = [...prev.destinations];
      newDest.splice(index, 1);
      return { ...prev, destinations: newDest.length > 0 ? newDest : [''] };
    });
  };

  const updateDestination = (index: number, val: string) => {
    setFormData(prev => {
      const newDest = [...prev.destinations];
      newDest[index] = val;
      return { ...prev, destinations: newDest };
    });
  };

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA')); // YYYY-MM-DD in local time
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  // View state
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year' | 'kanban'>('week');

  // Derived State
  const today = new Date().toISOString().split('T')[0];
  const weekDays = useMemo(() => {
    const days = [];
    const current = new Date(selectedDate);

    if (viewMode === 'day') {
      days.push({
        date: current.toISOString().split('T')[0],
        day: current.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dayNum: current.getDate()
      });
      return days;
    }

    // Default 'week' view logic
    // Find Monday of the current week
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(current.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({
        date: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
        dayNum: d.getDate()
      });
    }
    return days;
  }, [selectedDate, viewMode]);

  const getPlanningsForDate = (vehicleId: string, date: string) => {
    return planningItems
      .filter((p: any) =>
        p.vehiculeId === vehicleId &&
        ['acceptee', 'en_attente'].includes(p.status) &&
        date >= p.dateDebut.split('T')[0] &&
        date <= p.dateFin.split('T')[0]
      )
      .sort((a: any, b: any) => {
        const pA = a.priorite || 3;
        const pB = b.priorite || 3;
        if (pA !== pB) return pA - pB;
        return new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime();
      });
  };

  const filteredVehicles = useMemo(() => {
    const baseFilter = vehicles.filter((v: any) => {
      const term = searchTerm.toLowerCase();
      const driver = drivers.find((d: any) => d.vehiculeAssigne === v.id);
      const driverName = driver ? `${driver.prenom} ${driver.nom}`.toLowerCase() : '';

      // Search filter
      const matchesSearch = (
        (v.immatriculation?.toLowerCase() || v.matricule?.toLowerCase() || '').includes(term) ||
        (v.marque?.toLowerCase() || '').includes(term) ||
        driverName.includes(term)
      );

      // Vehicle type filter
      const matchesType = vehicleTypeFilter === 'all' ||
        (v.type_vehicule?.toLowerCase() || '') === vehicleTypeFilter.toLowerCase();

      return matchesSearch && matchesType;
    });

    // For day view, also include vehicles with accepted plannings for selected date
    // This ensures accepted plannings are always visible, even if vehicle is filtered out
    if (viewMode === 'day') {
      const vehicleIdsInFilter = new Set(baseFilter.map((v: any) => v.id));

      // Find accepted plannings for the selected date
      const acceptedPlanningsForDate = planningItems.filter((p: any) => {
        if (p.status?.toLowerCase() !== 'acceptee') return false;

        const itemStartDate = p.dateDebut.split('T')[0];
        const itemEndDate = p.dateFin.split('T')[0];

        // Check if selected date falls within planning date range
        return selectedDate >= itemStartDate && selectedDate <= itemEndDate;
      });

      // Get vehicle IDs that have accepted plannings but are not in filtered list
      const additionalVehicleIds = new Set(
        acceptedPlanningsForDate
          .map((p: any) => p.vehiculeId)
          .filter((id: string) => !vehicleIdsInFilter.has(id))
      );

      // Add these vehicles to the list
      const additionalVehicles = vehicles.filter((v: any) => additionalVehicleIds.has(v.id));

      console.log('🔍 Day View Vehicle Filter Enhancement:');
      console.log('  Base filtered vehicles:', baseFilter.length);
      console.log('  Additional vehicles with accepted plannings:', additionalVehicles.length);
      console.log('  Total vehicles shown:', baseFilter.length + additionalVehicles.length);
      console.log('  DEBUG - Selected date:', selectedDate);
      console.log('  DEBUG - Total planning items from API:', planningItems.length);
      console.log('  DEBUG - Accepted plannings for date:', acceptedPlanningsForDate.length);
      if (acceptedPlanningsForDate.length > 0) {
        console.log('  DEBUG - Accepted planning details:', acceptedPlanningsForDate.map(p => ({
          id: p.id,
          vehicleId: p.vehiculeId,
          start: p.dateDebut,
          end: p.dateFin
        })));
      }
      return [...baseFilter, ...additionalVehicles];
    }

    return baseFilter;
  }, [vehicles, searchTerm, vehicleTypeFilter, drivers, viewMode, selectedDate, planningItems]);

  // Filter plannings by status
  const filteredPlanningsByStatus = useMemo(() => {
    if (statusFilter === 'all') return planningItems;

    if (statusFilter === 'historique') {
      // Vue historique : uniquement les réservations clôturées, triées par date décroissante
      return planningItems
        .filter((p: any) => p.status === 'cloturee')
        .sort((a: any, b: any) =>
          new Date(b.dateDebut).getTime() - new Date(a.dateDebut).getTime()
        );
    }

    return planningItems.filter((p: any) => p.status === statusFilter);
  }, [planningItems, statusFilter]);

  const planningByVehicle = filteredVehicles.map((vehicle: any) => ({
    vehicle,
    driver: drivers.find((d: any) => d.vehiculeAssigne === vehicle.id),
  }));

  // Navigation Handlers
  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    } else if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'year') {
      d.setFullYear(d.getFullYear() - 1);
    } else {
      // week
      d.setDate(d.getDate() - 7);
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    } else if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'year') {
      d.setFullYear(d.getFullYear() + 1);
    } else {
      // week
      d.setDate(d.getDate() + 7);
    }
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const getHeaderLabel = () => {
    const d = new Date(selectedDate);

    if (viewMode === 'day') {
      return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    }

    if (viewMode === 'month') {
      return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase();
    }

    if (viewMode === 'year') {
      return `ANNÉE ${d.getFullYear()}`;
    }

    // Week view default
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d);
    start.setDate(diff);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    // Capitalize month
    const month = start.toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const startDay = start.getDate();
    const endDay = end.getDate();
    const weekNum = getWeekNumber(start);
    const year = start.getFullYear();

    return `${month} ${startDay} - ${endDay} (sem ${weekNum} - ${year})`;
  };



  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning"
        description="Vue d'ensemble des planifications"
        icon={Calendar}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetchPlanning()}
              className={cn(isPlanningFetching && "animate-spin")}
              title="Rafraîchir"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button className="gap-2" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" />
              Nouvelle réservation
            </Button>
          </div>
        }
      />

      {/* New Navigation Header matching design */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        {/* Date Navigation */}
        <div className="flex items-center gap-2 bg-background/50 backdrop-blur border rounded-lg p-1">
          <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 font-semibold min-w-[280px] text-center text-primary">
            {getHeaderLabel()}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* View Selectors */}
        <div className="flex bg-secondary/50 p-1 rounded-xl">
          <Button
            variant={viewMode === 'day' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setViewMode('day');
              setStatusFilter('all');
            }}
            className={cn("gap-2", viewMode === 'day' ? "bg-teal-600 hover:bg-teal-700" : "")}
          >
            <LayoutList className="h-4 w-4" />
            Vue Jour
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setViewMode('week');
              setStatusFilter('all');
            }}
            className={cn("gap-2", viewMode === 'week' ? "bg-teal-600 hover:bg-teal-700" : "")}
          >
            <CalendarDays className="h-4 w-4" />
            Vue Hebdomadaire
          </Button>
          <Button
            variant={viewMode === 'month' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setViewMode('month');
              setStatusFilter('all');
            }}
            className={cn("gap-2", viewMode === 'month' ? "bg-teal-600 hover:bg-teal-700" : "")}
          >
            <Calendar className="h-4 w-4" />
            Vue Mensuelle
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className={cn("gap-2", viewMode === 'kanban' ? "bg-teal-600 hover:bg-teal-700" : "")}
          >
            <LayoutList className="h-4 w-4" />
            Kanban
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'year' ? 'default' : 'ghost'}
            className={cn("gap-2", viewMode === 'year' ? "bg-teal-600 hover:bg-teal-700" : "bg-teal-600/10 hover:bg-teal-600/20 text-teal-400")}
            onClick={() => {
              setViewMode('year');
              setStatusFilter('all');
            }}
          >
            <Calendar className="h-4 w-4" />
            Planification annuelle
          </Button>
          <Button
            variant="default"
            className="bg-teal-600 hover:bg-teal-700 gap-2"
            onClick={() => setIsDriverDialogOpen(true)}
          >
            <Calendar className="h-4 w-4" />
            Cal. annuel conducteur
          </Button>
        </div>
      </div>

      {/* Toolbar - Always visible now */}
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
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {viewMode === 'day' ? 'Date :' : 'Semaine du :'}
            </span>
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

      {viewMode === 'kanban' && (
        <div className="bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-4 mb-6 shadow-sm dark:shadow-2xl overflow-x-auto">
          <StatusTabs
            activeTab={statusFilter}
            onTabChange={(tab) => {
              setStatusFilter(tab as any);
              setViewMode('kanban');
            }}
          />
        </div>
      )}

      {
        viewMode === 'kanban' ? (
          <KanbanView
            planningItems={filteredPlanningsByStatus}
            statusFilter={statusFilter}
            vehicles={vehicles}
            drivers={drivers}
            onEditClick={handleEditClick}
          />
        ) : viewMode === 'year' ? (
          <div className="space-y-4">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Vue Annuelle {new Date(selectedDate).getFullYear()}
                  {driverFilter && (
                    <Badge variant="secondary" className="ml-2">
                      Conducteur: {drivers.find((d: any) => d.id === driverFilter)?.prenom} {drivers.find((d: any) => d.id === driverFilter)?.nom}
                      <X
                        className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive"
                        onClick={() => {
                          setDriverFilter(null);
                          // Keep year view but clear filter
                        }}
                      />
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <YearView
                  year={new Date(selectedDate).getFullYear()}
                  planningItems={planningItems}
                  vehicles={vehicles}
                  drivers={drivers}
                  driverFilter={driverFilter}
                  onMonthClick={(monthIndex) => {
                    // Switch to month view (simplified: just select date in that month and go to week view for now)
                    const d = new Date(selectedDate);
                    d.setMonth(monthIndex);
                    setSelectedDate(d.toISOString().split('T')[0]);
                    setViewMode('month');
                  }}
                />
              </CardContent>
            </Card>
          </div>
        ) : viewMode === 'month' ? (
          <div className="space-y-4">
            <MonthView
              currentDate={selectedDate}
              planningItems={planningItems}
              onDateClick={(date) => {
                setSelectedDate(date);
                setViewMode('day');
              }}
              onPrevMonth={handlePrev}
              onNextMonth={handleNext}
            />
          </div>
        ) : viewMode === 'day' ? (
          <div className="space-y-4 overflow-x-auto custom-scrollbar rounded-xl">
            {(() => {
              // Dans la vue jour, on garde l'affichage des plannings acceptés pour ce jour
              const filteredByStatus = planningItems.filter((p: any) => p.status?.toLowerCase() === 'acceptee');

              return (
                <DayTimelineView
                  selectedDate={selectedDate}
                  vehicles={filteredVehicles}
                  planningItems={filteredByStatus}
                  drivers={drivers}
                  typeConfig={typeConfig}
                  onEditClick={handleEditClick}
                  onCellClick={(vehicleId, hour) => {
                    handleCreateForDate(vehicleId, selectedDate);
                    setFormData(prev => ({
                      ...prev,
                      dateDebut: `${selectedDate}T${hour.toString().padStart(2, '0')}:00`,
                      dateFin: `${selectedDate}T${(hour + 1).toString().padStart(2, '0')}:00`
                    }));
                  }}
                />
              );
            })()}
          </div>
        ) : (
          <>
            {/* Week Calendar Header */}
            <Card variant="glass">
              <CardContent className="p-4">
                <div className="grid gap-2 grid-cols-8">
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
                    <div key={vehicle.id} className="grid gap-2 py-2 border-b border-border/50 last:border-0 grid-cols-8">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                          <Car className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{vehicle.immatriculation || vehicle.matricule}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {vehicle.marque}
                          </p>
                        </div>
                      </div>

                      {weekDays.map(day => {
                        const dayPlannings = getPlanningsForDate(vehicle.id, day.date);

                        return (
                          <div
                            key={day.date}
                            onClick={() => handleCreateForDate(vehicle.id, day.date)}
                            className="rounded-lg p-1.5 min-h-[70px] transition-all relative group flex flex-col gap-1.5 border border-dashed border-border/30 hover:bg-secondary/20 transition-colors cursor-pointer"
                          >
                            {dayPlannings.length > 0 ? (
                              <div className="flex flex-col gap-1.5 w-full">
                                {dayPlannings.map((planning: any) => {
                                  const config = typeConfig[planning.type];
                                  const Icon = config?.icon || Clock;
                                  return (
                                    <div
                                      key={planning.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditClick(planning);
                                      }}
                                      className={cn(
                                        "h-4 w-full rounded-md border text-[10px] flex items-center px-2 cursor-pointer transition-all hover:scale-[1.02] shadow-sm relative overflow-hidden text-white",
                                        planning.status === 'acceptee' ? "bg-emerald-500 border-emerald-600" :
                                          planning.status === 'en_attente' ? "bg-amber-500 border-amber-600" :
                                            planning.status === 'rejetee' ? "bg-rose-500 border-rose-600" :
                                              "bg-slate-500 border-slate-600"
                                      )}
                                      style={planning.status === 'en_attente' ? {
                                        backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
                                        backgroundSize: '10px 10px'
                                      } : {}}
                                      title={`
Type: ${config?.label}
Statut: ${PLANNING_STATUS_LABELS[planning.status as PlanningStatus]}
Véhicule: ${vehicle.marque} ${vehicle.modele}
Conducteur: ${planning.conducteurId ? drivers.find((d: any) => d.id === planning.conducteurId)?.prenom + ' ' + drivers.find((d: any) => d.id === planning.conducteurId)?.nom : 'Aucun'}
Mission: ${planning.titre || 'N/A'}
Itinéraire: ${planning.lieuDepart || ''} -> ${planning.trajet || planning.lieuDestination || ''}
Missionnaire(s): ${planning.missionnaire || 'N/A'}
Du: ${new Date(planning.dateDebut).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
Au: ${new Date(planning.dateFin).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
Desc: ${planning.description}
`.trim()}
                                    >
                                      <div className="flex items-center gap-1.5 w-full overflow-hidden relative z-10">
                                        <Icon className="h-2.5 w-2.5 shrink-0" />
                                        {planning.status === 'acceptee' ? (
                                          <Check className="h-2.5 w-2.5 shrink-0 text-white" />
                                        ) : planning.status === 'en_attente' ? (
                                          <Clock className="h-2.5 w-2.5 shrink-0 text-white animate-pulse" />
                                        ) : planning.status === 'rejetee' ? (
                                          <X className="h-2.5 w-2.5 shrink-0 text-red-200" />
                                        ) : null}
                                        <span className="font-bold truncate pointer-events-none uppercase text-[8px] tracking-tighter">
                                          {planning.description || config?.label} {planning.conducteurId && `| ${drivers.find((d: any) => d.id === planning.conducteurId)?.prenom}`}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Plus className="h-4 w-4 text-muted-foreground/40" />
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
          </>
        )
      }


      {/* Driver Selection Dialog for Annual View */}
      <Dialog open={isDriverDialogOpen} onOpenChange={setIsDriverDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sélectionner un collaborateur</DialogTitle>
            <DialogDescription>
              Choisissez un conducteur pour voir son planning annuel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Conducteur</Label>
              <Select onValueChange={(val) => {
                setDriverFilter(val);
                setViewMode('year');
                setIsDriverDialogOpen(false);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom} ({d.statut})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDriverDialogOpen(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Form */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-zinc-950">
          {isViewMode && editingItem ? (
            <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <DialogHeader className="p-6 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-t-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-white/20 hover:bg-white/30 border-none text-white">
                        {(typeConfig[editingItem.type] || typeConfig['mission'])?.label || editingItem.type}
                      </Badge>
                      {editingItem.mission_reference && (
                        <span className="text-xs font-mono opacity-80 flex items-center gap-1">
                          <Hash className="w-3 h-3" /> {editingItem.mission_reference}
                        </span>
                      )}
                    </div>
                    <DialogTitle className="text-2xl font-bold">
                      {editingItem.titre || editingItem.description || "Détails de la réservation"}
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 opacity-80 mt-1">
                      Consultez les informations complètes de cette planification.
                    </DialogDescription>
                  </div>
                  <div className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-1.5 shadow-lg",
                    editingItem.status === 'acceptee' ? "bg-emerald-500 text-white" :
                      editingItem.status === 'en_attente' ? "bg-amber-500 text-white" :
                        editingItem.status === 'rejetee' ? "bg-rose-500 text-white" : "bg-slate-500 text-white"
                  )}>
                    {editingItem.status === 'acceptee' ? <Check className="w-3.5 h-3.5" /> :
                      editingItem.status === 'en_attente' ? <Clock className="w-3.5 h-3.5" /> :
                        editingItem.status === 'rejetee' ? <X className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    {PLANNING_STATUS_LABELS[editingItem.status as PlanningStatus] || editingItem.status}
                  </div>
                </div>
              </DialogHeader>

              {/* Content */}
              <div className="p-6 space-y-8">
                {/* Primary Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: Mission Info */}
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2.5 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase font-black tracking-widest">Période & Horaire</Label>
                        <div className="text-slate-800 dark:text-slate-200 mt-1">
                          <p className="font-bold text-lg">{formatDateFr(editingItem.dateDebut)}</p>
                          <div className="flex items-center gap-2 text-sm font-medium opacity-70 mt-1">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(editingItem.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span>{new Date(editingItem.dateFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2.5 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase font-black tracking-widest">Missionnaire(s)</Label>
                        <p className="text-slate-800 dark:text-slate-200 font-bold text-lg mt-0.5">{editingItem.missionnaire || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2.5 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                        <Info className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase font-black tracking-widest">Niveau de Priorité</Label>
                        <div className="mt-1.5">
                          <Badge className={cn(
                            "px-3 py-1 border-none shadow-sm",
                            (editingItem.priorite_label || 'Moyenne') === 'Haute' ? "bg-orange-500 text-white" :
                              (editingItem.priorite_label || 'Moyenne') === 'Critique' ? "bg-rose-500 text-white" :
                                (editingItem.priorite_label || 'Moyenne') === 'Basse' ? "bg-emerald-500 text-white" : "bg-blue-500 text-white"
                          )}>
                            {editingItem.priorite_label || 'Moyenne'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Vehicle & Driver */}
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase font-black tracking-widest">Détails du Véhicule</Label>
                        {(() => {
                          const v = vehicles.find((v: any) => v.id === editingItem.vehiculeId);
                          return v ? (
                            <div className="text-slate-800 dark:text-slate-200 mt-1">
                              <p className="font-bold text-lg leading-tight">{v.immatriculation || v.matricule}</p>
                              <p className="text-sm font-medium opacity-70 italic">{v.marque} {v.modele}</p>
                            </div>
                          ) : <p className="text-slate-400 mt-1">Véhicule non trouvé</p>
                        })()}
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="mt-1 p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <Label className="text-xs text-slate-500 uppercase font-black tracking-widest">Chauffeur Assigné</Label>
                        {(() => {
                          const d = drivers.find((d: any) => d.id === editingItem.conducteurId);
                          return d ? (
                            <div className="text-slate-800 dark:text-slate-200 mt-1">
                              <p className="font-bold text-lg leading-tight">{d.prenom} {d.nom}</p>
                              <p className="text-sm font-medium opacity-70 flex items-center gap-2 mt-1">
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-white/5 rounded text-[10px]">{d.statut}</span>
                                {d.telephone}
                              </p>
                            </div>
                          ) : <p className="text-slate-400 mt-1">Aucun chauffeur assigné</p>
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itinerary Section */}
                <div className="bg-slate-50 dark:bg-zinc-900/50 p-6 rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-black uppercase text-xs tracking-widest">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span>Itinéraire & Destinations</span>
                    </div>
                    {editingItem.distancePrevue && (
                      <Badge variant="outline" className="font-mono text-emerald-600 bg-emerald-500/5 border-emerald-500/20">
                        Total: {editingItem.distancePrevue} km
                      </Badge>
                    )}
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-teal-500 before:to-emerald-500 before:rounded-full">
                    {/* Depart */}
                    <div className="relative">
                      <div className="absolute -left-[2.05rem] top-1.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border-4 border-blue-500 z-10" />
                      <div>
                        <Label className="text-[10px] uppercase text-slate-400 font-black tracking-tighter block mb-0.5">Point de départ</Label>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{editingItem.lieuDepart || "CAMPUS"}</p>
                      </div>
                    </div>

                    {/* Step Destinations */}
                    {editingItem.trajet && editingItem.trajet.split(' --> ').length > 1 ? (
                      editingItem.trajet.split(' --> ').slice(0, -1).map((step: string, i: number) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[2rem] top-2 w-[14px] h-[14px] rounded-full bg-teal-500 ring-2 ring-white dark:ring-zinc-900 z-10" />
                          <div>
                            <Label className="text-[10px] uppercase text-slate-400 font-black tracking-tighter block mb-0.5">Étape {i + 1}</Label>
                            <p className="font-bold text-slate-700 dark:text-slate-300">{step}</p>
                          </div>
                        </div>
                      ))
                    ) : null}

                    {/* Final Destination */}
                    <div className="relative">
                      <div className="absolute -left-[2.05rem] top-1.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 border-4 border-emerald-500 z-10" />
                      <div>
                        <Label className="text-[10px] uppercase text-slate-400 font-black tracking-tighter block mb-0.5">Destination finale</Label>
                        <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">
                          {editingItem.trajet ? editingItem.trajet.split(' --> ').pop() : (editingItem.lieuDestination || "Non spécifié")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {editingItem.kilometrageDepart && (
                    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500 font-medium">Compteur au départ :</span>
                      </div>
                      <span className="text-sm font-black font-mono text-slate-700 dark:text-slate-300">
                        {editingItem.kilometrageDepart.toLocaleString()} KM
                      </span>
                    </div>
                  )}
                </div>

                {/* Description Box */}
                {editingItem.description && (
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-slate-200 to-blue-200 dark:from-white/5 dark:to-white/5 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-100 dark:border-white/5">
                      <Label className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Remarques complémentaires
                      </Label>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed italic pr-4 italic">
                        &ldquo;{editingItem.description}&rdquo;
                      </p>
                    </div>
                  </div>
                )}

                {/* Footer Operations */}
                <DialogFooter className="gap-4 sm:justify-between flex-col sm:flex-row pt-6 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                    {permissions?.canManagePlanning && (
                      <>
                        {editingItem.status === 'en_attente' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 px-6"
                              onClick={() => updateMutation.mutate({ id: editingItem.id, data: { status: 'acceptee' } })}
                            >
                              <Check className="h-4 w-4 mr-2" /> Accepter
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="px-6 shadow-lg shadow-rose-500/20"
                              onClick={() => updateMutation.mutate({ id: editingItem.id, data: { status: 'rejetee' } })}
                            >
                              <X className="h-4 w-4 mr-2" /> Rejeter
                            </Button>
                          </>
                        )}

                        {editingItem.status === 'acceptee' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-6"
                            onClick={() => updateMutation.mutate({ id: editingItem.id, data: { status: 'cloturee' } })}
                          >
                            <Archive className="h-4 w-4 mr-2" /> Clôturer
                          </Button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex gap-3 justify-center sm:justify-end">
                    {(user?.role === 'admin' || user?.role === 'technician') && (
                      <Button
                        variant="outline"
                        onClick={() => setIsViewMode(false)}
                        className="gap-2 border-slate-200 dark:border-white/10 hover:bg-teal-500 hover:text-white hover:border-teal-500 transition-all duration-300"
                      >
                        <Pencil className="w-4 h-4" /> Modifier
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => setIsDialogOpen(false)}
                      className="text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                      Fermer
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-900 dark:to-purple-900 text-white rounded-t-lg">
                <DialogTitle className="text-xl font-bold flex flex-col gap-1">
                  <span>{editingItem ? 'Modifier la réservation' : 'Nouvelle réservation'}</span>
                  <DialogDescription className="text-sm font-normal opacity-90 text-blue-100">
                    {editingItem ? 'Mettez à jour les détails de la réservation.' : 'Remplissez les informations pour créer une mission et sa réservation.'}
                  </DialogDescription>
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Section 1: Informations */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-xl border border-blue-100 dark:border-blue-900/20 space-y-4">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold border-b border-blue-100 dark:border-blue-900/20 pb-2">
                    <FileText className="h-4 w-4" /> <span>Informations de la mission</span>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Titre de la mission *</Label>
                      <Select value={formData.titre} onValueChange={handleTitleChange}>
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
                      <Select value={formData.priorite} disabled>
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
                        value={formData.zone}
                        onValueChange={(val: 'ville' | 'periferie') => setFormData({ ...formData, zone: val })}
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

                    {formData.zone === 'periferie' && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Label className="text-xs font-semibold text-slate-500 uppercase">Numéro OM * (Max 15 carac.)</Label>
                        <Input
                          value={formData.numeroOm}
                          onChange={e => setFormData({ ...formData, numeroOm: e.target.value.slice(0, 15) })}
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
                        value={formData.missionnaire || ''}
                        onChange={e => setFormData({ ...formData, missionnaire: e.target.value })}
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
                      <Select value={formData.vehiculeId} onValueChange={v => setFormData({ ...formData, vehiculeId: v })}>
                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {vehicles.map((v: any) => (<SelectItem key={v.id} value={v.id}>{v.immatriculation || v.matricule} - {v.marque}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Chauffeur *</Label>
                      <Select value={formData.conducteurId} onValueChange={v => setFormData({ ...formData, conducteurId: v })}>
                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {drivers.map((d: any) => (<SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>))}
                        </SelectContent>
                      </Select>
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
                        value={formData.lieuDepart}
                        onChange={e => setFormData({ ...formData, lieuDepart: e.target.value })}
                        className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                        required
                      />
                    </div>

                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2">
                        Destinations / Étapes *
                      </Label>

                      <div className="space-y-3">
                        {formData.destinations.map((dest, index) => (
                          <div key={index} className="flex gap-2 group">
                            <div className="relative flex-1">
                              <Input
                                value={dest}
                                onChange={(e) => updateDestination(index, e.target.value)}
                                placeholder={index === 0 ? "Première destination" : `Destination ${index + 1}`}
                                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 pr-10"
                                required
                              />
                            </div>

                            <div className="flex gap-1">
                              {formData.destinations.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => removeDestination(index)}
                                  className="h-10 w-10 text-red-500 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={addDestination}
                                className="h-10 w-10 text-blue-500"
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
                        value={formData.distancePrevue || ''}
                        onChange={e => setFormData({ ...formData, distancePrevue: parseFloat(e.target.value) || 0 })}
                        className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                        placeholder="Ex: 225"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Kilométrage de départ *</Label>
                      <Input
                        type="number"
                        value={formData.kilometrageDepart || ''}
                        onChange={e => setFormData({ ...formData, kilometrageDepart: e.target.value })}
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
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Début (Date & Heure) *</Label>
                      <Input
                        type="datetime-local"
                        value={formData.dateDebut}
                        onChange={e => setFormData({ ...formData, dateDebut: e.target.value })}
                        className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-500 uppercase">Fin (Date & Heure) *</Label>
                      <Input
                        type="datetime-local"
                        value={formData.dateFin}
                        onChange={e => setFormData({ ...formData, dateFin: e.target.value })}
                        className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-500 uppercase">Remarques / Description</Label>
                  <Input
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Précisions sur la mission..."
                  />
                </div>

                <DialogFooter className="gap-2 sm:justify-between flex-col sm:flex-row pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                    {editingItem && (user?.role === 'admin' || user?.role === 'technician') && (
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
                    {(!editingItem || user?.role === 'admin' || user?.role === 'technician') && (
                      <Button type="submit">{editingItem ? "Enregistrer" : "Créer la réservation"}</Button>
                    )}
                  </div>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Planning;
