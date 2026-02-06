import { Client, Poseur } from '../types';

export interface StorageConfig {
  webhook_url: string;
  client_webhook_url?: string;
  clients: Client[];
  poseurs: Poseur[];
}

export interface DbConfig {
  url: string;
  email: string;
  password?: string;
  hasPassword?: boolean;
}

// Fallback uniquement si le serveur est inaccessible et le cache vide
const DEFAULT_CONFIG: StorageConfig = {
  webhook_url: "",
  client_webhook_url: "",
  clients: [],
  poseurs: []
};

/**
 * Récupère la configuration complète (Bootstrap)
 */
export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  try {
    const response = await fetch('/api/bootstrap');
    // Si 503, c'est que la DB n'est pas connectée, mais le serveur répond.
    // On veut quand même retourner null pour gérer l'état UI.
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const config: StorageConfig = await response.json();
    
    // Mise à jour du cache local
    localStorage.setItem('buildscan_webhook_url', config.webhook_url);
    if (config.client_webhook_url) {
      localStorage.setItem('buildscan_client_webhook_url', config.client_webhook_url);
    }
    localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
    localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
    localStorage.setItem('buildscan_data_source', 'server');
    localStorage.setItem('buildscan_last_sync', new Date().toISOString());
    
    return config;
  } catch (err) {
    console.warn("API Inaccessible ou DB déconnectée, passage en mode cache/local :", err);
    
    const cachedWebhook = localStorage.getItem('buildscan_webhook_url');
    const cachedClientWebhook = localStorage.getItem('buildscan_client_webhook_url');
    const cachedClients = localStorage.getItem('buildscan_clients');
    const cachedPoseurs = localStorage.getItem('buildscan_poseurs');

    if (cachedWebhook || cachedClients) {
      const offlineConfig: StorageConfig = {
        webhook_url: cachedWebhook || "",
        client_webhook_url: cachedClientWebhook || "",
        clients: cachedClients ? JSON.parse(cachedClients) : [],
        poseurs: cachedPoseurs ? JSON.parse(cachedPoseurs) : []
      };
      
      localStorage.setItem('buildscan_data_source', 'local_cache');
      return offlineConfig;
    }

    return DEFAULT_CONFIG;
  }
}

// --- GESTION DB CONNECTION ---

export async function getDbConfig(): Promise<DbConfig | null> {
  try {
    const res = await fetch('/api/admin/db-config');
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function updateDbConfig(config: DbConfig): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch('/api/admin/db-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json();
    return { success: res.ok && data.success, message: data.message || data.error };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

// --- CRUD CLIENTS ---
export async function addClient(client: Omit<Client, 'id'>): Promise<Client | null> {
  try {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    });
    return res.ok ? await res.json() : null;
  } catch (e) { return null; }
}

export async function updateClient(id: string, client: Partial<Client>): Promise<boolean> {
  try {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client)
    });
    return res.ok;
  } catch (e) { return false; }
}

export async function deleteClient(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) { return false; }
}

// --- CRUD POSEURS ---
export async function addPoseur(poseur: Omit<Poseur, 'id'>): Promise<Poseur | null> {
  try {
    const res = await fetch('/api/poseurs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poseur)
    });
    return res.ok ? await res.json() : null;
  } catch (e) { return null; }
}

export async function updatePoseur(id: string, poseur: Partial<Poseur>): Promise<boolean> {
  try {
    const res = await fetch(`/api/poseurs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(poseur)
    });
    return res.ok;
  } catch (e) { return false; }
}

export async function deletePoseur(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/poseurs/${id}`, { method: 'DELETE' });
    return res.ok;
  } catch (e) { return false; }
}

// --- CONFIG WEBHOOKS ---
export async function updateConfig(config: Partial<StorageConfig>): Promise<boolean> {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    if (res.ok) {
      if (config.webhook_url !== undefined) localStorage.setItem('buildscan_webhook_url', config.webhook_url);
      if (config.client_webhook_url !== undefined) localStorage.setItem('buildscan_client_webhook_url', config.client_webhook_url);
    }
    return res.ok;
  } catch (e) { return false; }
}

// Deprecated: kept for backward compatibility if needed, but redirects to updateConfig
export async function updateWebhookUrl(url: string): Promise<boolean> {
  return updateConfig({ webhook_url: url });
}