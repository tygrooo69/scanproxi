import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ConstructionOrderData, Client, LogEntry, Poseur } from '../types';
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
  
  // Poseurs State
  const [poseurs, setPoseurs] = useState<Poseur[]>([]);
  const [selectedPoseurId, setSelectedPoseurId] = useState<string>("");

  // State for editable case number
  const escapeSql = (str: string | null) => str ? str.replace(/'/g, "''").trim() : "";
  const [chantierInput, setChantierInput] = useState<string>(() => 
    escapeSql(data.num_bon_travaux).replace(/\D/g, '').substring(0, 6) || "000000"
  );
  const [fetchingChantier, setFetchingChantier] = useState(false);

  const DEFAULT_WEBHOOK_URL = "http://194.116.0.110:5678/webhook-test/857f9b11-6d28-4377-a63b-c431ff3fc324";

  // Memoization de addLog pour l'utiliser dans les useEffect
  const addLog = useCallback((type: LogEntry['type'], message: string, data?: any) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      data
    };
    setLogs(prev => [...prev, newLog]);
  }, []);

  const clearLogs = () => setLogs([]);

  useEffect(() => {
    addLog('info', `Système prêt. Module de transmission binaire activé.`);
    addLog('info', `En attente d'envoi vers n8n via Multipart FormData.`);
    
    // Charger les poseurs
    const savedPoseurs = localStorage.getItem('buildscan_poseurs');
    if (savedPoseurs) {
      setPoseurs(JSON.parse(savedPoseurs));
    }
  }, [addLog]);

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

  // Présélection intelligente et AUTOMATIQUE du poseur
  // Se déclenche à chaque fois que le Type Affaire du client change (nouvelle analyse ou mapping)
  useEffect(() => {
    if (mappedClient?.typeAffaire && poseurs.length > 0) {
      // On cherche un poseur qui a le même 'type' que le 'typeAffaire' du client
      const match = poseurs.find(p => p.type === mappedClient.typeAffaire);
      
      if (match) {
        setSelectedPoseurId(match.id);
        addLog('info', `Poseur assigné automatiquement : ${match.nom}`, {
          type_match: match.type,
          client_type: mappedClient.typeAffaire
        });
      }
    }
  }, [mappedClient?.typeAffaire, poseurs, addLog]);

  const selectedPoseur = useMemo(() => 
    poseurs.find(p => p.id === selectedPoseurId), 
  [poseurs, selectedPoseurId]);

  const fullAddress = [data.adresse_1, data.adresse_2, data.adresse_3]
    .filter(Boolean)
    .join(' ');
  const safeAddress = escapeSql(fullAddress);

  const soc = "SAM";
  const ets = "001";
  const secteur = "80";
  const phase = "0";
  
  // Use state variable for chantier
  const chantier = chantierInput;
  const imputation = `${secteur}${chantier}${phase}`;
  
  const cpSource = data.adresse_3 || fullAddress;
  const cpMatch = cpSource.match(/\d{5}/);
  const codePostal = cpMatch ? cpMatch[0] : "";
  
  const codeCliFour = mappedClient ? mappedClient.codeClient : "";
  const codeTrv = mappedClient?.typeAffaire || "O3-0";
  const descTravaux = escapeSql(data.descriptif_travaux);

  // Ajout du poseur dans le commentaire SQL si sélectionné
  const poseurComment = selectedPoseur ? ` | Poseur: ${selectedPoseur.nom}` : "";

  const sqlInsert = `INSERT INTO \`a_cht\` 
(\`soc\`, \`ets\`, \`secteur\`, \`chantier\`, \`phase\`, \`imputation\`, \`libelle1\`, \`descriptif_tvx\`, \`descriptif_trvx2\`, \`code_postal\`, \`inter_cli\`, \`tel_cli\`, \`code_ouvert\`, \`code_raz_fin_exo\`, \`code_clifour\`, \`code_trv\`) 
VALUES ('${soc}', '${ets}', '${secteur}', '${chantier}', '${phase}', '${imputation}', '${escapeSql(data.nom_client).substring(0, 40)}', '<p>Import BuildScan AI : ${descTravaux.substring(0, 500)}${poseurComment}</p>', '${safeAddress.substring(0, 120)}', '${codePostal}', '${escapeSql(data.nom_client).substring(0, 40)}', '${escapeSql(data.coord_gardien).substring(0, 30)}', '4', 'N', '${codeCliFour}', '${codeTrv}');`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlInsert);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchNextChantier = async () => {
    const url = localStorage.getItem('buildscan_client_webhook_url');
    if (!url) {
      addLog('error', 'Erreur : Aucun Webhook "Numéro d\'affaire" configuré dans l\'admin.');
      return;
    }
    
    if (!mappedClient) {
      addLog('error', 'Erreur : Client non identifié, impossible de demander un numéro.');
      return;
    }

    setFetchingChantier(true);
    addLog('request', `Demande de nouveau numéro d'affaire au webhook...`, { typeAffaire: mappedClient.typeAffaire, codeClient: mappedClient.codeClient });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          typeAffaire: mappedClient.typeAffaire,
          codeClient: mappedClient.codeClient,
          nomClient: mappedClient.nom
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      addLog('response', `Réponse Webhook reçue`, result);
      
      let newNumber = "";
      if (result.numero_affaire) newNumber = result.numero_affaire;
      else if (result.next_id) newNumber = result.next_id;
      else if (result.value) newNumber = result.value;
      else if (typeof result === 'string') newNumber = result;
      else if (typeof result === 'number') newNumber = String(result);
      
      if (newNumber) {
        const cleanNumber = String(newNumber).replace(/\D/g, '');
        const formattedNumber = cleanNumber.length > 6 ? cleanNumber.substring(cleanNumber.length - 6) : cleanNumber.padStart(6, '0');
        
        setChantierInput(formattedNumber);
        addLog('info', `Numéro d'affaire mis à jour : ${formattedNumber}`);
      } else {
        throw new Error("Format de réponse inconnu (attendu: numero_affaire ou next_id)");
      }

    } catch (e: any) {
      addLog('error', `Échec récupération numéro : ${e.message}`);
    } finally {
      setFetchingChantier(false);
    }
  };

  const transmitToWebhook = async () => {
    setTransmitting(true);
    setTransmitStatus('idle');
    const webhookUrl = localStorage.getItem('buildscan_webhook_url') || DEFAULT_WEBHOOK_URL;
    
    const formData = new FormData();
    
    if (originalFile) {
      formData.append('file', originalFile, 'document.pdf');
    }
    
    formData.append('codeClient', codeCliFour);
    formData.append('code_trv', codeTrv);
    formData.append('num_chantier', chantier);
    formData.append('imputation', imputation);
    formData.append('source', "BuildScan AI");
    formData.append('timestamp', new Date().toISOString());

    formData.append('num_bon_travaux', data.num_bon_travaux || '');
    formData.append('nom_client', data.nom_client || '');
    
    formData.append('adresse_1', data.adresse_1 || '');
    formData.append('adresse_2', data.adresse_2 || '');
    formData.append('adresse_3', data.adresse_3 || '');
    formData.append('adresse_intervention', fullAddress);

    formData.append('coord_gardien', data.coord_gardien || '');
    formData.append('delai_intervention', data.delai_intervention || '');
    formData.append('date_intervention', data.date_intervention || '');
    formData.append('descriptif_travaux', data.descriptif_travaux || '');
    
    formData.append('libelle', data.nom_client || '');

    // Ajout des données Poseur
    if (selectedPoseur) {
      formData.append('poseur_id', selectedPoseur.id);
      formData.append('poseur_nom', selectedPoseur.nom);
      formData.append('poseur_code', selectedPoseur.codeSalarie || '');
      // On envoie aussi le type pour information
      formData.append('poseur_type', selectedPoseur.type || '');
    }

    addLog('request', `Envoi Multipart/FormData vers n8n...`, {
      codeClient: codeCliFour,
      imputation: imputation,
      num_chantier: chantier,
      poseur: selectedPoseur?.nom || 'Non assigné'
    });

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
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
          {/* Sélection du Poseur */}
          <div className="mb-6">
            <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 flex items-center justify-between">
              <span><i className="fas fa-user-hard-hat mr-2"></i>Assignation Poseur</span>
              {selectedPoseur && mappedClient?.typeAffaire && selectedPoseur.type === mappedClient.typeAffaire && (
                <span className="text-emerald-500"><i className="fas fa-magic mr-1"></i>Auto-sélectionné</span>
              )}
            </label>
            <div className="relative">
              <select
                value={selectedPoseurId}
                onChange={(e) => setSelectedPoseurId(e.target.value)}
                className={`w-full bg-slate-800 border text-white text-sm rounded-lg p-3 appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${
                    selectedPoseur && mappedClient?.typeAffaire && selectedPoseur.type === mappedClient.typeAffaire 
                    ? 'border-emerald-600/50 ring-1 ring-emerald-900' 
                    : 'border-slate-700'
                }`}
              >
                <option value="">-- Sélectionner un poseur --</option>
                {poseurs.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} {p.type ? `[Type: ${p.type}]` : ''} - {p.entreprise}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                <i className="fas fa-chevron-down text-xs"></i>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Type Affaire</p>
                <p className="text-sm font-mono font-bold text-blue-400">{codeTrv}</p>
              </div>
              <i className="fas fa-folder-open text-blue-500"></i>
            </div>

            <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col justify-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1.5 flex items-center gap-2">
                Numéro Affaire / Chantier
                {chantierInput && <span className="text-[8px] bg-slate-700 px-1 rounded text-slate-300">{chantierInput.length} chars</span>}
              </p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={chantierInput}
                  onChange={(e) => setChantierInput(e.target.value)}
                  className="bg-slate-900 border border-slate-600 text-white text-sm font-mono font-bold rounded px-2 py-1 w-full focus:outline-none focus:border-blue-500"
                />
                <button 
                  onClick={fetchNextChantier}
                  disabled={fetchingChantier || !mappedClient}
                  title="Générer le prochain numéro via Webhook"
                  className={`px-3 py-1 rounded font-bold text-xs transition-colors flex items-center justify-center ${
                    fetchingChantier ? 'bg-slate-700 text-slate-500' : 
                    !mappedClient ? 'bg-slate-800 text-slate-600 cursor-not-allowed' :
                    'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {fetchingChantier ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                </button>
              </div>
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