import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Clock,
    Car,
    User,
    Calendar,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Archive,
    MapPin,
    ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PLANNING_STATUS_LABELS } from '@/types';
import { typeConfig } from '@/pages/Planning';

interface KanbanViewProps {
    planningItems: any[];
    statusFilter: string;
    vehicles: any[];
    drivers: any[];
    onEditClick: (item: any) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({
    planningItems,
    statusFilter,
    vehicles,
    drivers,
    onEditClick
}) => {
    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'en_attente':
                return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
            case 'acceptee':
                return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
            case 'annulee':
                return { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' };
            case 'rejetee':
                return { icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
            default:
                return { icon: Archive, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
        }
    };

    const renderCard = (item: any) => {
        const vehicle = vehicles.find(v => v.id === item.vehiculeId);
        const driver = drivers.find(d => d.id === item.conducteurId);
        const config = typeConfig[item.type] || { label: item.type, icon: ClipboardList };
        const statusCfg = getStatusConfig(item.status);
        const StatusIcon = statusCfg.icon;

        const startDate = new Date(item.dateDebut);
        const endDate = new Date(item.dateFin);

        return (
            <Card
                key={item.id}
                onClick={() => onEditClick(item)}
                className="group relative overflow-hidden border-white/5 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10 hover:shadow-xl hover:shadow-black/20 cursor-pointer"
            >
                <div className={cn("absolute inset-y-0 left-0 w-1", statusCfg.bg.replace('/10', ''))} />

                <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline" className="bg-white/5 border-white/10 text-white gap-1.5 py-1">
                            <config.icon className="w-3.5 h-3.5 text-teal-400" />
                            {config.label}
                        </Badge>
                        <div className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full", statusCfg.bg, statusCfg.color)}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {PLANNING_STATUS_LABELS[item.status as keyof typeof PLANNING_STATUS_LABELS] || item.status}
                        </div>
                    </div>

                    <h4 className="text-white font-semibold mb-1 line-clamp-1">
                        {item.titre || item.description || "Sans titre"}
                    </h4>
                    {item.titre && item.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
                            {item.description}
                        </p>
                    )}
                    {!item.titre && <div className="mb-3" />}

                    <div className="space-y-2 text-sm">
                        {item.trajet || item.lieuDestination ? (
                            <div className="flex items-center gap-2 text-gray-400">
                                <MapPin className="w-4 h-4 text-emerald-500/70" />
                                <span className="truncate">
                                    {item.lieuDepart || 'CAMPUS'} → {item.trajet || item.lieuDestination}
                                </span>
                            </div>
                        ) : null}

                        {item.missionnaire ? (
                            <div className="flex items-center gap-2 text-gray-400">
                                <User className="w-4 h-4 text-orange-500/70" />
                                <span className="truncate">
                                    {item.missionnaire}
                                </span>
                            </div>
                        ) : null}

                        <div className="flex items-center gap-2 text-gray-400">
                            <Car className="w-4 h-4 text-teal-500/70" />
                            <span className="truncate">
                                {vehicle ? `${vehicle.marque} ${vehicle.modele} (${vehicle.immatriculation || vehicle.matricule})` : "Véhicule non assigné"}
                            </span>
                        </div>

                        {!item.missionnaire && driver && (
                            <div className="flex items-center gap-2 text-gray-400">
                                <User className="w-4 h-4 text-purple-500/70" />
                                <span className="truncate">
                                    {driver ? `${driver.prenom} ${driver.nom}` : "Sans conducteur"}
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-gray-400 pt-1">
                            <Calendar className="w-4 h-4 text-blue-500/70" />
                            <span>
                                {startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} • {startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                <ChevronRight className="inline w-3 h-3 mx-1 text-gray-600" />
                                {endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const statuses = statusFilter === 'all'
        ? ['en_attente', 'acceptee', 'rejetee']
        : [statusFilter === 'historique' ? 'cloturee' : statusFilter];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
            {statusFilter === 'all' || statusFilter === 'historique' ? (
                // Mode Galerie / Historique : Toutes les cartes dans une grille
                planningItems.map(item => renderCard(item))
            ) : (
                // Mode Filtré : Liste de cartes pour un statut spécifique
                planningItems
                    .filter(item => item.status === statusFilter)
                    .map(item => renderCard(item))
            )}

            {planningItems.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                    <Archive className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg">Aucune réservation trouvée</p>
                    <p className="text-sm">Essayez de changer de statut ou de période</p>
                </div>
            )}
        </div>
    );
};

export default KanbanView;
