import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Maintenance as MaintenanceType, Vehicle } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { FileText, ChevronLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateFr } from '@/lib/utils';
import { ImageUpload } from '@/components/common/ImageUpload';

const MaintenanceReports: React.FC = () => {
    const navigate = useNavigate();
    const [selectedMaintenace, setSelectedMaintenance] = useState<MaintenanceType | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [report, setReport] = useState('');
    const [pieces, setPieces] = useState('');
    const [dateRel, setDateRel] = useState('');
    const [coutReel, setCoutReel] = useState('');
    const [imageFacture, setImageFacture] = useState('');
    const queryClient = useQueryClient();

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

    const closedMaintenances = maintenances.filter(m => m.statut === 'cloture');

    const handleEditReport = (maintenance: MaintenanceType) => {
        setSelectedMaintenance(maintenance);
        setReport(maintenance.compteRendu || '');
        setPieces(maintenance.piecesRemplacees || '');
        setDateRel(maintenance.dateRealisation || new Date().toISOString().split('T')[0]);
        setCoutReel(maintenance.cout ? String(maintenance.cout) : '');
        setImageFacture(maintenance.imageFacture || '');
        setIsEditOpen(true);
    };

    const handleSaveReport = async () => {
        if (!selectedMaintenace) return;
        try {
            await apiClient.put(`/maintenance/${selectedMaintenace.id}`, {
                ...selectedMaintenace,
                compteRendu: report,
                piecesRemplacees: pieces,
                dateRealisation: dateRel,
                cout: coutReel ? Number(coutReel) : selectedMaintenace.cout,
                imageFacture: imageFacture,
            });
            queryClient.invalidateQueries({ queryKey: ['maintenances'] });
            toast({
                title: "Succès",
                description: "Rapport mis à jour avec succès",
            });
            setIsEditOpen(false);
        } catch (error) {
            toast({
                title: "Erreur",
                description: "Impossible de mettre à jour le rapport",
                variant: "destructive",
            });
        }
    };

    const typeLabels: Record<string, string> = {
        revision: 'Révision',
        vidange: 'Vidange',
        freins: 'Freins',
        pneus: 'Pneus',
        autre: 'Autre',
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
            key: 'datePrevue',
            header: 'Date Prévue',
            cell: (item: MaintenanceType) => formatDateFr(item.datePrevue),
        },
        {
            key: 'compteRendu',
            header: 'Rapport',
            cell: (item: MaintenanceType) => (
                <span className={item.compteRendu ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                    {item.compteRendu ? "Rédigé" : "À rédiger"}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            cell: (item: MaintenanceType) => (
                <Button variant="ghost" size="sm" onClick={() => handleEditReport(item)}>
                    {item.compteRendu ? "Modifier" : "Rédiger"}
                </Button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Rapports Techniques"
                description="Gérer les comptes-rendus d'entretien"
                icon={FileText}
                actions={
                    <Button variant="outline" onClick={() => navigate('/maintenance')}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Retour
                    </Button>
                }
            />

            <div className="bg-white dark:bg-card rounded-3xl border border-slate-100 dark:border-border shadow-sm overflow-hidden">
                <DataTable
                    data={closedMaintenances}
                    columns={columns}
                    searchPlaceholder="Rechercher par véhicule..."
                    searchKeys={['description', 'technicien']}
                />
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Rédiger le rapport technique</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date de réalisation</Label>
                                <Input
                                    type="date"
                                    value={dateRel}
                                    onChange={(e) => setDateRel(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Pièces remplacées</Label>
                                <Input
                                    placeholder="Ex: Filtre à huile, Plaquettes..."
                                    value={pieces}
                                    onChange={(e) => setPieces(e.target.value)}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Coût réel de réparation (Ar)</Label>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={coutReel}
                                    onChange={(e) => setCoutReel(e.target.value)}
                                    className="rounded-xl font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Facture / Justificatif</Label>
                                <ImageUpload
                                    value={imageFacture}
                                    onChange={setImageFacture}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Compte-rendu détaillé</Label>
                            <Textarea
                                placeholder="Détaillez l'intervention effectuée..."
                                className="min-h-[150px] rounded-2xl"
                                value={report}
                                onChange={(e) => setReport(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">
                                Annuler
                            </Button>
                            <Button onClick={handleSaveReport} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Save className="h-4 w-4 mr-2" />
                                Enregistrer le rapport
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MaintenanceReports;
