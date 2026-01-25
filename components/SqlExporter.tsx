import React, { useState, useMemo, useEffect } from 'react';
import { ConstructionOrderData, Client, LogEntry } from '../types';
import Terminal from './Terminal';

interface SqlExporterProps {
  data: ConstructionOrderData;
  originalFile?: File;
}

const SqlExporter: React.FC<SqlExporterProps> = ({ data, originalFile }) => {
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

  useEffect(() => {
    addLog('info', `Système prêt. Module de transmission binaire activé.`);
    addLog('info', `En attente d'envoi vers n8n via Multipart FormData.`);
  }, []);

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
  const descTravaux = escapeSql(data.descriptif_travaux);

  const sqlInsert = `INSERT INTO \`a_cht\` 
(\`soc\`, \`ets\`, \`secteur\`, \`chantier\`, \`phase\`, \`imputation\`, \`libelle1\`, \`descriptif_tvx\`, \`descriptif_trvx2\`, \`code_postal\`, \`inter_cli\`, \`tel_cli\`, \`code_ouvert\`, \`code_raz_fin_exo\`, \`code_clifour\`, \`code_trv\`) 
VALUES ('${soc}', '${ets}', '${secteur}', '${chantier}', '${phase}', '${imputation}', '${escapeSql(data.nom_client).substring(0, 40)}', '<p>Import BuildScan AI : ${descTravaux.substring(0, 500)}</p>', '${fullAddress.substring(0, 120)}', '${codePostal}', '${escapeSql(data.nom_client).substring(0, 40)}', '${escapeSql(data.coord_gardien).substring(0, 30)}', '4', 'N', '${codeCliFour}', '${codeTrv}');`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlInsert);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const transmitToWebhook = async () => {
    setTransmitting(true);
    setTransmitStatus('idle');
    const webhookUrl = localStorage.getItem('buildscan_webhook_url') || DEFAULT_WEBHOOK_URL;
    
    // Création du FormData pour un envoi MULTIPART
    // C'est ce qui permet à n8n de voir le PDF comme un fichier binaire réel
    const formData = new FormData();
    
    if (originalFile) {
      formData.append('file', originalFile, 'document.pdf');
    }
    
    // --- Données ERP / Calculées ---
    formData.append('codeClient', codeCliFour);
    formData.append('code_trv', codeTrv);
    formData.append('num_chantier', chantier);
    formData.append('imputation', imputation);
    formData.append('source', "BuildScan AI");
    formData.append('timestamp', new Date().toISOString());

    // --- Données Brutes Extraites (Intégralité) ---
    formData.append('num_bon_travaux', data.num_bon_travaux || '');
    formData.append('nom_client', data.nom_client || '');
    formData.append('adresse_intervention', data.adresse_intervention || '');
    formData.append('coord_gardien', data.coord_gardien || '');
    formData.append('delai_intervention', data.delai_intervention || '');
    formData.append('date_intervention', data.date_intervention || '');
    formData.append('descriptif_travaux', data.descriptif_travaux || '');
    
    // Alias pour compatibilité existante
    formData.append('libelle', data.nom_client || '');

    addLog('request', `Envoi Multipart/FormData vers n8n... (Fichier inclus : ${originalFile ? 'OUI' : 'NON'})`, {
      codeClient: codeCliFour,
      imputation: imputation,
      adresse: data.adresse_intervention,
      fileSize: originalFile ? `${(originalFile.size / 1024).toFixed(2)} KB` : 'N/A'
    });

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        // Note: Ne PAS mettre de Content-Type header, le navigateur le fera automatiquement avec le boundary pour FormData
        body: formData
      });

      if (response.ok) {
        setTransmitStatus('success');
        addLog('response', `Réponse n8n : Succès (HTTP ${response.status})`);
      } else {
        throw new Error(`Erreur n8n : ${response.status}`);
      }
    } catch (err: any) {
      console.error("Erreur Webhook:", err);
      setTransmitStatus('error');
      addLog('error', `Échec transmission: ${err.message}`);
    } finally {
      setTransmitting(false);
      setTimeout(() => setTransmitStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center">
              <i className="fas fa-network-wired text-sm"></i>
            </div>
            <div>
              <h3 className="text-white font-bold uppercase tracking-wider text-xs">Intégration <span className="text-blue-400">n8n / ERP</span></h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Transmission Binaire</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={copyToClipboard}
              className={`px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all flex items-center gap-2 ${copied ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}
            >
              {copied ? 'SQL Copié' : 'Copier SQL'}
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
              {transmitting ? 'Envoi...' : transmitStatus === 'success' ? 'Transmis !' : 'Transmettre à n8n'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className={`p-3 rounded-lg border flex items-center justify-between transition-all ${mappedClient ? 'bg-emerald-900/20 border-emerald-800' : 'bg-amber-900/20 border-amber-800'}`}>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Code Client</p>
                <p className={`text-sm font-mono font-bold ${mappedClient ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {codeCliFour || 'MANQUANT'}
                </p>
              </div>
              {mappedClient ? <i className="fas fa-link text-emerald-500"></i> : <i className="fas fa-unlink text-amber-500"></i>}
            </div>
            <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Affaire</p>
                <p className="text-sm font-mono font-bold text-blue-400">{codeTrv}</p>
              </div>
              <i className="fas fa-folder-open text-blue-500"></i>
            </div>
          </div>

          <div className="relative group">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Script SQL de secours</p>
            <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-800 bg-black/40 p-3">
              <pre className="text-emerald-300 text-[10px] font-mono leading-relaxed whitespace-pre-wrap opacity-70 group-hover:opacity-100 transition-opacity">
                {sqlInsert}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <Terminal logs={logs} onClear={clearLogs} />
    </div>
  );
};

export default SqlExporter;