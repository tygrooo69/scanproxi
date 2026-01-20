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

    // Vérification critique : Si le serveur est en mode SPA, il peut renvoyer index.html (200 OK) pour un fichier manquant.
    // On vérifie donc que le contenu est bien du JSON.
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.warn(`⚠️ BuildScan AI : ${filename} a renvoyé un type de contenu invalide (${contentType}).`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error(`❌ Erreur lors de la lecture de ${filename}:`, err);
    return null;
  }
}

export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  console.log("🚀 BuildScan AI : Tentative de chargement de la configuration...");
  
  // 1. Tentative avec storage.json
  const storageData = await safeFetchJson('storage.json');
  if (storageData) {
    console.log("✅ BuildScan AI : storage.json chargé avec succès.");
    return storageData;
  }

  // 2. Fallback sur config.json
  console.warn("⚠️ BuildScan AI : storage.json non trouvé ou invalide. Repli sur config.json...");
  const configData = await safeFetchJson('config.json');
  
  if (configData) {
    console.log("✅ BuildScan AI : config.json chargé avec succès (Fallback).");
    return {
      webhook_url: configData.webhook_url,
      clients: configData.clients || configData.default_clients || [],
      poseurs: configData.poseurs || configData.default_poseurs || []
    };
  }

  console.error('❌ BuildScan AI : Aucun fichier de configuration valide (storage.json ou config.json) n\'est accessible à la racine.');
  return null;
}

export function syncLocalStorageWithFile(config: StorageConfig) {
  if (!config) return;
  localStorage.setItem('buildscan_webhook_url', config.webhook_url);
  localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
  localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
  localStorage.setItem('buildscan_initialized', 'true');
  localStorage.setItem('buildscan_last_sync', new Date().toISOString());
}
