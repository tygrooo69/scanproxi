import { Client, Poseur } from '../types';

export interface StorageConfig {
  webhook_url: string;
  clients: Client[];
  poseurs: Poseur[];
}

// Fallback uniquement si le serveur est inaccessible
const DEFAULT_CONFIG: StorageConfig = {
  webhook_url: "",
  clients: [],
  poseurs: []
};

/**
 * Récupère la configuration complète (Bootstrap)
 */
export async function fetchStorageConfig(): Promise<StorageConfig | null> {
  try {
    const response = await fetch('/api/bootstrap');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const config: StorageConfig = await response.json();
    
    // Cache local pour performance UI immédiate
    localStorage.setItem('buildscan_webhook_url', config.webhook_url);
    localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
    localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
    localStorage.setItem('buildscan_data_source', 'pocketbase');
    
    return config;
  } catch (err) {
    console.error("Erreur connexion API:", err);
    return DEFAULT_CONFIG;
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

// --- CONFIG WEBHOOK ---
export async function updateWebhookUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhook_url: url })
    });
    return res.ok;
  } catch (e) { return false; }
}