import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { FuelChart } from '@/components/dashboard/FuelChart';
import { MaintenanceChart } from '@/components/dashboard/MaintenanceChart';
import { VehicleUsageChart } from '@/components/dashboard/VehicleUsageChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PageHeader } from '@/components/common/PageHeader';
import { Car, Users, Wrench, MapPin, Fuel, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch real dashboard stats from API
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:5000/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      return res.json();
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Chargement des statistiques...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="animate-slide-up space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <span className="opacity-70 font-light italic">Bonjour,</span>
          <span className="gradient-text">{user?.name.split(' ')[0]}</span>
          <span className="animate-pulse-glow h-3 w-3 rounded-full bg-primary inline-block ml-1"></span>
        </h1>
        <p className="text-muted-foreground text-sm font-medium opacity-60 tracking-wide uppercase">
          Tableau de bord FIARAmotion • {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Primary KPI Section */}
      <section className="space-y-4 animate-slide-up [animation-delay:100ms]">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/70">Statistiques Vitales</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent mx-4"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            title="Véhicules"
            value={stats.totalVehicules}
            subtitle={`${stats.vehiculesEnService} en service`}
            icon={Car}
            variant="primary"
          />
          <StatsCard
            title="Chauffeurs"
            value={stats.totalChauffeurs}
            subtitle={`${stats.chauffeursActifs} actifs`}
            icon={Users}
            variant="info"
          />
          <StatsCard
            title="Entretien"
            value={stats.entretiensEnAttente}
            subtitle="Demandes en attente"
            icon={Wrench}
            variant="warning"
          />
          <StatsCard
            title="Missions"
            value={stats.missionsEnCours}
            subtitle="En cours"
            icon={MapPin}
            variant="success"
          />
        </div>
      </section>

      {/* Secondary Performance Section */}
      <section className="animate-slide-up [animation-delay:200ms]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            title="Maintenance"
            value={stats.vehiculesEnMaintenance}
            subtitle="Unités immobilisées"
            icon={AlertTriangle}
            variant="warning"
            className="bg-warning/5"
          />
          <StatsCard
            title="Consommation"
            value={`${stats.consommationMoyenne}`}
            subtitle="L/100km Moy. Globale"
            icon={Fuel}
            variant="info"
            className="bg-info/5"
          />
          <StatsCard
            title="Disponibilité"
            value={`${Math.round((stats.vehiculesEnService / stats.totalVehicules) * 100)}%`}
            subtitle="Flotte opérationnelle"
            icon={CheckCircle}
            variant="success"
            className="bg-success/5"
          />
          <StatsCard
            title="Utilisation"
            value={`${Math.round((stats.missionsEnCours / (stats.vehiculesEnService || 1)) * 100)}%`}
            subtitle="Rendement missions"
            icon={TrendingUp}
            variant="primary"
            className="bg-primary/5"
          />
        </div>
      </section>

      {/* Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up [animation-delay:300ms]">
        <Card variant="glass" className="border-primary/5 overflow-hidden">
          <CardHeader className="border-b border-primary/5 bg-primary/5 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Fuel className="h-4 w-4 text-primary" />
              Analyse Carburant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <FuelChart data={stats.fuelByMonth} />
          </CardContent>
        </Card>

        <Card variant="glass" className="border-info/5 overflow-hidden">
          <CardHeader className="border-b border-info/5 bg-info/5 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wrench className="h-4 w-4 text-info" />
              Répartition Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <MaintenanceChart data={stats.maintenanceByType} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up [animation-delay:400ms]">
        <div className="lg:col-span-8">
          <Card variant="glass" className="border-primary/5 overflow-hidden h-full">
            <CardHeader className="border-b border-primary/5 bg-primary/5 pb-4">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Car className="h-4 w-4 text-primary" />
                Utilisation par Véhicule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <VehicleUsageChart data={stats.vehicleUsage} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-4 space-y-8">
          <ComplianceAlerts />
          <div className="animate-slide-up [animation-delay:500ms]">
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
};

const ComplianceAlerts: React.FC = () => {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['complianceAlerts'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:5000/api/compliance/alerts', {
        headers: {
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('fiara_user') || '{}').token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch compliance alerts');
      const data = await res.json();
      return data;
    },
  });

  if (isLoading || !alerts) return null;

  return (
    <Card variant="glass" className="border-warning/10 overflow-hidden shadow-lg shadow-warning/5 animate-scale-in">
      <CardHeader className="bg-warning/5 border-b border-warning/10 pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-warning">
          <div className="p-1.5 rounded-lg bg-warning/20">
            <AlertTriangle className="h-4 w-4" />
          </div>
          Alertes Échéances
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-auto h-5 px-1.5 min-w-[20px] justify-center animate-pulse-glow">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {alerts.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-semibold">Tout est en règle</p>
            <p className="text-xs text-muted-foreground">Aucune échéance immédiate détectée.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/40">
              {alerts.slice(0, 4).map((alert: any) => (
                <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Car className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold tracking-tight">{alert.vehicule_immatriculation}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                        {alert.type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={alert.daysRemaining <= 7 ? "destructive" : "warning"}
                      className="h-5 px-2 text-[10px] font-bold rounded-md">
                      {alert.daysRemaining <= 0 ? 'Expiré' : `${alert.daysRemaining}j restants`}
                    </Badge>
                    <p className="text-[10px] font-medium text-muted-foreground mt-1">
                      {format(new Date(alert.dateExpiration), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 text-center bg-muted/5 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs font-bold text-muted-foreground hover:text-primary group"
                onClick={() => window.location.href = '/compliance'}
              >
                Gérer toutes les échéances
                <TrendingUp className="h-3 w-3 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Dashboard;
