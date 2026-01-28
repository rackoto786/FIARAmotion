import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockActionLogs } from '@/data/mockData'; // Kept for Logs tab for now, or could fetch real logs too if endpoint exists
import { ROLE_LABELS, UserRole, User } from '@/types';
import {
  Settings as SettingsIcon,
  Users,
  Shield,
  Bell,
  Database,
  Activity,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Filter,
  X,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { userService } from '@/services/users';
import { logsService, Log } from '@/services/logs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

import { EditUserDialog } from '@/components/users/EditUserDialog';
import { differenceInHours } from 'date-fns';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error('Accès refusé. Cette page est réservée aux administrateurs.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Logs state
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilters, setLogFilters] = useState({ start: '', end: '', startHour: '', endHour: '', userId: '' });

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await logsService.getAll({
        startDate: logFilters.start ? new Date(logFilters.start).toISOString() : undefined,
        endDate: logFilters.end ? new Date(logFilters.end).toISOString() : undefined,
        startHour: logFilters.startHour || undefined,
        endHour: logFilters.endHour || undefined,
        userId: logFilters.userId || undefined
      });
      setLogs(data);
    } catch (error) {
      console.error("Failed to fetch logs", error);
      toast.error("Erreur lors du chargement des logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [logFilters]);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');

  const filteredUsers = users.filter(user => {
    if (statusFilter !== 'all' && user.status !== statusFilter) return false;
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    return true;
  });

  const roleBadgeVariants: Record<UserRole, 'default' | 'secondary' | 'destructive' | 'outline' | 'glow'> = {
    admin: 'glow',
    technician: 'default',
    driver: 'secondary',
    direction: 'outline',
    collaborator: 'secondary',
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getAll();
      setUsers(data);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Erreur lors du chargement des utilisateurs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) return;
    try {
      await userService.delete(id);
      toast.success("Utilisateur supprimé");
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const isNewUser = (dateString: string) => {
    // Logic changed: New users are those with status 'pending'
    // Old logic: return differenceInHours(new Date(), new Date(dateString)) < 24;
    return false;
  };

  const pendingUsers = users.filter(u => u.status === 'pending');
  const pendingUsersCount = pendingUsers.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Configuration du système"
        icon={SettingsIcon}
      />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="users" className="gap-2 relative">
            <Users className="h-4 w-4" />
            Utilisateurs
            {pendingUsersCount > 0 && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Rôles
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Gestion des utilisateurs</CardTitle>
                <CardDescription>Gérez les comptes utilisateurs du système</CardDescription>
              </div>
              <Button className="gap-2" onClick={() => window.location.href = '/register'}>
                <Plus className="h-4 w-4" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn(
                      "rounded-full border-primary/10 gap-2 px-4 h-10",
                      (statusFilter !== 'all' || roleFilter !== 'all') && "bg-primary/5 border-primary/20"
                    )}>
                      <Filter className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Filtrer</span>
                      {(statusFilter !== 'all' || roleFilter !== 'all') && (
                        <Badge variant="glow" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                          {(statusFilter !== 'all' ? 1 : 0) + (roleFilter !== 'all' ? 1 : 0)}
                        </Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 border-primary/10 bg-background/95 backdrop-blur-xl" align="start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold leading-none">Filtres Utilisateurs</h4>
                        {(statusFilter !== 'all' || roleFilter !== 'all') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setStatusFilter('all'); setRoleFilter('all'); }}
                            className="h-8 pr-2 pl-2 text-xs text-muted-foreground hover:text-primary"
                          >
                            Effacer
                          </Button>
                        )}
                      </div>
                      <div className="space-y-3 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase opacity-50">Statut</Label>
                          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                            <SelectTrigger className="h-9 bg-muted/30 border-primary/5">
                              <SelectValue placeholder="Filtrer par statut" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les statuts</SelectItem>
                              <SelectItem value="active">Actif</SelectItem>
                              <SelectItem value="pending">En attente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase opacity-50">Rôle</Label>
                          <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                            <SelectTrigger className="h-9 bg-muted/30 border-primary/5">
                              <SelectValue placeholder="Filtrer par rôle" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Tous les rôles</SelectItem>
                              {Object.entries(ROLE_LABELS).map(([role, label]) => (
                                <SelectItem key={role} value={role}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {(statusFilter !== 'all' || roleFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setStatusFilter('all'); setRoleFilter('all'); }}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {filteredUsers.map(user => {
                  const isPending = user.status === 'pending';
                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-4 rounded-lg transition-colors ${isPending ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-secondary/30 hover:bg-secondary/50'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center text-sm font-bold text-primary-foreground">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          {isPending && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name}</p>
                            {isPending && <Badge variant="outline" className="text-[10px] h-4 px-1 text-yellow-600 border-yellow-600 bg-yellow-500/10">En attente</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={roleBadgeVariants[user.role]}>
                          {ROLE_LABELS[user.role]}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {user.lastLogin && (
                            <span className="text-xs text-muted-foreground">
                              Actif {formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true, locale: fr })}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)} title="Modifier l'utilisateur">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setLogFilters(prev => ({ ...prev, userId: user.id }));
                              document.querySelector('[value="logs"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                            }}
                            title="Voir l'historique des actions"
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Supprimer l'utilisateur"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {users.length === 0 && !loading && (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          onSuccess={fetchUsers}
        />

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <Card key={role} variant="glass">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      {label}
                    </span>
                    <Badge variant={roleBadgeVariants[role as UserRole]}>{role}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {role === 'admin' && (
                    <>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Accès total
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Gestion utilisateurs
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Voir les logs
                      </div>
                    </>
                  )}
                  {role === 'technician' && (
                    <>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> CRUD Véhicules
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Approuver demandes
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-3 w-3" /> Gestion utilisateurs
                      </div>
                    </>
                  )}
                  {role === 'driver' && (
                    <>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Voir véhicules
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Demander entretien
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-3 w-3" /> Modifier données
                      </div>
                    </>
                  )}
                  {role === 'direction' && (
                    <>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Consultation totale
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Voir rapports
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-3 w-3" /> Modifications
                      </div>
                    </>
                  )}
                  {role === 'collaborator' && (
                    <>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Voir planning
                      </div>
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="h-3 w-3" /> Demander véhicule
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <XCircle className="h-3 w-3" /> Accès limité
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Paramètres de notifications</CardTitle>
              <CardDescription>Configurez les notifications système</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Nouvelles demandes d'entretien</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevoir une notification pour chaque nouvelle demande
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Validation de missions</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifier lors de l'approbation ou rejet de missions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes carburant</Label>
                    <p className="text-sm text-muted-foreground">
                      Alerter en cas de consommation anormale
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Rappels d'entretien</Label>
                    <p className="text-sm text-muted-foreground">
                      Rappeler les entretiens planifiés
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Notifications par email</Label>
                    <p className="text-sm text-muted-foreground">
                      Envoyer les notifications par email
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Historique des actions
              </CardTitle>
              <CardDescription>Journal des activités du système</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 mb-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn(
                      "rounded-full border-primary/10 gap-2 px-4 h-10",
                      (logFilters.start || logFilters.end || logFilters.startHour || logFilters.endHour || logFilters.userId) && "bg-primary/5 border-primary/20"
                    )}>
                      <Filter className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Filtrer les logs</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 border-primary/10 bg-background/95 backdrop-blur-xl" align="start">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold leading-none">Filtres Logs</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLogFilters({ start: '', end: '', startHour: '', endHour: '', userId: '' })}
                          className="h-8 pr-2 pl-2 text-xs text-muted-foreground hover:text-primary"
                        >
                          Réinitialiser
                        </Button>
                      </div>
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase opacity-50">Date début</Label>
                            <Input
                              type="date"
                              className="h-8 text-xs bg-muted/30"
                              value={logFilters.start}
                              onChange={(e) => setLogFilters(prev => ({ ...prev, start: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase opacity-50">Heure début</Label>
                            <Input
                              type="time"
                              className="h-8 text-xs bg-muted/30"
                              value={logFilters.startHour}
                              onChange={(e) => setLogFilters(prev => ({ ...prev, startHour: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase opacity-50">Date fin</Label>
                            <Input
                              type="date"
                              className="h-8 text-xs bg-muted/30"
                              value={logFilters.end}
                              onChange={(e) => setLogFilters(prev => ({ ...prev, end: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold uppercase opacity-50">Heure fin</Label>
                            <Input
                              type="time"
                              className="h-8 text-xs bg-muted/30"
                              value={logFilters.endHour}
                              onChange={(e) => setLogFilters(prev => ({ ...prev, endHour: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {(logFilters.start || logFilters.end || logFilters.startHour || logFilters.endHour || logFilters.userId) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLogFilters({ start: '', end: '', startHour: '', endHour: '', userId: '' })}
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {logFilters.userId && (
                <div className="flex items-center gap-2 mb-4 p-2 bg-primary/5 rounded-md border border-primary/20 w-fit">
                  <span className="text-sm font-medium">Filtré par: {users.find(u => u.id === logFilters.userId)?.name || "Utilisateur"}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full"
                    onClick={() => setLogFilters(prev => ({ ...prev, userId: '' }))}
                  >
                    <XCircle className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="space-y-3">
                {logs.length === 0 && !loadingLogs ? (
                  <div className="text-center py-8 text-muted-foreground">Aucun log trouvé.</div>
                ) : (
                  logs.map(log => {
                    const user = log.user;
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30"
                      >
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('') : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="font-medium cursor-pointer hover:text-primary hover:underline transition-colors"
                              onClick={() => setLogFilters(prev => ({ ...prev, userId: log.userId }))}
                              title={`Voir toutes les actions de ${user?.name}`}
                            >
                              {user?.name || "Utilisateur inconnu"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {log.action}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {log.entite}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{log.details}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div >
  );
};

export default Settings;
