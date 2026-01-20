import { Client, Poseur } from '../types';

export interface StorageConfig {
  webhook_url: string;
  clients: Client[];
  poseurs: Poseur[];
}

const DEFAULT_CONFIG: StorageConfig = {
  webhook_url: "http://194.116.0.110:5678/webhook-test/857f9b11-6d28-4377-a63b-c431ff3fc324",
  clients: [
    { id: "def-1", nom: "OPH DE DRANCY", codeClient: "411DRA038", typeAffaire: "O3-0" },
    { id: "def-2", nom: "VILOGIA", codeClient: "411VIL001", typeAffaire: "O1-A" }
  ],
  poseurs: [
    { id: "p-1", nom: "Equipe A - Standard", entreprise: "SAMDB", telephone: "0148365214", specialite: "Menuiserie", codeSalarie: "SAM-A1" }
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
 * Charge la configuration depuis le serveur avec fallback local
 */
export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const config: StorageConfig = await response.json();
    
    // Sync LocalStorage
    localStorage.setItem(STORAGE_KEYS.WEBHOOK, config.webhook_url);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(config.clients));
    localStorage.setItem(STORAGE_KEYS.POSEURS, JSON.stringify(config.poseurs));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, 'server');
    
    return config;
  } catch (err) {
    console.warn("⚠️ Serveur non joignable, lecture du cache local...");
    
    const localWebhook = localStorage.getItem(STORAGE_KEYS.WEBHOOK);
    const localClients = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    const localPoseurs = localStorage.getItem(STORAGE_KEYS.POSEURS);
    
    if (localWebhook && localClients && localPoseurs) {
      localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, 'localStorage');
      return {
        webhook_url: localWebhook,
        clients: JSON.parse(localClients),
        poseurs: JSON.parse(localPoseurs)
      };
    }
    
    return DEFAULT_CONFIG;
  }
}

/**
 * Sauvegarde sur le serveur et en local
 */
export async function saveStorageConfigToServer(config: StorageConfig): Promise<boolean> {
  try {
    // Mettre à jour le local d'abord pour réactivité
    localStorage.setItem(STORAGE_KEYS.WEBHOOK, config.webhook_url);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(config.clients));
    localStorage.setItem(STORAGE_KEYS.POSEURS, JSON.stringify(config.poseurs));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (response.ok) {
      localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, 'server');
      return true;
    }
    return false;
  } catch (err) {
    console.error("❌ Erreur sauvegarde serveur:", err);
    localStorage.setItem(STORAGE_KEYS.DATA_SOURCE, 'localStorage');
    return true; // Succès partiel (local uniquement)
  }
}

/**
 * Mise à jour partielle
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