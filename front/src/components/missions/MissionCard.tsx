import React from 'react';
import { Mission, Vehicle, Driver } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, User, Truck, MoreHorizontal, ChevronRight, Pencil, Trash2, Route, FileText, Ban, Play, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MissionCardProps {
    mission: Mission;
    vehicle?: Vehicle;
    driver?: Driver;
    onDetails: (mission: Mission) => void;
    onEdit?: (mission: Mission) => void;
    onDelete?: (mission: Mission) => void;
    onCR?: (mission: Mission) => void;
    onCancel?: (mission: Mission) => void;
    onStart?: (mission: Mission) => void;
    onFinish?: (mission: Mission) => void;
}

export const MissionCard: React.FC<MissionCardProps> = ({
    mission,
    vehicle,
    driver,
    onDetails,
    onEdit,
    onDelete,
    onCR,
    onCancel,
    onStart,
    onFinish
}) => {
    const getProgress = (state: string) => {
        switch (state) {
            case 'nouveau': return 0;
            case 'planifie': return 25;
            case 'en_cours': return 65; // Example "active" state
            case 'termine': return 100;
            case 'archive': return 100;
            case 'rejeter': return 100;
            case 'annule': return 0;
            default: return 0;
        }
    };

    const getStatusBadge = (state: string) => {
        switch (state) {
            case 'en_cours': return <Badge className="bg-blue-100 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 font-semibold px-3 uppercase text-[10px]">EN COURS</Badge>;
            case 'nouveau': return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-500/10 dark:text-slate-400 font-semibold px-3 uppercase text-[10px]">EN ATTENTE</Badge>;
            case 'planifie': return <Badge className="bg-purple-100 text-purple-600 hover:bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 font-semibold px-3 uppercase text-[10px]">PLANIFIÉ</Badge>;
            case 'termine': return <Badge className="bg-green-100 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 font-semibold px-3 uppercase text-[10px]">TERMINÉ</Badge>;
            case 'archive': return <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 font-semibold px-3 uppercase text-[10px]">ARCHIVÉ</Badge>;
            case 'rejeter': return <Badge className="bg-red-100 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 font-semibold px-3 uppercase text-[10px]">RETARD</Badge>;
            case 'annule': return <Badge className="bg-orange-100 text-orange-600 hover:bg-orange-100 dark:bg-orange-500/10 dark:text-orange-400 font-semibold px-3 uppercase text-[10px]">ANNULÉ</Badge>;
            default: return <Badge variant="outline" className="font-semibold px-3 uppercase text-[10px]">INCONNU</Badge>;
        }
    };

    const progress = getProgress(mission.state);

    // Helper to format float hours
    const formatTime = (time: number | undefined) => {
        if (time === undefined) return '--:--';
        const h = Math.floor(time);
        const m = Math.round((time - h) * 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const getStatusColor = (state: string) => {
        switch (state) {
            case 'en_cours': return 'border-l-blue-500 dark:border-l-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-900/10';
            case 'nouveau': return 'border-l-slate-400 dark:border-l-zinc-500 hover:bg-slate-50 dark:hover:bg-slate-800/50';
            case 'planifie': return 'border-l-purple-500 dark:border-l-purple-500 hover:bg-purple-50/10 dark:hover:bg-purple-900/10';
            case 'termine': return 'border-l-green-500 dark:border-l-green-500 hover:bg-green-50/10 dark:hover:bg-green-900/10';
            case 'archive': return 'border-l-emerald-500 dark:border-l-emerald-500 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/10';
            case 'rejeter': return 'border-l-red-500 dark:border-l-red-500 hover:bg-red-50/10 dark:hover:bg-red-900/10';
            case 'annule': return 'border-l-orange-500 dark:border-l-orange-500 hover:bg-orange-50/10 dark:hover:bg-orange-900/10';
            default: return 'border-l-slate-200 dark:border-l-slate-700';
        }
    };

    const statusColorClass = getStatusColor(mission.state);

    return (
        <Card className={cn(
            "p-0 border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group border-l-[3px]",
            "bg-white dark:bg-zinc-900 dark:border-zinc-800", // Theme colors
            statusColorClass
        )}>
            <div className="flex flex-col md:flex-row md:items-center p-3 gap-3">

                {/* Left Section: Info & Title */}
                <div className="flex-1 min-w-[180px] space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-0 font-mono text-[9px] px-1.5 py-0 rounded-sm">
                            MS-{mission.reference.split('-').pop()}
                        </Badge>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1 group-hover:text-primary transition-colors">
                            {mission.missionnaire || "Mission Sans Titre"}
                        </h3>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground dark:text-zinc-400">
                            <div className="flex items-center gap-1">
                                <User className="h-3 w-3 opacity-70" />
                                <span>{driver ? `${driver.prenom} ${driver.nom}` : "Inconnu"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Truck className="h-3 w-3 opacity-70" />
                                <span>{vehicle ? `${vehicle.marque} ${vehicle.modele}` : "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Section: Route */}
                <div className="flex-[2] flex flex-col justify-center gap-2 px-3 border-l border-r border-slate-100 dark:border-zinc-800 min-h-[50px]">
                    <div className="flex items-center justify-between w-full">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                                <MapPin className="h-2.5 w-2.5" /> DEP
                            </div>
                            <p className="font-semibold text-xs text-slate-900 dark:text-slate-200">{mission.lieuDepart}</p>
                            <div className="text-[10px] text-slate-500 dark:text-slate-500 font-mono">{formatTime(mission.heureDepart)}</div>
                        </div>

                        <div className="flex-1 flex flex-col items-center px-2 hidden md:flex opacity-20 dark:opacity-40">
                            <div className="w-full h-px bg-slate-400 dark:bg-slate-500 relative">
                                <ChevronRight className="absolute -right-1 -top-1.5 h-3 w-3 text-slate-400 dark:text-slate-500" />
                            </div>
                        </div>

                        <div className="space-y-0.5 text-right md:text-left">
                            <div className="flex items-center gap-1 text-[9px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest md:justify-start justify-end">
                                <MapPin className="h-2.5 w-2.5" /> ARR
                            </div>
                            <p className="font-semibold text-xs text-slate-900 dark:text-slate-200">{mission.lieuDestination}</p>
                            <div className="text-[10px] text-slate-500 dark:text-slate-500 font-mono">{formatTime(mission.heureRetour)}</div>
                        </div>
                    </div>

                    {mission.trajet && (
                        <div className="flex items-center gap-1.5 text-[9px] px-2 py-1 bg-blue-50/50 dark:bg-blue-900/10 rounded border border-blue-100/50 dark:border-blue-900/30 text-blue-700 dark:text-blue-400">
                            <Route className="h-3 w-3 opacity-70" />
                            <span className="font-medium truncate">
                                {mission.trajet.startsWith(mission.lieuDepart) ? mission.trajet : `${mission.lieuDepart} --> ${mission.trajet}`}
                            </span>
                        </div>
                    )}
                </div>

                {/* Right Section: Status & Actions */}
                <div className="flex-1 flex flex-col items-end gap-2 min-w-[140px]">
                    <div className="flex items-center justify-between w-full">
                        <div className="scale-[0.85] origin-left">
                            {getStatusBadge(mission.state)}
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[10px]">{progress}%</span>
                    </div>

                    <div className="w-full space-y-1">
                        <Progress value={progress} className="h-1 w-full bg-slate-100 dark:bg-zinc-800" />
                        <p className="text-[8px] text-slate-400 dark:text-zinc-500 font-medium uppercase tracking-wider text-right">
                            {mission.state === 'en_cours' ? 'En cours' : (mission.state === 'termine' || mission.state === 'archive') ? 'Terminé' : 'État'}
                        </p>
                    </div>

                    <div className="flex items-center gap-1 mt-0.5 w-full justify-end">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-full">
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {onEdit && (
                                    <DropdownMenuItem onClick={() => onEdit(mission)} className="text-xs gap-2 cursor-pointer">
                                        <Pencil className="h-3 w-3" /> Modifier
                                    </DropdownMenuItem>
                                )}
                                {onStart && mission.state === 'planifie' && (
                                    <DropdownMenuItem onClick={() => onStart(mission)} className="text-xs gap-2 text-blue-600 focus:text-blue-600 focus:bg-blue-50 dark:focus:bg-blue-900/10 cursor-pointer">
                                        <Play className="h-3 w-3" /> Démarrer
                                    </DropdownMenuItem>
                                )}
                                {onFinish && mission.state === 'en_cours' && (
                                    <DropdownMenuItem onClick={() => onFinish(mission)} className="text-xs gap-2 text-green-600 focus:text-green-600 focus:bg-green-50 dark:focus:bg-green-900/10 cursor-pointer">
                                        <CheckCircle className="h-3 w-3" /> Terminer
                                    </DropdownMenuItem>
                                )}
                                {onDelete && (
                                    <DropdownMenuItem onClick={() => onDelete(mission)} className="text-xs gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/10 cursor-pointer">
                                        <Trash2 className="h-3 w-3" /> Supprimer
                                    </DropdownMenuItem>
                                )}
                                {onCancel && !['annule', 'archive'].includes(mission.state) && (
                                    <DropdownMenuItem onClick={() => onCancel(mission)} className="text-xs gap-2 text-orange-600 focus:text-orange-600 focus:bg-orange-50 dark:focus:bg-orange-900/10 cursor-pointer">
                                        <Ban className="h-3 w-3" /> Annuler
                                    </DropdownMenuItem>
                                )}
                                {!onEdit && !onDelete && !onCancel && !onStart && !onFinish && (
                                    <DropdownMenuItem disabled className="text-xs gap-2 opacity-50">
                                        Aucune action
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {onCR && (
                            <Button
                                onClick={(e) => { e.stopPropagation(); onCR(mission); }}
                                className="bg-purple-600 dark:bg-purple-500 text-white hover:bg-purple-700 dark:hover:bg-purple-600 rounded-full h-7 px-3 text-[10px] font-bold gap-1 animate-in fade-in zoom-in duration-300"
                            >
                                <FileText className="h-2 w-2" /> CR Mission
                            </Button>
                        )}

                        <Button
                            onClick={() => onDetails(mission)}
                            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-full h-7 px-3 text-[10px] font-bold gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                            Détails <ChevronRight className="h-2 w-2" />
                        </Button>
                    </div>
                </div>

            </div>
        </Card>
    );
};
