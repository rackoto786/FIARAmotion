import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Compliance, Vehicle } from '@/types';
import { apiClient } from '@/lib/api';
import {
    Shield,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Plus,
    Search,
    Filter,
    MoreVertical,
    ExternalLink,
    History,
    FileCheck,
    Zap,
    ChevronRight,
    CreditCard,
    Building2,
    FileText,
    Pencil,
    Trash2
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { X } from 'lucide-react';

const COMPLIANCE_TYPES = [
    { id: 'assurance', label: 'Assurance', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'vignette', label: 'Vignette', icon: CreditCard, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { id: 'visite_technique', label: 'Visite Technique', icon: FileCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'carte_rose', label: 'Carte Rose', icon: FileText, color: 'text-pink-500', bg: 'bg-pink-500/10' },
];

const CompliancePage = () => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<Compliance[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Form State
    const [formData, setFormData] = useState<Partial<Compliance>>({
        vehiculeId: '',
        type: 'assurance',
        dateExpiration: '',
        dateEmission: '',
        numeroDocument: '',
        prestataire: '',
        cout: 0,
        statut: 'valide'
    });

    const fetchData = async () => {
        try {
            const [complianceRes, vehiclesRes] = await Promise.all([
                apiClient.get<Compliance[]>('compliance'),
                apiClient.get<Vehicle[]>('vehicles')
            ]);
            setEntries(complianceRes.data);
            setVehicles(vehiclesRes.data);
        } catch (error) {
            console.error('Error fetching compliance data:', error);
            toast.error("Erreur lors du chargement des données");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
        toast.success("Données actualisées", {
            style: { background: '#10b981', color: '#fff', border: 'none' }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && currentEntryId) {
                await apiClient.put(`compliance/${currentEntryId}`, formData);
                toast.success("Échéance mise à jour avec succès", {
                    style: { background: '#10b981', color: '#fff', border: 'none' }
                });
            } else {
                await apiClient.post('compliance', formData);
                toast.success("Échéance enregistrée avec succès", {
                    style: { background: '#10b981', color: '#fff', border: 'none' }
                });
            }
            setIsDialogOpen(false);
            fetchData();
            resetForm();
        } catch (error) {
            toast.error("Erreur lors de l'enregistrement");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiClient.delete(`compliance/${id}`);
            toast.success("Échéance supprimée", {
                style: { background: '#10b981', color: '#fff', border: 'none' }
            });
            fetchData();
        } catch (error) {
            toast.error("Erreur lors de la suppression");
        }
    };

    const resetForm = () => {
        setFormData({
            vehiculeId: '',
            type: 'assurance',
            dateExpiration: '',
            dateEmission: '',
            numeroDocument: '',
            prestataire: '',
            cout: 0,
            statut: 'valide'
        });
        setIsEditing(false);
        setCurrentEntryId(null);
    };

    const handleEditOpen = (entry: Compliance) => {
        setFormData({
            vehiculeId: entry.vehiculeId,
            type: entry.type,
            dateExpiration: entry.dateExpiration.split('T')[0],
            dateEmission: entry.dateEmission?.split('T')[0] || '',
            numeroDocument: entry.numeroDocument || '',
            prestataire: entry.prestataire || '',
            cout: entry.cout,
            statut: entry.statut
        });
        setIsEditing(true);
        setCurrentEntryId(entry.id);
        setIsDialogOpen(true);
    };

    const getStatusBadge = (dateStr: string) => {
        const today = new Date();
        const expiry = new Date(dateStr);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return <Badge variant="destructive" className="animate-pulse shadow-lg shadow-destructive/20">Expiré</Badge>;
        if (diffDays <= 30) return <Badge variant="warning" className="shadow-lg shadow-warning/20">À renouveler ({diffDays}j)</Badge>;
        return <Badge variant="success" className="shadow-lg shadow-success/20">Valide</Badge>;
    };

    const filteredEntries = entries.filter(e => {
        const matchesSearch = e.vehicule_immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.type.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all' || e.type === filterType;

        const today = new Date();
        const expiry = new Date(e.dateExpiration);
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let status = 'valide';
        if (diffDays < 0) status = 'expire';
        else if (diffDays <= 30) status = 'renouveler';

        const matchesStatus = filterStatus === 'all' || status === filterStatus;

        return matchesSearch && matchesType && matchesStatus;
    });

    const stats = {
        total: entries.length,
        expired: entries.filter(e => new Date(e.dateExpiration) < new Date()).length,
        upcoming: entries.filter(e => {
            const diff = (new Date(e.dateExpiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff <= 30;
        }).length,
        valid: entries.filter(e => {
            const diff = (new Date(e.dateExpiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
            return diff > 30;
        }).length
    };

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700">
            {/* Header section with Glassmorphism */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight gradient-text">Gestion des Échéances</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Suivi professionnel de la conformité légale de votre parc
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        className={cn("rounded-full border-primary/20", isRefreshing && "animate-spin")}
                    >
                        <Zap className="h-4 w-4 text-primary" />
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button className="rounded-full shadow-glow gap-2 pl-4 pr-5 transition-all hover:scale-105 active:scale-95 bg-primary">
                                <Plus className="h-5 w-5" />
                                <span className="font-semibold">Nouvelle Échéance</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] border-primary/20 bg-background/95 backdrop-blur-xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl gradient-text">{isEditing ? "Modifier l'échéance" : "Ajouter un document"}</DialogTitle>
                                <CardDescription>{isEditing ? "Mettez à jour les informations du document." : "Enregistrez un nouveau titre de transport ou assurance."}</CardDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="vehicle">Véhicule</Label>
                                        <Select value={formData.vehiculeId} onValueChange={(v) => setFormData({ ...formData, vehiculeId: v })}>
                                            <SelectTrigger className="bg-muted/50 border-primary/10">
                                                <SelectValue placeholder="Sélectionner..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicles.map(v => (
                                                    <SelectItem key={v.id} value={v.id}>{v.immatriculation} - {v.marque}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Type de document</Label>
                                        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
                                            <SelectTrigger className="bg-muted/50 border-primary/10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COMPLIANCE_TYPES.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="expiry">Date d'expiration</Label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="expiry"
                                                type="date"
                                                value={formData.dateExpiration}
                                                className="pl-10 bg-muted/50 border-primary/10"
                                                onChange={(e) => setFormData({ ...formData, dateExpiration: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="docNum">Numéro de document</Label>
                                        <Input
                                            id="docNum"
                                            value={formData.numeroDocument}
                                            placeholder="Ex: POL-2024-X"
                                            className="bg-muted/50 border-primary/10"
                                            onChange={(e) => setFormData({ ...formData, numeroDocument: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cost">Coût (MGA)</Label>
                                        <Input
                                            id="cost"
                                            type="number"
                                            value={formData.cout}
                                            placeholder="0.00"
                                            className="bg-muted/50 border-primary/10"
                                            onChange={(e) => setFormData({ ...formData, cout: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="provider">Prestataire</Label>
                                        <Input
                                            id="provider"
                                            value={formData.prestataire}
                                            placeholder="Ex: ARO SA"
                                            className="bg-muted/50 border-primary/10"
                                            onChange={(e) => setFormData({ ...formData, prestataire: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <DialogFooter className="pt-4">
                                    <Button type="submit" className="w-full shadow-glow">
                                        {isEditing ? "Mettre à jour" : "Enregistrer"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Total Documents"
                    value={stats.total.toString()}
                    subtitle="Tous les titres"
                    icon={FileText}
                    variant="primary"
                />
                <StatsCard
                    title="Expirés"
                    value={stats.expired.toString()}
                    subtitle="Action immédiate"
                    icon={AlertTriangle}
                    variant="danger"
                />
                <StatsCard
                    title="À renouveler"
                    value={stats.upcoming.toString()}
                    subtitle="Sous 30 jours"
                    icon={Clock}
                    variant="warning"
                />
                <StatsCard
                    title="Valides"
                    value={stats.valid.toString()}
                    subtitle="Conformité OK"
                    icon={CheckCircle2}
                    variant="success"
                />
            </div>

            {/* Main Table Section */}
            <Card className="glass-card border-primary/5 shadow-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-white/5 bg-white/2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl">État de la flotte</CardTitle>
                            <CardDescription>Liste exhaustive des documents légaux par véhicule.</CardDescription>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher un véhicule..."
                                    className="pl-10 bg-muted/30 border-primary/5 focus:border-primary/20 transition-all rounded-full"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className={cn(
                                            "rounded-full border-primary/10 gap-2 px-4 h-10",
                                            (filterType !== 'all' || filterStatus !== 'all') && "bg-primary/5 border-primary/20"
                                        )}>
                                            <Filter className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium">Filtrer</span>
                                            {(filterType !== 'all' || filterStatus !== 'all') && (
                                                <Badge variant="glow" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                                                    {(filterType !== 'all' ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0)}
                                                </Badge>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-4 border-primary/10 bg-background/95 backdrop-blur-xl" align="end">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-semibold leading-none">Filtres</h4>
                                                {(filterType !== 'all' || filterStatus !== 'all') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                                                        className="h-8 pr-2 pl-2 text-xs text-muted-foreground hover:text-primary"
                                                    >
                                                        Effacer
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="space-y-3 pt-2">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold uppercase opacity-50">Type de document</Label>
                                                    <Select value={filterType} onValueChange={setFilterType}>
                                                        <SelectTrigger className="h-9 bg-muted/30 border-primary/5">
                                                            <SelectValue placeholder="Tous les types" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Tous les types</SelectItem>
                                                            {COMPLIANCE_TYPES.map(t => (
                                                                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold uppercase opacity-50">Statut</Label>
                                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                                        <SelectTrigger className="h-9 bg-muted/30 border-primary/5">
                                                            <SelectValue placeholder="Tous les statuts" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">Tous les statuts</SelectItem>
                                                            <SelectItem value="valide">Valide</SelectItem>
                                                            <SelectItem value="renouveler">À renouveler</SelectItem>
                                                            <SelectItem value="expire">Expiré</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {(filterType !== 'all' || filterStatus !== 'all') && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                                        className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/20">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="w-[200px] pl-6">Véhicule</TableHead>
                                <TableHead>Type de document</TableHead>
                                <TableHead>N° Document</TableHead>
                                <TableHead>Expiration</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Coût (MGA)</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse border-white/5">
                                        {Array(7).fill(0).map((_, j) => (
                                            <TableCell key={j}><div className="h-4 bg-muted/30 rounded w-full" /></TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : filteredEntries.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        Aucune échéance trouvée.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredEntries.map((e) => (
                                    <TableRow key={e.id} className="hover:bg-white/5 transition-colors border-white/5 group">
                                        <TableCell className="font-semibold text-foreground pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">
                                                    {e.vehicule_immatriculation.substring(0, 2)}
                                                </div>
                                                {e.vehicule_immatriculation}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {(() => {
                                                    const typeData = COMPLIANCE_TYPES.find(t => t.id === e.type) || COMPLIANCE_TYPES[0];
                                                    return (
                                                        <>
                                                            <div className={cn("p-1.5 rounded-md", typeData.bg)}>
                                                                <typeData.icon className={cn("h-3.5 w-3.5", typeData.color)} />
                                                            </div>
                                                            <span className="text-sm">{typeData.label}</span>
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                                            {e.numeroDocument || "---"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-sm">{format(new Date(e.dateExpiration), 'dd MMM yyyy', { locale: fr })}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(e.dateExpiration)}</TableCell>
                                        <TableCell className="text-right font-semibold font-mono text-primary">
                                            {new Intl.NumberFormat('fr-MG', { style: 'currency', currency: 'MGA' }).format(e.cout)}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 border-primary/10">
                                                    <DropdownMenuItem onClick={() => handleEditOpen(e)} className="gap-2">
                                                        <Pencil className="h-4 w-4" />
                                                        Modifier
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 text-destructive">
                                                                <Trash2 className="h-4 w-4" />
                                                                Supprimer
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="border-destructive/20 bg-background/95 backdrop-blur-xl">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Cette action supprimera définitivement cette échéance de la base de données.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="rounded-full">Annuler</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive hover:bg-destructive/90 rounded-full">
                                                                    Supprimer
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default CompliancePage;
