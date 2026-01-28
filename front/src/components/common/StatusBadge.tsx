import React from 'react';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Vehicle, Maintenance, Mission, Driver, FuelEntry } from '@/types';

type StatusType =
  | Vehicle['statut']
  | Maintenance['statut']
  | Mission['state']
  | Driver['statut']
  | FuelEntry['statut'];

interface StatusConfig {
  label: string;
  variant: BadgeProps['variant'];
}

const statusConfigs: Record<StatusType, StatusConfig> = {
  // Vehicle status
  en_service: { label: 'En Service', variant: 'success' },
  en_maintenance: { label: 'En Maintenance', variant: 'warning' },
  hors_service: { label: 'Hors Service', variant: 'destructive' },
  reserve: { label: 'Réservé', variant: 'info' },
  disponible: { label: 'Disponible', variant: 'success' },

  // Maintenance status
  en_attente: { label: 'En Attente', variant: 'warning' },
  accepte: { label: 'Accepté', variant: 'info' },
  rejete: { label: 'Rejeté', variant: 'destructive' },
  en_cours: { label: 'En Cours', variant: 'info' },
  cloture: { label: 'Clôturé', variant: 'success' },

  // Mission status
  nouveau: { label: 'Nouveau', variant: 'muted' },
  planifie: { label: 'Planifié', variant: 'info' },
  // en_cours defined above
  termine: { label: 'Terminé', variant: 'success' },
  annule: { label: 'Annulé', variant: 'destructive' },
  rejeter: { label: 'Rejetée', variant: 'destructive' },

  // Driver status
  actif: { label: 'Actif', variant: 'success' },
  inactif: { label: 'Inactif', variant: 'muted' },
  en_conge: { label: 'En Congé', variant: 'warning' },

  // Fuel status
  valide: { label: 'Validé', variant: 'success' },
};

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = statusConfigs[status] || { label: status, variant: 'muted' as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};
