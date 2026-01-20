
import React, { useState, useEffect } from 'react';
// Fix: Use correct exported function names from configService
import { fetchStorageConfig, syncLocalStorageWithFile } from '../services/configService';

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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSyncFromServer = async () => {
    if (!confirm("Voulez-vous écraser vos paramètres locaux par la base de données serveur ?")) return;
    
    setSyncing(true);
    // Fix: Use fetchStorageConfig instead of fetchGlobalConfig
    const config = await fetchStorageConfig();
    if (config) {
      // Fix: Use syncLocalStorageWithFile instead of initializeAppFromConfig
      syncLocalStorageWithFile(config);
      setUrl(config.webhook_url);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      alert("Erreur lors de la récupération de la configuration serveur.");
    }
    setSyncing(false);
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
            Base Serveur
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
              Cette URL sera utilisée par le bouton <strong>"Transmettre à l'ERP"</strong>.
            </p>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              className={`px-8 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 ${
                saved ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
              }`}
            >
              {saved ? <><i className="fas fa-check"></i> Configuration Enregistrée</> : <><i className="fas fa-save"></i> Sauvegarder l'URL</>}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-900 rounded-xl p-6 text-white border border-slate-800">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Dernière Synchronisation Serveur</h3>
        <div className="text-[10px] text-slate-400 font-mono">
          {localStorage.getItem('buildscan_initialized') ? "Statut : Connecté à la base serveur" : "Statut : Local uniquement"}
        </div>
      </div>
    </div>
  );
};

export default AdminWebhook;
