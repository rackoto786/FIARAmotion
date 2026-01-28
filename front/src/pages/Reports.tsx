import React from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Fuel,
  Wrench,
  Car,
  TrendingUp,
  Calendar,
  DollarSign,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from '@/hooks/use-toast';

import { GlobalSummaryTable } from '@/components/reports/GlobalSummaryTable';
import { formatDateFr } from '@/lib/utils';
import { StatsCard } from '@/components/dashboard/StatsCard';

const Reports: React.FC = () => {
  const { data: reportsStats, isLoading } = useQuery({
    queryKey: ['reports-stats'],
    queryFn: async () => (await apiClient.get<any>('/reports/stats')).data
  });

  const summary = reportsStats?.summary || {
    totalVehicles: 0,
    annualFuel: 0,
    maintenanceCount: 0,
    availability: 0
  };

  const costData = reportsStats?.costData || [];
  const maintenanceByTypeData = reportsStats?.maintenanceByType || [];
  const vehicleUsage = reportsStats?.vehicleUsage || [];

  if (isLoading) {
    return <div className="p-8 text-center">Chargement des rapports...</div>;
  }

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text('Rapport Récapitulatif du Parc Auto', 14, 20);

      doc.setFontSize(10);
      doc.text(`Généré le: ${formatDateFr(new Date())}`, 14, 28);

      // Section: KPI Summary
      doc.setFontSize(14);
      doc.text('Indicateurs Clés', 14, 40);
      doc.setFontSize(10);
      doc.text(`Total Véhicules: ${summary.totalVehicles}`, 14, 48);
      doc.text(`Carburant Annuel: ${summary.annualFuel.toLocaleString()} L`, 14, 54);
      doc.text(`Total Entretiens: ${summary.maintenanceCount}`, 14, 60);
      doc.text(`Disponibilité Flotte: ${summary.availability}%`, 14, 66);

      // Section: Costs Table
      doc.setFontSize(14);
      doc.text('Évolution des Coûts Mensuels', 14, 80);

      const tableData = costData.map(d => [
        d.month,
        `${d.cout.toLocaleString()} Ar`,
        `${d.maintenance.toLocaleString()} Ar`,
        `${(d.cout + d.maintenance).toLocaleString()} Ar`
      ]);

      autoTable(doc, {
        head: [['Mois', 'Carburant', 'Maintenance', 'Total']],
        body: tableData,
        startY: 85,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246] }
      });

      // Save PDF
      doc.save(`rapport_recapitulatif_${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Succès",
        description: "Le rapport PDF a été généré.",
        variant: "default",
        className: "bg-green-500 text-white"
      });
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le PDF.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Récapitulatif"
        description="Rapports et analyses"
        icon={FileText}
        actions={
          <div className="flex gap-2">
            <Button variant="default" className="gap-2 shadow-lg hover:shadow-xl transition-all" onClick={exportToPDF}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <div className="hidden">
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Flotte"
          value={summary.totalVehicles.toString()}
          subtitle="Total actifs"
          icon={Car}
          variant="primary"
        />
        <StatsCard
          title="Carburant annuel"
          value={`${summary.annualFuel.toLocaleString()} L`}
          subtitle={new Date().getFullYear().toString()}
          icon={Fuel}
          variant="info"
        />
        <StatsCard
          title="Entretiens"
          value={summary.maintenanceCount.toString()}
          subtitle={`Interventions ${new Date().getFullYear()}`}
          icon={Wrench}
          variant="warning"
        />
        <StatsCard
          title="Disponibilité"
          value={`${summary.availability}%`}
          subtitle="Flotte opérationnelle"
          icon={TrendingUp}
          variant="success"
        />
      </div>

      {/* Global Summary Table */}
      <GlobalSummaryTable />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Évolution des coûts
              </span>
              <Badge variant="muted">{new Date().getFullYear()}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={costData}>
                  <defs>
                    <linearGradient id="colorCout" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMaintenance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} Ar`]}
                  />
                  <Area type="monotone" dataKey="cout" name="Carburant" stroke="hsl(var(--primary))" fill="url(#colorCout)" />
                  <Area type="monotone" dataKey="maintenance" name="Maintenance" stroke="hsl(var(--warning))" fill="url(#colorMaintenance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Coûts de maintenance par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintenanceByTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="type" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} Ar`]}
                  />
                  <Bar dataKey="cout" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Performance Table */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Performance par véhicule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Véhicule</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Missions</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Kilométrage</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Consommation</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Performance</th>
                </tr>
              </thead>
              <tbody>
                {vehicleUsage.map((vehicle: any, index: number) => {
                  const consumption = vehicle.consumption;
                  const performance = Math.round(80 + Math.random() * 20); // Placeholder for actual perf algorithm if needed
                  return (
                    <tr key={vehicle.vehicule} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Car className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{vehicle.vehicule}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 font-mono">{vehicle.missions}</td>
                      <td className="text-right py-3 px-4 font-mono">{vehicle.km.toLocaleString()} km</td>
                      <td className="text-right py-3 px-4 font-mono">{consumption} L/100</td>
                      <td className="text-right py-3 px-4">
                        <Badge variant={performance >= 90 ? 'success' : performance >= 80 ? 'warning' : 'destructive'}>
                          {performance}%
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
