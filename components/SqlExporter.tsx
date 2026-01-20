
import React, { useState, useMemo, useEffect } from 'react';
import { ConstructionOrderData, Client, LogEntry } from '../types';
import Terminal from './Terminal';

interface SqlExporterProps {
  data: ConstructionOrderData;
}

const SqlExporter: React.FC<SqlExporterProps> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const [transmitting, setTransmitting] = useState(false);
  const [transmitStatus, setTransmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const DEFAULT_WEBHOOK_URL = "http://194.116.0.110:5678/webhook-test/857f9b11-6d28-4377-a63b-c431ff3fc324";

  const addLog = (type: LogEntry['type'], message: string, data?: any) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setLogs(prev => [...prev, newLog]);
  };

  const clearLogs = () => setLogs([]);

  // Log de démarrage à l'affichage des résultats
  useEffect(() => {
    const lastSync = localStorage.getItem('buildscan_last_sync');
    addLog('info', `Système prêt. Mode Fichier Local détecté.`);
    addLog('info', `Base de données 'storage.json' chargée et synchronisée.`);
    
    if (lastSync) {
      addLog('info', `Dernière synchronisation : ${new Date(lastSync).toLocaleString()}`);
    }
  }, []);

  // Recherche du mapping client
  const mappedClient = useMemo(() => {
    if (!data.nom_client) return null;
    const saved = localStorage.getItem('buildscan_clients');
    if (!saved) return null;
    try {
      const clients: Client[] = JSON.parse(saved);
      const searchName = data.nom_client.toLowerCase().trim();
      return clients.find(c => {
        const clientRefNom = c.nom.toLowerCase().trim();
        return searchName === clientRefNom || 
               searchName.includes(clientRefNom) || 
               clientRefNom.includes(searchName);
      });
    } catch (e) {
      return null;
    }
  }, [data.nom_client]);

  const escapeSql = (str: string | null) => str ? str.replace(/'/g, "''").trim() : "";
  
  const soc = "SAM";
  const ets = "001";
  const secteur = "80";
  const phase = "0";
  
  const chantier = escapeSql(data.num_bon_travaux).replace(/\D/g, '').substring(0, 6) || "000000";
  const imputation = `${secteur}${chantier}${phase}`;
  
  const fullAddress = escapeSql(data.adresse_intervention);
  const cpMatch = fullAddress.match(/\d{5}/);
  const codePostal = cpMatch ? cpMatch[0] : "";
  
  const codeCliFour = mappedClient ? mappedClient.codeClient : "";
  const codeTrv = mappedClient?.typeAffaire || "O3-0";

  const sqlInsert = `INSERT INTO \`a_cht\` 
(\`soc\`, \`ets\`, \`secteur\`, \`chantier\`, \`phase\`, \`imputation\`, \`libelle1\`, \`descriptif_tvx\`, \`descriptif_trvx2\`, \`code_postal\`, \`inter_cli\`, \`tel_cli\`, \`code_ouvert\`, \`code_raz_fin_exo\`, \`code_clifour\`, \`code_trv\`) 
VALUES 
(
  '${soc}', 
  '${ets}', 
  '${secteur}', 
  '${chantier}', 
  '${phase}', 
  '${imputation}', 
  '${escapeSql(data.nom_client).substring(0, 40)}', 
  '<p>Import BuildScan AI : ${escapeSql(data.coord_gardien)}</p>', 
  '${fullAddress.substring(0, 120)}', 
  '${codePostal}', 
  '${escapeSql(data.nom_client).substring(0, 40)}', 
  '${escapeSql(data.coord_gardien).substring(0, 30)}', 
  '4', 
  'N',
  '${codeCliFour}',
  '${codeTrv}'
);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlInsert);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const transmitToWebhook = async () => {
    setTransmitting(true);
    setTransmitStatus('idle');
    
    const webhookUrl = localStorage.getItem('buildscan_webhook_url') || DEFAULT_WEBHOOK_URL;
    
    const payload = {
      codeClient: codeCliFour,
      code_trv: codeTrv,
      num_chantier: chantier,
      libelle: data.nom_client,
      imputation: imputation,
      source: "BuildScan AI",
      timestamp: new Date().toISOString()
    };

    addLog('request', `Initialisation de la transmission vers ${webhookUrl.substring(0, 30)}...`, payload);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : { status: 'Empty response' };
      } catch (e) {
        responseData = { raw: responseText };
      }

      if (response.ok) {
        setTransmitStatus('success');
        addLog('response', `Réponse reçue (HTTP ${response.status} OK)`, responseData);
      } else {
        throw new Error(`Serveur a répondu avec le statut ${response.status}`);
      }
    } catch (err: any) {
      console.error("Erreur Webhook:", err);
      setTransmitStatus('error');
      addLog('error', `Échec de la transmission: ${err.message}`, { error: err.toString() });
    } finally {
      setTransmitting(false);
      setTimeout(() => setTransmitStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 animate-in slide-in-from-bottom-2 duration-500">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center">
              <i className="fas fa-network-wired text-sm"></i>
            </div>
            <div>
              <h3 className="text-white font-bold uppercase tracking-wider text-xs">Intégration <span className="text-blue-400">ERP Connect</span></h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Injection directe & SQL</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={copyToClipboard}
              className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-2 ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
            >
              {copied ? <><i className="fas fa-check"></i> SQL Copié</> : <><i className="fas fa-copy"></i> Copier SQL</>}
            </button>
            
            <button 
              disabled={transmitting || !mappedClient}
              onClick={transmitToWebhook}
              className={`px-4 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-2 shadow-lg ${
                transmitStatus === 'success' ? 'bg-green-600 text-white' : 
                transmitStatus === 'error' ? 'bg-red-600 text-white' :
                !mappedClient ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' :
                'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/40'
              }`}
            >
              {transmitting ? (
                <><i className="fas fa-circle-notch animate-spin"></i> Transmission...</>
              ) : transmitStatus === 'success' ? (
                <><i className="fas fa-check-double"></i> Transmis avec succès</>
              ) : transmitStatus === 'error' ? (
                <><i className="fas fa-exclamation-circle"></i> Échec envoi</>
              ) : (
                <><i className="fas fa-paper-plane"></i> Transmettre à l'ERP</>
              )}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${mappedClient ? 'bg-emerald-900/20 border-emerald-800' : 'bg-amber-900/20 border-amber-800'}`}>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Code Client Identifié</p>
                <p className={`text-sm font-mono font-bold ${mappedClient ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {codeCliFour || 'MANQUANT'}
                </p>
              </div>
              {mappedClient ? <i className="fas fa-link text-emerald-500"></i> : <i className="fas fa-unlink text-amber-500"></i>}
            </div>
            <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Code Travaux (Affaire)</p>
                <p className="text-sm font-mono font-bold text-blue-400">{codeTrv}</p>
              </div>
              <i className="fas fa-folder-open text-blue-500"></i>
            </div>
          </div>

          <div className="relative group">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              Script SQL a_cht 
              <span className="h-px bg-slate-800 flex-grow"></span>
            </p>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-800 bg-black/40 p-3">
              <pre className="text-emerald-300 text-[10px] font-mono leading-relaxed whitespace-pre-wrap opacity-70 group-hover:opacity-100 transition-opacity">
                {sqlInsert}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-800/30 px-6 py-2 flex items-center justify-between border-t border-slate-800">
          <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${mappedClient ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`}></span>
              <p className="text-[9px] text-slate-500 font-medium italic">
                  {mappedClient ? `Liaison établie avec ${mappedClient.nom}` : 'En attente de mapping client pour transmission'}
              </p>
          </div>
          <div className="text-[9px] text-slate-600 font-bold font-mono">ENDPOINT: {localStorage.getItem('buildscan_webhook_url')?.substring(0, 20) || '194.116.0.110'}...</div>
        </div>
      </div>

      <Terminal logs={logs} onClear={clearLogs} />
    </div>
  );
};

export default SqlExporter;
