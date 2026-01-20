
import { Client, Poseur } from '../types';

export interface StorageConfig {
  webhook_url: string;
  clients: Client[];
  poseurs: Poseur[];
}

/**
 * Charge la configuration depuis le serveur
 */
export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error("Erreur serveur lors du chargement");
    return await response.json();
  } catch (err) {
    console.error("❌ BuildScan AI : Erreur config serveur:", err);
    return null;
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
    
    if (!response.ok) throw new Error("Erreur serveur lors de la sauvegarde");
    
    // On met aussi à jour le local storage pour une réactivité immédiate de l'UI si nécessaire
    localStorage.setItem('buildscan_webhook_url', config.webhook_url);
    localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
    localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
    localStorage.setItem('buildscan_last_sync', new Date().toISOString());
    
    return true;
  } catch (err) {
    console.error("❌ BuildScan AI : Échec sauvegarde serveur:", err);
    return false;
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
