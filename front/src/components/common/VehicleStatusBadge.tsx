import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Vehicle } from '@/types';

interface VehicleStatusBadgeProps {
    vehicle: Vehicle;
    className?: string;
}

export const VehicleStatusBadge: React.FC<VehicleStatusBadgeProps> = ({ vehicle, className }) => {
    // Determine variant and label based on status hierarchy using badges like StatusBadge
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' = 'default';
    let label = vehicle.statut || 'Inconnu';

    // Map main status to variants
    switch (vehicle.statut) {
        case 'principale':
            // Check sub-status for principale
            if (vehicle.sous_statut_principale === 'disponible') {
                variant = 'success';
                label = 'Disponible';
            } else if (vehicle.sous_statut_principale === 'reservee') {
                variant = 'info';
                label = 'Réservé';
            } else if (vehicle.sous_statut_principale === 'en_deplacement') {
                variant = 'info';
                label = 'En déplacement';
            } else if (vehicle.sous_statut_principale === 'occupee') {
                variant = 'info';
                label = 'Occupé';
            } else {
                variant = 'success';
                label = 'En Service';
            }
            break;

        case 'technique':
            variant = 'warning';
            label = 'En Maintenance';
            if (vehicle.sous_statut_technique === 'en_reparation') {
                label = 'En réparation';
            } else if (vehicle.sous_statut_technique === 'entretien_periodique') {
                label = 'Entretien périodique';
            }
            break;

        case 'exceptionnel':
            variant = 'destructive';
            label = 'Hors Service';
            if (vehicle.sous_statut_exceptionnel === 'vole') {
                label = 'Volé';
            } else if (vehicle.sous_statut_exceptionnel === 'vendu') {
                label = 'Vendu';
            } else if (vehicle.sous_statut_exceptionnel === 'detruit') {
                label = 'Détruit';
            } else if (vehicle.sous_statut_exceptionnel === 'reforme') {
                label = 'Réformé';
            }
            break;

        // Handle specific new statuses if they are at root level (fallback or direct usage)
        case 'en_service':
            variant = 'success';
            label = 'En Service';
            break;
        case 'en_maintenance':
            variant = 'warning';
            label = 'En Maintenance';
            break;
        case 'reserve':
            variant = 'info';
            label = 'Réservé';
            break;

        default:
            // Fallback for unknown statuses or if they match label keys directly
            if (vehicle.statut === 'reparation') {
                variant = 'warning';
                label = 'En Réparation';
            } else {
                variant = 'secondary';
                // Clean up raw labels if needed
                label = label.replace(/_/g, ' ');
            }
            break;
    }

    return (
        <Badge variant={variant} className={className}>
            {label}
        </Badge>
    );
};
