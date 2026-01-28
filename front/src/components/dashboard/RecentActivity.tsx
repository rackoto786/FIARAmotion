import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, Plus, Edit, Trash2, CheckCircle, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const actionIcons: Record<string, React.ElementType> = {
  CREATE: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
  APPROVE: CheckCircle,
};

const actionColors: Record<string, 'success' | 'info' | 'destructive' | 'warning'> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'destructive',
  APPROVE: 'warning',
};

export const RecentActivity: React.FC = () => {
  const { data: logs = [] } = useQuery({
    queryKey: ['recentLogs'],
    queryFn: async () => {
      const res = await fetch('http://127.0.0.1:5000/api/logs');
      if (!res.ok) throw new Error('Failed to fetch logs');
      return res.json();
    },
  });

  const recentLogs = logs.slice(0, 5);

  return (
    <Card variant="glass" className="vision-card border-white/5 animate-scale-in group">
      <CardHeader className="bg-white/[0.02] border-b border-white/5 pb-4">
        <CardTitle className="text-[11px] font-black flex items-center gap-3 uppercase tracking-[0.2em] text-white/90">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 group-hover:vision-cyan-glow transition-all duration-500">
            <Activity className="h-4 w-4" />
          </div>
          Activité Récente
          <Badge className="ml-auto bg-blue-500/10 text-blue-400 border-blue-500/20 text-[9px] font-black h-5 uppercase tracking-tighter">
            {recentLogs.length} LOGS
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {recentLogs.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mx-auto opacity-30">
              <Activity className="h-6 w-6" />
            </div>
            <p className="text-[11px] font-black text-white/20 uppercase tracking-widest">Aucun flux détecté</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentLogs.map((log: any, index: number) => {
              const Icon = actionIcons[log.action] || Activity;
              const color = actionColors[log.action] || 'info';

              return (
                <div
                  key={log.id}
                  className="p-5 flex items-start gap-4 hover:bg-white/[0.03] transition-all group/item animate-slide-in-left relative overflow-hidden"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className={cn(
                    'p-2.5 rounded-xl border transition-all duration-500 group-hover/item:scale-110 group-hover/item:rotate-6',
                    log.action === 'CREATE' && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
                    log.action === 'UPDATE' && 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(0,210,255,0.1)]',
                    log.action === 'DELETE' && 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
                    log.action === 'APPROVE' && 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white leading-snug tracking-tight">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                          <span className="text-[8px] font-black text-white/50">{log.user?.name?.[0] || 'S'}</span>
                        </div>
                        <span className="text-[9px] font-black text-white/40 truncate uppercase tracking-widest leading-none">
                          {log.user?.name || 'Système'}
                        </span>
                      </div>
                      <div className="h-1 w-1 rounded-full bg-white/10 shrink-0" />
                      <span className="text-[9px] font-bold text-white/30 flex items-center gap-1.5 leading-none">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
