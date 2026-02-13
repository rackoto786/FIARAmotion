import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MissionKPIProps {
    title: string;
    value: number;
    subtitle: string;
    icon: LucideIcon;
    variant: 'pending' | 'accepted' | 'rejected' | 'total';
    className?: string;
}

const variants = {
    pending: {
        bg: 'bg-amber-500/10 dark:bg-amber-500/8',
        text: 'text-amber-500',
        iconBg: 'bg-white/10 dark:bg-amber-500/10',
        glow: 'shadow-[0_8px_32px_-8px_rgba(245,158,11,0.25)]',
        accent: 'from-amber-500/20 to-transparent',
        vision: 'vision-card-warning'
    },
    accepted: {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/8',
        text: 'text-emerald-500',
        iconBg: 'bg-white/10 dark:bg-emerald-500/10',
        glow: 'shadow-[0_8px_32px_-8px_rgba(16,185,129,0.25)]',
        accent: 'from-emerald-500/20 to-transparent',
        vision: 'vision-card-success'
    },
    rejected: {
        bg: 'bg-rose-500/10 dark:bg-rose-500/8',
        text: 'text-rose-500',
        iconBg: 'bg-white/10 dark:bg-rose-500/10',
        glow: 'shadow-[0_8px_32px_-8px_rgba(244,63,94,0.25)]',
        accent: 'from-rose-500/20 to-transparent',
        vision: 'vision-card-danger'
    },
    total: {
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/8',
        text: 'text-cyan-500',
        iconBg: 'bg-white/10 dark:bg-cyan-500/10',
        glow: 'shadow-[0_8px_32px_-8px_rgba(6,182,212,0.25)]',
        accent: 'from-cyan-500/20 to-transparent',
        vision: 'vision-card-info'
    }
};

export const MissionKPI: React.FC<MissionKPIProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    variant,
    className
}) => {
    const v = variants[variant];

    return (
        <Card className={cn(
            "relative overflow-hidden border-0 transition-all duration-500 group hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]",
            "vision-3d dashdark-accent-glow",
            v.bg,
            v.glow,
            v.vision,
            "backdrop-blur-xl",
            className
        )}>
            {/* Dynamic Glow Effect */}
            <div className={cn(
                "absolute -inset-24 bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"
            )} />

            {/* Accent Gradient */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-20", v.accent)} />

            <CardContent className="p-4 relative z-10">
                <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/70 truncate">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                            <span className={cn("text-2xl font-black tracking-tighter vision-text-gradient", v.text)}>
                                {value}
                            </span>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground/50 capitalize truncate">
                            {subtitle}
                        </p>
                    </div>

                    <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center border border-white/10 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 group-hover:vision-cyan-glow bg-white/5 shadow-inner",
                        v.text
                    )}>
                        <Icon className="h-5 w-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
