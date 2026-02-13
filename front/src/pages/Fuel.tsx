import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FuelEntry, Vehicle, Driver } from '@/types';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Droplets, Plus, Edit, Trash2, Camera, Loader2, Sparkles, Search, CheckCircle2, XCircle, MoreVertical, Gauge, Coins, MapPin, ShieldCheck, Clock, ClipboardList, Filter, X, Upload, Eye, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { fuelService } from '@/services/fuelService';
import { parseFuelTicketText } from '@/lib/ocrUtils';
import Tesseract from 'tesseract.js';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatDateFr } from '@/lib/utils';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { apiClient } from '@/lib/api';

// As requested by user: exact column order and naming
// Date, Heure, Numero_Ticket, Precedent_KM, Actuel_KM, KM_parcouru, 
// Distance_possible_QTEacheter_km, Distance_possible_QTErestant_km, 
// GO_PU_AR_L, Ancien_Solde, Solde_Ticket, Difference_Solde, 
// Montant_Recharger, Montant_Ristourne, Bonus_Recharge_Carte, 
// Total_Acheter, Montant_Transaction_Annuler, Cout_au_Km, 
// Nouveau_Solde, QTE_Restant, QTE_Recharger, QTE_Acheter, 
// Capacite_Reservoir_L, Statut_Carburant, Alerte, Consommation_L_100km

const STATION_OPTIONS = [
  "Karenjy (Ankidona)",
  "Vohibola (Antarandolo)",
  "Miregnina (Ampasambazaha)",
  "Autre"
];

const FuelPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOcrDialogOpen, setIsOcrDialogOpen] = useState(false);
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FuelEntry | null>(null);
  const [viewingEntry, setViewingEntry] = useState<FuelEntry | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
  const [filterHour, setFilterHour] = useState<string>('');
  const [filterStation, setFilterStation] = useState<string>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [amountRange, setAmountRange] = useState<{ min: string, max: string }>({ min: '', max: '' });

  const [formData, setFormData] = useState<Partial<FuelEntry>>({
    vehiculeId: '',
    demandeurId: '',
    date: new Date().toISOString().split('T')[0],
    heure: '',
    station: '',
    produit: 'Gasoil',

    // Metering
    precedentKm: 0,
    actuelKm: 0,
    kmParcouru: 0,

    // Ticket & Transactions
    numeroTicket: '',
    ticketImage: '',
    soldeTicket: 0,
    montantRecharge: 0,
    montantRistourne: 0,
    bonus: 0,
    montantTransactionAnnuler: 0,

    // Financials
    prixUnitaire: 0,
    ancienSolde: 0,
    totalAchete: 0,
    differenceSolde: 0,
    nouveauSolde: 0,

    // Quantities
    quantiteAchetee: 0,
    quantiteRechargee: 0,
    quantiteRestante: 0,
    capaciteReservoir: 0,

    // Efficiency
    coutAuKm: 0,
    consommation100: 0,
    distancePossible: 0, // from purchase
    distancePossibleRestant: 0, // from balance

    statut: 'en_attente',
    alerte: '',
  });

  const { user } = useAuth();

  const { data: fuelEntries = [], isLoading } = useQuery({
    queryKey: ['fuelEntries', user?.role, user?.profileEmail || user?.email, filterStatus],
    queryFn: () => fuelService.getAll(user?.role, user?.profileEmail || user?.email, filterStatus),
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const res = await apiClient.get<Vehicle[]>('/vehicles');
      return res.data;
    },
  });

  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ['drivers'],
    queryFn: async () => {
      const res = await apiClient.get<Driver[]>('/drivers');
      return res.data;
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiClient.get<User[]>('/users');
      return res.data;
    },
  });




  // Calculation Effect
  useEffect(() => {
    const {
      actuelKm, precedentKm, prixUnitaire, montantRecharge,
      totalAchete, ancienSolde, soldeTicket, consommation100: manualConso
    } = formData;

    const updates: Partial<FuelEntry> = {};

    // 0. Sync Capacity from Vehicle
    if (formData.vehiculeId && vehicles.length > 0) {
      const selectedVehicle = vehicles.find((v: any) => v.id === formData.vehiculeId);
      if (selectedVehicle && selectedVehicle.capacite_reservoir !== formData.capaciteReservoir) {
        updates.capaciteReservoir = selectedVehicle.capacite_reservoir;
      }
    }

    // 1. KM Parcouru
    const kmParcouru = (actuelKm || 0) - (precedentKm || 0);
    if (kmParcouru !== formData.kmParcouru) updates.kmParcouru = kmParcouru;

    // 2. Qte Achetée & Rechargée
    const pu = prixUnitaire && prixUnitaire > 0 ? prixUnitaire : 0;

    if (pu > 0) {
      const qAchetee = (totalAchete || 0) / pu;
      if (Math.abs(qAchetee - (formData.quantiteAchetee || 0)) > 0.01) updates.quantiteAchetee = Number(qAchetee.toFixed(2));

      const qRechargee = (montantRecharge || 0) / pu;
      if (Math.abs(qRechargee - (formData.quantiteRechargee || 0)) > 0.01) updates.quantiteRechargee = Number(qRechargee.toFixed(2));
    }

    // 3. Difference Solde
    const diffSolde = (soldeTicket || 0) - (ancienSolde || 0);
    if (Math.abs(diffSolde - (formData.differenceSolde || 0)) > 0.01) updates.differenceSolde = diffSolde;

    // 4. Nouveau Solde (Updated Formula)
    const nSolde = (ancienSolde || 0) - (totalAchete || 0) + (montantRecharge || 0) + (formData.montantRistourne || 0) + (formData.montantTransactionAnnuler || 0);
    if (Math.abs(nSolde - (formData.nouveauSolde || 0)) > 0.01) updates.nouveauSolde = Number(nSolde.toFixed(2));

    // 5. Qte Restante (Updated Formula)
    if (pu > 0) {
      const qRestante = nSolde / pu;
      if (Math.abs(qRestante - (formData.quantiteRestante || 0)) > 0.01) updates.quantiteRestante = Number(qRestante.toFixed(2));
    }

    // 6. Conso 
    const qAcheteeActual = updates.quantiteAchetee !== undefined ? updates.quantiteAchetee : (formData.quantiteAchetee || 0);
    const conso = kmParcouru > 0 ? (qAcheteeActual * 100) / kmParcouru : 0;
    if (Math.abs(conso - (formData.consommation100 || 0)) > 0.01) updates.consommation100 = Number(conso.toFixed(2));

    // 7. Distance Possible (Updated Formulas)
    const appliedConso = conso > 0 ? conso : (manualConso || 0);
    if (appliedConso > 0) {
      const distPossible = (qAcheteeActual * 100) / appliedConso;
      if (Math.abs(distPossible - (formData.distancePossible || 0)) > 0.01) updates.distancePossible = Math.floor(distPossible);

      const qRestActual = updates.quantiteRestante !== undefined ? updates.quantiteRestante : (formData.quantiteRestante || 0);
      const distRestant = (qRestActual * 100) / appliedConso;
      if (Math.abs(distRestant - (formData.distancePossibleRestant || 0)) > 0.01) updates.distancePossibleRestant = Math.floor(distRestant);
    }

    // 8. Cout au KM (Updated Formula)
    if (kmParcouru > 0) {
      const coutKm = (totalAchete || 0) / kmParcouru;
      if (Math.abs(coutKm - (formData.coutAuKm || 0)) > 0.001) updates.coutAuKm = Number(coutKm.toFixed(3));
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }
  }, [
    formData.actuelKm, formData.precedentKm, formData.prixUnitaire,
    formData.montantRecharge, formData.totalAchete, formData.ancienSolde, formData.soldeTicket,
    formData.montantRistourne, formData.montantTransactionAnnuler,
    formData.vehiculeId, vehicles
  ]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return editingEntry
        ? fuelService.update(editingEntry.id, data)
        : fuelService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelEntries'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      setIsDialogOpen(false);
      setEditingEntry(null);
      toast({ title: 'Succès', description: 'Enregistré avec succès', className: "bg-green-500 text-white" });
    },
    onError: (err: any) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fuelService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelEntries'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      toast({ title: 'Succès', description: 'Supprimé avec succès', className: "bg-green-500 text-white" });
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'valide' | 'rejete' }) => {
      return fuelService.update(id, { statut: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuelEntries'] });
      queryClient.invalidateQueries({ queryKey: ['global-summary'] });
      toast({ title: 'Statut mis à jour', description: 'La demande a été traitée.', className: "bg-green-500 text-white" });
    },
    onError: (err: any) => toast({ title: 'Erreur', description: err.message, variant: 'destructive' })
  });

  const filteredEntries = fuelEntries.filter(e => {
    // 1. Search Query
    const matchesSearch =
      e.numeroTicket?.toLowerCase().includes(search.toLowerCase()) ||
      e.station?.toLowerCase().includes(search.toLowerCase()) ||
      vehicles.find((v: any) => v.id === e.vehiculeId)?.immatriculation.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Type Filter (Voiture / Moto)
    if (filterType !== 'all') {
      const vehicle = vehicles.find((v: any) => v.id === e.vehiculeId);
      const vType = vehicle?.type_vehicule?.toLowerCase();
      if (filterType === 'voiture' && vType === 'moto') return false;
      if (filterType === 'moto' && vType !== 'moto') return false;
    }

    // 3. Date Range Filter
    if (dateRange.start && e.date < dateRange.start) return false;
    if (dateRange.end && e.date > dateRange.end) return false;

    // 4. Hour Filter
    if (filterHour && e.heure && !e.heure.includes(filterHour)) return false;

    // 5. Station Filter
    if (filterStation !== 'all' && e.station !== filterStation) return false;

    // 6. Vehicle Filter
    if (filterVehicle !== 'all' && e.vehiculeId !== filterVehicle) return false;

    // 7. Amount Range Filter (Total Achete)
    if (amountRange.min && (e.totalAchete || 0) < Number(amountRange.min)) return false;
    if (amountRange.max && (e.totalAchete || 0) > Number(amountRange.max)) return false;

    // 8. Status Filter (Client-side fallback)
    if (filterStatus !== 'all' && e.statut !== filterStatus) return false;

    return true;
  });

  // KPI Calculations
  const pendingCount = fuelEntries.filter(e => e.statut === 'en_attente').length;
  const acceptedCount = fuelEntries.filter(e => e.statut === 'valide').length;
  const rejectedCount = fuelEntries.filter(e => e.statut === 'rejete').length;
  const totalCount = fuelEntries.length;

  const kpis = [
    { label: "Demandes en attente", value: pendingCount.toString(), icon: Clock, variant: "warning" as const, subtitle: "À valider" },
    { label: "Demandes acceptées", value: acceptedCount.toString(), icon: CheckCircle2, variant: "success" as const, subtitle: "Validées" },
    { label: "Demandes rejetées", value: rejectedCount.toString(), icon: XCircle, variant: "danger" as const, subtitle: "Annulées" },
    { label: "Total des demandes", value: totalCount.toString(), icon: ClipboardList, variant: "primary" as const, subtitle: "Historique" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    // Validation des champs obligatoires
    if (!formData.vehiculeId) errors.push("Véhicule");
    if (!formData.demandeurId) errors.push("Demandeur");
    if (!formData.date) errors.push("Date");
    if (!formData.heure) errors.push("Heure");
    if (!formData.station) errors.push("Station");
    if (!formData.numeroTicket) errors.push("N° Ticket");

    // Validation des montants et kilométrage
    if (!formData.actuelKm) errors.push("Kilométrage Actuel");
    if (!formData.prixUnitaire || formData.prixUnitaire <= 0) errors.push("Prix Unitaire");
    if (!formData.totalAchete || formData.totalAchete <= 0) errors.push("Total Acheté");

    // Champs financiers
    if (formData.ancienSolde === undefined || formData.ancienSolde === null) errors.push("Ancien Solde");
    if (formData.soldeTicket === undefined || formData.soldeTicket === null) errors.push("Solde Ticket");

    if (errors.length > 0) {
      toast({
        title: "Champs obligatoires manquants",
        description: `Veuillez remplir : ${errors.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, ticketImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border/50">
        <PageHeader title="Gestion Carburant" description="Suivi détaillé selon vos spécifications" icon={Droplets} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsOcrDialogOpen(true)} className="gap-2 border-primary/20 text-primary hover:bg-primary/5 dark:bg-zinc-900/50">
            <Sparkles className="h-4 w-4" /> Saisie Rapide (IA)
          </Button>
          <Button onClick={() => {
            setEditingEntry(null);
            setFormData(prev => ({ ...prev, demandeurId: user?.id }));
            setIsDialogOpen(true);
          }} className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Nouvelle entrée
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, idx) => (
          <StatsCard
            key={idx}
            title={kpi.label}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
            variant={kpi.variant}
          />
        ))}
      </div>

      <div className="flex items-center gap-4 mb-6 p-4 bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-full border-primary/10 bg-background/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {(user?.role === 'admin' || user?.role === 'technician') && (
            <Button
              onClick={() => navigate('/fuel/year-end')}
              variant="outline"
              className="rounded-full border-primary/20 gap-2 px-4 h-10 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 backdrop-blur-sm transition-all"
            >
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Solde Fin d'Année</span>
            </Button>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "rounded-full border-primary/10 gap-2 px-4 h-10 bg-background/50 backdrop-blur-sm transition-all hover:border-primary/30",
                  (filterType !== 'all' || filterStatus !== 'all' || dateRange.start !== '' || dateRange.end !== '' || filterHour !== '' || filterStation !== 'all' || filterVehicle !== 'all' || amountRange.min !== '' || amountRange.max !== '') && "bg-primary/5 border-primary/20"
                )}
              >
                <Filter className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Filtrer</span>
                {(filterType !== 'all' || filterStatus !== 'all' || dateRange.start !== '' || dateRange.end !== '' || filterHour !== '' || filterStation !== 'all' || filterVehicle !== 'all' || amountRange.min !== '' || amountRange.max !== '') && (
                  <Badge variant="default" className="ml-1 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-white border-none">
                    {(filterType !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0) + (dateRange.start !== '' || dateRange.end !== '' ? 1 : 0) + (filterHour !== '' ? 1 : 0) + (filterStation !== 'all' ? 1 : 0) + (filterVehicle !== 'all' ? 1 : 0) + (amountRange.min !== '' || amountRange.max !== '' ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 border-primary/10 bg-background/95 backdrop-blur-xl shadow-2xl rounded-2xl" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h4 className="font-semibold text-sm">Filtres Carburant</h4>
                  {(filterType !== 'all' || filterStatus !== 'all' || dateRange.start !== '' || dateRange.end !== '' || filterHour !== '' || filterStation !== 'all' || filterVehicle !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterType('all');
                        setFilterStatus('all');
                        setDateRange({ start: '', end: '' });
                        setFilterHour('');
                        setFilterStation('all');
                        setFilterVehicle('all');
                        setAmountRange({ min: '', max: '' });
                      }}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Effacer
                    </Button>
                  )}
                </div>

                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Type de véhicule</Label>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="h-9 bg-muted/20 border-border/50 rounded-lg">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les types</SelectItem>
                          <SelectItem value="voiture">Voitures</SelectItem>
                          <SelectItem value="moto">Motos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Statut de validation</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="h-9 bg-muted/20 border-border/50 rounded-lg">
                          <SelectValue placeholder="Statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="en_attente">En attente</SelectItem>
                          <SelectItem value="valide">Validé</SelectItem>
                          <SelectItem value="rejete">Rejeté</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Période (Début - Fin)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={dateRange.start}
                          onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="h-9 bg-muted/20 border-border/50 rounded-lg text-xs"
                          placeholder="Début"
                        />
                        <Input
                          type="date"
                          value={dateRange.end}
                          onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="h-9 bg-muted/20 border-border/50 rounded-lg text-xs"
                          placeholder="Fin"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Heure</Label>
                      <Input
                        type="time"
                        value={filterHour}
                        onChange={(e) => setFilterHour(e.target.value)}
                        className="h-9 bg-muted/20 border-border/50 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Station de service</Label>
                    <Select value={filterStation} onValueChange={setFilterStation}>
                      <SelectTrigger className="h-9 bg-muted/20 border-border/50 rounded-lg">
                        <SelectValue placeholder="Station" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes les stations</SelectItem>
                        {STATION_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Montant (Min - Max)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={amountRange.min}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, min: e.target.value }))}
                        className="h-9 bg-muted/20 border-border/50 rounded-lg text-xs"
                        placeholder="Min (Ar)"
                      />
                      <Input
                        type="number"
                        value={amountRange.max}
                        onChange={(e) => setAmountRange(prev => ({ ...prev, max: e.target.value }))}
                        className="h-9 bg-muted/20 border-border/50 rounded-lg text-xs"
                        placeholder="Max (Ar)"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-0.5">Véhicule</Label>
                    <Select value={filterVehicle} onValueChange={setFilterVehicle}>
                      <SelectTrigger className="h-9 bg-muted/20 border-border/50 rounded-lg text-xs">
                        <SelectValue placeholder="Choisir un véhicule" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les véhicules</SelectItem>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.immatriculation} ({v.marque})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {(filterType !== 'all' || filterStatus !== 'all' || dateRange.start !== '' || dateRange.end !== '' || filterHour !== '' || filterStation !== 'all' || filterVehicle !== 'all') && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setFilterType('all');
                setFilterStatus('all');
                setDateRange({ start: '', end: '' });
                setFilterHour('');
                setFilterStation('all');
                setFilterVehicle('all');
                setAmountRange({ min: '', max: '' });
                setSearch('');
              }}
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <ScrollArea className="w-full h-[calc(100vh-20rem)] border rounded-md">
          <table className="w-full border-collapse text-xs min-w-[2800px]">
            <thead className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm shadow-md">
              {/* Row 1: Grouped Headers */}
              <tr className="border-b-2 border-border/60">
                <th colSpan={3} className="border-r border-border/40 bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-700/60 p-3 font-black text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-200 shadow-sm">Informations de base et identification du ticket</th>
                <th colSpan={6} className="border-r border-border/40 bg-gradient-to-br from-blue-50 to-blue-100/70 dark:from-blue-900/40 dark:to-blue-800/30 p-3 font-black text-[10px] uppercase tracking-wider text-blue-700 dark:text-blue-300 shadow-sm">Données kilométriques et distance</th>
                <th colSpan={11} className="border-r border-border/40 bg-gradient-to-br from-emerald-50 to-emerald-100/70 dark:from-emerald-900/40 dark:to-emerald-800/30 p-3 font-black text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 shadow-sm">Gestion financière et coûts</th>
                <th colSpan={3} className="border-r border-border/40 bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900/60 dark:to-slate-800/40 p-3 font-black text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 shadow-sm">Gestion des quantités et du réservoir</th>
                <th colSpan={4} className="border-r border-border/40 bg-gradient-to-br from-amber-50 to-amber-100/70 dark:from-amber-900/40 dark:to-amber-800/30 p-3 font-black text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-300 shadow-sm">Indicateurs de performance et alertes</th>
                <th rowSpan={2} className="border-l-2 border-border/60 bg-gradient-to-b from-background via-background/95 to-muted/20 sticky right-0 z-40 p-3 font-black text-[10px] uppercase tracking-widest text-primary shadow-lg">Actions</th>
              </tr>
              {/* Row 2: Specific Columns */}
              <tr className="bg-gradient-to-b from-muted/30 to-muted/50 border-b border-border/40">
                {/* Base Info */}
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Date</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Heure</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">N° Ticket</th>

                {/* KM Data */}
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Précédent KM</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Actuel KM</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">KM parcouru</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Distance possible QTEacheter (km)</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Distance possible QTErestant (km)</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400">Source d'energie P.U Ar/L</th>

                {/* Financial */}
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Ancien Solde</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Solde inscrit sur le Ticket</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground whitespace-normal">Différence Solde inscrit sur le Ticket / Ancien Solde</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Montant recharger</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Montant ristourne</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Bonus sur recharge carte</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Total Acheter (Montant total de l'achat)</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Montant transaction annuler</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Coût au Km</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Nouveau Solde</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground whitespace-normal">QTErestant (Quantité restante dans la carte)</th>

                {/* Quantities */}
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">QTErecharger</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">QTEacheter</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Capacité de réservoir (L)</th>

                {/* Performance */}
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Statut carburant</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Validation</th>
                <th className="border-r border-border/30 p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Alerte</th>
                <th className="p-2.5 font-bold text-[10px] uppercase tracking-wide text-muted-foreground">Consommation (L/100 km)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={28} className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /><p className="mt-2 text-muted-foreground">Chargement des données...</p></td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan={28} className="p-8 text-center text-muted-foreground">Aucune donnée trouvée</td></tr>
              ) : (
                filteredEntries.map((e) => (
                  <tr key={e.id} className="group hover:bg-gradient-to-r hover:from-primary/5 hover:via-primary/3 hover:to-transparent transition-all duration-300 border-b border-border/20 last:border-0 text-center hover:shadow-sm">
                    {/* Base Info */}
                    <td className="border-r border-border/20 p-3 text-foreground/90 font-medium">{formatDateFr(e.date)}</td>
                    <td className="border-r border-border/20 p-3 text-muted-foreground">{e.heure || '-'}</td>
                    <td className="border-r border-border/20 p-3 font-semibold text-primary">{e.numeroTicket || '-'}</td>

                    {/* KM Data */}
                    <td className="border-r border-border/20 p-3 text-foreground/80">{e.precedentKm?.toLocaleString()}</td>
                    <td className="border-r border-border/20 p-3 text-foreground/80">{e.actuelKm?.toLocaleString()}</td>
                    <td className="border-r border-border/20 p-3 bg-blue-50/30 dark:bg-blue-900/10 font-bold text-blue-700 dark:text-blue-400">{e.kmParcouru?.toLocaleString()}</td>
                    <td className="border-r border-border/20 p-3 text-muted-foreground">{e.distancePossible?.toFixed(0)}</td>
                    <td className="border-r border-border/20 p-3 text-muted-foreground">{e.distancePossibleRestant?.toFixed(0)}</td>
                    <td className="border-r border-border/20 p-3 text-right font-semibold text-foreground/90">{e.prixUnitaire?.toLocaleString()} Ar</td>

                    {/* Financial */}
                    <td className="border-r border-border/20 p-3 text-right text-muted-foreground">{e.ancienSolde?.toLocaleString()} Ar</td>
                    <td className="border-r border-border/20 p-3 text-right text-muted-foreground">{e.soldeTicket?.toLocaleString()} Ar</td>
                    <td className="border-r border-border/20 p-3 text-right font-semibold" style={{ color: (e.differenceSolde || 0) < 0 ? 'rgb(239 68 68)' : 'inherit' }}>
                      {e.differenceSolde?.toLocaleString()} Ar
                    </td>
                    <td className="border-r border-border/20 p-3 text-right text-muted-foreground">{e.montantRecharge?.toLocaleString()} Ar</td>
                    <td className="border-r border-border/20 p-3 text-right text-muted-foreground">{e.montantRistourne?.toLocaleString()} Ar</td>
                    <td className="border-r border-border/20 p-3 text-right text-muted-foreground">{e.bonus?.toLocaleString()} Ar</td>
                    <td className="border-r border-border/20 p-3 text-right bg-emerald-50/30 dark:bg-emerald-900/10 font-bold text-emerald-700 dark:text-emerald-400">{e.totalAchete?.toLocaleString()} Ar</td>
                    <td className="border-r border-border/20 p-3 text-right text-muted-foreground">{e.montantTransactionAnnuler?.toLocaleString()} Ar</td>
                    <td className="border-r border-border/20 p-3 text-muted-foreground">{e.coutAuKm?.toFixed(3)}</td>
                    <td className="border-r border-border/20 p-3 text-right font-bold text-blue-600 dark:text-blue-400">{e.nouveauSolde?.toLocaleString()} Ar</td>
                    <td className="border-r border-border/20 p-3 text-muted-foreground">{e.quantiteRestante?.toFixed(2)} L</td>

                    {/* Quantities */}
                    <td className="border-r border-border/20 p-3 text-muted-foreground">{e.quantiteRechargee?.toFixed(2)} L</td>
                    <td className="border-r border-border/20 p-3 text-muted-foreground">{e.quantiteAchetee?.toFixed(2)} L</td>
                    <td className="border-r border-border/20 p-3 text-muted-foreground">{e.capaciteReservoir || '-'}</td>

                    {/* Performance */}
                    <td className="border-r border-border/20 p-3">
                      <Badge
                        variant={e.statut_carburant === 'Dépassement' ? 'destructive' : 'outline'}
                        className={cn(
                          "text-[10px] px-2 py-0.5 font-bold border-none",
                          e.statut_carburant === 'Dépassement'
                            ? "bg-red-500 text-white shadow-sm shadow-red-200 dark:shadow-red-900/30"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                        )}
                      >
                        {e.statut_carburant === 'Dépassement' ? 'Dépassement' : 'Normal'}
                      </Badge>
                    </td>
                    <td className="border-r border-border/20 p-3">
                      {e.statut === 'valide' ? (
                        <Badge className="bg-green-500 hover:bg-green-600 text-white border-none shadow-sm shadow-green-200 dark:shadow-green-900/30 text-[10px] gap-1 px-2 py-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Validé</span>
                        </Badge>
                      ) : e.statut === 'rejete' ? (
                        <Badge variant="destructive" className="text-[10px] gap-1 px-2 py-0.5 shadow-sm shadow-red-200 dark:shadow-red-900/30 border-none">
                          <XCircle className="h-3 w-3" />
                          <span>Rejeté</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                          <Clock className="h-3 w-3" />
                          <span>En attente</span>
                        </Badge>
                      )}
                    </td>
                    <td className="border-r border-border/20 p-3 italic text-muted-foreground">{e.alerte || '-'}</td>
                    <td className="p-3 font-bold bg-amber-50/30 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400">{e.consommation100?.toFixed(2)}</td>

                    <td className="sticky right-0 bg-background/95 backdrop-blur-sm border-l-2 border-border/40 p-2 z-10 w-[60px] shadow-[-6px_0_8px_-2px_rgba(0,0,0,0.08)]">
                      <div className="flex justify-center items-center h-full">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-300">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => { setViewingEntry(e); setIsDetailsDialogOpen(true); }}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Détails</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {(user?.role === 'admin' || user?.role === 'technician') && e.statut === 'en_attente' && (
                              <>
                                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: e.id, status: 'valide' })} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  <span>Accepter</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => statusMutation.mutate({ id: e.id, status: 'rejete' })} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                                  <XCircle className="mr-2 h-4 w-4" />
                                  <span>Rejeter</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => { setEditingEntry(e); setFormData({ ...e }); setIsDialogOpen(true); }}>
                              <Edit className="mr-2 h-4 w-4" />
                              <span>Modifier</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { if (confirm('Supprimer cette entrée ?')) deleteMutation.mutate(e.id); }} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Supprimer</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <ScrollBar orientation="horizontal" className="z-30 h-2.5 bg-blue-500/10 hover:bg-blue-500/20 transition-colors" />
          <ScrollBar orientation="vertical" className="z-30" />
        </ScrollArea>
      </div>

      {/* OCR Quick Fill Dialog */}
      <Dialog open={isOcrDialogOpen} onOpenChange={setIsOcrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Saisie Rapide par IA
            </DialogTitle>
            <DialogDescription>
              Prenez en photo votre ticket de carburant pour extraire automatiquement les données.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl border-muted-foreground/25 hover:border-primary/50 transition-colors bg-muted/5">
            {isProcessingOcr ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-medium">Analyse du ticket en cours...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-primary/10">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Glissez une photo ou cliquez ici</p>
                  <p className="text-xs text-muted-foreground">Format JPG ou PNG</p>
                </div>
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="ocr-upload"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    setIsProcessingOcr(true);
                    try {
                      const { data: { text } } = await Tesseract.recognize(file, 'fra+eng', {
                        logger: m => console.log(m)
                      });

                      const results = parseFuelTicketText(text);

                      setFormData(prev => ({
                        ...prev,
                        ...results
                      }));

                      setIsOcrDialogOpen(false);
                      setIsDialogOpen(true);
                      toast({
                        title: "Analyse terminée",
                        description: "Les données ont été extraites avec succès.",
                        className: "bg-green-500 text-white"
                      });
                    } catch (err) {
                      console.error('OCR Error:', err);
                      toast({ title: "Erreur", description: "Impossible de lire le ticket.", variant: "destructive" });
                    } finally {
                      setIsProcessingOcr(false);
                    }
                  }}
                />
                <Button variant="outline" onClick={() => document.getElementById('ocr-upload')?.click()}>
                  Choisir une photo
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog >

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[96vh] p-0 flex flex-col overflow-hidden border-border bg-background dark:bg-zinc-950 shadow-2xl">
          <div className="flex h-full w-full overflow-hidden">
            {/* --- Left Navigation Sidebar --- */}
            <div className="hidden md:flex w-52 bg-muted/40 border-r border-border flex-col p-4 gap-4 sticky top-0 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase tracking-tighter">Navigation</span>
              </div>

              {[
                { id: 'section-base', label: 'Identification', icon: '1' },
                { id: 'section-km', label: 'Kilométrage', icon: '2' },
                { id: 'section-finance', label: 'Finances', icon: '3' },
                { id: 'section-performance', label: 'Performance', icon: '4' },
                { id: 'section-actions', label: 'Validation', icon: '✓' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(item.id);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="flex items-center gap-3 text-left p-3 rounded-lg hover:bg-background dark:hover:bg-zinc-800/50 transition-all text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95"
                >
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}

              <div className="mt-auto pt-4 border-t border-border">
                <p className="text-[10px] text-muted-foreground/30 text-center font-medium">Réglages réseau: 192.168.1.29</p>
              </div>
            </div>

            {/* --- Right Content Area --- */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-background dark:bg-zinc-950">
              <DialogHeader className="p-6 border-b border-border bg-card/50 dark:bg-zinc-900/50">
                <DialogTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-blue-600" />
                  {editingEntry ? 'Modifier l\'entrée carburant' : 'Enregistrer une nouvelle transaction'}
                </DialogTitle>
                <DialogDescription>
                  Remplissez le formulaire ci-dessous pour {editingEntry ? 'modifier' : 'ajouter'} une entrée.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-scroll premium-scrollbar pr-1 max-h-[calc(96vh-120px)] bg-slate-50/30 dark:bg-zinc-900/10">
                <form onSubmit={handleSubmit} className="space-y-12 p-8">

                  {/* --- Section 1: Identification --- */}
                  <div id="section-base" className="space-y-4 scroll-mt-10">
                    <h3 className="text-sm font-bold border-l-4 border-blue-600 pl-2 text-blue-600 dark:text-blue-500">1. INFORMATIONS DE BASE ET TICKET</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Véhicule *</Label>
                        <Select value={formData.vehiculeId} onValueChange={v => setFormData({ ...formData, vehiculeId: v })}>
                          <SelectTrigger className="dark:bg-zinc-800/50 border-border/50"><SelectValue placeholder="Choisir" /></SelectTrigger>
                          <SelectContent>
                            {vehicles
                              .filter((v: any) => {
                                // Admin, Technician, and Direction see all vehicles
                                if (user?.role !== 'collaborator' && user?.role !== 'driver') return true;

                                // For collaborators and drivers, try to find their driver profile
                                const userEmail = (user?.email || '').toLowerCase();
                                const profileEmail = (user?.profileEmail || '').toLowerCase();
                                const userName = (user?.name || '').toLowerCase();

                                const currentDriver = drivers?.find((d: any) => {
                                  const driverEmail = (d.email || '').toLowerCase();
                                  const driverFullName = `${d.nom} ${d.prenom}`.toLowerCase();
                                  return driverEmail === userEmail ||
                                    driverEmail === profileEmail ||
                                    driverFullName.includes(userName) ||
                                    userName.includes(d.nom.toLowerCase());
                                });

                                // Fallback: if no specific driver profile is found for a collaborator/driver,
                                // allow them to see all vehicles so they aren't blocked, 
                                // but prioritize their assigned one if found.
                                if (!currentDriver) return true;

                                // Bidirectional check: 
                                // 1. Driver has vehicle assigned (vehiculeAssigne)
                                // 2. Vehicle has driver assigned (conducteur_id)
                                const isAssigned = v.id === currentDriver.vehiculeAssigne || v.conducteur_id === currentDriver.id;

                                // If the driver HAS an assignment, only show that assignment.
                                // If they exist but have NO assignment yet, show all to let them pick.
                                if (currentDriver.vehiculeAssigne || v.conducteur_id === currentDriver.id) {
                                  return isAssigned;
                                }

                                return true;
                              })
                              .map((v: any) => <SelectItem key={v.id} value={v.id}>{v.immatriculation} ({v.marque})</SelectItem>)
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Demandeur *</Label>
                        <Select
                          value={formData.demandeurId}
                          onValueChange={v => setFormData({ ...formData, demandeurId: v })}
                          disabled={user?.role === 'collaborator' || user?.role === 'driver'}
                        >
                          <SelectTrigger className="dark:bg-zinc-800/50 border-border/50"><SelectValue placeholder="Choisir" /></SelectTrigger>
                          <SelectContent>
                            {users.map((u: any) => (
                              <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Station de Service</Label>
                        <Select value={formData.station} onValueChange={v => setFormData({ ...formData, station: v })}>
                          <SelectTrigger className="dark:bg-zinc-800/50 border-border/50"><SelectValue placeholder="Choisir" /></SelectTrigger>
                          <SelectContent>
                            {STATION_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Date *</Label>
                        <Input type="date" className="dark:bg-zinc-800/50" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Heure</Label>
                        <Input type="time" className="dark:bg-zinc-800/50" value={formData.heure} onChange={e => setFormData({ ...formData, heure: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">N° Ticket</Label>
                        <Input placeholder="T-0000" className="dark:bg-zinc-800/50" value={formData.numeroTicket}
                          onChange={(e) => setFormData({ ...formData, numeroTicket: e.target.value })}
                          placeholder="ex: T-12345"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-blue-700 dark:text-blue-500 font-semibold">Solde inscrit sur le Ticket</Label>
                        <Input type="number" step="any" className="dark:bg-zinc-800/50" value={formData.soldeTicket} onChange={e => setFormData({ ...formData, soldeTicket: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="mt-4 p-4 border border-dashed border-border rounded-xl bg-muted/5">
                      <Label htmlFor="ticketImage" className="block mb-2 font-medium">Photo du Ticket (Preuve)</Label>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <Input
                            id="ticketImage"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 h-12 pt-2"
                          />
                        </div>
                        {formData.ticketImage && (
                          <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden border border-border shadow-md select-none group">
                            <img
                              src={formData.ticketImage}
                              alt="Ticket"
                              className="h-full w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setPreviewImage(formData.ticketImage || null)}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 rounded-full"
                              onClick={() => setFormData({ ...formData, ticketImage: '' })}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* --- Section 2: Kilométrage --- */}
                  <div id="section-km" className="space-y-4 pt-4 border-t border-border scroll-mt-10">
                    <h3 className="text-sm font-bold border-l-4 border-blue-700 pl-2 text-blue-700 dark:text-blue-500">2. DONNÉES KILOMÉTRIQUES</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/20 dark:bg-zinc-900/40 p-4 rounded-lg">
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Précédent KM</Label>
                        <Input type="number" className="dark:bg-zinc-800/50" value={formData.precedentKm} onChange={e => setFormData({ ...formData, precedentKm: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Actuel KM</Label>
                        <Input type="number" className="dark:bg-zinc-800/50" value={formData.actuelKm} onChange={e => setFormData({ ...formData, actuelKm: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-primary/70 font-medium dark:text-primary/60">KM parcouru (Calculé)</Label>
                        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-md h-10 flex items-center justify-center font-bold text-primary">
                          {formData.kmParcouru || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* --- Section 3: Gestion Financière --- */}
                  <div id="section-finance" className="space-y-4 pt-4 border-t border-border scroll-mt-10">
                    <h3 className="text-sm font-bold border-l-4 border-blue-800 dark:text-blue-200 pl-2 text-blue-900">3. GESTION FINANCIÈRE ET COÛTS</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-blue-600 dark:text-blue-400 font-bold">Source d'energie P.U Ar/L</Label>
                        <Input type="number" step="any" className="dark:bg-zinc-800/50" value={formData.prixUnitaire} onChange={e => setFormData({ ...formData, prixUnitaire: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Ancien Solde</Label>
                        <Input type="number" step="any" className="dark:bg-zinc-800/50" value={formData.ancienSolde} onChange={e => setFormData({ ...formData, ancienSolde: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Montant à Recharger</Label>
                        <Input type="number" step="any" className="dark:bg-zinc-800/50" value={formData.montantRecharge} onChange={e => setFormData({ ...formData, montantRecharge: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Montant Ristourne</Label>
                        <Input type="number" step="any" className="dark:bg-zinc-800/50" value={formData.montantRistourne} onChange={e => setFormData({ ...formData, montantRistourne: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Bonus Recharge Carte</Label>
                        <Input type="number" step="any" className="dark:bg-zinc-800/50" value={formData.bonus} onChange={e => setFormData({ ...formData, bonus: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-green-700 dark:text-green-500 font-bold">Total Acheter (Montant total de l'achat)</Label>
                        <Input type="number" step="any" className="border-green-300 dark:border-green-800 dark:bg-zinc-800/50" value={formData.totalAchete} onChange={e => setFormData({ ...formData, totalAchete: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Montant Transaction Annulée</Label>
                        <Input type="number" step="any" className="dark:bg-zinc-800/50" value={formData.montantTransactionAnnuler} onChange={e => setFormData({ ...formData, montantTransactionAnnuler: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Différence Solde (T-A)</Label>
                        <Input value={formData.differenceSolde?.toFixed(2) || 0} readOnly className="bg-muted dark:bg-zinc-800/50 font-semibold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 bg-blue-500/5 p-4 rounded-lg border border-blue-500/10">
                      <div className="flex flex-col items-center">
                        <Label className="mb-2 text-xs text-muted-foreground">Nouveau Solde</Label>
                        <span className="text-xl font-black text-blue-700 dark:text-blue-400">{formData.nouveauSolde?.toLocaleString()} Ar</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Label className="mb-2 text-xs text-muted-foreground">Quantité Restante</Label>
                        <span className="text-xl font-black text-blue-600 dark:text-blue-300">{formData.quantiteRestante?.toFixed(2)} L</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <Label className="mb-2 text-xs text-muted-foreground">Coût au KM</Label>
                        <span className="text-xl font-black text-foreground/80">{formData.coutAuKm?.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>

                  <div id="section-performance" className="space-y-4 pt-4 border-t border-border scroll-mt-10">
                    <h3 className="text-sm font-bold border-l-4 border-indigo-600 pl-2 text-indigo-600 dark:text-indigo-400">4. VOLUMES ET INDICATEURS</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Quantité Rechargée (L)</Label>
                        <div className="p-2 border rounded bg-muted/20 font-medium">{formData.quantiteRechargee}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Quantité Achetée (L)</Label>
                        <div className="p-2 border rounded bg-muted/20 font-medium">{formData.quantiteAchetee}</div>
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Capacité de réservoir (L)</Label>
                        <Input
                          type="number"
                          className="dark:bg-zinc-800/50 bg-muted cursor-not-allowed"
                          value={formData.capaciteReservoir || 0}
                          readOnly
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="dark:text-zinc-400">Statut Carburant</Label>
                        <Input
                          className="font-bold cursor-not-allowed bg-muted/30"
                          style={{ color: (formData.quantiteAchetee || 0) > (formData.capaciteReservoir || 0) ? '#ef4444' : '#22c55e' }}
                          value={(formData.quantiteAchetee || 0) > (formData.capaciteReservoir || 0) ? 'Dépassement' : 'Normal'}
                          readOnly
                        />
                      </div>
                      {(user?.role === 'admin' || user?.role === 'technician') && (
                        <div className="space-y-2">
                          <Label>Validation</Label>
                          <Select value={formData.statut} onValueChange={(v: any) => setFormData({ ...formData, statut: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="en_attente">En attente</SelectItem>
                              <SelectItem value="valide">Valide</SelectItem>
                              <SelectItem value="rejete">Rejeté</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        {/* Manual Alert field removed - now handled automatically by backend */}
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex flex-col items-center justify-center">
                        <Label className="text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold text-center">Consommation L/100km</Label>
                        <span className="text-2xl font-black text-amber-500">{formData.consommation100 || 0}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg border border-border">
                      <div className="flex flex-col border-r border-border pr-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dist. possible (achat)</Label>
                        <span className="font-bold text-lg">{formData.distancePossible || 0} <span className="text-xs font-normal">km</span></span>
                      </div>
                      <div className="flex flex-col pl-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Dist. possible (restant)</Label>
                        <span className="font-bold text-lg text-primary">{formData.distancePossibleRestant || 0} <span className="text-xs font-normal">km</span></span>
                      </div>
                    </div>
                  </div>

                  {/* --- Section 5: Form Actions --- */}
                  <div id="section-actions" className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border scroll-mt-10 sticky bottom-0 bg-background dark:bg-zinc-950 border-border/50 pb-2">
                    <Button type="button" variant="ghost" size="lg" className="px-8 text-muted-foreground hover:text-foreground dark:hover:bg-zinc-900" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                    <Button type="submit" size="lg" className="px-10 bg-blue-600 hover:bg-blue-700 shadow-lg text-white font-bold" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingEntry ? 'Appliquer les modifications' : 'Enregistrer la transaction'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-background/95 backdrop-blur-xl border-border shadow-2xl rounded-2xl">
          <DialogHeader className="mb-6 border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Eye className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Détails de la Transaction</DialogTitle>
                  <DialogDescription>Récapitulatif complet de l'entrée carburant</DialogDescription>
                </div>
              </div>
              {viewingEntry && (
                <Badge variant={viewingEntry.statut === 'valide' ? 'default' : viewingEntry.statut === 'rejete' ? 'destructive' : 'outline'} className="h-7 px-4">
                  {viewingEntry.statut.toUpperCase()}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {viewingEntry && (
            <div className="space-y-8">
              {/* Section 1: Informations de base */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ClipboardList className="h-3 w-3" /> Informations de base
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Date</p>
                      <p className="font-semibold">{formatDateFr(viewingEntry.date)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Heure</p>
                      <p className="font-semibold">{viewingEntry.heure || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">N° Ticket</p>
                      <p className="font-semibold text-primary">{viewingEntry.numeroTicket || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Station</p>
                      <p className="font-semibold">{viewingEntry.station || '-'}</p>
                    </div>
                  </div>
                  {viewingEntry.ticketImage && (
                    <div className="mt-4">
                      <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Image du Ticket</p>
                      <div className="rounded-lg overflow-hidden border border-border/50 max-w-xs">
                        <img
                          src={viewingEntry.ticketImage}
                          alt="Ticket"
                          className="w-full h-auto object-contain max-h-48 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewImage(viewingEntry.ticketImage || null)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Véhicule & Demandeur
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Véhicule</p>
                      <p className="font-semibold">
                        {vehicles.find(v => v.id === viewingEntry.vehiculeId)?.immatriculation || 'Non spécifié'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Demandeur</p>
                      <p className="font-semibold">
                        {users.find(u => u.id === viewingEntry.demandeurId)?.name || 'Non spécifié'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Type</p>
                      <p className="font-semibold">
                        {vehicles.find(v => v.id === viewingEntry.vehiculeId)?.type_vehicule || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Produit</p>
                      <p className="font-semibold">{viewingEntry.produit}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Données kilométriques */}
              <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Gauge className="h-3 w-3" /> Données kilométriques & Distances
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="bg-background/50 p-2 rounded-md">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Précédent KM</p>
                    <p className="text-lg font-bold">{viewingEntry.precedentKm?.toLocaleString()}</p>
                  </div>
                  <div className="bg-background/50 p-2 rounded-md border border-blue-200 dark:border-blue-900 shadow-sm">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Actuel KM</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{viewingEntry.actuelKm?.toLocaleString()}</p>
                  </div>
                  <div className="bg-blue-600/10 p-2 rounded-md">
                    <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase font-medium mb-1">KM Parcouru</p>
                    <p className="text-lg font-black text-blue-700 dark:text-blue-300">{viewingEntry.kmParcouru?.toLocaleString()}</p>
                  </div>
                  <div className="bg-background/50 p-2 rounded-md">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">P.U (Ar/L)</p>
                    <p className="text-lg font-bold">{viewingEntry.prixUnitaire?.toLocaleString()} Ar</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground">Distance possible (QTE achetée)</span>
                    <span className="font-bold">{viewingEntry.distancePossible?.toFixed(0)} km</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <span className="text-xs text-primary/70">Distance possible (QTE restante)</span>
                    <span className="font-bold text-primary">{viewingEntry.distancePossibleRestant?.toFixed(0)} km</span>
                  </div>
                </div>
              </div>

              {/* Section 3: Gestion Financière */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Coins className="h-3 w-3" /> Gestion Financière
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-xs text-muted-foreground">Ancien Solde</span>
                      <span className="text-sm font-medium">{viewingEntry.ancienSolde?.toLocaleString()} Ar</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-xs text-muted-foreground">Solde Ticket</span>
                      <span className="text-sm font-medium">{viewingEntry.soldeTicket?.toLocaleString()} Ar</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Différence Solde</span>
                      <span className={cn("text-sm font-bold", (viewingEntry.differenceSolde || 0) < 0 ? "text-red-500" : "text-green-500")}>
                        {viewingEntry.differenceSolde?.toLocaleString()} Ar
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-xs text-muted-foreground">Montant Rechargé</span>
                      <span className="text-sm font-medium">{viewingEntry.montantRecharge?.toLocaleString()} Ar</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-xs text-muted-foreground">Ristourne</span>
                      <span className="text-sm font-medium">{viewingEntry.montantRistourne?.toLocaleString()} Ar</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Bonus</span>
                      <span className="text-sm font-medium">{viewingEntry.bonus?.toLocaleString()} Ar</span>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-xl space-y-4 text-center border-2 border-primary/20 bg-primary/5">
                    <div>
                      <p className="text-[10px] text-primary/70 uppercase font-black tracking-widest mb-1">Nouveau Solde</p>
                      <p className="text-2xl font-black text-primary">{viewingEntry.nouveauSolde?.toLocaleString()} <span className="text-xs">Ar</span></p>
                    </div>
                    <div className="pt-2 border-t border-primary/10">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Coût au KM</p>
                      <p className="text-sm font-bold">{viewingEntry.coutAuKm?.toFixed(3)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Volumes & Performance */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Volumes (L)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted/20 border rounded-lg text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">QTE Rechargée</p>
                      <p className="font-bold">{viewingEntry.quantiteRechargee?.toFixed(2)} L</p>
                    </div>
                    <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-center">
                      <p className="text-[10px] text-green-600/70 dark:text-green-400/70 uppercase mb-1">QTE Achetée</p>
                      <p className="font-bold text-green-600 dark:text-green-400">{viewingEntry.quantiteAchetee?.toFixed(2)} L</p>
                    </div>
                    <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-center">
                      <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase mb-1">QTE Restante</p>
                      <p className="font-bold text-blue-600 dark:text-blue-400">{viewingEntry.quantiteRestante?.toFixed(2)} L</p>
                    </div>
                    <div className="p-3 bg-muted/20 border rounded-lg text-center">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Capacité</p>
                      <p className="font-bold">{viewingEntry.capaciteReservoir || '-'} L</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Performance & Alertes
                  </h3>
                  <div className="h-full flex flex-col gap-4">
                    <div className="flex-1 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col items-center justify-center">
                      <p className="text-[10px] text-amber-600 uppercase font-black tracking-widest mb-1">Consommation L/100km</p>
                      <p className="text-3xl font-black text-amber-500">{viewingEntry.consommation100?.toFixed(2)}</p>
                    </div>
                    {viewingEntry.alerte && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                        <p className="text-[10px] text-red-600 uppercase font-bold mb-1 italic">Alerte</p>
                        <p className="text-xs text-red-500 font-medium">{viewingEntry.alerte}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t flex justify-end gap-3">
            {viewingEntry && (
              <Button
                variant="outline"
                size="lg"
                className="gap-2 border-primary/20 text-primary hover:bg-primary/5"
                onClick={() => {
                  // Open the PDF in a new tab/window which triggers download
                  window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/fuel/${viewingEntry.id}/pdf`, '_blank');
                }}
              >
                <Upload className="h-4 w-4 rotate-180" />
                Exporter PDF
              </Button>
            )}
            <Button size="lg" className="px-12 rounded-full font-bold shadow-xl shadow-primary/20" onClick={() => setIsDetailsDialogOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Year-End Balance Modal */}
      {/* Image Preview Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none shadow-2xl">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors z-50"
            >
              <X className="h-6 w-6" />
            </button>
            {previewImage && (
              <img
                src={previewImage}
                alt="Aperçu Ticket"
                className="max-w-full max-h-[90vh] object-contain rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default FuelPage;
