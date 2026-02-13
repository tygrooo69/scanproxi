
import React, { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';
import { fetchStorageConfig, updateConfig, getDbConfig, updateDbConfig, DbConfig } from '../services/configService';

const AdminSettings: React.FC = () => {
  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState("");
  const [clientWebhookUrl, setClientWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // DB State
  const [dbConfig, setDbConfig] = useState<DbConfig>({ url: '', email: '', password: '' });
  const [dbSaving, setDbSaving] = useState(false);
  const [dbStatus, setDbStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [dbMessage, setDbMessage] = useState('');

  // Test Connection State
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    jwt?: string;
    collections?: number;
  } | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const storeConfig = await fetchStorageConfig();
    if (storeConfig) {
      setWebhookUrl(storeConfig.webhook_url || "");
      setClientWebhookUrl(storeConfig.client_webhook_url || "");
    }

    const dbConf = await getDbConfig();
    if (dbConf) {
      setDbConfig({ 
        url: dbConf.url, 
        email: dbConf.email, 
        password: '', 
        hasPassword: dbConf.hasPassword 
      });
    }
  };

  const handleTestConnection = async () => {
    if (!dbConfig.url || !dbConfig.email || !dbConfig.password) {
      setTestResult({ success: false, message: "Veuillez remplir tous les champs (URL, Email, Mot de passe) pour tester." });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const pb = new PocketBase(dbConfig.url);
      pb.autoCancellation(false);
      const authData = await pb.collection('_superusers').authWithPassword(dbConfig.email, dbConfig.password);
      const collections = await pb.collections.getFullList();

      setTestResult({
        success: true,
        message: "Connexion établie avec succès !",
        jwt: authData.token,
        collections: collections.length
      });

    } catch (err: any) {
      console.error("Test Connection Error:", err);
      let errorMsg = "Erreur inconnue";
      if (err.status === 0) errorMsg = "Impossible de joindre le serveur (Vérifiez l'URL ou CORS).";
      else if (err.status === 401 || err.status === 403) errorMsg = "Identifiants Admin invalides.";
      else if (err.status === 404) errorMsg = "URL invalide ou instance non trouvée.";
      else if (err.message) errorMsg = err.message;
      setTestResult({ success: false, message: errorMsg });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveWebhooks = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookSaving(true);
    setWebhookStatus('idle');
    
    const success = await updateConfig({ 
      webhook_url: webhookUrl,
      client_webhook_url: clientWebhookUrl
    });
    
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
      password: dbConfig.password 
    });

    if (result.success) {
      setDbStatus('success');
      setDbMessage(result.message || 'Connexion réussie');
      setDbConfig(prev => ({ ...prev, password: '', hasPassword: true })); 
      loadConfigs();
    } else {
      setDbStatus('error');
      setDbMessage(result.message || 'Erreur de connexion');
    }
    setDbSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-inner">
              <i className="fas fa-database"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Connexion PocketBase</h2>
              <p className="text-slate-500 text-xs">Configuration de l'instance SGBD cible</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg border flex items-center gap-3 ${testResult?.success ? 'bg-emerald-50 border-emerald-200' : testResult?.success === false ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`w-3 h-3 rounded-full ${testResult?.success ? 'bg-emerald-500 animate-pulse' : testResult?.success === false ? 'bg-red-500' : 'bg-slate-300'}`}></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Statut Backend</p>
              <p className={`text-xs font-bold ${testResult?.success ? 'text-emerald-700' : testResult?.success === false ? 'text-red-700' : 'text-slate-600'}`}>
                {testResult?.success ? 'En ligne' : testResult?.success === false ? 'Déconnecté' : 'Inconnu'}
              </p>
            </div>
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
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border ${
                isTesting 
                  ? 'bg-slate-100 text-slate-400 border-slate-200' 
                  : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300'
              }`}
            >
              {isTesting ? <><i className="fas fa-spinner fa-spin"></i> Test en cours...</> : <><i className="fas fa-plug"></i> Tester la Connexion</>}
            </button>
            <button 
              type="submit" 
              disabled={dbSaving}
              className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm ${
                dbSaving ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-300'
              }`}
            >
              {dbSaving ? 'Sauvegarde...' : 'Sauvegarder la Config'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
        {(!dbConfig.url) && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-lg text-slate-500 font-bold text-sm flex items-center gap-2">
              <i className="fas fa-lock text-slate-400"></i>
              Connectez la Base de Données pour configurer les Webhooks
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-xl shadow-inner">
            <i className="fas fa-network-wired"></i>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Configuration des Flux</h2>
            <p className="text-slate-500 text-xs">Synchronisation n8n / ERP (stocké en base)</p>
          </div>
        </div>
        <form onSubmit={handleSaveWebhooks} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Export (PDF + Data)</label>
            <div className="relative">
                <i className="fas fa-upload absolute left-3 top-3.5 text-slate-400"></i>
                <input 
                type="url" required
                className="w-full pl-10 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-slate-50"
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://n8n.example.com/webhook/export"
                />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Client / Numéro d'Affaire</label>
            <div className="relative">
                <i className="fas fa-search absolute left-3 top-3.5 text-slate-400"></i>
                <input 
                type="url" 
                className="w-full pl-10 p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-slate-50"
                value={clientWebhookUrl}
                onChange={e => setClientWebhookUrl(e.target.value)}
                placeholder="https://n8n.example.com/webhook/get-case-number"
                />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {webhookStatus === 'success' && <span className="text-emerald-600 text-xs font-bold"><i className="fas fa-check-circle"></i> Mis à jour</span>}
              {webhookStatus === 'error' && <span className="text-red-600 text-xs font-bold"><i className="fas fa-times-circle"></i> Erreur</span>}
            </div>
            <button type="submit" disabled={webhookSaving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
