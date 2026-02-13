import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Car } from 'lucide-react';

interface VehicleUsageChartProps {
  data?: Array<{ vehicle: string; missions: number }>;
}

export const VehicleUsageChart: React.FC<VehicleUsageChartProps> = ({ data = [] }) => {
  return (
    <div className="animate-slide-up" style={{ animationDelay: '0.35s' }}>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground/40 italic">
          Récupération des données...
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: -20, right: 20 }}>
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00d2ff" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#00d2ff" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <XAxis
                type="number"
                stroke="currentColor"
                className="text-muted-foreground/30"
                fontSize={10}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="vehicle"
                type="category"
                stroke="currentColor"
                className="text-foreground font-black"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl animate-scale-in">
                        <p className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-2">{label}</p>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]" />
                          <p className="text-xl font-black text-white">{payload[0].value} <span className="text-[10px] font-normal opacity-50 uppercase">Missions</span></p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="missions"
                fill="url(#colorBar)"
                radius={[0, 10, 10, 0]}
                barSize={16}
                background={{ fill: 'rgba(255,255,255,0.02)', radius: 10 }}
                animationDuration={1500}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
