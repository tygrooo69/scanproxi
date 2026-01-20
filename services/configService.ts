import { Client, Poseur } from '../types';

export interface StorageConfig {
  webhook_url: string;
  clients: Client[];
  poseurs: Poseur[];
}

/**
 * Configuration par défaut pour AI Studio (mode standalone)
 */
const DEFAULT_CONFIG: StorageConfig = {
  webhook_url: "http://194.116.0.110:5678/webhook-test/857f9b11-6d28-4377-a63b-c431ff3fc324",
  clients: [
    {
      id: "def-1",
      nom: "OPH DE DRANCY",
      codeClient: "411DRA038",
      typeAffaire: "O3-0"
    },
    {
      id: "def-2",
      nom: "VILOGIA",
      codeClient: "411VIL001",
      typeAffaire: "O1-A"
    },
    {
      id: "def-3",
      nom: "CDC HABITAT",
      codeClient: "411CDC002",
      typeAffaire: "O2-B"
    }
  ],
  poseurs: [
    {
      id: "p-1",
      nom: "Equipe A - Standard",
      entreprise: "SAMDB",
      telephone: "0148365214",
      specialite: "Menuiserie",
      codeSalarie: "SAM-A1"
    }
  ]
};

const STORAGE_KEYS = {
  WEBHOOK: 'buildscan_webhook_url',
  CLIENTS: 'buildscan_clients',
  POSEURS: 'buildscan_poseurs',
  LAST_SYNC: 'buildscan_last_sync',
  DATA_SOURCE: 'buildscan_data_source'
};

/**
 * Initialise le localStorage avec la config par défaut si vide
 */
function initializeLocalStorage(): void {
  if (!localStorage.getItem(STORAGE_KEYS.WEBHOOK)) {
    localStorage.setItem(STORAGE_KEYS.WEBHOOK, DEFAULT_CONFIG.webhook_url);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(DEFAULT_CONFIG.clients));
    localStorage.setItem(STORAGE_KEYS.POSEURS, JSON.stringify(DEFAULT_CONFIG.poseurs));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, 'default');
    console.log('✅ Configuration par défaut initialisée dans localStorage');
  }
}

/**
 * Charge la configuration depuis localStorage (AI Studio mode)
 */
export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  try {
    // Initialiser si nécessaire
    initializeLocalStorage();
    
    const webhook = localStorage.getItem(STORAGE_KEYS.WEBHOOK);
    const clientsStr = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const poseursStr = localStorage.getItem(STORAGE_KEYS.POSEURS);
    
    if (!webhook || !clientsStr || !poseursStr) {
      console.warn('⚠️ Données manquantes, réinitialisation...');
      initializeLocalStorage();
      return DEFAULT_CONFIG;
    }
    
    const config: StorageConfig = {
      webhook_url: webhook,
      clients: JSON.parse(clientsStr),
      poseurs: JSON.parse(poseursStr)
    };
    
    console.log('✅ Configuration chargée depuis localStorage (AI Studio mode)');
    return config;
    
  } catch (err) {
    console.error('❌ Erreur de lecture localStorage:', err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Sauvegarde la configuration dans localStorage (AI Studio mode)
 */
export async function saveStorageConfigToServer(config: StorageConfig): Promise<boolean> {
  try {
    localStorage.setItem(STORAGE_KEYS.WEBHOOK, config.webhook_url);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(config.clients));
    localStorage.setItem(STORAGE_KEYS.POSEURS, JSON.stringify(config.poseurs));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, 'localStorage');
    
    console.log('✅ Configuration sauvegardée dans localStorage');
    return true;
    
  } catch (err) {
    console.error('❌ Erreur sauvegarde localStorage:', err);
    return false;
  }
}

/**
 * Mise à jour partielle de la configuration
 */
export async function updatePartialConfig(updates: Partial<StorageConfig>): Promise<boolean> {
  const current = await fetchStorageConfig();
  if (!current) return false;
  
  const updated: StorageConfig = {
    webhook_url: updates.webhook_url !== undefined ? updates.webhook_url : current.webhook_url,
    clients: updates.clients !== undefined ? updates.clients : current.clients,
    poseurs: updates.poseurs !== undefined ? updates.poseurs : current.poseurs
  };
  
  return await saveStorageConfigToServer(updated);
}