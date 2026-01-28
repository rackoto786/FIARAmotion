import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Wrench } from 'lucide-react';

const COLORS = [
  '#00d2ff', // Cyan neon
  '#8d5cf6', // Purple neon
  '#00f5a0', // Green neon
  '#fbbf24', // Amber
  '#f472b6', // Pink
];

interface MaintenanceChartProps {
  data?: Array<{ type: string; count: number }>;
}

export const MaintenanceChart: React.FC<MaintenanceChartProps> = ({ data = [] }) => {
  return (
    <Card variant="glass" className="animate-slide-up vision-card border-white/5 group" style={{ animationDelay: '0.25s' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-white/90 text-sm font-black uppercase tracking-[0.2em]">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover:vision-cyan-glow transition-all duration-500">
            <Wrench className="h-4 w-4" />
          </div>
          Répartition Entretiens
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-white/20 italic">
            Synchronisation en cours...
          </div>
        ) : (
          <div className="h-[300px] relative mt-4">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-white vision-text-gradient">
                {data.reduce((acc, curr) => acc + curr.count, 0)}
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Total</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="count"
                  nameKey="type"
                  animationDuration={1500}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="transition-all duration-500 hover:opacity-100 opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-scale-in">
                          <p className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-2">{payload[0].name}</p>
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: payload[0].payload.fill, color: payload[0].payload.fill }} />
                            <p className="text-xl font-black text-white">{payload[0].value} <span className="text-[10px] font-normal opacity-50 uppercase">Interventions</span></p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  content={({ payload }) => (
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {payload?.map((entry: any, index: number) => (
                        <div key={`legend-${index}`} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/30 border border-primary/5">
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                          <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-tighter">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
