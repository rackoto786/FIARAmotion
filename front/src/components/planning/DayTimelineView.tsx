import React, { useMemo, useEffect, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay, differenceInMinutes, isWithinInterval, addMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Car, Clock, MapPin, User, Check, X, Wrench, Coffee } from 'lucide-react';
import { cn } from "@/lib/utils";

interface DayTimelineViewProps {
    selectedDate: string;
    vehicles: any[];
    planningItems: any[];
    drivers: any[];
    typeConfig?: any;
    onEditClick: (item: any) => void;
    onCellClick: (vehicleId: string, hour: number) => void;
}

export const DayTimelineView: React.FC<DayTimelineViewProps> = ({
    selectedDate,
    vehicles,
    planningItems,
    drivers,
    typeConfig = {},
    onEditClick,
    onCellClick
}) => {
    const [now, setNow] = useState(new Date());

    // Auto-scroll to current time on mount
    useEffect(() => {
        if (selectedDate === format(new Date(), 'yyyy-MM-dd')) {
            const container = document.querySelector('.overflow-x-auto');
            if (container) {
                const minutes = new Date().getHours() * 60 + new Date().getMinutes();
                const percent = minutes / (24 * 60);
                // 13rem (sidebar) + timeline width
                // We want to center the viewport on the time
                // Scroll width approx min-w-[1400px]
                // Let's just scroll to the start for now or try to center
                // A simplified approach:
                const scrollWidth = container.scrollWidth - 208; // 208px is 13rem
                const targetScroll = (scrollWidth * percent) - (container.clientWidth / 2) + 208;
                container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
            }
        }
    }, [selectedDate]); // Run when date changes to today

    useEffect(() => {
        // Update every minute is enough for position, but every second feels more "real-time" if we want seconds precision
        // If we only use minutes for position, 30s or 60s is fine.
        // User asked for "tourner en temps reelle", so 1s check is better.
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayStart = useMemo(() => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        return new Date(y, m - 1, d, 0, 0, 0);
    }, [selectedDate]);
    const dayEnd = useMemo(() => {
        const d = new Date(dayStart);
        d.setHours(23, 59, 59, 999);
        return d;
    }, [dayStart]);

    const currentTimePosition = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        console.log('🕒 Time Indicator Debug:', {
            selectedDate,
            todayStr,
            isMatch: selectedDate === todayStr,
            now: now.toLocaleTimeString(),
            raw: now,
            seconds: now.getSeconds()
        });

        if (selectedDate !== todayStr) return null;

        // Include seconds for smooth movement
        const minutes = now.getHours() * 60 + now.getMinutes() + (now.getSeconds() / 60);
        const pos = (minutes / (24 * 60)) * 100;
        console.log('📍 Calculated Position:', pos);
        return pos;
    }, [now, selectedDate]);

    const getItemStyle = (item: any, laneIndex: number) => {
        const start = parseISO(item.dateDebut);
        const end = parseISO(item.dateFin);

        const displayStart = start < dayStart ? dayStart : start;
        const displayEnd = end > dayEnd ? dayEnd : end;

        if (displayStart >= displayEnd) return null;

        const startMinutes = differenceInMinutes(displayStart, dayStart);
        const endMinutes = differenceInMinutes(displayEnd, dayStart);

        const left = (startMinutes / (24 * 60)) * 100;
        const width = ((endMinutes - startMinutes) / (24 * 60)) * 100;

        // Lane height is 70px (60px item + 10px margin)
        const top = laneIndex * 70 + 8;

        return {
            left: `${left}%`,
            width: `${width}%`,
            top: `${top}px`,
        };
    };

    const getStatusColor = (item: any) => {
        if (item.type === 'maintenance') return {
            bg: "bg-red-500/10",
            border: "border-red-500/50",
            text: "text-red-400",
            glow: "bg-red-500",
            gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0) 100%)"
        };
        if (item.type === 'pause') return {
            bg: "bg-amber-500/10",
            border: "border-amber-500/50",
            text: "text-amber-400",
            glow: "bg-amber-500",
            gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(245, 158, 11, 0) 100%)"
        };

        const isEnCours = item.dateDebut <= new Date().toISOString() && item.dateFin >= new Date().toISOString();
        if (isEnCours) return {
            bg: "bg-emerald-500/30",
            border: "border-emerald-500/50",
            text: "text-emerald-400",
            glow: "bg-emerald-500",
            gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0) 100%)"
        };

        return {
            bg: "bg-sky-500/30",
            border: "border-sky-500/50",
            text: "text-sky-400",
            glow: "bg-sky-500",
            gradient: "linear-gradient(135deg, rgba(14, 165, 233, 0.4) 0%, rgba(14, 165, 233, 0) 100%)"
        };
    };

    const getTypeIcon = (type: string) => {
        const config = typeConfig[type];
        if (config?.icon) {
            const Icon = config.icon;
            return <Icon className="h-3 w-3 shrink-0" />;
        }
        switch (type) {
            case 'maintenance': return <Wrench className="h-3 w-3 shrink-0" />;
            case 'pause': return <Coffee className="h-3 w-3 shrink-0" />;
            default: return null;
        }
    };

    const getLabel = (item: any) => {
        const driver = drivers.find(d => d.id === item.conducteurId);
        const name = driver ? `${driver.prenom} ${driver.nom}` : '';

        const config = typeConfig[item.type];
        const typeLabel = config?.label || item.type;

        if (name) return name;
        return typeLabel;
    };

    // Helper to calculate lanes for a vehicle
    const getLanesMap = useMemo(() => {
        const map = new Map();
        vehicles.forEach(vehicle => {
            const items = planningItems
                .filter(p => {
                    if (String(p.vehiculeId) !== String(vehicle.id)) {
                        return false;
                    }

                    // Use the same robust string-prefix matching as the weekly view
                    const itemStartDate = p.dateDebut.split('T')[0];
                    const itemEndDate = p.dateFin.split('T')[0];

                    // The item is relevant for this date if the date falls within its [start, end] days
                    const isVisibleOnDate = selectedDate >= itemStartDate && selectedDate <= itemEndDate;

                    if (!isVisibleOnDate) {
                        return false;
                    }

                    // Still parse for pixel positioning
                    const itemStart = parseISO(p.dateDebut);
                    const itemEnd = parseISO(p.dateFin);
                    const validDates = !isNaN(itemStart.getTime()) && !isNaN(itemEnd.getTime()) && itemStart < itemEnd;

                    return validDates;
                })
                .sort((a, b) => a.dateDebut.localeCompare(b.dateDebut));

            const lanes: any[][] = [];
            const itemsWithLanes = items.map(item => {
                let laneIndex = lanes.findIndex(lane => {
                    const lastItemInLane = lane[lane.length - 1];
                    // Buffer to avoid sticking
                    return differenceInMinutes(parseISO(item.dateDebut), parseISO(lastItemInLane.dateFin)) >= 0;
                });

                if (laneIndex === -1) {
                    lanes.push([item]);
                    laneIndex = lanes.length - 1;
                } else {
                    lanes[laneIndex].push(item);
                }
                return { ...item, laneIndex };
            });

            map.set(vehicle.id, { itemsWithLanes, totalLanes: Math.max(lanes.length, 1) });
        });
        return map;
    }, [vehicles, planningItems, dayStart, dayEnd]);

    return (
        <div className="flex flex-col w-full bg-[#0B1120] text-slate-300 rounded-xl overflow-hidden shadow-2xl border border-slate-800/50 select-none font-sans">
            {/* Scrollable Container for Header + Grid */}
            <div className="overflow-x-auto custom-scrollbar">
                <div className="min-w-[1400px]">
                    {/* Header with Hours */}
                    <div className="flex border-b border-slate-800/80 bg-[#0F172A]/90 backdrop-blur-md sticky top-0 z-40">
                        <div className="w-52 p-4 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 border-r border-slate-800/80 flex items-center sticky left-0 z-50 bg-[#0F172A]">
                            VÉHICULE
                        </div>
                        <div className="flex-1 flex relative">
                            {hours.map((hour) => (
                                <div key={hour} className="flex-1 text-center py-4 text-[9px] font-bold text-slate-500 border-r border-slate-800/20 last:border-r-0">
                                    {hour.toString().padStart(2, '0')}h
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Grid Body */}
                    <div className="relative bg-[#0B1120] overflow-y-auto max-h-[650px] custom-scrollbar">
                        {/* Wrapper to ensure full height for absolute elements */}
                        <div className="min-h-full relative flex flex-col">
                            {vehicles.map((vehicle) => {
                                const { itemsWithLanes, totalLanes } = getLanesMap.get(vehicle.id) || { itemsWithLanes: [], totalLanes: 1 };
                                const rowHeight = Math.max(totalLanes * 65 + 20, 90);

                                return (
                                    <div key={vehicle.id} className="flex border-b border-slate-800/20 hover:bg-slate-800/5 transition-colors relative" style={{ height: `${rowHeight}px` }}>
                                        {/* Vehicle Info Column (Sticky) */}
                                        <div className="w-52 p-4 border-r border-slate-800/80 flex flex-col justify-center bg-[#0F172A] z-20 shrink-0 sticky left-0 shadow-[4px_0_15px_rgba(0,0,0,0.6)] h-full">
                                            <span className="font-bold text-slate-100 text-xs tracking-tight uppercase">{vehicle.immatriculation || vehicle.matricule}</span>
                                            <span className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-0.5 opacity-60">{vehicle.marque} {vehicle.modele}</span>
                                        </div>

                                        {/* Timeline Row */}
                                        <div className="flex-1 flex relative items-start h-full pt-2">
                                            {/* Hour Grid Lines */}
                                            {hours.map((hour) => (
                                                <div
                                                    key={hour}
                                                    className="flex-1 h-full border-r border-white/5 cursor-pointer hover:bg-sky-500/[0.02] transition-colors"
                                                    onClick={() => onCellClick(vehicle.id, hour)}
                                                />
                                            ))}

                                            {/* Items Container */}
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="relative w-full h-full pointer-events-auto">
                                                    {itemsWithLanes.map((item: any) => {
                                                        const style = getItemStyle(item, item.laneIndex) as any;
                                                        if (!style) return null;
                                                        const config = getStatusColor(item);

                                                        return (
                                                            <div
                                                                key={item.id}
                                                                style={{
                                                                    ...style,
                                                                    height: '45px',
                                                                    background: config.gradient
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEditClick(item);
                                                                }}
                                                                className={cn(
                                                                    "absolute rounded-lg border shadow-lg backdrop-blur-sm flex flex-col justify-center transition-all hover:scale-[1.02] hover:z-30 cursor-pointer overflow-hidden group/item pl-3.5 pr-3",
                                                                    config.bg,
                                                                    config.border
                                                                )}
                                                                title={`Mission: ${item.titre || 'N/A'}\nItinéraire: ${item.lieuDepart || ''} -> ${item.trajet || item.lieuDestination || ''}\nMissionnaire(s): ${item.missionnaire || 'N/A'}\nDescription: ${item.description}`}
                                                            >
                                                                <div className={cn("absolute left-0 top-0 bottom-0 w-[4px] shadow-[2px_0_10px_rgba(0,0,0,0.3)]", config.glow)} />

                                                                <div className="flex items-center gap-2 mb-0.5 overflow-hidden">
                                                                    {getTypeIcon(item.type)}
                                                                    <span className={cn("font-bold text-[11px] truncate tracking-tight uppercase", config.text)}>
                                                                        {getLabel(item)}
                                                                    </span>
                                                                </div>

                                                                <div className="flex items-center gap-1.5 text-[8px] font-bold opacity-50 tracking-wide uppercase overflow-hidden">
                                                                    <span className="shrink-0">{format(parseISO(item.dateDebut), 'HH:mm')}</span>
                                                                    <span className="opacity-30 shrink-0">→</span>
                                                                    <span className="shrink-0">{format(parseISO(item.dateFin), 'HH:mm')}</span>
                                                                    {item.description && (
                                                                        <>
                                                                            <span className="opacity-30 shrink-0 text-[10px]">•</span>
                                                                            <span className="truncate">{item.description}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Current Time Indicator Container */}
                            {currentTimePosition !== null && (
                                <div className="absolute top-0 bottom-0 right-0 left-52 pointer-events-none z-50">
                                    <div
                                        className="absolute top-0 bottom-0 w-[2px] bg-orange-500 shadow-[0_0_15px_#F97316]"
                                        style={{ left: `${currentTimePosition}%` }}
                                    >
                                        {/* Time Badge */}
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-[0_0_10px_#F97316] whitespace-nowrap border border-orange-400">
                                            {format(now, 'HH:mm:ss')}
                                        </div>
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-orange-500 rounded-full shadow-[0_0_15px_#F97316] border-2 border-[#0B1120] z-50" />
                                        <div className="absolute top-0 bottom-0 w-full bg-orange-500/50 blur-[2px]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Legend Footer */}
            <div className="px-8 py-4 bg-[#0F172A] border-t border-slate-800/80 flex items-center gap-8">
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="w-6 h-3 rounded bg-emerald-500/20 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-emerald-400 transition-colors">Mission En cours</span>
                </div>
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="w-6 h-3 rounded bg-sky-500/20 border border-sky-500/50 shadow-[0_0_10px_rgba(14,165,233,0.2)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-sky-400 transition-colors">Planifié</span>
                </div>
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="w-6 h-3 rounded bg-red-500/20 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-red-400 transition-colors">Maintenance</span>
                </div>
                <div className="flex items-center gap-3 group cursor-default">
                    <div className="w-6 h-3 rounded bg-amber-500/20 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-amber-400 transition-colors">Pause</span>
                </div>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #1E293B; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
                @keyframes pulse-glow {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
};
