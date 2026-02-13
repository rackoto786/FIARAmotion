import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Maintenance as MaintenanceType, Vehicle } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Eye, Check, MoreHorizontal, Clock, DollarSign, Car, X, Filter, CheckCircle, AlertCircle, Sparkles, PlusCircle, Flag, MapPin, User, FilePlus, Info, Calendar, Gauge, CreditCard, ChevronRight, History, ArrowRight, Truck, Archive, Search, LayoutGrid, List as ListIcon, FileText, Save } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

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
import { Textarea } from '@/components/ui/textarea';
import { MaintenanceHero } from '@/components/maintenance/MaintenanceHero';


const typeLabels: Record<MaintenanceType['type'], string> = {
  revision: 'Révision',
  vidange: 'Vidange',
  freins: 'Freins',
  pneus: 'Pneus',
  autre: 'Autre',
};

const statusLabels: Record<MaintenanceType['statut'], string> = {
  en_attente: 'En attente',
  accepte: 'Acceptée',
  rejete: 'Rejetée',
  en_cours: 'En cours',
  cloture: 'Clôturée',
  planifie: 'Planifié',
  archive: 'Archivée',
};

const Maintenance: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { permissions, user } = useAuth();
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceType | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formState, setFormState] = useState({
    vehiculeId: '',
    immatriculation: '', // For UI display only
    type: 'revision' as MaintenanceType['type'],
    description: '',
    dateDemande: new Date().toISOString().split('T')[0],
    datePrevue: '',
    kilometrage: '',
    cout: '',
    prestataire: '',
    statut: 'en_attente' as MaintenanceType['statut'],
    demandeurId: '',
    imageFacture: '',
    priorite: 'Moyenne',
    prochainEntretienKm: '',
    localisation: '',
    technicien: '',
    coutEstime: '',
    notesSupplementaires: '',
    compteRendu: '',
    dateRealisation: '',
    piecesRemplacees: '',
  });

  // Report modal state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportMaintenance, setReportMaintenance] = useState<MaintenanceType | null>(null);
  const [reportData, setReportData] = useState({
    report: '',
    pieces: '',
    dateRel: '',
    coutReel: '',
    imageFacture: '',
  });


  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');



  const queryClient = useQueryClient();

  const { data: maintenances = [], isLoading, isError } = useQuery<MaintenanceType[]>({
    queryKey: ['maintenances', user?.role, user?.id],
    queryFn: async () => {
      const res = await apiClient.get<MaintenanceType[]>(`/maintenance?role=${user?.role}&userId=${user?.id}`);
      // Filter out archived maintenance from the main views
      return res.data.filter(m => m.statut !== 'archive');
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
      immatriculation: '',
      type: 'revision',
      description: '',
      dateDemande: new Date().toISOString().split('T')[0],
      datePrevue: '',
      kilometrage: '',
      cout: '',
      prestataire: '',
      statut: 'en_attente',
      demandeurId: user?.id || '',
      imageFacture: '',
      priorite: 'Moyenne',
      prochainEntretienKm: '',
      localisation: '',
      technicien: '',
      coutEstime: '',
      notesSupplementaires: '',
      compteRendu: '',
      dateRealisation: '',
      piecesRemplacees: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEditOpen(true);
  };

  const openEditDialog = (m: MaintenanceType) => {
    const v = vehicles.find(veh => veh.id === m.vehiculeId);
    setEditingMaintenance(m);
    setSubmitError(null);
    setFormState({
      vehiculeId: m.vehiculeId,
      immatriculation: v?.immatriculation || '',
      type: m.type,
      description: m.description,
      dateDemande: m.dateDemande,
      datePrevue: m.datePrevue,
      kilometrage: String(m.kilometrage),
      cout: m.cout ? String(m.cout) : '',
      prestataire: m.prestataire || '',
      statut: m.statut,
      demandeurId: m.demandeurId,
      imageFacture: m.imageFacture || '',
      priorite: m.priorite || 'Moyenne',
      prochainEntretienKm: m.prochainEntretienKm ? String(m.prochainEntretienKm) : '',
      localisation: m.localisation || '',
      technicien: m.technicien || '',
      coutEstime: m.coutEstime ? String(m.coutEstime) : '',
      notesSupplementaires: m.notesSupplementaires || '',
      compteRendu: m.compteRendu || '',
      dateRealisation: m.dateRealisation || '',
      piecesRemplacees: m.piecesRemplacees || '',
    });
    setIsEditOpen(true);
  };

  const handleOpenReportModal = (m: MaintenanceType) => {
    setReportMaintenance(m);
    setReportData({
      report: m.compteRendu || '',
      pieces: m.piecesRemplacees || '',
      dateRel: m.dateRealisation || new Date().toISOString().split('T')[0],
      coutReel: m.cout ? String(m.cout) : '',
      imageFacture: m.imageFacture || '',
    });
    setIsReportOpen(true);
  };

  const handleSaveReport = async () => {
    if (!reportMaintenance) return;

    // Validation
    if (!reportData.dateRel || !reportData.pieces || !reportData.coutReel || !reportData.report) {
      toast({
        title: "Erreur",
        description: "Tous les champs sont obligatoires",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.put(`/maintenance/${reportMaintenance.id}`, {
        ...reportMaintenance,
        compteRendu: reportData.report,
        piecesRemplacees: reportData.pieces,
        dateRealisation: reportData.dateRel,
        cout: reportData.coutReel ? Number(reportData.coutReel) : reportMaintenance.cout,
        imageFacture: reportData.imageFacture,
        statut: 'archive',
      });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      toast({
        title: "Succès",
        description: "Rapport enregistré et entretien archivé avec succès",
        className: "bg-green-500 text-white"
      });
      setIsReportOpen(false);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rapport",
        variant: "destructive",
      });
    }
  };


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
      setIsSubmitting(true);
      const payload = {
        vehiculeId: formState.vehiculeId,
        type: formState.type,
        description: formState.description,
        dateDemande: formState.dateDemande,
        datePrevue: formState.datePrevue,
        kilometrage: Number(formState.kilometrage || 0),
        cout: formState.cout ? Number(formState.cout) : null,
        prestataire: formState.prestataire || null,
        statut: formState.statut,
        demandeurId: editingMaintenance?.demandeurId || user?.id || '1',
        priorite: formState.priorite,
        prochainEntretienKm: formState.prochainEntretienKm ? Number(formState.prochainEntretienKm) : null,
        localisation: formState.localisation || null,
        technicien: formState.technicien || null,
        coutEstime: formState.coutEstime ? Number(formState.coutEstime) : null,
        notesSupplementaires: formState.notesSupplementaires || null,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (maintenance: MaintenanceType) => {
    try {
      await apiClient.patch(`/maintenance/${maintenance.id}`, { statut: 'accepte' });
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      const vehicle = vehicles.find(v => v.id === maintenance.vehiculeId);
      toast({
        title: 'Demande acceptée',
        description: `L'entretien de ${typeLabels[maintenance.type]} pour ${vehicle?.immatriculation || maintenance.vehiculeId} a été approuvé.`,
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
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
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
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      const vehicle = vehicles.find(v => v.id === maintenance.vehiculeId);
      toast({
        title: 'Entretien clôturé',
        description: `L'entretien de ${typeLabels[maintenance.type]} pour ${vehicle?.immatriculation || maintenance.vehiculeId} a été marqué comme terminé.`,
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
      key: 'priorite',
      header: 'Priorité',
      cell: (maintenance: MaintenanceType) => (
        <Badge
          className={cn(
            "capitalize font-semibold",
            maintenance.priorite === 'Critique' ? "bg-red-600 text-white border-red-700 animate-pulse" :
              maintenance.priorite === 'Haute' ? "bg-red-500/10 text-red-600 border-red-200" :
                maintenance.priorite === 'Basse' ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                  "bg-yellow-500/10 text-yellow-600 border-yellow-200"
          )}
          variant="outline"
        >
          <Flag className="h-3 w-3 mr-1" />
          {maintenance.priorite || 'Moyenne'}
        </Badge>
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
      key: 'datePrevue',
      header: 'Date Prévue',
      cell: (maintenance: MaintenanceType) => {
        const isOverdue = (maintenance.statut === 'en_attente' || maintenance.statut === 'accepte' || maintenance.statut === 'en_cours') &&
          maintenance.datePrevue < new Date().toISOString().split('T')[0];
        return (
          <div className="flex flex-col">
            <span className={cn(
              "text-sm font-medium transition-colors",
              isOverdue ? "text-red-600 font-bold" : "text-slate-700 dark:text-slate-200 font-black"
            )}>
              {formatDateFr(maintenance.datePrevue)}
            </span>
            {isOverdue && (
              <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter animate-pulse flex items-center gap-1">
                <AlertCircle className="h-2.5 w-2.5" />
                Dépassement
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'technicien',
      header: 'Technicien',
      cell: (maintenance: MaintenanceType) => (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{maintenance.technicien || '-'}</span>
      ),
    },
    {
      key: 'prestataire',
      header: 'Prestataire',
      cell: (maintenance: MaintenanceType) => (
        <span className="text-sm text-slate-600 dark:text-slate-400">{maintenance.prestataire || '-'}</span>
      ),
    },
    {
      key: 'cout',
      header: 'Coût / Estimé',
      cell: (maintenance: MaintenanceType) => (
        <div className="flex flex-col">
          {maintenance.cout ? (
            <span className="font-mono font-medium text-success">
              {maintenance.cout.toLocaleString()} Ar
            </span>
          ) : maintenance.coutEstime ? (
            <span className="font-mono text-xs text-muted-foreground italic">
              Est: {maintenance.coutEstime.toLocaleString()} Ar
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
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
            {/* Action pour passer en cours */}
            {permissions?.canApproveRequests && maintenance.statut === 'accepte' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  try {
                    await apiClient.patch(`/maintenance/${maintenance.id}`, { statut: 'en_cours' });
                    queryClient.invalidateQueries({ queryKey: ['maintenances'] });
                    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                    toast({
                      title: 'Mise à jour',
                      description: 'Maintenance marquée comme en cours.',
                      className: "bg-blue-500 text-white"
                    });
                  } catch (err: any) {
                    toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
                  }
                }} className="text-info">
                  <Clock className="h-4 w-4 mr-2" />
                  Marquer en cours
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

            {(user?.role === 'admin' || user?.role === 'technician' || maintenance.demandeurId === user?.id) && permissions?.canManageMaintenance && (
              <>
                <DropdownMenuItem onClick={() => openEditDialog(maintenance)}>
                  <Wrench className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>

              </>
            )}

            {permissions?.canDeleteMaintenance && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    if (window.confirm("Supprimer cette maintenance ?")) {
                      try {
                        await apiClient.delete(`/maintenance/${maintenance.id}`);
                        queryClient.invalidateQueries({ queryKey: ['maintenances'] });
                        queryClient.invalidateQueries({ queryKey: ['global-summary'] });
                        queryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-recap'] });
                        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
                        toast({
                          title: "Succès",
                          description: "La maintenance a été supprimée.",
                          className: "bg-green-500 text-white"
                        });
                      } catch (error: any) {
                        const errorMsg = error.response?.data?.error || error.message || 'Erreur lors de la suppression';
                        console.error('Erreur lors de la suppression:', errorMsg);
                        toast({
                          title: 'Erreur',
                          description: errorMsg,
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
  const demandeur = selectedMaintenance
    ? drivers.find(d => d.id === selectedMaintenance.demandeurId)
    : null;

  // Filtered data
  const filteredMaintenances = maintenances.filter(maintenance => {
    // Status Filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'en_retard') {
        const isOverdue = (maintenance.statut === 'en_attente' || maintenance.statut === 'accepte' || maintenance.statut === 'en_cours') &&
          maintenance.datePrevue < new Date().toISOString().split('T')[0];
        if (!isOverdue) return false;
      } else if (maintenance.statut !== statusFilter) {
        return false;
      }
    }

    // Vehicle Type Filter
    if (vehicleTypeFilter !== 'all') {
      const v = vehicles.find(veh => veh.id === maintenance.vehiculeId);
      if (!v) return false;
      const type = v.type_vehicule?.toLowerCase();
      if (vehicleTypeFilter === 'moto' && type !== 'moto') return false;
      if (vehicleTypeFilter === 'voiture' && type !== 'voiture') return false;
    }

    // Priority Filter
    if (priorityFilter !== 'all' && maintenance.priorite !== priorityFilter) return false;

    // Date Filter (using Scheduled Date)
    if (dateFilter) {
      const maintenanceDate = new Date(maintenance.datePrevue).toISOString().split('T')[0];
      if (maintenanceDate !== dateFilter) return false;
    }

    // Search Query
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const vehicle = vehicles.find(v => v.id === maintenance.vehiculeId);
      const matches =
        maintenance.description.toLowerCase().includes(lowerCaseQuery) ||
        maintenance.technicien?.toLowerCase().includes(lowerCaseQuery) ||
        maintenance.prestataire?.toLowerCase().includes(lowerCaseQuery) ||
        typeLabels[maintenance.type].toLowerCase().includes(lowerCaseQuery) ||
        vehicle?.immatriculation?.toLowerCase().includes(lowerCaseQuery) ||
        vehicle?.marque?.toLowerCase().includes(lowerCaseQuery) ||
        vehicle?.modele?.toLowerCase().includes(lowerCaseQuery);
      if (!matches) return false;
    }

    return true;
  });

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const maintenanceCategories = {
    planifies: filteredMaintenances.filter(m => (m.statut === 'en_attente' || m.statut === 'accepte') && m.datePrevue >= todayStr),
    en_cours: filteredMaintenances.filter(m => m.statut === 'en_cours' && m.datePrevue >= todayStr),
    termines: filteredMaintenances.filter(m => m.statut === 'cloture'),
    en_retard: filteredMaintenances.filter(m => (m.statut === 'en_attente' || m.statut === 'accepte' || m.statut === 'en_cours') && m.datePrevue < todayStr),
  };

  const KanbanCard = ({ maintenance }: { maintenance: MaintenanceType }) => {
    const { theme } = useTheme();
    const v = vehicles.find(veh => veh.id === maintenance.vehiculeId);
    const isOverdue = (maintenance.statut === 'en_attente' || maintenance.statut === 'accepte' || maintenance.statut === 'en_cours') &&
      maintenance.datePrevue < todayStr;

    // Calculate days remaining
    const diffTime = new Date(maintenance.datePrevue).getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));



    const isDark = theme === 'dark';

    const statusStyles = {
      planifies: {
        color: '#00AEEF',
        bg: 'bg-[#E0F7FF] dark:bg-[#003d52]/30',
        border: 'border-[#00AEEF40] dark:border-[#00B4D8]/30',
        headerBg: 'bg-[#00AEEF]',
        buttonBg: 'bg-[#00AEEF]',
        lightBg: 'bg-blue-50/50 dark:bg-blue-900/20',
        cardBg: 'bg-[#F0FAFF] dark:bg-[#001e2b]',
      },
      en_cours: {
        color: '#F7941D',
        bg: 'bg-[#FFF4E5] dark:bg-[#52310a]/30',
        border: 'border-[#F7941D40] dark:border-[#F7941D]/30',
        headerBg: 'bg-[#F7941D]',
        buttonBg: 'bg-[#F7941D]',
        lightBg: 'bg-orange-50/50 dark:bg-orange-900/20',
        cardBg: 'bg-[#FFFAF2] dark:bg-[#2b1a00]',
      },
      termines: {
        color: '#00BFA5',
        bg: 'bg-[#E6FFFA] dark:bg-[#00423a]/30',
        border: 'border-[#00BFA540] dark:border-[#00BFA5]/30',
        headerBg: 'bg-[#00BFA5]',
        buttonBg: 'bg-[#00BFA5]',
        lightBg: 'bg-teal-50/50 dark:bg-teal-900/20',
        cardBg: 'bg-[#F2FAFA] dark:bg-[#001f1c]',
      },
      en_retard: {
        color: '#E91E63',
        bg: 'bg-[#FFE5EE] dark:bg-[#520a22]/30',
        border: 'border-[#E91E6340] dark:border-[#E91E63]/30',
        headerBg: 'bg-[#E91E63]',
        buttonBg: 'bg-[#E91E63]',
        lightBg: 'bg-pink-50/50 dark:bg-pink-900/20',
        cardBg: 'bg-[#FFF5F8] dark:bg-[#2b000a]',
      }
    };

    const currentStatus = isOverdue ? 'en_retard' :
      maintenance.statut === 'cloture' ? 'termines' :
        maintenance.statut === 'en_cours' ? 'en_cours' : 'planifies';

    const style = statusStyles[currentStatus];

    const kmNum = Number(maintenance.kilometrage);
    const nextKmNum = Number(maintenance.prochainEntretienKm);
    const progressVal = !isNaN(kmNum) && !isNaN(nextKmNum) && nextKmNum > 0
      ? Math.min(100, (kmNum / nextKmNum) * 100)
      : 0;

    return (
      <Card
        className={cn(
          "group relative overflow-hidden transition-all duration-300 border shadow-sm hover:shadow-md h-full",
          style.cardBg,
          style.border
        )}
        style={{ borderRadius: '16px' }}
      >
        {/* Style Bar */}
        <div className={cn("absolute top-0 left-0 w-full h-1.5", style.headerBg)} />

        <CardContent className="p-5 space-y-4 pt-6">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm text-slate-400">
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-[15px] font-bold text-slate-900 dark:text-white leading-tight">
                  {v ? `${v.marque} ${v.modele}` : 'Véhicule inconnu'}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-medium text-slate-400">
                    {v?.immatriculation || '---'}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {maintenance.priorite || 'Moyenne'}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="h-2 w-2 rounded-full mt-1"
              style={{ backgroundColor: style.color }}
            />
          </div>

          {/* Description & Status Pill */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-slate-700 dark:text-slate-300 text-[13px]">
                {typeLabels[maintenance.type]}
              </h5>
              <div
                className={cn(
                  "flex items-center gap-1 py-1 px-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-white dark:bg-slate-800 border",
                )}
                style={{ color: style.color }}
              >
                {maintenance.statut === 'cloture' ? <CheckCircle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                {statusLabels[maintenance.statut]}
              </div>
            </div>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed opacity-80">
              {maintenance.description}
            </p>
          </div>

          {/* Info Boxes: Date & Km */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Date</span>
                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                  {new Date(maintenance.datePrevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-2.5">
              <Gauge className="h-3.5 w-3.5 text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Km</span>
                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                  {typeof maintenance.kilometrage === 'number' ? maintenance.kilometrage.toLocaleString() : maintenance.kilometrage}
                </p>
              </div>
            </div>
          </div>

          {/* Cost Estimation */}
          <div className="bg-slate-50/50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center gap-2.5">
            <div className="text-purple-400 dark:text-purple-300 font-bold text-sm">Ar</div>
            <div className="flex flex-col">
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Coût estimé</span>
              <p className="text-[16px] font-extrabold text-[#8b5cf6] dark:text-purple-400">{maintenance.cout || 0} Ar</p>
            </div>
          </div>

          {/* Location & Technician */}
          <div className="space-y-1 text-slate-500 pt-1">
            <div className="flex items-center gap-2">
              <MapPin className="h-3 w-3 text-slate-300" />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{maintenance.localisation || 'Non spécifiée'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-slate-300" />
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{maintenance.technicien || 'Aucun technicien'}</span>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400 uppercase tracking-widest text-[8px]">Prochain entretien</span>
              <span className="text-slate-900 dark:text-slate-200">{maintenance.prochainEntretienKm || '---'} {typeof maintenance.prochainEntretienKm === 'number' || !isNaN(Number(maintenance.prochainEntretienKm)) ? 'km' : ''}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-slate-900 dark:bg-white rounded-full transition-all duration-1000"
                style={{ width: `${progressVal}%` }}
              />
            </div>
          </div>

          {/* Bottom Banner */}
          {currentStatus !== 'termines' && (
            <div
              className={cn("p-2.5 rounded-xl flex items-center gap-2 border shadow-none", style.lightBg)}
              style={{ borderColor: style.border }}
            >
              <Clock className="h-3.5 w-3.5" style={{ color: style.color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: style.color }}>
                {isOverdue ? `En retard` : diffDays < 0 ? `Dans ${Math.abs(diffDays)} jours` : diffDays === 0 ? "Aujourd'hui" : `Dans ${diffDays} jours`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className={cn("grid gap-3 pt-2", currentStatus === 'termines' ? "grid-cols-2" : "grid-cols-2")}>
            <Button
              variant="outline"
              className="h-10 text-[11px] font-bold uppercase rounded-xl border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              onClick={() => {
                setSelectedMaintenance(maintenance);
                setIsViewOpen(true);
              }}
            >
              Détails
            </Button>
            {currentStatus === 'termines' ? (
              <Button
                className="h-10 text-[11px] font-bold uppercase rounded-xl text-white shadow-sm border-0 transition-opacity hover:opacity-90 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => handleOpenReportModal(maintenance)}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Rapport
              </Button>
            ) : (
              (user?.role === 'admin' || user?.role === 'technician' || maintenance.demandeurId === user?.id) && (
                <Button
                  className={cn("h-10 text-[11px] font-bold uppercase rounded-xl text-white shadow-sm border-0 transition-opacity hover:opacity-90", style.buttonBg)}
                  onClick={() => openEditDialog(maintenance)}
                >
                  Modifier
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">


      {
        isLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : isError ? (
          <div className="py-10 text-center text-sm text-destructive">
            Impossible de charger les maintenances. Vérifiez que l’API est démarrée.
          </div>
        ) : (
          <>
            {/* Hero Section */}
            <MaintenanceHero onCreateClick={openCreateDialog} />

            {/* Quick stats with role-adaptive labels */}
            <div className={cn(
              "grid grid-cols-1 gap-4 mb-6",
              (user?.role === 'admin' || user?.role === 'technician') ? "sm:grid-cols-5" : "sm:grid-cols-4"
            )}>
              <StatsCard
                title={user?.role === 'driver' ? "Mes rapports en attente" : "En attente"}
                value={maintenances.filter(m => m.statut === 'en_attente').length.toString()}
                subtitle="Nouveaux rapports"
                icon={Clock}
                variant="warning"
              />
              {(user?.role === 'admin' || user?.role === 'technician') && (
                <StatsCard
                  title="En retard"
                  value={maintenances.filter(m =>
                    (m.statut === 'en_attente' || m.statut === 'accepte' || m.statut === 'en_cours') &&
                    m.datePrevue < new Date().toISOString().split('T')[0]
                  ).length.toString()}
                  subtitle="Dates dépassées"
                  icon={AlertCircle}
                  variant="danger"
                />
              )}
              <StatsCard
                title={user?.role === 'driver' ? "Mes entretiens en cours" : "En cours"}
                value={maintenances.filter(m => m.statut === 'en_cours').length.toString()}
                subtitle="Interventions"
                icon={Wrench}
                variant="info"
              />
              <StatsCard
                title={user?.role === 'driver' ? "Mes entretiens validés" : "Acceptée"}
                value={maintenances.filter(m => m.statut === 'accepte').length.toString()}
                subtitle="Maintenances"
                icon={Check}
                variant="success"
              />
              <StatsCard
                title={user?.role === 'driver' ? "Mes entretiens terminés" : "Clôturés"}
                value={maintenances.filter(m => m.statut === 'cloture').length.toString()}
                subtitle="Terminés"
                icon={CheckCircle}
                variant="primary"
              />
            </div>

            {/* View controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 bg-white dark:bg-card p-6 rounded-3xl border border-slate-100 dark:border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Rechercher une maintenance..."
                    className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg hover:bg-indigo-700 transition-all focus:outline-none hover:rotate-3 hover:scale-110 active:scale-95 group relative">
                      <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <FilePlus className="h-7 w-7 relative z-10" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 p-2 rounded-2xl shadow-2xl border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2 duration-300">
                    <DropdownMenuItem
                      className="gap-3 p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      onClick={() => navigate('/maintenance/reports')}
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Rédiger rapport</span>
                        <span className="text-[10px] text-slate-400">Rapports techniques d'intervention</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-3 p-4 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      onClick={() => navigate('/maintenance/archives')}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Archive className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Archives</span>
                        <span className="text-[10px] text-slate-400">Historique complet des entretiens</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-sm p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Filter className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Filtres de recherche</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Affinez vos résultats</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Statut</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 rounded-xl focus:ring-blue-500 text-slate-900 dark:text-slate-100">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="en_retard">⚠️ En retard</SelectItem>
                      <SelectItem value="en_attente">En attente</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="accepte">Acceptée</SelectItem>
                      <SelectItem value="rejete">Rejetée</SelectItem>
                      <SelectItem value="cloture">Clôturée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Priorité</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 rounded-xl focus:ring-blue-500 text-slate-900 dark:text-slate-100">
                      <SelectValue placeholder="Toutes priorités" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes priorités</SelectItem>
                      <SelectItem value="Critique">Critique 🔥</SelectItem>
                      <SelectItem value="Haute">Haute</SelectItem>
                      <SelectItem value="Moyenne">Moyenne</SelectItem>
                      <SelectItem value="Basse">Basse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Type</Label>
                  <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                    <SelectTrigger className="h-11 bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 rounded-xl focus:ring-blue-500 text-slate-900 dark:text-slate-100">
                      <SelectValue placeholder="Tous véhicules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous véhicules</SelectItem>
                      <SelectItem value="voiture">Voitures</SelectItem>
                      <SelectItem value="moto">Motos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-card rounded-3xl border border-slate-100 dark:border-border shadow-sm overflow-hidden animate-in fade-in-50 duration-500 mb-8">
              <DataTable
                data={filteredMaintenances}
                columns={columns}
                searchPlaceholder="Rechercher une maintenance..."
                searchKeys={['description', 'prestataire', 'technicien']}
                extraFilters={
                  (statusFilter !== 'all' || vehicleTypeFilter !== 'all' || priorityFilter !== 'all' || dateFilter !== '') ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('all');
                        setVehicleTypeFilter('all');
                        setPriorityFilter('all');
                        setDateFilter('');
                      }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Effacer les filtres
                    </Button>
                  ) : null
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { id: 'en_attente', label: 'Planifiés', color: 'bg-[#00AEEF]' },
                { id: 'en_cours', label: 'En cours', color: 'bg-[#F7941D]' },
                { id: 'cloture', label: 'Terminés', color: 'bg-[#00BFA5]' },
                { id: 'en_retard', label: 'En retard', color: 'bg-[#E91E63]' }
              ].map(col => (
                <div key={col.id} className="space-y-4">
                  <div className={cn("flex items-center justify-between p-2 rounded-2xl shadow-sm", col.color)}>
                    <span className="text-white font-black text-[12px] uppercase tracking-wider pl-2">{col.label}</span>
                    <div className="bg-white/20 backdrop-blur-md rounded-full w-7 h-7 flex items-center justify-center">
                      <span className="text-white font-black text-[10px]">
                        {maintenanceCategories[col.id === 'en_retard' ? 'en_retard' : col.id === 'cloture' ? 'termines' : col.id === 'en_cours' ? 'en_cours' : 'planifies'].length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4 min-h-[200px]">
                    {filteredMaintenances
                      .filter(m => {
                        const isOverdue = (m.statut === 'en_attente' || m.statut === 'accepte' || m.statut === 'en_cours') &&
                          m.datePrevue < todayStr;
                        if (col.id === 'en_retard') return isOverdue;
                        if (m.statut === 'cloture') return col.id === 'cloture';
                        if (m.statut === 'en_cours') return col.id === 'en_cours' && !isOverdue;
                        return col.id === 'en_attente' && (m.statut === 'en_attente' || m.statut === 'accepte') && !isOverdue;
                      })
                      .map(maintenance => (
                        <KanbanCard key={maintenance.id} maintenance={maintenance} />
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      }

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
              {/* Bouton pour marquer en cours */}
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

              {/* Bouton pour marquer en cours */}
              {permissions?.canApproveRequests && selectedMaintenance.statut === 'accepte' && (
                <div className="flex gap-2 p-3 rounded-lg bg-muted/50 border-2 border-dashed border-info">
                  <Button variant="outline" className="flex-1 gap-2 w-full" onClick={async () => {
                    try {
                      await apiClient.patch(`/maintenance/${selectedMaintenance.id}`, { statut: 'en_cours' });
                      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
                      setIsViewOpen(false);
                      toast({
                        title: 'Mise à jour',
                        description: 'Maintenance marquée comme en cours.',
                        className: "bg-blue-500 text-white"
                      });
                    } catch (err: any) {
                      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
                    }
                  }}>
                    <Clock className="h-4 w-4" />
                    Marquer en cours
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
                      <span className="text-muted-foreground">Date demande</span>
                      <span className="font-medium text-purple-600">{formatDateFr(selectedMaintenance.dateDemande)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date prévue</span>
                      <span className="font-semibold text-slate-900">{formatDateFr(selectedMaintenance.datePrevue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kilométrage</span>
                      <span className="font-mono">{selectedMaintenance.kilometrage} {!isNaN(Number(selectedMaintenance.kilometrage)) ? 'km' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Demandeur</span>
                      <span className="font-medium">{demandeur ? `${demandeur.nom} ${demandeur.prenom}` : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium">{typeLabels[selectedMaintenance.type]}</span>
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
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-0 space-y-0">
            {/* Custom Header with Gradient */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-pink-600 p-6 text-white relative">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
                    {editingMaintenance ? 'Modifier une maintenance' : 'Nouvel entretien'}
                  </DialogTitle>
                  <DialogDescription className="text-white/80 text-sm">Renseignez les détails de l'intervention</DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4 text-white hover:bg-white/20 rounded-full"
                onClick={() => setIsEditOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-white dark:bg-[#0a0a0f] max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              {/* Row 1: Véhicule (Combined) */}
              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Véhicule *</Label>
                <div className="relative group">
                  <select
                    className="w-full h-11 pr-10 pl-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm transition-all appearance-none cursor-pointer dark:text-slate-200"
                    value={formState.vehiculeId}
                    onChange={(e) => {
                      const v = vehicles.find(veh => veh.id === e.target.value);
                      setFormState({
                        ...formState,
                        vehiculeId: e.target.value,
                        immatriculation: v?.immatriculation || ''
                      });
                    }}
                    required
                  >
                    <option value="">Sélectionner</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.immatriculation} ({v.marque} {v.modele})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-purple-500 transition-colors">
                    <Car className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Row 2: Type & Date */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Type d'entretien *</Label>
                <div className="relative group">
                  <select
                    className="w-full h-11 pr-10 pl-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm appearance-none dark:text-slate-200"
                    value={formState.type}
                    onChange={(e) =>
                      setFormState({ ...formState, type: e.target.value as MaintenanceType['type'] })
                    }
                  >
                    {Object.entries(typeLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <Wrench className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-purple-500 transition-colors" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date de demande *</Label>
                <div className="relative">
                  <Input
                    type="date"
                    className="h-11 pl-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm"
                    value={formState.dateDemande}
                    onChange={(e) => setFormState({ ...formState, dateDemande: e.target.value })}
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">date prevue pour l'entretient</Label>
                <div className="relative">
                  <Input
                    type="date"
                    className="h-11 pl-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm dark:text-slate-200"
                    value={formState.datePrevue}
                    onChange={(e) => setFormState({ ...formState, datePrevue: e.target.value })}
                    required
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>



              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Priorité *</Label>
                <div className="relative">
                  <select
                    className="w-full h-11 pr-10 pl-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm appearance-none dark:text-slate-200"
                    value={formState.priorite}
                    onChange={(e) => setFormState({ ...formState, priorite: e.target.value })}
                  >
                    <option value="Basse">Basse</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Haute">Haute</option>
                    <option value="Critique">Critique 🔥</option>
                  </select>
                  <Flag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Row 4: Kilométrage & Prochain entretien */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kilométrage (Actuel) *</Label>
                <Input
                  type="text"
                  placeholder="Ex: 50000 ou HS"
                  className="h-11 pl-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm dark:text-slate-200"
                  value={formState.kilometrage}
                  onChange={(e) => setFormState({ ...formState, kilometrage: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prochain entretien (km)</Label>
                <Input
                  type="text"
                  placeholder="Ex: 60000 ou HS"
                  className="h-11 pl-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm dark:text-slate-200"
                  value={formState.prochainEntretienKm}
                  onChange={(e) => setFormState({ ...formState, prochainEntretienKm: e.target.value })}
                />
              </div>

              {/* Row 5: Localisation & Technicien */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Localisation *</Label>
                <div className="relative">
                  <Input
                    placeholder="Ex: Garage Dupont, Paris"
                    className="h-11 pl-4 pr-10 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm dark:text-slate-200"
                    value={formState.localisation}
                    onChange={(e) => setFormState({ ...formState, localisation: e.target.value })}
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Technicien</Label>
                <div className="relative">
                  <Input
                    placeholder="Ex: Jean Martin"
                    className="h-11 pl-4 pr-10 rounded-xl border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm"
                    value={formState.technicien}
                    onChange={(e) => setFormState({ ...formState, technicien: e.target.value })}
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Row 6: Coût estimé */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Coût estimé (Ar)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Ex: 350000"
                    className="h-11 pl-4 pr-12 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm dark:text-slate-200"
                    value={formState.coutEstime}
                    onChange={(e) => setFormState({ ...formState, coutEstime: e.target.value })}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">Ar</div>
                </div>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prestataire / Réparateur</Label>
                <Input
                  className="h-11 pl-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm dark:text-slate-200"
                  value={formState.prestataire}
                  onChange={(e) => setFormState({ ...formState, prestataire: e.target.value })}
                />
              </div>
            </div>

            {/* Description (Full Width) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description *</Label>
              <textarea
                placeholder="Décrivez les travaux à effectuer..."
                className="w-full min-h-[80px] p-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm resize-none dark:text-slate-200"
                value={formState.description}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                required
              />
            </div>

            {/* Notes (Full Width) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes supplémentaires</Label>
              <textarea
                placeholder="Ajoutez des notes complémentaires..."
                className="w-full min-h-[80px] p-4 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:ring-2 focus:ring-purple-500 shadow-sm resize-none dark:text-slate-200"
                value={formState.notesSupplementaires}
                onChange={(e) => setFormState({ ...formState, notesSupplementaires: e.target.value })}
              />
            </div>



            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              {submitError && (
                <div className="text-sm text-destructive font-medium flex-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1.5" />
                  {submitError}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                className="rounded-xl px-6 h-11 h-11 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                onClick={() => {
                  setIsEditOpen(false);
                  resetForm();
                }}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl px-6 h-11 bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 shadow-purple-500/25 transition-all gap-2"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <FilePlus className="h-5 w-5" />
                )}
                {editingMaintenance ? 'Enregistrer' : 'Créer l\'entretien'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-4xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
                  <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3>Rédiger le rapport technique</h3>
                  {reportMaintenance && (
                    <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                      {vehicles.find(v => v.id === reportMaintenance.vehiculeId)?.immatriculation} - {typeLabels[reportMaintenance.type]}
                    </p>
                  )}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Date de réalisation <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={reportData.dateRel}
                  onChange={(e) => setReportData({ ...reportData, dateRel: e.target.value })}
                  className="rounded-xl h-11 border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pièces remplacées <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Ex: Filtre à huile, Plaquettes..."
                  value={reportData.pieces}
                  onChange={(e) => setReportData({ ...reportData, pieces: e.target.value })}
                  className="rounded-xl h-11 border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Coût réel de réparation (Ar) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={reportData.coutReel}
                  onChange={(e) => setReportData({ ...reportData, coutReel: e.target.value })}
                  className="rounded-xl h-11 font-bold border-slate-200 dark:border-slate-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Facture / Justificatif</Label>
                <ImageUpload
                  value={reportData.imageFacture}
                  onChange={(val) => setReportData({ ...reportData, imageFacture: val })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Compte-rendu détaillé <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Détaillez l'intervention effectuée..."
                className="min-h-[150px] rounded-2xl border-slate-200 dark:border-slate-800 resize-none"
                value={reportData.report}
                onChange={(e) => setReportData({ ...reportData, report: e.target.value })}
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                onClick={() => setIsReportOpen(false)}
                className="rounded-xl px-6 h-11"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveReport}
                className="rounded-xl px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                Enregistrer et archiver
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Maintenance;
