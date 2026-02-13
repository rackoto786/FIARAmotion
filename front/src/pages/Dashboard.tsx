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
import { Clock } from 'lucide-react';
import { fr } from 'date-fns/locale';
import { apiClient } from '@/lib/api';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  // Fetch real dashboard stats from API
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/dashboard/stats');
      return res.data;
    },
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-8 pb-8 animate-pulse">
        <div className="space-y-4">
          <div className="h-10 w-64 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-zinc-800 rounded-lg opacity-50" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-zinc-800 rounded-3xl" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 bg-slate-200 dark:bg-zinc-800 rounded-3xl" />
          <div className="h-80 bg-slate-200 dark:bg-zinc-800 rounded-3xl" />
        </div>
      </div>
    );
  }

  const renderKPIs = () => {
    if (stats.role === 'driver') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            title="Mon Véhicule"
            value={stats.myVehicle}
            subtitle={stats.vehicleStatus}
            icon={Car}
            variant="primary"
          />
          <StatsCard
            title="Missions En Cours"
            value={stats.activeMissions}
            subtitle="Actuellement"
            icon={MapPin}
            variant="success"
          />
          <StatsCard
            title="Missions Planifiées"
            value={stats.upcomingMissions}
            subtitle="À venir"
            icon={TrendingUp}
            variant="info"
          />
          <StatsCard
            title="Ma Consommation"
            value={`${stats.avgConsumption} L`}
            subtitle="Moyenne / 100km"
            icon={Fuel}
            variant="warning"
          />
        </div>
      );
    } else if (stats.role === 'collaborator') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatsCard
            title="Mes Missions"
            value={stats.totalMissions}
            subtitle="Total créées"
            icon={Car}
            variant="primary"
          />
          <StatsCard
            title="En Attente"
            value={stats.pendingMissions}
            subtitle="Missions non validées"
            icon={AlertTriangle}
            variant="warning"
          />
          <StatsCard
            title="En Cours"
            value={stats.activeMissions}
            subtitle="Missions actives"
            icon={MapPin}
            variant="success"
          />
          <StatsCard
            title="Mes Demandes"
            value={stats.totalRequests}
            subtitle={`${stats.pendingRequests} en attente`}
            icon={Wrench}
            variant="info"
          />
        </div>
      );
    } else {
      // Admin / Tech / Direction (Default)
      return (
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
      );
    }
  };

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
        {renderKPIs()}
      </section>

      {/* Secondary Performance Section (Only for Admins/Techs roughly, or keep for all but simpler?) 
          Let's hide specific secondary stats for driver/collab if they don't make sense, 
          or keep them if they are general. 
          For now, 'Maintenance' and 'Consommation' global stats might distract drivers/collabs.
          Let's conditionally render Secondary Section too.
      */}
      {(!stats.role || stats.role === 'admin') && (
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
      )}

      {/* Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up [animation-delay:300ms]">
        <Card variant="glass" className="vision-card-primary overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Fuel className="h-4 w-4 text-primary" />
              Analyse Carburant
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <FuelChart data={stats.fuelByMonth} />
          </CardContent>
        </Card>

        <Card variant="glass" className="vision-card-info overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-white/5 pb-4">
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
          <Card variant="glass" className="vision-card-success overflow-hidden h-full">
            <CardHeader className="border-b border-white/5 bg-white/5 pb-4">
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
          {stats.role === 'admin' && (
            <OnlineUsersCard />
          )}
        </div>
      </div>
    </div>
  );
};

const OnlineUsersCard: React.FC = () => {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['usersOnline'],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/users');
      return res.data;
    },
    refetchInterval: 60000,
  });

  const onlineUsers = (users || []).filter((u: any) => u.isOnline);

  return (
    <Card variant="glass" className="border-primary/5 overflow-hidden animate-slide-up">
      <CardHeader className="border-b border-primary/5 bg-primary/5 pb-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <div className="p-1 rounded-lg bg-primary/20">
            <Clock className="h-4 w-4 text-primary" />
          </div>
          Utilisateurs en ligne
          <Badge className="ml-auto h-5 px-2 text-[10px]">{onlineUsers.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Chargement...</div>
        ) : onlineUsers.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun utilisateur en ligne.</div>
        ) : (
          <div className="space-y-2">
            {onlineUsers.slice(0, 6).map((u: any) => (
              <div key={u.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-sm font-bold">
                  {u.name ? u.name.split(' ').map((n: string) => n[0]).join('') : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground">Actif {format(new Date(u.lastLogin), 'dd/MM/yyyy HH:mm', { locale: fr })}</div>
                </div>
                <Badge variant="success" className="h-6">En ligne</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ComplianceAlerts: React.FC = () => {
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['complianceAlerts'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/compliance/alerts');
      return res.data;
    },
  });

  if (isLoading || !alerts) return null;

  return (
    <Card variant="glass" className="vision-card-warning overflow-hidden shadow-lg shadow-warning/5 animate-scale-in">
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
