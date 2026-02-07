import React, { useState, useEffect } from 'react';
import { ConstructionOrderData, Client, LogEntry, Poseur } from '../types';
import Terminal from './Terminal';

interface SqlExporterProps {
  data: ConstructionOrderData;
  originalFile?: File;
  mappedClient: Client | null;
  prefilledChantierNumber: string | null;
  // Callback (gardé pour compatibilité mais moins utilisé ici)
  onPoseurSelect?: (poseurId: string, poseurs: Poseur[]) => void;
  // Shared Logs Props
  logs: LogEntry[];
  onAddLog: (type: LogEntry['type'], message: string, data?: any) => void;
  onClearLogs: () => void;
}

const SqlExporter: React.FC<SqlExporterProps> = ({ 
  data, 
  mappedClient, 
  prefilledChantierNumber, 
  logs,
  onAddLog,
  onClearLogs
}) => {
  const escapeSql = (str: string | null) => str ? str.replace(/'/g, "''").trim() : "";
  
  // Le chantierInput est initialisé avec prefilledChantierNumber s'il existe, sinon on prend le numéro du bon, sinon 000000
  const [chantierInput, setChantierInput] = useState<string>("000000");

  useEffect(() => {
    if (prefilledChantierNumber) {
      setChantierInput(prefilledChantierNumber);
    } else {
      // Fallback si pas de webhook: numéro du bon
      const fromBon = escapeSql(data.num_bon_travaux).replace(/\D/g, '').substring(0, 6);
      if (fromBon) setChantierInput(fromBon);
    }
  }, [prefilledChantierNumber, data.num_bon_travaux]);

  const codeCliFour = mappedClient ? mappedClient.codeClient : "";
  const codeTrv = mappedClient?.typeAffaire || "O3-0";

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 flex-shrink-0">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/20 text-blue-400 rounded flex items-center justify-center">
              <i className="fas fa-network-wired text-sm"></i>
            </div>
            <div>
              <h3 className="text-white font-bold uppercase tracking-wider text-xs">Terminal <span className="text-blue-400">SQL & Logs</span></h3>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Infos techniques compactes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow">
        <Terminal logs={logs} onClear={onClearLogs} />
      </div>
    </div>
  );
};

export default SqlExporter;