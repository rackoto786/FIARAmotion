import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface MaintenanceHeroProps {
    onCreateClick: () => void;
}

export const MaintenanceHero: React.FC<MaintenanceHeroProps> = ({ onCreateClick }) => {
    return (
        <div className="relative w-full h-[200px] rounded-3xl overflow-hidden mb-8 group shadow-lg">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{
                    backgroundImage: "url('/images/maintenance-hero-dodge-v2.jpg')"
                }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex items-center justify-between p-8 md:p-12">
                <div className="flex flex-col gap-2 max-w-xl">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
                        Tâches de réparation
                    </h1>
                    <p className="text-slate-200 text-lg font-medium opacity-90">
                        Gérez les interventions curatives sur votre parc
                    </p>
                </div>

                <div className="hidden md:block">
                    <Button
                        onClick={onCreateClick}
                        size="lg"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-6 py-6 shadow-xl shadow-green-500/20 transition-all hover:scale-105 hover:shadow-green-500/40"
                    >
                        <Plus className="mr-2 h-5 w-5" />
                        Nouvelle tâche
                    </Button>
                </div>
            </div>

            {/* Mobile Button (positioned differently if needed, or kept hidden/visible based on desire) */}
        </div>
    );
};
