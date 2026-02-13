import React, { useState, useEffect } from 'react';
import { Vehicle } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Droplet, Filter, Wind, Fuel, Fan, Disc, Activity, CircleDot, Cog, Thermometer, Car,
    Save, AlertTriangle, CheckCircle2, AlertOctagon, RefreshCw, Search
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PeriodicMaintenanceProps {
    vehicles: Vehicle[];
    onRefresh: () => void;
}

const MAINTENANCE_ITEMS = [
    { key: 'vidange', label: 'Vidange Moteur', icon: Droplet, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { key: 'filtre', label: 'Filtre à huile', icon: Filter, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { key: 'filtre_air', label: 'Filtre à air', icon: Wind, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    { key: 'filtre_carburant', label: 'Filtre à carburant', icon: Fuel, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { key: 'filtre_habitacle', label: 'Filtre habitacle', icon: Fan, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { key: 'freins', label: 'Freins', icon: Disc, color: 'text-red-500', bg: 'bg-red-500/10' },
    { key: 'pneus', label: 'Pneus', icon: CircleDot, color: 'text-slate-500', bg: 'bg-slate-500/10' },
    { key: 'distribution', label: 'Distribution', icon: Cog, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { key: 'liquide_refroidissement', label: 'Liquide Refroidissement', icon: Thermometer, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { key: 'amortisseur', label: 'Amortisseurs', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { key: 'pont', label: 'Pont', icon: Car, color: 'text-zinc-500', bg: 'bg-zinc-500/10' },
] as const;

export const PeriodicMaintenance: React.FC<PeriodicMaintenanceProps> = ({ vehicles, onRefresh }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    // Local state for editing values before save
    const [editValues, setEditValues] = useState<Record<string, any>>({});

    useEffect(() => {
        if (vehicles.length > 0 && !selectedVehicleId) {
            setSelectedVehicleId(vehicles[0].id);
        }
    }, [vehicles]);

    useEffect(() => {
        if (selectedVehicleId) {
            const v = vehicles.find(v => v.id === selectedVehicleId);
            if (v) {
                const initialValues: Record<string, any> = {};
                MAINTENANCE_ITEMS.forEach(item => {
                    initialValues[`${item.key}_interval_km`] = (v as any)[`${item.key}_interval_km`] || 0;
                    initialValues[`last_${item.key}_km`] = (v as any)[`last_${item.key}_km`] || 0;
                });
                setEditValues(initialValues);
            }
        }
    }, [selectedVehicleId, vehicles]);

    const handleSave = async () => {
        if (!selectedVehicleId) return;
        setIsSaving(true);
        try {
            await apiClient.patch(`vehicles/${selectedVehicleId}`, editValues);
            toast.success("Paramètres de maintenance mis à jour", {
                style: { background: '#10b981', color: '#fff', border: 'none' }
            });
            onRefresh();
        } catch (error) {
            toast.error("Erreur lors de la mise à jour");
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setEditValues(prev => ({
            ...prev,
            [key]: parseInt(value) || 0
        }));
    };

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

    // Filter vehicles for the sidebar
    const filteredVehicles = vehicles.filter(v =>
        v.immatriculation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.marque.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!selectedVehicle) return <div className="p-8 text-center text-muted-foreground">Aucun véhicule sélectionné</div>;

    return (
        <div className="flex h-[calc(100vh-200px)] gap-6 animate-in fade-in duration-500">
            {/* Sidebar List */}
            <Card className="w-80 flex flex-col glass-card border-primary/5 shadow-xl h-full">
                <div className="p-4 border-b border-white/5 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher..."
                            className="pl-9 bg-muted/30 border-primary/5"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {filteredVehicles.map(v => (
                            <button
                                key={v.id}
                                onClick={() => setSelectedVehicleId(v.id)}
                                className={cn(
                                    "w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group",
                                    selectedVehicleId === v.id
                                        ? "bg-primary/10 text-primary shadow-inner"
                                        : "hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div>
                                    <div className="font-semibold">{v.immatriculation}</div>
                                    <div className="text-xs opacity-70">{v.marque} {v.modele}</div>
                                </div>
                                {selectedVehicleId === v.id && (
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                )}
                            </button>
                        ))}
                    </div>
                </ScrollArea>
            </Card>

            {/* Main Content */}
            <div className="flex-1 flex flex-col space-y-6 overflow-hidden h-full">
                <Card className="glass-card border-primary/5 shadow-xl flex-shrink-0">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-3">
                                {selectedVehicle.marque} {selectedVehicle.modele}
                                <Badge variant="outline" className="text-lg px-3 py-1 bg-background/50">{selectedVehicle.immatriculation}</Badge>
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                                <Activity className="h-4 w-4" />
                                Kilométrage actuel: <span className="font-mono text-primary font-bold text-lg">{selectedVehicle.kilometrage_actuel.toLocaleString()} km</span>
                            </CardDescription>
                        </div>
                        <Button onClick={handleSave} disabled={isSaving} className="shadow-glow gap-2 bg-primary hover:bg-primary/90">
                            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Enregistrer les changements
                        </Button>
                    </CardHeader>
                </Card>

                <ScrollArea className="flex-1 pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                        {MAINTENANCE_ITEMS.map((item) => {
                            const interval = editValues[`${item.key}_interval_km`] || 0;
                            const lastKm = editValues[`last_${item.key}_km`] || 0;
                            const nextDue = lastKm + interval;
                            const currentKm = selectedVehicle.kilometrage_actuel || 0;
                            const remaining = nextDue - currentKm;
                            const progress = Math.min(100, Math.max(0, ((currentKm - lastKm) / interval) * 100));

                            let statusColor = "bg-primary";
                            let statusText = "Normal";
                            let StatusIcon = CheckCircle2;

                            if (remaining < 0) {
                                statusColor = "bg-destructive";
                                statusText = "Dépassé";
                                StatusIcon = AlertOctagon;
                            } else if (remaining < 1000) {
                                statusColor = "bg-orange-500";
                                statusText = "Bientôt";
                                StatusIcon = AlertTriangle;
                            }

                            return (
                                <Card key={item.key} className={cn("border-l-4 overflow-hidden hover:shadow-lg transition-all border-t-0 border-b-0 border-r-0", item.color.replace('text-', 'border-'))}>
                                    <div className={cn("absolute top-0 right-0 p-2 opacity-5", item.color)}>
                                        <item.icon className="h-24 w-24" />
                                    </div>
                                    <CardHeader className="pb-2 relative">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("p-2 rounded-lg", item.bg)}>
                                                    <item.icon className={cn("h-5 w-5", item.color)} />
                                                </div>
                                                <CardTitle className="text-base font-semibold">{item.label}</CardTitle>
                                            </div>
                                            <Badge variant="outline" className={cn("gap-1", statusColor.replace('bg-', 'text-').replace('500', '600'), "border-current bg-transparent")}>
                                                <StatusIcon className="h-3 w-3" />
                                                {statusText}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4 relative">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Progression</span>
                                                <span className={remaining < 0 ? "text-destructive font-bold" : ""}>
                                                    {remaining < 0 ? `+${Math.abs(remaining).toLocaleString()} km en retard` : `${remaining.toLocaleString()} km restants`}
                                                </span>
                                            </div>
                                            <Progress value={progress} className={cn("h-2", remaining < 0 ? "bg-destructive/20" : "")} indicatorClassName={statusColor} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Intervalle (km)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        className="h-9 px-3 bg-muted/30 border-primary/10 focus:border-primary/30 font-mono text-sm"
                                                        value={interval || ''}
                                                        onChange={(e) => handleChange(`${item.key}_interval_km`, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Dernière à (km)</Label>
                                                <div className="relative">
                                                    <Input
                                                        type="number"
                                                        className="h-9 px-3 bg-muted/30 border-primary/10 focus:border-primary/30 font-mono text-sm"
                                                        value={lastKm || ''}
                                                        onChange={(e) => handleChange(`last_${item.key}_km`, e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
};
