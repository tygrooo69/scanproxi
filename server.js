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

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir les fichiers statiques du build Vite
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Valeurs par défaut au cas où aucun fichier n'existe
 */
const DEFAULT_CONFIG = {
  webhook_url: "http://194.116.0.110:5678/webhook-test/857f9b11-6d28-4377-a63b-c431ff3fc324",
  clients: [
    {
      "id": "def-1",
      "nom": "OPH DE DRANCY",
      "codeClient": "411DRA038",
      "typeAffaire": "O3-0"
    },
    {
      "id": "def-2",
      "nom": "VILOGIA",
      "codeClient": "411VIL001",
      "typeAffaire": "O1-A"
    }
  ],
  poseurs: [
    {
      "id": "p-1",
      "nom": "Equipe A - Standard",
      "entreprise": "SAMDB",
      "telephone": "0148365214",
      "specialite": "Menuiserie",
      "codeSalarie": "SAM-A1"
    }
  ]
};

/**
 * GET /api/config
 * Tente de lire storage.json, sinon renvoie le défaut.
 */
app.get('/api/config', async (req, res) => {
  try {
    try {
      const storageContent = await fs.readFile(STORAGE_FILE, 'utf-8');
      return res.json(JSON.parse(storageContent));
    } catch (err) {
      console.log("storage.json non trouvé, utilisation de la config par défaut.");
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