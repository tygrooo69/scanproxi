import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import cors from 'cors';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_CONFIG_FILE = path.join(__dirname, 'db_config.json');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration Fallback via Env (pour le premier démarrage)
const ENV_WEBHOOK_URL = process.env.WEBHOOK_URL;

// Instance globale PocketBase
let pb = null;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// --- GESTION CONFIGURATION POCKETBASE ---

async function getDbConfig() {
  try {
    const data = await fs.readFile(DB_CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    // Si pas de fichier de config local, on utilise les variables d'environnement
    return {
      url: process.env.POCKETBASE_URL,
      email: process.env.POCKETBASE_ADMIN_EMAIL,
      password: process.env.POCKETBASE_ADMIN_PASSWORD
    };
  }
}

async function saveDbConfig(config) {
  await fs.writeFile(DB_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Initialisation / Reconnexion dynamique
async function initPocketBase() {
  console.log('🔄 Initialisation connexion PocketBase...');
  const config = await getDbConfig();
  
  if (!config.url) {
    console.warn('⚠️ Aucune URL PocketBase configurée.');
    return false;
  }

  try {
    pb = new PocketBase(config.url);
    pb.autoCancellation(false); // Évite l'annulation des requêtes concurrentes

    if (config.email && config.password) {
      // Support PocketBase v0.23+ : Utilisation de la collection système _superusers
      await pb.collection('_superusers').authWithPassword(config.email, config.password);
      console.log(`✅ Connecté à PocketBase Admin (${config.url})`);
      return true;
    } else {
      console.warn('⚠️ Identifiants Admin manquants.');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur Connexion PocketBase:', error.originalError || error.message);
    return false;
  }
}

// Lancement initial
initPocketBase();

// --- API SYSTEME ---

// Lire la config actuelle (sans exposer le mot de passe complet si possible, mais ici requis pour l'UI)
app.get('/api/admin/db-config', async (req, res) => {
  const config = await getDbConfig();
  res.json({
    url: config.url || '',
    email: config.email || '',
    hasPassword: !!config.password // On indique juste si un mot de passe est set
  });
});

// Mettre à jour la config et reconnecter
app.post('/api/admin/db-config', async (req, res) => {
  try {
    const { url, email, password } = req.body;
    
    // On récupère l'ancienne config pour garder le mot de passe si non fourni
    const oldConfig = await getDbConfig();
    const newConfig = {
      url,
      email,
      password: password || oldConfig.password // Garder l'ancien si vide
    };

    await saveDbConfig(newConfig);
    const success = await initPocketBase();
    
    if (success) {
      res.json({ success: true, message: "Connexion établie et sauvegardée." });
    } else {
      res.status(400).json({ success: false, message: "Impossible de se connecter avec ces identifiants." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API METIER ---

/**
 * Middleware pour vérifier si PB est prêt
 */
const requirePb = (req, res, next) => {
  if (!pb || !pb.authStore.isValid) {
    return res.status(503).json({ error: "PocketBase non connecté. Vérifiez la configuration Admin." });
  }
  next();
};

app.get('/api/bootstrap', async (req, res) => {
  try {
    if (!pb) {
      // Mode dégradé si PB non configuré
      return res.json({ webhook_url: "", client_webhook_url: "", clients: [], poseurs: [] });
    }

    // Récupération parallèle
    const [clientsReq, poseursReq, configList, nextcloudReq] = await Promise.all([
      pb.collection('clients').getFullList({ sort: 'nom' }).catch(() => []), 
      pb.collection('poseurs').getFullList({ sort: 'nom' }).catch(() => []),
      pb.collection('config').getFullList().catch(() => []),
      pb.collection('nextcloud_config').getFirstListItem('').catch(() => null)
    ]);

    // Mapping des configurations par type (0 = Export, 1 = Client)
    const exportConfig = configList.find(c => c.type === "0");
    const clientConfig = configList.find(c => c.type === "1");

    // On utilise le champ 'webhook_url' défini dans le schéma
    const finalWebhookUrl = exportConfig?.webhook_url || ENV_WEBHOOK_URL || "http://default-webhook.com";
    const finalClientWebhookUrl = clientConfig?.webhook_url || "";
    
    let nextcloudConfig = undefined;
    if (nextcloudReq) {
      nextcloudConfig = {
        url: nextcloudReq.url,
        username: nextcloudReq.username,
        password: nextcloudReq.password // Attention: En prod, éviter d'exposer le mot de passe si non nécessaire au front
      };
    }

    res.json({
      webhook_url: finalWebhookUrl,
      client_webhook_url: finalClientWebhookUrl,
      clients: clientsReq.map(c => ({ 
        id: c.id, 
        nom: c.nom, 
        codeClient: c.codeClient, 
        typeAffaire: c.typeAffaire,
        bpu: c.bpu
      })),
      poseurs: poseursReq.map(p => ({ 
        id: p.id, 
        nom: p.nom, 
        entreprise: p.entreprise, 
        telephone: p.telephone, 
        specialite: p.specialite, 
        codeSalarie: p.codeSalarie,
        type: p.type,
        nextcloud_user: p.nextcloud_user
      })),
      nextcloud: nextcloudConfig
    });
  } catch (error) {
    console.error('Erreur Bootstrap:', error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- CALENDAR PROXY (Proxy Nextcloud ICS) ---
app.post('/api/calendar/events', requirePb, async (req, res) => {
  try {
    const { poseur_id } = req.body;
    
    // 1. Récupérer config Nextcloud et Poseur
    const ncConfig = await pb.collection('nextcloud_config').getFirstListItem('');
    const poseur = await pb.collection('poseurs').getOne(poseur_id);

    if (!ncConfig || !poseur || !poseur.nextcloud_user) {
      return res.status(400).json({ error: "Configuration manquante" });
    }

    // 2. Construire l'URL ICS (Export)
    // URL Standard: remote.php/dav/calendars/USER/personal?export
    const baseUrl = ncConfig.url.replace(/\/$/, '');
    const icsUrl = `${baseUrl}/remote.php/dav/calendars/${poseur.nextcloud_user}/personal?export`;

    // 3. Fetch ICS avec Basic Auth
    const auth = Buffer.from(`${ncConfig.username}:${ncConfig.password}`).toString('base64');
    
    const response = await fetch(icsUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur Nextcloud: ${response.status}`);
    }

    const icsData = await response.text();

    // 4. Parser ICS (Parsing simplifié pour extraire les VEVENT)
    // Note: Ceci est un parser basique pour la visualisation. 
    // Il ne gère pas parfaitement les récurrences complexes (RRULE), mais suffit pour les événements simples.
    const events = [];
    const lines = icsData.split(/\r\n|\n|\r/);
    let currentEvent = null;

    const parseDate = (str) => {
      if (!str) return null;
      // Format: 20230101T120000Z ou 20230101
      const match = str.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/);
      if (!match) return null;
      const d = new Date(Date.UTC(match[1], match[2]-1, match[3], match[4]||0, match[5]||0, match[6]||0));
      return d.toISOString();
    };

    for (const line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        currentEvent = {};
      } else if (line.startsWith('END:VEVENT')) {
        if (currentEvent && currentEvent.start) {
          events.push(currentEvent);
        }
        currentEvent = null;
      } else if (currentEvent) {
        if (line.startsWith('DTSTART')) currentEvent.start = parseDate(line.split(':')[1]);
        if (line.startsWith('DTEND')) currentEvent.end = parseDate(line.split(':')[1]);
        if (line.startsWith('SUMMARY')) currentEvent.title = line.split(':')[1];
        if (line.startsWith('LOCATION')) currentEvent.location = line.split(':')[1];
      }
    }

    // Filtrer les événements passés (optionnel, pour alléger)
    const now = new Date();
    now.setMonth(now.getMonth() - 1); // Garder 1 mois d'historique
    const recentEvents = events.filter(e => e.start && new Date(e.start) > now);

    res.json({ success: true, events: recentEvents });

  } catch (err) {
    console.error("Calendar Proxy Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- CRUD ---
app.post('/api/clients', requirePb, async (req, res) => {
  try { res.json(await pb.collection('clients').create(req.body)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/clients/:id', requirePb, async (req, res) => {
  try { res.json(await pb.collection('clients').update(req.params.id, req.body)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/clients/:id', requirePb, async (req, res) => {
  try { await pb.collection('clients').delete(req.params.id); res.json({ success: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/poseurs', requirePb, async (req, res) => {
  try { res.json(await pb.collection('poseurs').create(req.body)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/poseurs/:id', requirePb, async (req, res) => {
  try { res.json(await pb.collection('poseurs').update(req.params.id, req.body)); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/poseurs/:id', requirePb, async (req, res) => {
  try { await pb.collection('poseurs').delete(req.params.id); res.json({ success: true }); } 
  catch (e) { res.status(500).json({ error: e.message }); }
});

// --- NEXTCLOUD CONFIG ---
app.post('/api/config/nextcloud', requirePb, async (req, res) => {
  try {
    const { url, username, password } = req.body;
    let record;
    try {
      record = await pb.collection('nextcloud_config').getFirstListItem('');
      // Update
      record = await pb.collection('nextcloud_config').update(record.id, { url, username, password });
    } catch (e) {
      if (e.status === 404) {
        // Create
        record = await pb.collection('nextcloud_config').create({ url, username, password });
      } else {
        throw e;
      }
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/config', requirePb, async (req, res) => {
  try {
    const { webhook_url, client_webhook_url } = req.body;
    
    // Fonction utilitaire pour mettre à jour ou créer une config selon son type
    const upsertConfig = async (typeStr, urlValue) => {
       if (urlValue === undefined) return null;
       
       try {
         // Tente de trouver par type (format texte)
         const record = await pb.collection('config').getFirstListItem(`type="${typeStr}"`);
         // Mise à jour du champ 'webhook_url'
         return await pb.collection('config').update(record.id, { webhook_url: urlValue });
       } catch (e) {
         // Si non trouvé (404), on crée
         if (e.status === 404) {
            return await pb.collection('config').create({ type: typeStr, webhook_url: urlValue });
         }
         throw e;
       }
    };

    const results = {};
    if (webhook_url !== undefined) {
      results.export = await upsertConfig("0", webhook_url);
    }
    if (client_webhook_url !== undefined) {
      results.client = await upsertConfig("1", client_webhook_url);
    }

    res.json({ success: true, updates: results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Support SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur BuildScan AI sur le port ${PORT}`);
});