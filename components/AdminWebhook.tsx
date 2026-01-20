
import React, { useState, useEffect } from 'react';
import { fetchStorageConfig, updatePartialConfig } from '../services/configService';

const AdminWebhook: React.FC = () => {
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      const config = await fetchStorageConfig();
      if (config) setUrl(config.webhook_url);
    };
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus('idle');
    
    const success = await updatePartialConfig({ webhook_url: url });
    if (success) {
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } else {
      setStatus('error');
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl">
            <i className="fas fa-network-wired"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Configuration Webhook</h2>
            <p className="text-slate-500 text-sm">Destination ERP (Automatique via serveur)</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">URL du Webhook</label>
            <input 
              type="url" 
              required
              className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-slate-50"
              placeholder="http://..."
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status === 'success' && <span className="text-emerald-600 text-xs font-bold"><i className="fas fa-check-circle"></i> Sauvegardé sur storage.json</span>}
              {status === 'error' && <span className="text-red-600 text-xs font-bold"><i className="fas fa-times-circle"></i> Erreur serveur</span>}
            </div>
            <button 
              type="submit" 
              disabled={isSaving}
              className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${
                isSaving ? 'bg-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSaving ? <i className="fas fa-sync animate-spin"></i> : <i className="fas fa-save"></i>}
              Sauvegarder sur le Serveur
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex gap-3 text-xs text-slate-500 italic">
        <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
        Toute modification ici est immédiatement répercutée dans le fichier storage.json du serveur. Aucun export manuel n'est requis.
      </div>
    </div>
  );
};

export default AdminWebhook;
