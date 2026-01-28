export type UserRole = 'admin' | 'technician' | 'driver' | 'direction' | 'collaborator';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: 'active' | 'pending';
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface Vehicle {
  id: string;
  image_128?: string;
  immatriculation: string;
  marque: string;
  modele: string;
  type_vehicule: string;
  autre_type_vehicule?: string;
  puissance?: number;
  date_acquisition: string;
  date_mise_circulation: string;
  kilometrage_actuel: number;
  numero_chassis?: string;
  couleur?: string;
  annee_fabrication?: number;
  carburant?: string;
  statut: string;
  sous_statut_principale?: string;
  sous_statut_technique?: string;
  sous_statut_exceptionnel?: string;
  capacite_reservoir?: number;
  ref_pneu_av?: string;
  ref_pneu_ar?: string;
  numero_moteur?: string;
  compteur_huile?: number;
  compteur_filtre?: number;
  detenteur?: string;
  numero_serie_type?: string;
  valeur_acquisition?: number;
  anciennete?: string;
  cout_entretien_annuel?: number;
  observations?: string;
  num_ancienne_carte_carburant?: string;
  num_nouvelle_carte_carburant?: string;
  code_nouvelle_carte_carburant?: string;
  porteur_carte_carburant?: string;
  card_holder_name?: string;
  date_expiration_carburant?: string;
  conducteur_id?: string;
  service_id?: string;
  notes?: string;
  vidange_interval_km?: number;
  last_vidange_km?: number;
  vidange_alert_sent?: boolean;
  filtre_interval_km?: number;
  last_filtre_km?: number;
  filtre_alert_sent?: boolean;
  // Legacy fields mapping support if needed, otherwise clean break
}

export interface Driver {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  permis: string;
  dateEmbauche: string;
  statut: 'actif' | 'inactif' | 'en_conge';
  vehiculeAssigne?: string;
  avatar?: string;
}

export interface FuelEntry {
  id: string;
  vehiculeId: string;
  conducteurId: string;

  date: string;
  heure?: string;
  station?: string;
  produit?: string;

  precedentKm?: number;
  actuelKm?: number;
  kmParcouru?: number;

  prixUnitaire?: number;
  ancienSolde?: number;

  numeroTicket?: string;
  soldeTicket?: number;
  montantRecharge?: number;
  montantRistourne?: number;
  montantTransactionAnnuler?: number;

  quantiteRechargee?: number;
  bonus?: number;

  totalAchete?: number;
  quantiteAchetee?: number;
  coutAuKm?: number;

  consommation100?: number;
  distancePossible?: number; // Qte Achetee
  distancePossibleRestant?: number; // Qte Restante

  nouveauSolde?: number;
  quantiteRestante?: number;
  differenceSolde?: number;

  capaciteReservoir?: number;
  alerte?: string;
  statut_carburant?: string;

  // Legacy / Mapped
  kilometrage: number;
  volume: number;
  cout: number;

  statut: 'en_attente' | 'valide' | 'rejete';
}

export interface Maintenance {
  id: string;
  vehiculeId: string;
  type: 'revision' | 'vidange' | 'freins' | 'pneus' | 'autre';
  description: string;
  date: string;
  kilometrage: number;
  cout?: number;
  prestataire?: string;
  statut: 'en_attente' | 'accepte' | 'rejete' | 'en_cours' | 'cloture';
  demandeurId: string;
  documents?: string[];
  imageFacture?: string; // Image de la facture en base64
}

export interface Mission {
  id: string;
  reference: string;
  missionnaire?: string;
  missionnaireRetour?: string;
  vehiculeId: string;
  conducteurId: string;
  dateDebut: string;
  dateFin: string; // Now typically required or optional in frontend logic, but backend uses Date
  heureDepart?: number;
  heureRetour?: number;
  lieuDepart: string;
  lieuDestination: string;
  kilometrageDepart?: number;
  kilometrageRetour?: number; // Was kilometrageArrivee
  kilometreParcouru?: number;
  state: 'nouveau' | 'planifie' | 'en_cours' | 'termine' | 'annule' | 'rejeter';
  immatriculation?: string;
  createdById?: string;
}

export interface Planning {
  id: string;
  vehiculeId: string;
  conducteurId?: string;
  dateDebut: string;
  dateFin: string;
  type: 'mission' | 'maintenance' | 'disponible' | 'reserve';
  description: string;
  status: PlanningStatus;
  createdById?: string;
}

