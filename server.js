import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Servir les fichiers statiques du dossier dist (généré par npm run build)
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Valeurs par défaut si storage.json est manquant
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
 * Renvoie le contenu de storage.json
 */
app.get('/api/config', async (req, res) => {
  try {
    try {
      const storageContent = await fs.readFile(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(storageContent);
      return res.json(data);
    } catch (err) {
      console.log("storage.json absent ou corrompu, renvoi des valeurs par défaut.");
      return res.json(DEFAULT_CONFIG);
    }
  } catch (error) {
    console.error("Erreur API GET config:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * POST /api/config
 * Sauvegarde la configuration reçue dans storage.json
 */
app.post('/api/config', async (req, res) => {
  try {
    const config = req.body;
    await fs.writeFile(STORAGE_FILE, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true });
  } catch (error) {
    console.error("Erreur API POST config:", error);
    res.status(500).json({ error: "Impossible d'écrire le fichier storage.json" });
  }
});

// Support SPA : redirige toutes les routes non-API vers index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur BuildScan AI opérationnel sur le port ${PORT}`);
  console.log(`📂 Stockage : ${STORAGE_FILE}`);
});