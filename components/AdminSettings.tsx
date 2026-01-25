import React, { useState, useEffect } from 'react';
import { fetchStorageConfig, updateWebhookUrl, getDbConfig, updateDbConfig, DbConfig } from '../services/configService';

const AdminSettings: React.FC = () => {
  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // DB State
  const [dbConfig, setDbConfig] = useState<DbConfig>({ url: '', email: '', password: '' });
  const [dbSaving, setDbSaving] = useState(false);
  const [dbStatus, setDbStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [dbMessage, setDbMessage] = useState('');

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    // Charger Webhook (depuis DB)
    const storeConfig = await fetchStorageConfig();
    if (storeConfig) setWebhookUrl(storeConfig.webhook_url);

    // Charger DB Config (depuis Serveur Local)
    const dbConf = await getDbConfig();
    if (dbConf) {
      setDbConfig({ 
        url: dbConf.url, 
        email: dbConf.email, 
        password: '', // On ne récupère jamais le mot de passe réel pour l'afficher
        hasPassword: dbConf.hasPassword 
      });
    }
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookSaving(true);
    setWebhookStatus('idle');
    
    const success = await updateWebhookUrl(webhookUrl);
    if (success) {
      setWebhookStatus('success');
      setTimeout(() => setWebhookStatus('idle'), 3000);
    } else {
      setWebhookStatus('error');
    }
    setWebhookSaving(false);
  };

  const handleSaveDb = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbSaving(true);
    setDbStatus('idle');
    setDbMessage('');

    const result = await updateDbConfig({
      url: dbConfig.url,
      email: dbConfig.email,
      password: dbConfig.password // Si vide, le serveur garde l'ancien
    });

    if (result.success) {
      setDbStatus('success');
      setDbMessage(result.message || 'Connexion réussie');
      setDbConfig(prev => ({ ...prev, password: '', hasPassword: true })); // Reset champ password
      // Recharger le webhook car la DB a pu changer
      const storeConfig = await fetchStorageConfig();
      if (storeConfig) setWebhookUrl(storeConfig.webhook_url);
    } else {
      setDbStatus('error');
      setDbMessage(result.message || 'Erreur de connexion');
    }
    setDbSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* SECTION BASE DE DONNEES */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-inner">
            <i className="fas fa-database"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Connexion PocketBase</h2>
            <p className="text-slate-500 text-xs">Configuration de l'instance SGBD cible</p>
          </div>
        </div>

        <form onSubmit={handleSaveDb} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">URL Instance</label>
              <div className="relative">
                <i className="fas fa-globe absolute left-3 top-3.5 text-slate-400"></i>
                <input 
                  type="url" required
                  className="w-full pl-10 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm bg-slate-50"
                  placeholder="https://votre-instance.pockethost.io"
                  value={dbConfig.url}
                  onChange={e => setDbConfig({...dbConfig, url: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Email Admin</label>
              <div className="relative">
                <i className="fas fa-envelope absolute left-3 top-3.5 text-slate-400"></i>
                <input 
                  type="email" required
                  className="w-full pl-10 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50"
                  value={dbConfig.email}
                  onChange={e => setDbConfig({...dbConfig, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                Mot de Passe {dbConfig.hasPassword && <span className="text-emerald-500">(Configuré)</span>}
              </label>
              <div className="relative">
                <i className="fas fa-key absolute left-3 top-3.5 text-slate-400"></i>
                <input 
                  type="password"
                  className="w-full pl-10 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 placeholder:italic"
                  placeholder={dbConfig.hasPassword ? "•••••••• (Laisser vide pour garder)" : "Mot de passe Admin"}
                  value={dbConfig.password}
                  onChange={e => setDbConfig({...dbConfig, password: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm">
              {dbStatus === 'success' && <span className="text-emerald-600 font-bold flex items-center gap-2"><i className="fas fa-check-circle"></i> {dbMessage}</span>}
              {dbStatus === 'error' && <span className="text-red-600 font-bold flex items-center gap-2"><i className="fas fa-times-circle"></i> {dbMessage}</span>}
            </div>
            <button 
              type="submit" 
              disabled={dbSaving}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm ${
                dbSaving ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              {dbSaving ? 'Connexion...' : 'Tester & Sauvegarder'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION WEBHOOK */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
        {/* Overlay si DB non connectée */}
        {(!dbConfig.url || dbStatus === 'error') && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-lg text-slate-500 font-bold text-sm flex items-center gap-2">
              <i className="fas fa-lock text-slate-400"></i>
              Connectez la Base de Données pour configurer le Webhook
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl shadow-inner">
            <i className="fas fa-network-wired"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Configuration Webhook</h2>
            <p className="text-slate-500 text-xs">Synchronisation n8n / ERP (stocké en base)</p>
          </div>
        </div>

        <form onSubmit={handleSaveWebhook} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Endpoint</label>
            <div className="relative">
                <i className="fas fa-bolt absolute left-3 top-3.5 text-slate-400"></i>
                <input 
                type="url" 
                required
                className="w-full pl-10 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-slate-50"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {webhookStatus === 'success' && <span className="text-emerald-600 text-xs font-bold"><i className="fas fa-check-circle"></i> Mis à jour</span>}
              {webhookStatus === 'error' && <span className="text-red-600 text-xs font-bold"><i className="fas fa-times-circle"></i> Erreur lors de l'enregistrement</span>}
            </div>
            <button 
              type="submit" 
              disabled={webhookSaving}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm ${
                webhookSaving ? 'bg-slate-300 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
              }`}
            >
              {webhookSaving ? '...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;