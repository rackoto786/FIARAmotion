import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";

interface MonthViewProps {
    currentDate: string; // ISO date string
    planningItems: any[];
    onDateClick: (date: string) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
    currentDate,
    planningItems,
    onDateClick,
    onPrevMonth,
    onNextMonth
}) => {
    const date = new Date(currentDate);
    const year = date.getFullYear();
    const month = date.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Days in month
    const daysInMonth = lastDay.getDate();

    // Day of week of the first day (0-6, rearrange for Monday start if needed)
    // Standard JS getDay() returns 0 for Sunday. Let's adjust for Monday start = 0
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Sunday becomes 6

    // Generate calendar grid cells
    const days = [];

    // Empty cells for previous month padding
    for (let i = 0; i < startDayOfWeek; i++) {
        days.push(null);
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }

    const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    const getItemsForDate = (d: Date) => {
        return planningItems
            .filter(item => {
                const start = new Date(item.dateDebut);
                const end = new Date(item.dateFin);
                // Simple check: if date falls within range (ignoring time for this high-level view)
                // Reset times for accurate date comparison
                const check = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
                const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                return check >= s && check <= e;
            })
            .sort((a, b) => {
                const pA = a.priorite || 3;
                const pB = b.priorite || 3;
                if (pA !== pB) return pA - pB;
                return new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime();
            });
    };

    return (
        <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="text-lg font-bold capitalize">
                    {date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </div>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={onPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {weekDays.map(d => (
                        <div key={d} className="text-xs font-semibold text-muted-foreground py-1">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 auto-rows-fr">
                    {days.map((day, idx) => {
                        if (!day) return <div key={`empty-${idx}`} className="h-24 bg-secondary/10 rounded-md" />;

                        const items = getItemsForDate(day);
                        const isToday = day.toDateString() === new Date().toDateString();
                        const formattedDate = day.toLocaleDateString('fr-CA'); // YYYY-MM-DD

                        return (
                            <div
                                key={formattedDate}
                                className={`h-24 p-1 border rounded-md transition-colors hover:bg-muted/50 cursor-pointer flex flex-col gap-1 ${isToday ? 'border-primary bg-primary/5' : 'border-border/50'
                                    }`}
                                onClick={() => onDateClick(formattedDate)}
                            >
                                <span className={`text-xs ml-auto font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                                    {day.getDate()}
                                </span>

                                <div className="flex flex-col gap-1 overflow-hidden mt-1">
                                    {items.map((item, i) => (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "h-2.5 w-full rounded shadow-sm border-l-2 relative overflow-hidden",
                                                item.status === 'acceptee' ? 'bg-emerald-500 border-emerald-700' :
                                                    item.status === 'en_attente' ? 'bg-amber-500 border-amber-700' :
                                                        item.status === 'rejetee' ? 'bg-rose-500 border-rose-700' :
                                                            'bg-slate-500 border-slate-700'
                                            )}
                                            style={item.status === 'en_attente' ? {
                                                backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.2) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 75%, transparent 75%, transparent)',
                                                backgroundSize: '8px 8px'
                                            } : {}}
                                            title={`${item.status.toUpperCase()}: ${item.type}: ${item.description}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
