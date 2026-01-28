import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info' | 'danger';
  className?: string;
}

const variantStyles = {
  default: 'bg-accent/50 border-border text-muted-foreground',
  primary: 'bg-primary/10 border-primary/20 text-primary',
  success: 'bg-success/10 border-success/20 text-success',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  info: 'bg-info/10 border-info/20 text-info',
  danger: 'bg-destructive/10 border-destructive/20 text-destructive',
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}) => {
  return (
    <Card variant="glass" className={cn(
      'animate-scale-in group overflow-hidden transition-all duration-500 vision-3d dashdark-accent-glow',
      variant !== 'default' && `vision-card-${variant}`,
      className
    )}>
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1 truncate">{title}</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight vision-text-gradient truncate">{value}</span>
              {trend && (
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-300',
                    trend.isPositive ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                  )}
                >
                  {trend.isPositive ? (
                    <ArrowUpRight className="h-2.5 w-2.5" />
                  ) : (
                    <ArrowDownRight className="h-2.5 w-2.5" />
                  )}
                  {trend.value}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[10px] font-medium text-muted-foreground/60 mt-1 truncate">{subtitle}</p>
            )}
          </div>

          <div className={cn(
            'flex-shrink-0 p-3 rounded-2xl border-2 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 group-hover:vision-cyan-glow',
            variantStyles[variant]
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
