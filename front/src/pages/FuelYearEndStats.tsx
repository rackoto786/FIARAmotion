import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { TrendingUp, Calendar, Car, Download, ArrowLeft, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { Input } from '@/components/ui/input';

interface MonthlyData {
    month: number;
    forecast: number;
    consumed: number;
    balance: number;
    date: string | null;
    exceeded: boolean;
}

interface VehicleBudgetData {
    vehicle_id: string;
    immatriculation: string;
    marque: string;
    monthly_data: MonthlyData[];
    last_balance: number;
    overrun_months: number;
}

interface YearEndResponse {
    year: number;
    vehicles_data: VehicleBudgetData[];
    grand_total_forecast: number;
    grand_total_consumed: number;
    grand_total_balance: number;
    total_overruns: number;
}

// Editable forecast cell component
const EditableForecast: React.FC<{
    value: number;
    vehicleId: string;
    year: number;
    month: number;
    onUpdate: () => void;
}> = ({ value, vehicleId, year, month, onUpdate }) => {
    const [editing, setEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value.toString());

    const saveMutation = useMutation({
        mutationFn: async (newValue: number) => {
            await apiClient.post('/fuel/budgets', {
                vehicle_id: vehicleId,
                year,
                month,
                forecast_amount: newValue
            });
        },
        onSuccess: () => {
            setEditing(false);
            onUpdate();
        }
    });

    const handleSave = () => {
        const numValue = parseFloat(tempValue);
        if (isNaN(numValue) || numValue < 0) {
            return;
        }
        saveMutation.mutate(numValue);
    };

    const handleCancel = () => {
        setTempValue(value.toString());
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="absolute z-50 left-0 top-0 w-[260px] bg-background shadow-lg rounded-md border p-1.5 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100 ring-2 ring-primary/10">
                <Input
                    type="number"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="h-8 text-sm flex-1 font-medium"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') handleCancel();
                    }}
                />
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200 hover:text-green-800 rounded-md"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleSave}
                >
                    <Check className="h-4 w-4" />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 rounded-md"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCancel}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div
            className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 rounded px-2 py-1 group"
            onClick={() => setEditing(true)}
        >
            <span className="text-sm">{value > 0 ? value.toLocaleString() : '—'}</span>
            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

const FuelYearEndStats: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const { data: yearEndData, isLoading } = useQuery<YearEndResponse>({
        queryKey: ['yearEndBalanceWithBudgets', selectedYear],
        queryFn: async () => {
            const response = await apiClient.get<YearEndResponse>(`/fuel/year-end-balance-with-budgets?year=${selectedYear}`);
            return response.data;
        },
    });

    const handleBudgetUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['yearEndBalanceWithBudgets', selectedYear] });
    };

    const exportToExcel = () => {
        if (!yearEndData) return;

        const wsData = [
            ['Suivi Budget Carburant - Année ' + selectedYear],
            [''],
            ['Véhicule', 'Immatriculation', 'Marque',
                ...(['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].flatMap(m => [
                    `${m} Prév`, `${m} Cons`
                ])),
                'Solde Fin Année'
            ]
        ];

        yearEndData.vehicles_data.forEach((v: any) => {
            const row = [
                v.immatriculation,
                v.immatriculation,
                v.marque,
            ];

            for (let m = 1; m <= 12; m++) {
                const monthData = v.monthly_data.find((md: any) => md.month === m);
                row.push(monthData?.forecast || 0);
                row.push(monthData?.consumed || 0);
            }

            row.push(v.last_balance);
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Budgets");
        XLSX.writeFile(wb, `Budget_Carburant_${selectedYear}.xlsx`);
    };

    const months = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
        'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
    ];

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-border/50">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/fuel')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <PageHeader
                        title="Suivi Budgétaire Carburant"
                        description="Prévision vs consommation réelle par véhicule"
                        icon={TrendingUp}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-background/50 p-1 pr-3 rounded-lg border border-border/50">
                        <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
                        <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                            <SelectTrigger className="w-32 border-none h-8 bg-transparent focus:ring-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={exportToExcel} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Exporter
                    </Button>
                </div>
            </div>

            {isLoading && (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {yearEndData && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-primary/80 uppercase tracking-wider">Budget Total Prévu</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-primary">{yearEndData.grand_total_forecast?.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">Ar</span></div>
                                <p className="text-xs text-muted-foreground mt-1">Somme des prévisions {selectedYear}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-blue-600/80 uppercase tracking-wider">Montant Consommé</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-blue-600">{yearEndData.grand_total_consumed?.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">Ar</span></div>
                                <p className="text-xs text-muted-foreground mt-1">Total des achats carburant</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-green-600/80 uppercase tracking-wider">Solde Restant</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-green-600">{yearEndData.grand_total_balance?.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">Ar</span></div>
                                <p className="text-xs text-muted-foreground mt-1">Toutes cartes confondues</p>
                            </CardContent>
                        </Card>

                        <Card className={cn(
                            "border-2",
                            yearEndData.total_overruns > 0
                                ? "bg-gradient-to-br from-red-500/10 to-red-500/20 border-red-500/30"
                                : "bg-gradient-to-br from-gray-500/5 to-gray-500/10 border-gray-500/20"
                        )}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
                                    {yearEndData.total_overruns > 0 && <AlertTriangle className="h-4 w-4 text-red-600" />}
                                    Dépassements
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={cn(
                                    "text-3xl font-black",
                                    yearEndData.total_overruns > 0 ? "text-red-600" : "text-gray-600"
                                )}>
                                    {yearEndData.total_overruns}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {yearEndData.total_overruns > 0 ? "Mois en dépassement" : "Aucun dépassement"}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Table */}
                    <Card className="shadow-xl border-primary/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Car className="h-5 w-5" />
                                Tableau Comparatif - Prévision vs Consommé
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="w-full">
                                <div className="min-w-max">
                                    <table className="w-full border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="sticky left-0 z-40 bg-background/95 backdrop-blur-sm p-4 text-left font-black uppercase text-xs tracking-wider text-primary w-[160px] min-w-[160px] border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                    Véhicule
                                                </th>
                                                {months.map((month, idx) => (
                                                    <th key={idx} className="border-r border-border min-w-[200px] w-[200px]">
                                                        <div className="font-black uppercase text-xs tracking-wider text-center p-2 bg-muted/20 border-b border-border/50">
                                                            {month.toUpperCase()}
                                                        </div>
                                                        <div className="grid grid-cols-2">
                                                            <div className="p-2 text-center text-[10px] font-bold text-blue-600 border-r border-border/50 bg-blue-50/30">
                                                                PRÉV.
                                                            </div>
                                                            <div className="p-2 text-center text-[10px] font-bold text-green-600 bg-green-50/30">
                                                                CONS.
                                                            </div>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="sticky right-0 z-40 bg-background/95 p-4 text-right font-black uppercase text-xs tracking-wider text-primary border-l border-border shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] min-w-[140px]">
                                                    Solde Fin d'Année
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearEndData.vehicles_data.map((vehicle, idx) => (
                                                <tr
                                                    key={vehicle.vehicle_id}
                                                    className={cn(
                                                        "border-b border-border hover:bg-muted/30 transition-colors",
                                                        vehicle.overrun_months > 0 && "bg-red-50/10"
                                                    )}
                                                >
                                                    <td className="sticky left-0 z-30 bg-background/95 backdrop-blur-sm p-4 border-r border-border shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                        <div className="font-semibold text-foreground">{vehicle.immatriculation}</div>
                                                        <div className="text-xs text-muted-foreground">{vehicle.marque}</div>
                                                        {vehicle.overrun_months > 0 && (
                                                            <div className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                                                                <AlertTriangle className="h-3 w-3" />
                                                                {vehicle.overrun_months} mois avertis
                                                            </div>
                                                        )}
                                                    </td>
                                                    {months.map((_, monthIdx) => {
                                                        const monthData = vehicle.monthly_data.find(m => m.month === monthIdx + 1);
                                                        const forecast = monthData?.forecast || 0;
                                                        const consumed = monthData?.consumed || 0;
                                                        const exceeded = monthData?.exceeded || false;

                                                        return (
                                                            <td key={monthIdx} className="p-0 border-r border-border h-[60px]">
                                                                <div className="grid grid-cols-2 h-full">
                                                                    <div className={cn(
                                                                        "flex items-center justify-center p-1 border-r border-border/50 transition-colors h-full relative",
                                                                        "hover:bg-muted/50 cursor-pointer"
                                                                    )}>
                                                                        <EditableForecast
                                                                            value={forecast}
                                                                            vehicleId={vehicle.vehicle_id}
                                                                            year={selectedYear}
                                                                            month={monthIdx + 1}
                                                                            onUpdate={handleBudgetUpdate}
                                                                        />
                                                                    </div>
                                                                    <div className={cn(
                                                                        "flex items-center justify-center p-1 h-full text-xs transition-colors",
                                                                        consumed > 0 && "font-medium",
                                                                        exceeded && "bg-red-100/50 text-red-700 font-bold"
                                                                    )}>
                                                                        {consumed > 0 ? consumed.toLocaleString() : '—'}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="sticky right-0 z-30 bg-background/95 p-4 text-right border-l border-border shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                                        <div className="font-bold text-lg text-primary">
                                                            {vehicle.last_balance?.toLocaleString() || 0} Ar
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <div className="text-xs text-muted-foreground text-center italic space-y-1">
                        <p>* <strong>Prév</strong> = Budget prévisionnel (cliquez pour modifier)</p>
                        <p>* <strong>Cons</strong> = Montant total acheté dans le mois</p>
                        <p>* Les cellules en rouge indiquent un dépassement budgétaire</p>
                    </div>
                </>
            )}
        </div>
    );
};

export default FuelYearEndStats;
