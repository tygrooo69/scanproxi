export interface ConstructionOrderData {
  num_bon_travaux: string | null;
  adresse_intervention: string | null;
  coord_gardien: string | null;
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
}

export interface Client {
  id: string;
  nom: string; // Nom tel qu'il apparaît sur les PDF
  codeClient: string; // ex: 411DRA038
  typeAffaire: string; // ex: O3-0
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'request' | 'response' | 'error';
  message: string;
  data?: any;
}

export interface ExtractionResult {
  data: ConstructionOrderData;
  rawJson: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export type AppView = 'analyzer' | 'admin';