
import { Client, Poseur } from '../types';

interface StorageConfig {
  webhook_url: string;
  clients: Client[];
  poseurs: Poseur[];
}

export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  try {
    // Utilisation d'un chemin relatif 'storage.json' au lieu de '/storage.json'
    // pour éviter les erreurs 404 dans certains environnements de déploiement.
    const response = await fetch(`storage.json?t=${Date.now()}`);
    
    if (!response.ok) {
      console.warn(`⚠️ BuildScan AI : storage.json non trouvé (Status: ${response.status}). Tentative avec config.json...`);
      
      // Fallback sur config.json si storage.json est manquant
      const fallbackResponse = await fetch(`config.json?t=${Date.now()}`);
      
      if (!fallbackResponse.ok) {
        throw new Error('Aucun fichier de configuration (storage.json ou config.json) n\'a pu être chargé.');
      }
      
      const config = await fallbackResponse.json();
      console.log("✅ BuildScan AI : Mode Fichier activé via config.json (Fallback).");
      
      // Adaptation du format si config.json utilise des clés différentes
      return {
        webhook_url: config.webhook_url,
        clients: config.clients || config.default_clients || [],
        poseurs: config.poseurs || config.default_poseurs || []
      };
    }

    const config = await response.json();
    console.log("✅ BuildScan AI : Mode Fichier Local activé. storage.json chargé avec succès.");
    return config;
  } catch (err) {
    console.error('❌ BuildScan AI : Erreur critique de lecture configuration :', err);
    return null;
  }
}

export function syncLocalStorageWithFile(config: StorageConfig) {
  if (!config) return;
  localStorage.setItem('buildscan_webhook_url', config.webhook_url);
  localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
  localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
  localStorage.setItem('buildscan_initialized', 'true');
  localStorage.setItem('buildscan_last_sync', new Date().toISOString());
}
