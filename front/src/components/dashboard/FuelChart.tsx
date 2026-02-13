import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Fuel } from 'lucide-react';

interface FuelChartProps {
  data?: Array<{ month: string; liters: number; cost: number }>;
}

export const FuelChart: React.FC<FuelChartProps> = ({ data = [] }) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // En Vision UI, on compare souvent le 'Réalisé' au 'Prévisionnel' pour le style
  const enhancedData = data.map(item => ({
    ...item,
    reference: item.liters * 0.8 + Math.random() * 50 // Valeur de référence pour le style visuel
  }));

  const colors = {
    primary: theme === 'dark' ? '#00d2ff' : '#43B02A',
    secondary: theme === 'dark' ? '#8d5cf6' : '#CB2C30',
  };

  if (!mounted) return null;

  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground/40 italic">
          Initialisation du flux...
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={enhancedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.primary} stopOpacity={0.6} />
                  <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRef" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.secondary} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="currentColor"
                className="text-border/20"
              />
              <XAxis
                dataKey="month"
                stroke="currentColor"
                className="text-muted-foreground"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
                tickFormatter={(val) => val.substring(0, 3).toUpperCase()}
              />
              <YAxis
                stroke="currentColor"
                className="text-muted-foreground"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                domain={[0, 'dataMax + 100']}
              />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="vision-card border-border p-4 shadow-2xl animate-scale-in bg-background/95 backdrop-blur-xl">
                        <p className="text-[10px] uppercase font-black tracking-widest text-primary mb-2">{label}</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-sm" />
                            <p className="text-xl font-black text-foreground">{payload[0].value} <span className="text-[10px] font-normal opacity-50 uppercase">Litres</span></p>
                          </div>
                          <div className="flex items-center gap-2 opacity-50">
                            <div className="h-1.5 w-1.5 rounded-full bg-secondary" />
                            <p className="text-xs font-bold text-foreground uppercase tracking-tighter">Réf : {Math.round(Number(payload[1].value))} L</p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="liters"
                stroke={colors.primary}
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#colorLiters)"
                animationDuration={2500}
              />
              <Area
                type="monotone"
                dataKey="reference"
                stroke={colors.secondary}
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorRef)"
                animationDuration={2500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default FuelChart;
