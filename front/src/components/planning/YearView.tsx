import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { typeConfig } from '@/pages/Planning'; // We might need to export this from Planning.tsx or move to a config file

interface YearViewProps {
    year: number;
    planningItems: any[];
    vehicles: any[];
    drivers: any[];
    onMonthClick?: (month: number) => void;
    driverFilter?: string | null;
}

const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const YearView: React.FC<YearViewProps> = ({
    year,
    planningItems,
    onMonthClick,
    driverFilter
}) => {

    // Group planning by month
    const itemsByMonth = MONTHS.map((_, index) => {
        return planningItems.filter(item => {
            const d = new Date(item.dateDebut);
            return d.getFullYear() === year && d.getMonth() === index &&
                (!driverFilter || item.conducteurId === driverFilter);
        });
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {MONTHS.map((month, index) => {
                const items = itemsByMonth[index];
                const maintenanceCount = items.filter(i => i.type === 'maintenance').length;
                const reservationCount = items.length - maintenanceCount;

                return (
                    <Card key={month} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onMonthClick?.(index)}>
                        <CardHeader className="p-4 pb-2">
                            <CardTitle className="text-lg flex justify-between items-center">
                                {month}
                                <Badge variant="outline">{items.length}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between">
                                    <span>Réservations:</span>
                                    <span className="font-medium text-foreground">{reservationCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Maintenance:</span>
                                    <span className="font-medium text-foreground">{maintenanceCount}</span>
                                </div>

                                {/* Visual mini-heatmap or bars could go here */}
                                <div className="h-2 w-full bg-secondary rounded-full mt-2 overflow-hidden flex">
                                    <div className="h-full bg-emerald-500 opacity-80" style={{ width: `${(reservationCount / Math.max(items.length, 1)) * 100}%` }} />
                                    <div className="h-full bg-amber-500 opacity-80" style={{ width: `${(maintenanceCount / Math.max(items.length, 1)) * 100}%` }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};