export interface ActionLog {
  id: string;
  userId: string;
  action: string;
  entite: string;
  entiteId: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  totalVehicules: number;
  vehiculesEnService: number;
  vehiculesEnMaintenance: number;
  totalChauffeurs: number;
  chauffeursActifs: number;
  entretiensEnAttente: number;
  missionsEnCours: number;
  consommationMoyenne: number;
}

export interface RolePermissions {
  canManageUsers: boolean;
  canManageVehicles: boolean;
  canManageDrivers: boolean;
  canManageMaintenance: boolean;
  canManageFuel: boolean;
  canManageMissions: boolean;
  canManagePlanning: boolean;
  canViewReports: boolean;
  canApproveRequests: boolean;
  canViewLogs: boolean;
  canManageCompliance: boolean;
}

export interface Compliance {
  id: string;
  vehiculeId: string;
  vehicule_immatriculation: string;
  type: 'assurance' | 'vignette' | 'visite_technique' | 'carte_rose';
  numeroDocument?: string;
  dateEmission?: string;
  dateExpiration: string;
  prestataire?: string;
  cout: number;
  statut: 'valide' | 'expire' | 'a_renouveler';
  notes?: string;
  createdAt?: string;
  daysRemaining?: number;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canManageUsers: true,
    canManageVehicles: true,
    canManageDrivers: true,
    canManageMaintenance: true,
    canManageFuel: true,
    canManageMissions: true,
    canManagePlanning: true,
    canViewReports: true,
    canApproveRequests: true,
    canViewLogs: true,
    canManageCompliance: true,
  },
  technician: {
    canManageUsers: false,
    canManageVehicles: true,
    canManageDrivers: true,
    canManageMaintenance: true,
    canManageFuel: true,
    canManageMissions: true,
    canManagePlanning: true,
    canViewReports: true,
    canApproveRequests: true,
    canViewLogs: false,
    canManageCompliance: true,
  },
  driver: {
    canManageUsers: false,
    canManageVehicles: false,
    canManageDrivers: false,
    canManageMaintenance: false,
    canManageFuel: true,
    canManageMissions: false,
    canManagePlanning: false,
    canViewReports: false,
    canApproveRequests: false,
    canViewLogs: false,
    canManageCompliance: false,
  },
  direction: {
    canManageUsers: false,
    canManageVehicles: false,
    canManageDrivers: false,
    canManageMaintenance: false,
    canManageFuel: false,
    canManageMissions: false,
    canManagePlanning: false,
    canViewReports: true,
    canApproveRequests: false,
    canViewLogs: false,
    canManageCompliance: false,
  },
  collaborator: {
    canManageUsers: false,
    canManageVehicles: false,
    canManageDrivers: false,
    canManageMaintenance: true,
    canManageFuel: true,
    canManageMissions: false,
    canManagePlanning: false,
    canViewReports: false,
    canApproveRequests: false,
    canViewLogs: false,
    canManageCompliance: false,
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  technician: 'Chargé Technique',
  driver: 'Conducteur',
  direction: 'Direction',
  collaborator: 'Collaborateur',
};

export const VEHICLE_STATUS_LABELS: Record<Vehicle['statut'], string> = {
  en_service: 'En Service',
  en_maintenance: 'En Maintenance',
  hors_service: 'Hors Service',
  reserve: 'Réservé',
};

export const MAINTENANCE_STATUS_LABELS: Record<Maintenance['statut'], string> = {
  en_attente: 'En Attente',
  accepte: 'Accepté',
  rejete: 'Rejeté',
  en_cours: 'En Cours',
  cloture: 'Clôturé',
};

export const MISSION_STATUS_LABELS: Record<Mission['state'], string> = {
  nouveau: 'Nouveau',
  planifie: 'Planifiée',
  en_cours: 'En Cours',
  termine: 'Terminée',
  annule: 'Annulée',
  rejeter: 'Rejetée',
};

export type PlanningStatus = 'en_attente' | 'acceptee' | 'rejetee' | 'cloturee';

export const PLANNING_STATUS_LABELS: Record<PlanningStatus, string> = {
  en_attente: 'En attente',
  acceptee: 'Acceptée',
  rejetee: 'Rejetée',
  cloturee: 'Clôturée',
};
