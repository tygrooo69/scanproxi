import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import PocketBase from 'pocketbase';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration PocketBase
const PB_URL = process.env.POCKETBASE_URL;
const PB_EMAIL = process.env.POCKETBASE_ADMIN_EMAIL;
const PB_PASSWORD = process.env.POCKETBASE_ADMIN_PASSWORD;

const pb = new PocketBase(PB_URL);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// Authentification Admin automatique au démarrage
async function authPocketBase() {
  try {
    if (PB_EMAIL && PB_PASSWORD) {
      await pb.admins.authWithPassword(PB_EMAIL, PB_PASSWORD);
      console.log('✅ Connecté à PocketBase Admin');
    } else {
      console.warn('⚠️ Identifiants PocketBase manquants dans .env');
    }
  } catch (error) {
    console.error('❌ Erreur Auth PocketBase:', error.originalError || error);
  }
}
authPocketBase();

// --- API ENDPOINTS ---

/**
 * GET /api/bootstrap
 * Récupère toute la configuration nécessaire pour l'app (Clients + Config Webhook)
 * Optimisé pour le chargement initial.
 */
app.get('/api/bootstrap', async (req, res) => {
  try {
    // Récupération parallèle
    const [clientsReq, poseursReq, configReq] = await Promise.all([
      pb.collection('clients').getFullList({ sort: 'nom' }),
      pb.collection('poseurs').getFullList({ sort: 'nom' }),
      pb.collection('config').getFirstListItem('')
        .catch(() => ({ webhook_url: "http://default-webhook.com" })) // Fallback si config vide
    ]);

    const fullConfig = {
      webhook_url: configReq.webhook_url,
      clients: clientsReq.map(c => ({ id: c.id, nom: c.nom, codeClient: c.codeClient, typeAffaire: c.typeAffaire })),
      poseurs: poseursReq.map(p => ({ id: p.id, nom: p.nom, entreprise: p.entreprise, telephone: p.telephone, specialite: p.specialite, codeSalarie: p.codeSalarie }))
    };

    res.json(fullConfig);
  } catch (error) {
    console.error('Erreur Bootstrap:', error);
    res.status(500).json({ error: "Erreur lors de la récupération des données" });
  }
});

// --- CLIENTS ---
app.post('/api/clients', async (req, res) => {
  try {
    const record = await pb.collection('clients').create(req.body);
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const record = await pb.collection('clients').update(req.params.id, req.body);
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    await pb.collection('clients').delete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- POSEURS ---
app.post('/api/poseurs', async (req, res) => {
  try {
    const record = await pb.collection('poseurs').create(req.body);
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/poseurs/:id', async (req, res) => {
  try {
    const record = await pb.collection('poseurs').update(req.params.id, req.body);
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/poseurs/:id', async (req, res) => {
  try {
    await pb.collection('poseurs').delete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CONFIG (WEBHOOK) ---
app.post('/api/config', async (req, res) => {
  try {
    // On essaie de récupérer la config existante, sinon on crée
    let record;
    try {
      const existing = await pb.collection('config').getFirstListItem('');
      record = await pb.collection('config').update(existing.id, req.body);
    } catch (e) {
      record = await pb.collection('config').create(req.body);
    }
    res.json(record);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Support SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur BuildScan AI (PocketBase Edition) sur le port ${PORT}`);
});