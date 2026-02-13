import React, { useState, useEffect } from 'react';
import { Mission, Vehicle, Driver } from '@/types';
import { DataTable } from '@/components/common/DataTable';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { MapPin, Route, ArrowLeft, Eye, FileText } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDateFr } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

const MissionHistory: React.FC = () => {
    const navigate = useNavigate();
    const { user, isLoading: isAuthLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const statusParam = searchParams.get('status');
    const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    // CR Mission State
    const [isCROpen, setIsCROpen] = useState(false);
    const [crMission, setCrMission] = useState<Mission | null>(null);
    const [crForm, setCrForm] = useState({
        kilometrageRetour: 0,
        missionnaireRetour: ''
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        const allowedRoles = ['admin', 'technician', 'collaborator', 'direction', 'driver'];
        if (!isAuthLoading && user && !allowedRoles.includes(user.role)) {
            navigate('/missions');
        }
    }, [user, isAuthLoading, navigate]);

    // Update Mission Mutation
    const updateMissionMutation = useMutation({
        mutationFn: async (data: { id: string, kilometrageRetour: number, missionnaireRetour: string }) => {
            const res = await apiClient.put(`/missions/${data.id}`, {
                kilometrageRetour: data.kilometrageRetour,
                missionnaireRetour: data.missionnaireRetour
            });
            return res.data;
        },
        onSuccess: (updatedMission: any) => {
            queryClient.invalidateQueries({ queryKey: ['missions-history'] });
            toast.success("Mission mise à jour avec succès", {
                style: { background: '#22c55e', color: 'white', border: 'none' }
            });
            generateMissionPDF(updatedMission as Mission, vehicles.find(v => v.id === (updatedMission as Mission).vehiculeId));
            setIsCROpen(false);
        },
        onError: (error) => {
            toast.error(`Erreur: ${error.message}`, {
                style: { background: '#ef4444', color: 'white', border: 'none' }
            });
            console.error(error);
        }
    });

    if (isAuthLoading) {
        return <div>Chargement...</div>;
    }

    // Helper to convert float hour to HH:MM string
    const floatHourToString = (h: number | undefined): string => {
        if (h === undefined || h === null) return '';
        const hours = Math.floor(h);
        const minutes = Math.round((h - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };

    const generateMissionPDF = (mission: Mission, vehicle?: Vehicle) => {
        const doc = new jsPDF();

        // Colors
        const primaryColor = [41, 128, 185]; // Blue

        // Header
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text("RAPPORT DE MISSION", 105, 25, { align: "center" });

        // Info Section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);

        const startY = 50;

        // Mission Details
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

        // Vehicle & Route Details
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

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Page ${i} / ${pageCount}`, 105, 287, { align: "center" });
            doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 200, 287, { align: "right" });
        }

        doc.save(`Mission_${mission.reference}.pdf`);
    };

    const handleOpenCR = (mission: Mission) => {
        setCrMission(mission);
        setCrForm({
            kilometrageRetour: mission.kilometrageRetour || 0,
            missionnaireRetour: mission.missionnaireRetour || mission.missionnaire || ''
        });
        setIsCROpen(true);
    };

    const handleSaveAndExport = () => {
        if (!crMission) return;

        // Validation: Kilométrage retour doit être supérieur ou égal au kilométrage départ
        const kmDepart = crMission.kilometrageDepart || 0;
        if (crForm.kilometrageRetour < kmDepart) {
            toast.error(`Le kilométrage retour (${crForm.kilometrageRetour} km) ne peut pas être inférieur au kilométrage de départ (${kmDepart} km).`, {
                style: { background: '#ef4444', color: 'white', border: 'none' }
            });
            return;
        }

        updateMissionMutation.mutate({
            id: crMission.id,
            kilometrageRetour: crForm.kilometrageRetour,
            missionnaireRetour: crForm.missionnaireRetour
        });
    };

    const { data: missions = [], isLoading } = useQuery<Mission[]>({
        queryKey: ['missions-history'],
        queryFn: async () => {
            // Fetch missions based on URL param, or default to termine,rejeter if none
            const status = statusParam || 'termine,rejeter';
            const res = await apiClient.get<Mission[]>(`/missions?status=${status}`);
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

    const { data: drivers = [] } = useQuery<Driver[]>({
        queryKey: ['drivers'],
        queryFn: async () => {
            const res = await apiClient.get<Driver[]>('/drivers');
            return res.data;
        },
    });

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
            cell: (mission: Mission) => (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedMission(mission); setIsViewOpen(true); }}>
                        <Eye className="h-4 w-4 mr-2" /> Détails
                    </Button>
                    {mission.state === 'termine' && (
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => handleOpenCR(mission)}
                        >
                            <FileText className="h-4 w-4 mr-2" /> Rapport
                        </Button>
                    )}
                </div>
            )
        }
    ];

    const getPageTitle = () => {
        switch (statusParam) {
            case 'termine': return 'Missions Terminées';
            case 'rejeter': return 'Missions Rejetées';
            case 'nouveau': return 'Missions En Attente';
            case 'planifie': return 'Missions Planifiées';
            case 'en_cours': return 'Missions En Cours';
            default: return 'Historique des Missions';
        }
    };

    const getPageDescription = () => {
        switch (statusParam) {
            case 'termine': return 'Liste des missions terminées';
            case 'rejeter': return 'Liste des missions rejetées';
            case 'nouveau': return 'Liste des missions en attente de validation';
            case 'planifie': return 'Liste des missions planifiées';
            case 'en_cours': return 'Liste des missions en cours d\'exécution';
            default: return 'Historique complet des missions';
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={getPageTitle()}
                description={getPageDescription()}
                icon={Route}
                actions={
                    <Button variant="outline" className="gap-2" onClick={() => navigate('/missions')}>
                        <ArrowLeft className="h-4 w-4" /> Retour aux missions
                    </Button>
                }
            />

            <DataTable
                data={missions}
                columns={columns}
                searchPlaceholder="Rechercher..."
                searchKeys={['reference', 'missionnaire', 'lieuDestination']}
            />

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
                                    <Label className="text-muted-foreground">Missionnaire (Retour)</Label>
                                    <p>{selectedMission.missionnaireRetour || '-'}</p>
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
                                <div className="col-span-2">
                                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg">
                                        <div>
                                            <Label className="text-muted-foreground">Km Départ</Label>
                                            <p>{selectedMission.kilometrageDepart} km</p>
                                        </div>
                                        <div>
                                            <Label className="text-muted-foreground">Km Retour</Label>
                                            <p className="font-semibold">{selectedMission.kilometrageRetour} km</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Distance parcourue</Label>
                                    <p className="font-medium text-lg text-primary">{selectedMission.kilometreParcouru} km</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* CR Modal */}
            <Dialog open={isCROpen} onOpenChange={setIsCROpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rapport de Mission - {crMission?.reference}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="kilometrageRetour">Kilométrage retour</Label>
                            <Input
                                id="kilometrageRetour"
                                type="number"
                                value={crForm.kilometrageRetour}
                                onChange={(e) => setCrForm({ ...crForm, kilometrageRetour: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="missionnaireRetour">Missionnaire au retour</Label>
                            <Input
                                id="missionnaireRetour"
                                value={crForm.missionnaireRetour}
                                onChange={(e) => setCrForm({ ...crForm, missionnaireRetour: e.target.value })}
                                placeholder="Laisser vide si identique"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCROpen(false)}>Annuler</Button>
                        <Button onClick={handleSaveAndExport} disabled={updateMissionMutation.isPending}>
                            {updateMissionMutation.isPending ? 'Enregistrement...' : 'Valider et Exporter PDF'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MissionHistory;
