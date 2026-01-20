import React, { useState, useEffect } from 'react';
import { fetchStorageConfig, syncLocalStorageWithFile, exportCurrentConfigAsJson } from '../services/configService';

const AdminWebhook: React.FC = () => {
  const DEFAULT_WEBHOOK = "http://194.116.0.110:5678/webhook-test/857f9b11-6d28-4377-a63b-c431ff3fc324";
  const [url, setUrl] = useState(DEFAULT_WEBHOOK);
  const [saved, setSaved] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('buildscan_webhook_url');
    if (stored) {
      setUrl(stored);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('buildscan_webhook_url', url);
    localStorage.setItem('buildscan_data_source', 'modified');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSyncFromServer = async () => {
    if (!confirm("Voulez-vous écraser vos paramètres locaux par la base de données serveur (storage.json) ?")) return;
    
    setSyncing(true);
    const config = await fetchStorageConfig();
    if (config) {
      syncLocalStorageWithFile(config);
      setUrl(config.webhook_url);
      setSaved(true);
      setTimeout(() => {
          setSaved(false);
          window.location.reload();
      }, 1000);
    } else {
      alert("Erreur lors de la récupération de la configuration serveur.");
    }
    setSyncing(false);
  };

  const handleExport = () => {
    exportCurrentConfigAsJson();
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl">
              <i className="fas fa-network-wired"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Configuration Webhook</h2>
              <p className="text-slate-500 text-sm">Définissez l'URL de destination ERP.</p>
            </div>
          </div>
          <button 
            onClick={handleSyncFromServer}
            disabled={syncing}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-2 border border-slate-200"
          >
            {syncing ? <i className="fas fa-sync animate-spin"></i> : <i className="fas fa-cloud-download-alt"></i>}
            Sync Serveur
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">URL du Webhook (n8n / API Target)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <i className="fas fa-link text-xs"></i>
              </div>
              <input 
                type="url" 
                required
                className="w-full pl-9 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-slate-50"
                placeholder="https://votre-serveur.com/webhook/..."
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
            <i className="fas fa-info-circle text-amber-500 mt-0.5"></i>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Les modifications sont enregistrées dans votre navigateur. Pour les rendre permanentes pour tous, utilisez l'exportation ci-dessous.
            </p>
          </div>

          <div className="flex justify-end gap-3">
             <button 
              type="submit" 
              className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
                saved ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
              }`}
            >
              {saved ? <><i className="fas fa-check"></i> Enregistré Localement</> : <><i className="fas fa-save"></i> Sauvegarder Localement</>}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-900 rounded-xl p-8 text-white border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center">
                <i className="fas fa-file-export"></i>
            </div>
            <div>
                <h3 className="text-lg font-bold">Permanence Serveur</h3>
                <p className="text-slate-400 text-xs">Téléchargez votre configuration pour mettre à jour le fichier storage.json du serveur.</p>
            </div>
        </div>
        
        <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-xs text-slate-300 leading-relaxed">
            <ol className="list-decimal list-inside space-y-2">
                <li>Configurez vos clients, poseurs et votre webhook.</li>
                <li>Cliquez sur <strong>"Exporter storage.json"</strong> ci-dessous.</li>
                <li>Remplacez le fichier <code>storage.json</code> à la racine de votre déploiement Docker par celui téléchargé.</li>
                <li>Redémarrez le conteneur si nécessaire.</li>
            </ol>
        </div>

        <button 
            onClick={handleExport}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-900/20"
        >
            <i className="fas fa-download"></i>
            Exporter storage.json
        </button>
      </div>
    </div>
  );
};

export default AdminWebhook;