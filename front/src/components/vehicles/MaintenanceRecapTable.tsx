import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface MaintenanceRecapTableProps {
    vehicleId: string;
}

const months = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export const MaintenanceRecapTable: React.FC<MaintenanceRecapTableProps> = ({ vehicleId }) => {
    const { data: recap, isLoading } = useQuery<Record<string, number[]>>({
        queryKey: ['vehicle-maintenance-recap', vehicleId],
        queryFn: async () => {
            const fleetUser = localStorage.getItem('fiara_user');
            const token = fleetUser ? JSON.parse(fleetUser).token : '';

            const res = await fetch(`http://127.0.0.1:5000/api/vehicles/${vehicleId}/maintenance-recap`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Erreur lors du chargement du récapitulatif');
            return res.json();
        }
    });

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Chargement du récapitulatif...</p>
            </div>
        );
    }

    if (!recap || Object.keys(recap).length === 0) {
        return (
            <div className="text-center p-12 bg-muted/20 rounded-lg border-2 border-dashed text-muted-foreground">
                Aucune donnée d'entretien enregistrée pour ce véhicule.
            </div>
        );
    }

    const years = Object.keys(recap).sort((a, b) => b.localeCompare(a)); // Sort descending

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-primary">Récapitulatif des Coûts d'Entretien (Ar)</h3>
                <p className="text-sm text-muted-foreground italic">Montants mensuels cumulés</p>
            </div>
            <div className="overflow-x-auto rounded-xl border-2 shadow-sm bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-[150px] font-bold text-primary border-r">Mois</TableHead>
                            {years.map(year => (
                                <TableHead key={year} className="text-right font-bold text-primary">{year}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {months.map((month, index) => (
                            <TableRow key={month} className="hover:bg-primary/5 transition-colors">
                                <TableCell className="font-medium border-r">{month}</TableCell>
                                {years.map(year => (
                                    <TableCell key={`${year}-${month}`} className="text-right font-mono">
                                        {recap[year][index] > 0 ? (
                                            <span className="text-foreground font-semibold">
                                                {recap[year][index].toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/30">-</span>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                        <TableRow className="bg-primary/10 font-bold border-t-2">
                            <TableCell className="border-r">TOTAL ANNUEL</TableCell>
                            {years.map(year => {
                                const total = recap[year].reduce((acc, curr) => acc + curr, 0);
                                return (
                                    <TableCell key={`total-${year}`} className="text-right font-mono text-primary text-lg">
                                        {total > 0 ? `${total.toLocaleString()} Ar` : '-'}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};
