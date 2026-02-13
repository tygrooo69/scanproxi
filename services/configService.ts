
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

export interface WikiPage {
  id: string;
  slug: string;
  content: string;
  updated: string;
}

const DEFAULT_CONFIG: StorageConfig = {
  webhook_url: "",
  client_webhook_url: "",
  clients: [],
  poseurs: []
};

export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  try {
    const response = await fetch('/api/bootstrap');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config: StorageConfig = await response.json();
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
    const cachedWebhook = localStorage.getItem('buildscan_webhook_url');
    const cachedClientWebhook = localStorage.getItem('buildscan_client_webhook_url');
    const cachedClients = localStorage.getItem('buildscan_clients');
    const cachedPoseurs = localStorage.getItem('buildscan_poseurs');

    if (cachedWebhook || cachedClients) {
      return {
        webhook_url: cachedWebhook || "",
        client_webhook_url: cachedClientWebhook || "",
        clients: cachedClients ? JSON.parse(cachedClients) : [],
        poseurs: cachedPoseurs ? JSON.parse(cachedPoseurs) : []
      };
    }
    return DEFAULT_CONFIG;
  }
}

export async function getDbConfig(): Promise<DbConfig | null> {
  try {
    const res = await fetch('/api/admin/db-config');
    return res.ok ? await res.json() : null;
  } catch (e) { return null; }
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
  } catch (e: any) { return { success: false, message: e.message }; }
}

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

export async function getWiki(slug: string): Promise<WikiPage | null> {
  try {
    const res = await fetch(`/api/wiki/${slug}`);
    return res.ok ? await res.json() : null;
  } catch(e) { return null; }
}

export async function saveWiki(slug: string, content: string): Promise<boolean> {
  try {
    const res = await fetch('/api/wiki', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, content })
    });
    return res.ok;
  } catch(e) { return false; }
}
