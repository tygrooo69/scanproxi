
export interface ConstructionOrderData {
  num_bon_travaux: string | null;
  adresse_1: string | null;
  adresse_2: string | null;
  adresse_3: string | null;
  // Separation des données gardien
  gardien_nom: string | null;
  gardien_tel: string | null;
  gardien_email: string | null; // Ajout email
  
  nom_client: string | null;
  delai_intervention: string | null;
  date_intervention: string | null;
  descriptif_travaux: string | null;
}

export interface Poseur {
  id: string;
  nom: string;
  entreprise: string;
  telephone: string;
  specialite: string;
  codeSalarie: string;
  type?: string; // Lien avec le Type Affaire du client
  nextcloud_user?: string; // Identifiant utilisateur Nextcloud
}

export interface Client {
  id: string;
  nom: string; // Nom tel qu'il apparaît sur les PDF
  codeClient: string; // ex: 411DRA038
  typeAffaire: string; // ex: O3-0
  bpu?: string; // Code BPU
}

export interface NextcloudConfig {
  url: string;
  username: string;
  password?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'request' | 'response' | 'error';
  message: string;
  data?: any;
}

export interface ExtractionResult {
  data: ConstructionOrderData;
  rawJson: string;
}

export interface CalendarEvent {
  uid?: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isTentative?: boolean; // Pour le chantier en cours d'analyse
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type AppView = 'analyzer' | 'admin';