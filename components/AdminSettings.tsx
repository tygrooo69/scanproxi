import React, { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';
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
      // Si une config existe déjà, on tente un test silencieux pour mettre à jour le statut
      if (dbConf.url) {
        // Optionnel : on pourrait vérifier la connectivité ici au chargement
      }
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
      // 1. Instanciation SDK PocketBase
      const pb = new PocketBase(dbConfig.url);
      pb.autoCancellation(false);

      // 2. Authentification Admin
      const authData = await pb.admins.authWithPassword(dbConfig.email, dbConfig.password);
      
      // 3. Test de lecture (Lister les collections pour vérifier les droits et la connectivité)
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

      setTestResult({
        success: false,
        message: errorMsg
      });
    } finally {
      setIsTesting(false);
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
          
          {/* Section STATUT Temps Réel (Résultat du dernier test) */}
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

          {/* Zone de feedback Test */}
          {testResult && (
            <div className={`mt-4 p-4 rounded-lg border ${testResult.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} animate-in slide-in-from-top-2`}>
              <div className="flex items-start gap-3">
                <i className={`fas ${testResult.success ? 'fa-check-circle text-emerald-500' : 'fa-times-circle text-red-500'} mt-1`}></i>
                <div className="w-full overflow-hidden">
                  <h4 className={`font-bold text-sm ${testResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                    {testResult.success ? 'Connexion réussie !' : 'Échec de la connexion'}
                  </h4>
                  <p className={`text-xs mt-1 ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>{testResult.message}</p>
                  
                  {testResult.success && testResult.jwt && (
                    <div className="mt-3 bg-white/50 p-2 rounded border border-emerald-200/50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold text-emerald-700 uppercase">Token Admin (JWT)</span>
                        <span className="text-[9px] font-bold text-emerald-700 uppercase">{testResult.collections} Collections trouvées</span>
                      </div>
                      <code className="block font-mono text-[10px] text-emerald-600 break-all select-all">
                        {testResult.jwt.substring(0, 50)}...{testResult.jwt.substring(testResult.jwt.length - 10)}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              {isTesting ? (
                <><i className="fas fa-spinner fa-spin"></i> Test en cours...</>
              ) : (
                <><i className="fas fa-plug"></i> Tester la Connexion</>
              )}
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
          
          <div className="text-right text-xs">
            {dbStatus === 'success' && <span className="text-emerald-600 font-bold"><i className="fas fa-check"></i> {dbMessage}</span>}
            {dbStatus === 'error' && <span className="text-red-600 font-bold"><i className="fas fa-times"></i> {dbMessage}</span>}
          </div>
        </form>
      </div>

      {/* SECTION WEBHOOK */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 relative overflow-hidden">
        {/* Overlay si DB non connectée */}
        {(!dbConfig.url || (testResult?.success === false && !dbConfig.hasPassword)) && (
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