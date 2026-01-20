import { Client, Poseur } from '../types';

export interface StorageConfig {
  webhook_url: string;
  clients: Client[];
  poseurs: Poseur[];
}

/**
 * Configuration par défaut utilisée si le serveur n'est pas accessible
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

/**
 * Charge la configuration depuis le serveur, avec fallback sur localStorage
 */
export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  try {
    // Tentative de chargement depuis le serveur
    const response = await fetch('/api/config', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const config = await response.json();
    
    // Mise à jour du localStorage avec les données serveur
    localStorage.setItem('buildscan_webhook_url', config.webhook_url);
    localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
    localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
    localStorage.setItem('buildscan_last_sync', new Date().toISOString());
    localStorage.setItem('buildscan_data_source', 'server');
    
    console.log('✅ Configuration chargée depuis le serveur');
    return config;
    
  } catch (err) {
    console.warn("⚠️ Serveur non accessible, utilisation du localStorage ou config par défaut", err);
    
    // Fallback 1 : localStorage
    const localWebhook = localStorage.getItem('buildscan_webhook_url');
    const localClients = localStorage.getItem('buildscan_clients');
    const localPoseurs = localStorage.getItem('buildscan_poseurs');
    
    if (localWebhook && localClients && localPoseurs) {
      try {
        const config: StorageConfig = {
          webhook_url: localWebhook,
          clients: JSON.parse(localClients),
          poseurs: JSON.parse(localPoseurs)
        };
        localStorage.setItem('buildscan_data_source', 'localStorage');
        console.log('✅ Configuration chargée depuis localStorage');
        return config;
      } catch (parseErr) {
        console.error("Erreur parsing localStorage:", parseErr);
      }
    }
    
    // Fallback 2 : Config par défaut
    localStorage.setItem('buildscan_webhook_url', DEFAULT_CONFIG.webhook_url);
    localStorage.setItem('buildscan_clients', JSON.stringify(DEFAULT_CONFIG.clients));
    localStorage.setItem('buildscan_poseurs', JSON.stringify(DEFAULT_CONFIG.poseurs));
    localStorage.setItem('buildscan_data_source', 'default');
    console.log('✅ Configuration par défaut utilisée');
    return DEFAULT_CONFIG;
  }
}

/**
 * Sauvegarde la configuration complète sur le serveur
 */
export async function saveStorageConfigToServer(config: StorageConfig): Promise<boolean> {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    // Mise à jour du localStorage immédiatement
    localStorage.setItem('buildscan_webhook_url', config.webhook_url);
    localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
    localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
    localStorage.setItem('buildscan_last_sync', new Date().toISOString());
    localStorage.setItem('buildscan_data_source', 'server');
    
    console.log('✅ Configuration sauvegardée sur le serveur');
    return true;
    
  } catch (err) {
    console.warn("⚠️ Échec sauvegarde serveur, enregistrement en local uniquement:", err);
    
    // Fallback : sauvegarde en localStorage uniquement
    localStorage.setItem('buildscan_webhook_url', config.webhook_url);
    localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
    localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
    localStorage.setItem('buildscan_last_sync', new Date().toISOString());
    localStorage.setItem('buildscan_data_source', 'localStorage');
    
    console.log('✅ Configuration sauvegardée en localStorage');
    return true; // On retourne true car la sauvegarde locale a fonctionné
  }
}

/**
 * Aide à la mise à jour partielle (uniquement clients, ou poseurs, etc.)
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