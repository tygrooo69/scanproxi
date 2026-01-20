import { Client, Poseur } from '../types';

interface StorageConfig {
  webhook_url: string;
  clients: Client[];
  poseurs: Poseur[];
}

/**
 * Tente de charger un fichier JSON de manière sécurisée
 */
async function safeFetchJson(filename: string): Promise<any | null> {
  try {
    const response = await fetch(`${filename}?t=${Date.now()}`);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`❌ Erreur lors de la lecture de ${filename}:`, err);
    return null;
  }
}

/**
 * Charge la config depuis le serveur (storage.json ou config.json)
 */
export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  const storageData = await safeFetchJson('storage.json');
  if (storageData) return storageData;

  const configData = await safeFetchJson('config.json');
  if (configData) {
    return {
      webhook_url: configData.webhook_url,
      clients: configData.clients || configData.default_clients || [],
      poseurs: configData.poseurs || configData.default_poseurs || []
    };
  }
  return null;
}

/**
 * Synchronise le localStorage avec un objet de configuration
 */
export function syncLocalStorageWithFile(config: StorageConfig) {
  if (!config) return;
  localStorage.setItem('buildscan_webhook_url', config.webhook_url);
  localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
  localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
  localStorage.setItem('buildscan_initialized', 'true');
  localStorage.setItem('buildscan_last_sync', new Date().toISOString());
  localStorage.setItem('buildscan_data_source', 'server');
}

/**
 * Génère et télécharge le fichier storage.json actuel
 */
export function exportCurrentConfigAsJson() {
  const config: StorageConfig = {
    webhook_url: localStorage.getItem('buildscan_webhook_url') || '',
    clients: JSON.parse(localStorage.getItem('buildscan_clients') || '[]'),
    poseurs: JSON.parse(localStorage.getItem('buildscan_poseurs') || '[]')
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "storage.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
