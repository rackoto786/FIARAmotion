import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Maintenance as MaintenanceType, Vehicle } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { Archive, ChevronLeft, Eye, FileText, Calendar, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { formatDateFr, cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const MaintenanceArchives: React.FC = () => {
    const navigate = useNavigate();
    const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceType | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
    const [dateFromFilter, setDateFromFilter] = useState<string>('');
    const [dateToFilter, setDateToFilter] = useState<string>('');

    const { data: vehicles = [] } = useQuery({
        queryKey: ['vehicles'],
        queryFn: async () => {
            const response = await apiClient.get('/vehicles');
            return response.data as Vehicle[];
        },
    });

    const getVehicleDisplay = (id: string) => {
        const v = vehicles.find(v => v.id === id);
        return v ? `${v.immatriculation} (${v.marque} ${v.modele})` : id;
    };

    const { data: maintenances = [], isLoading } = useQuery({
        queryKey: ['maintenances'],
        queryFn: async () => {
            const response = await apiClient.get('/maintenance');
            return response.data as MaintenanceType[];
        },
    });

    const archivedMaintenances = maintenances.filter(m => m.statut === 'archive');

    // Apply filters
    const filteredMaintenances = archivedMaintenances.filter(maintenance => {
        // Type filter
        if (typeFilter !== 'all' && maintenance.type !== typeFilter) return false;

        // Vehicle type filter
        if (vehicleTypeFilter !== 'all') {
            const v = vehicles.find(veh => veh.id === maintenance.vehiculeId);
            if (!v) return false;
            const type = v.type_vehicule?.toLowerCase();
            if (vehicleTypeFilter === 'moto' && type !== 'moto') return false;
            if (vehicleTypeFilter === 'voiture' && type !== 'voiture') return false;
        }

        // Date range filter
        if (dateFromFilter && maintenance.datePrevue < dateFromFilter) return false;
        if (dateToFilter && maintenance.datePrevue > dateToFilter) return false;

        return true;
    });

    const typeLabels: Record<string, string> = {
        revision: 'Révision',
        vidange: 'Vidange',
        freins: 'Freins',
        pneus: 'Pneus',
        autre: 'Autre',
    };

    const handleViewDetails = (maintenance: MaintenanceType) => {
        setSelectedMaintenance(maintenance);
        setIsViewOpen(true);
    };

    const clearFilters = () => {
        setTypeFilter('all');
        setVehicleTypeFilter('all');
        setDateFromFilter('');
        setDateToFilter('');
    };

    const columns = [
        {
            key: 'vehicule',
            header: 'Véhicule',
            cell: (item: MaintenanceType) => getVehicleDisplay(item.vehiculeId),
        },
        {
            key: 'type',
            header: 'Type',
            cell: (item: MaintenanceType) => typeLabels[item.type] || item.type,
        },
        {
            key: 'description',
            header: 'Description',
            cell: (item: MaintenanceType) => (
                <span className="line-clamp-2">{item.description}</span>
            ),
        },
        {
            key: 'datePrevue',
            header: 'Date Prévue',
            cell: (item: MaintenanceType) => formatDateFr(item.datePrevue),
        },
        {
            key: 'cout',
            header: 'Coût',
            cell: (item: MaintenanceType) => item.cout ? `${item.cout.toLocaleString()} Ar` : '-',
        },
        {
            key: 'actions',
            header: 'Actions',
            cell: (item: MaintenanceType) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(item)}
                    className="gap-2"
                >
                    <Eye className="h-4 w-4" />
                    Détails
                </Button>
            ),
        },
    ];

    const vehicle = selectedMaintenance
        ? vehicles.find(v => v.id === selectedMaintenance.vehiculeId)
        : null;

    const activeFilterCount = [typeFilter !== 'all', vehicleTypeFilter !== 'all', dateFromFilter, dateToFilter].filter(Boolean).length;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Archives des Entretiens"
                description="Historique complet des maintenances archivées"
                icon={Archive}
                actions={
                    <Button variant="outline" onClick={() => navigate('/maintenance')}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Retour
                    </Button>
                }
            />

            {/* Filters Section */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-slate-500" />
                            <h3 className="font-semibold text-slate-900 dark:text-white">Filtres</h3>
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {activeFilterCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="gap-2"
                                >
                                    <X className="h-4 w-4" />
                                    Réinitialiser
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? 'Masquer' : 'Afficher'}
                            </Button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Type d'entretien</Label>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Tous les types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les types</SelectItem>
                                        <SelectItem value="revision">Révision</SelectItem>
                                        <SelectItem value="vidange">Vidange</SelectItem>
                                        <SelectItem value="freins">Freins</SelectItem>
                                        <SelectItem value="pneus">Pneus</SelectItem>
                                        <SelectItem value="autre">Autre</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Type de véhicule</Label>
                                <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Tous les véhicules" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tous les véhicules</SelectItem>
                                        <SelectItem value="voiture">Voiture</SelectItem>
                                        <SelectItem value="moto">Moto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Date de début</Label>
                                <Input
                                    type="date"
                                    value={dateFromFilter}
                                    onChange={(e) => setDateFromFilter(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Date de fin</Label>
                                <Input
                                    type="date"
                                    value={dateToFilter}
                                    onChange={(e) => setDateToFilter(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="bg-white dark:bg-card rounded-3xl border border-slate-100 dark:border-border shadow-sm overflow-hidden">
                <DataTable
                    data={filteredMaintenances}
                    columns={columns}
                    searchPlaceholder="Rechercher dans les archives..."
                    searchKeys={['description', 'prestataire', 'technicien']}
                />
            </div>

            {/* Details Modal */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent className="max-w-5xl rounded-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <FileText className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <h3>Détails de l'entretien archivé</h3>
                                    {selectedMaintenance && (
                                        <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mt-1">
                                            {vehicle?.immatriculation} - {typeLabels[selectedMaintenance.type]}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {selectedMaintenance && (
                        <div className="space-y-6 py-4">
                            {/* Vehicle Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Véhicule</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {vehicle ? `${vehicle.marque} ${vehicle.modele}` : 'Inconnu'}
                                    </p>
                                    <p className="text-xs text-slate-500">{vehicle?.immatriculation}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Type d'entretien</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {typeLabels[selectedMaintenance.type]}
                                    </p>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        Date prévue
                                    </Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {formatDateFr(selectedMaintenance.datePrevue)}
                                    </p>
                                </div>
                                {selectedMaintenance.dateRealisation && (
                                    <div className="space-y-1">
                                        <Label className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Date de réalisation
                                        </Label>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                                            {formatDateFr(selectedMaintenance.dateRealisation)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500 uppercase font-semibold">Description</Label>
                                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                                    {selectedMaintenance.description}
                                </p>
                            </div>

                            {/* Technical Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Kilométrage</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {selectedMaintenance.kilometrage} km
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Technicien</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {selectedMaintenance.technicien || 'Non spécifié'}
                                    </p>
                                </div>
                            </div>

                            {/* Cost */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Coût final</Label>
                                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                        {selectedMaintenance.cout ? `${selectedMaintenance.cout.toLocaleString()} Ar` : '-'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Localisation</Label>
                                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                                        {selectedMaintenance.localisation || 'Non spécifiée'}
                                    </p>
                                </div>
                            </div>

                            {/* Parts Replaced */}
                            {selectedMaintenance.piecesRemplacees && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Pièces remplacées</Label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">
                                        {selectedMaintenance.piecesRemplacees}
                                    </p>
                                </div>
                            )}

                            {/* Report */}
                            {selectedMaintenance.compteRendu && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Compte-rendu technique</Label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl whitespace-pre-wrap">
                                        {selectedMaintenance.compteRendu}
                                    </p>
                                </div>
                            )}

                            {/* Invoice Image */}
                            {selectedMaintenance.imageFacture && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500 uppercase font-semibold">Facture</Label>
                                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                        <img
                                            src={selectedMaintenance.imageFacture}
                                            alt="Facture"
                                            className="w-full h-auto"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                                <Button onClick={() => setIsViewOpen(false)} className="rounded-xl">
                                    Fermer
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MaintenanceArchives;
