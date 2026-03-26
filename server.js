
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import cors from 'cors';
import PocketBase from 'pocketbase';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_CONFIG_FILE = path.join(__dirname, 'db_config.json');

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Configuration de multer pour stocker temporairement les fichiers
  const upload = multer({ storage: multer.memoryStorage() });

  const ENV_WEBHOOK_URL = process.env.WEBHOOK_URL;

  let pb = null;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  /**
   * Proxy de transmission pour contourner CORS
   */
  app.post('/api/transmit', upload.single('file'), async (req, res) => {
    try {
      const { webhookUrl, ...payload } = req.body;
      
      if (!webhookUrl) {
        return res.status(400).json({ success: false, message: "URL Webhook manquante." });
      }

      console.log(`📡 Proxying transmission to: ${webhookUrl}`);

      const formData = new FormData();
      
      if (req.file) {
        const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
        formData.append('file', blob, req.file.originalname);
      }

      Object.entries(payload).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData
      });

      const contentType = response.headers.get("content-type");
      let result = {};
      if (contentType && contentType.includes("application/json")) {
        result = await response.json().catch(() => ({}));
      } else {
        result = { text: await response.text().catch(() => "") };
      }

      if (response.ok) {
        res.json({ success: true, data: result });
      } else {
        res.status(response.status).json({ 
          success: false, 
          message: `Erreur distante (${response.status}): ${response.statusText}`,
          details: result
        });
      }
    } catch (error) {
      console.error('❌ Erreur Proxy Transmit:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // --- Logique PocketBase existante ---
  async function getDbConfig() {
    try {
      const data = await fs.readFile(DB_CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      return {
        url: config.url || process.env.POCKETBASE_URL,
        email: config.email || process.env.POCKETBASE_ADMIN_EMAIL,
        password: config.password || process.env.POCKETBASE_ADMIN_PASSWORD
      };
    } catch (e) {
      return {
        url: process.env.POCKETBASE_URL,
        email: process.env.POCKETBASE_ADMIN_EMAIL,
        password: process.env.POCKETBASE_ADMIN_PASSWORD
      };
    }
  }

  async function saveDbConfig(config) {
    try {
      await fs.writeFile(DB_CONFIG_FILE, JSON.stringify(config, null, 2));
    } catch (e) {
      console.error('⚠️ Impossible d\'écrire db_config.json', e.message);
    }
  }

  async function initPocketBase() {
    const config = await getDbConfig();
    if (!config.url) return false;
    try {
      pb = new PocketBase(config.url);
      pb.autoCancellation(false);
      if (config.email && config.password) {
        await pb.collection('_superusers').authWithPassword(config.email, config.password);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  initPocketBase();

  app.get('/api/admin/db-config', async (req, res) => {
    const config = await getDbConfig();
    res.json({ url: config.url || '', email: config.email || '', hasPassword: !!config.password });
  });

  app.post('/api/admin/db-config', async (req, res) => {
    try {
      const { url, email, password } = req.body;
      const oldConfig = await getDbConfig();
      const newConfig = { url, email, password: password || oldConfig.password };
      await saveDbConfig(newConfig);
      const success = await initPocketBase();
      if (success) res.json({ success: true, message: "Connexion réussie." });
      else res.status(400).json({ success: false, message: "Échec connexion." });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  const requirePb = (req, res, next) => {
    if (!pb || !pb.authStore.isValid) return res.status(503).json({ error: "PB non dispo." });
    next();
  };

  app.get('/api/bootstrap', async (req, res) => {
    try {
      if (!pb || !pb.authStore.isValid) await initPocketBase();
      const [clientsReq, poseursReq, configList] = await Promise.all([
        pb.collection('clients').getFullList({ sort: 'nom' }).catch(() => []), 
        pb.collection('poseurs').getFullList({ sort: 'nom' }).catch(() => []),
        pb.collection('config').getFullList().catch(() => [])
      ]);
      const exportConfig = configList.find(c => c.type === "0");
      const clientConfig = configList.find(c => c.type === "1");
      res.json({
        webhook_url: exportConfig?.webhook_url || ENV_WEBHOOK_URL || "",
        client_webhook_url: clientConfig?.webhook_url || "",
        clients: clientsReq.map(c => ({ id: c.id, nom: c.nom, libelle_client: c.libelle_client, codeClient: c.codeClient, typeAffaire: c.typeAffaire, bpu: c.bpu, default_poseur: c.default_poseur })),
        poseurs: poseursReq.map(p => ({ id: p.id, nom: p.nom, entreprise: p.entreprise, telephone: p.telephone, specialite: p.specialite, codeSalarie: p.codeSalarie, type: p.type, nextcloud_user: p.nextcloud_user }))
      });
    } catch (error) { res.status(500).json({ error: error.message }); }
  });

  // --- Wiki, Clients, Poseurs, Config routes (abrégées pour l'exemple, mais à garder) ---
  app.get('/api/wiki/:slug', requirePb, async (req, res) => {
    try { res.json(await pb.collection('wiki').getFirstListItem(`slug="${req.params.slug}"`)); } 
    catch (e) { res.status(404).json({ error: 'N/A' }); }
  });

  app.post('/api/wiki', requirePb, async (req, res) => {
    try {
      const { slug, content } = req.body;
      let record;
      try {
        record = await pb.collection('wiki').getFirstListItem(`slug="${slug}"`);
        await pb.collection('wiki').update(record.id, { content });
      } catch (e) {
        if (e.status === 404) await pb.collection('wiki').create({ slug, content });
        else throw e;
      }
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

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

  app.post('/api/config', requirePb, async (req, res) => {
    try {
      const { webhook_url, client_webhook_url } = req.body;
      const upsertConfig = async (typeStr, urlValue) => {
         if (urlValue === undefined) return null;
         try {
           const record = await pb.collection('config').getFirstListItem(`type="${typeStr}"`);
           return await pb.collection('config').update(record.id, { webhook_url: urlValue });
         } catch (e) {
           if (e.status === 404) return await pb.collection('config').create({ type: typeStr, webhook_url: urlValue });
           throw e;
         }
      };
      if (webhook_url !== undefined) await upsertConfig("0", webhook_url);
      if (client_webhook_url !== undefined) await upsertConfig("1", client_webhook_url);
      res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BuildScan Server démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
