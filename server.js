import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir les fichiers statiques du build Vite
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Valeurs par défaut au cas où aucun fichier n'existe
 */
const DEFAULT_CONFIG = {
  webhook_url: "http://194.116.0.110:5678/webhook-test/857f9b11-6d28-4377-a63b-c431ff3fc324",
  clients: [],
  poseurs: []
};

/**
 * GET /api/config
 * Tente de lire storage.json, puis config.json, sinon renvoie le défaut.
 */
app.get('/api/config', async (req, res) => {
  try {
    // 1. Essai storage.json (données utilisateur)
    try {
      const storageContent = await fs.readFile(STORAGE_FILE, 'utf-8');
      return res.json(JSON.parse(storageContent));
    } catch (err) {
      console.log("storage.json non trouvé, essai config.json...");
    }

    // 2. Essai config.json (données par défaut du repo)
    try {
      const configContent = await fs.readFile(CONFIG_FILE, 'utf-8');
      const configData = JSON.parse(configContent);
      return res.json({
        webhook_url: configData.webhook_url || DEFAULT_CONFIG.webhook_url,
        clients: configData.clients || configData.default_clients || [],
        poseurs: configData.poseurs || configData.default_poseurs || []
      });
    } catch (err) {
      // 3. Fallback ultime
      console.log("Aucun fichier trouvé, utilisation de la config par défaut.");
      return res.json(DEFAULT_CONFIG);
    }
  } catch (error) {
    console.error("Erreur critique API config:", error);
    res.status(500).json({ error: "Erreur serveur lors du chargement de la config" });
  }
});

/**
 * POST /api/config
 * Enregistre les modifications sur le serveur
 */
app.post('/api/config', async (req, res) => {
  try {
    const config = req.body;
    await fs.writeFile(STORAGE_FILE, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur écriture serveur:", error);
    res.status(500).json({ error: "Impossible d'écrire sur le serveur" });
  }
});

// Support SPA : redirige tout vers index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur BuildScan AI prêt sur le port ${PORT}`);
});