import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { formatDateFr, formatCurrency } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

// Interface matching the backend response
interface GlobalSummaryRow {
    id: string;
    immatriculation: string;
    type_vehicule: string;
    marque: string;
    annee_mise_circulation: string | null;
    statut: string;
    valeur_acquisition: number;
    annee_acquisition: number | null;
    anciennete: string;

    // Dynamic cost keys: cost_2018, cost_2019, etc.
    [key: `cost_${number}`]: number;

    monthly_details: {
        [year: string]: {
            [month: string]: number;
        };
    };

    total_maintenance: number;
    total_fuel: number;
    total_global: number;
}

export const GlobalSummaryTable: React.FC = () => {
    const [expandedYears, setExpandedYears] = React.useState<number[]>([]);

    const toggleYear = (year: number) => {
        setExpandedYears(prev =>
            prev.includes(year)
                ? prev.filter(y => y !== year)
                : [...prev, year]
        );
    };

    const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const currentYear = new Date().getFullYear();
    const validYears = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => 2018 + i);

    const { data: rows = [], isLoading } = useQuery<GlobalSummaryRow[]>({
        queryKey: ['global-summary'],
        queryFn: async () => {
            const fleetUser = localStorage.getItem('fiara_user');
            const token = fleetUser ? JSON.parse(fleetUser).token : '';

            const res = await fetch('http://127.0.0.1:5000/api/reports/global_summary', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error('Erreur chargement rapport');
            return res.json();
        }
    });

    const exportToExcel = () => {
        // Prep data for export (flatten/translate headers if needed)
        const ws = XLSX.utils.json_to_sheet(rows.map(r => ({
            "Immatriculation": r.immatriculation,
            "Type": r.type_vehicule,
            "Marque": r.marque,
            "Mise en circulation": r.annee_mise_circulation ? formatDateFr(r.annee_mise_circulation) : '',
            "Statut": r.statut,
            "Valeur Acquisition": r.valeur_acquisition,
            "Année Acquisition": r.annee_acquisition,
            "Ancienneté": r.anciennete,
            ...validYears.reduce((acc, year) => ({
                ...acc,
                [year.toString()]: r[`cost_${year}`] || 0
            }), {}),
            "Coût Total Maintenance": r.total_maintenance,
            "Coût Total Carburant": r.total_fuel,
            "Coût Global": r.total_global
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Recapitulatif");
        XLSX.writeFile(wb, "recapitulatif_flotte.xlsx");
    };

    if (isLoading) return <div className="p-4 text-center">Chargement du rapport...</div>;

    return (
        <Card className="col-span-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Récapitulatif Global de la Flotte
                </CardTitle>
                <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
                    <Download className="h-4 w-4" />
                    Excel
                </Button>
            </CardHeader>
            <CardContent>
                <ScrollArea className="w-full whitespace-nowrap rounded-md border max-h-[700px]">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="min-w-[120px]">Immatriculation</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="min-w-[150px]">Marque / Modèle</TableHead>
                                <TableHead>Année MEC</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Val. Acqu.</TableHead>
                                <TableHead>Année Acqu.</TableHead>
                                <TableHead className="min-w-[100px]">Ancienneté</TableHead>

                                {validYears.map(year => (
                                    expandedYears.includes(year) ? (
                                        <React.Fragment key={year}>
                                            {monthNames.map((month, idx) => (
                                                <TableHead key={`${year}-${idx}`} className="text-center bg-primary/5 text-xs px-1 min-w-[50px]">{month}</TableHead>
                                            ))}
                                            <TableHead className="text-right bg-primary/10 font-bold min-w-[100px]">
                                                <div className="flex items-center justify-end gap-1">
                                                    TOT {year}
                                                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => toggleYear(year)}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </TableHead>
                                        </React.Fragment>
                                    ) : (
                                        <TableHead key={year} className="text-right bg-primary/5 font-semibold min-w-[100px]">
                                            <div className="flex items-center justify-end gap-1">
                                                {year}
                                                <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => toggleYear(year)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableHead>
                                    )
                                ))}

                                <TableHead className="text-right font-bold min-w-[120px] bg-warning/10">Total Maint.</TableHead>
                                <TableHead className="text-right font-bold min-w-[120px] bg-blue-500/10">Total Carb.</TableHead>
                                <TableHead className="text-right font-bold min-w-[140px] bg-green-500/10">Coût Global</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-muted/50">
                                    <TableCell className="font-medium">{row.immatriculation}</TableCell>
                                    <TableCell className="capitalize">{row.type_vehicule}</TableCell>
                                    <TableCell>{row.marque}</TableCell>
                                    <TableCell>{row.annee_mise_circulation ? new Date(row.annee_mise_circulation).getFullYear() : '-'}</TableCell>
                                    <TableCell><StatusBadge status={row.statut} /></TableCell>
                                    <TableCell className="text-right font-mono">{formatCurrency(row.valeur_acquisition)}</TableCell>
                                    <TableCell>{row.annee_acquisition || '-'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{row.anciennete}</TableCell>

                                    {validYears.map(year => {
                                        const totalKey = `cost_${year}`;
                                        const totalValue = (row as any)[totalKey] || 0;

                                        if (expandedYears.includes(year)) {
                                            return (
                                                <React.Fragment key={year}>
                                                    {monthNames.map((_, idx) => {
                                                        const monthNum = idx + 1;
                                                        const monthVal = row.monthly_details?.[year]?.[monthNum] || 0;
                                                        return (
                                                            <TableCell key={`${year}-${idx}`} className="text-right font-mono text-xs bg-muted/20 px-1">
                                                                {monthVal > 0 ? (monthVal / 1000).toFixed(0) + 'k' : '-'}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell className="text-right font-mono text-sm bg-primary/10 font-bold">
                                                        {totalValue > 0 ? formatCurrency(totalValue) : '-'}
                                                    </TableCell>
                                                </React.Fragment>
                                            );
                                        } else {
                                            return (
                                                <TableCell key={year} className="text-right font-mono text-sm bg-primary/5">
                                                    {totalValue > 0 ? formatCurrency(totalValue) : '-'}
                                                </TableCell>
                                            );
                                        }
                                    })}

                                    <TableCell className="text-right font-mono font-bold bg-warning/10">{formatCurrency(row.total_maintenance)}</TableCell>
                                    <TableCell className="text-right font-mono font-bold bg-blue-500/10">{formatCurrency(row.total_fuel)}</TableCell>
                                    <TableCell className="text-right font-mono font-bold bg-green-500/10 text-primary">{formatCurrency(row.total_global)}</TableCell>
                                </TableRow>
                            ))}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={17} className="text-center py-8 text-muted-foreground">
                                        Aucune donnée disponible.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" className="z-20 h-2.5 bg-blue-500/10 hover:bg-blue-500/20 transition-colors" />
                </ScrollArea>
            </CardContent>
        </Card>
    );
};
