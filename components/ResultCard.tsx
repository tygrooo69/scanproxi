
import React, { useEffect } from 'react';
import { ConstructionOrderData, Client, Poseur } from '../types';

interface ResultCardProps {
  data: ConstructionOrderData;
  onReset: () => void;
  mappedClient: Client | null;
  potentialClients?: Client[]; 
  onClientMatchUpdate?: (clientId: string) => void; 
  chantierNumber: string | null;
  isFetchingChantier: boolean;
  onUpdate: (updates: Partial<ConstructionOrderData>) => void;
  poseurs: Poseur[];
  selectedPoseurId: string;
  onPoseurSelect: (id: string) => void;
  onChantierUpdate: (num: string) => void;
  onTransmit: () => void;
  isTransmitting: boolean;
  transmitStatus: 'idle' | 'success' | 'error';
  rawPdfClientName?: string | null; 
}

const ResultCard: React.FC<ResultCardProps> = ({ 
    data, onReset, mappedClient, potentialClients = [], onClientMatchUpdate,
    chantierNumber, isFetchingChantier, onUpdate, poseurs, selectedPoseurId,
    onPoseurSelect, onChantierUpdate, onTransmit, isTransmitting, transmitStatus, rawPdfClientName
}) => {
  
  const handleInputChange = (field: keyof ConstructionOrderData, value: string) => {
    onUpdate({ [field]: value });
  };

  // Logique de formatage des dates en JJ/MM/AAAA
  useEffect(() => {
    const formatDate = (dateStr: string | null) => {
      if (!dateStr) return null;
      
      let d = dateStr.trim();
      
      // Cas AAAA-MM-JJ (souvent renvoyé par Gemini)
      if (d.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = d.split('-');
        return `${day}/${month}/${year}`;
      }
      
      // Cas JJ-MM-AAAA
      if (d.match(/^\d{2}-\d{2}-\d{4}$/)) {
        return d.replace(/-/g, '/');
      }

      // Si c'est déjà du JJ/MM/AAAA ou autre chose, on ne touche pas sauf si on veut forcer les slashs
      return d;
    };

    const formattedDate = formatDate(data.date_intervention);
    const formattedDelai = formatDate(data.delai_intervention);

    const updates: Partial<ConstructionOrderData> = {};
    if (formattedDate && formattedDate !== data.date_intervention) {
      updates.date_intervention = formattedDate;
    }
    if (formattedDelai && formattedDelai !== data.delai_intervention) {
      updates.delai_intervention = formattedDelai;
    }

    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  }, [data.date_intervention, data.delai_intervention, onUpdate]);

  const categories = [{ code: "01", label: "01 Locataire" }, { code: "02", label: "02 Parties communes" }, { code: "03", label: "03 Logement vacant" }, { code: "04", label: "04 Maintenance" }];
  const fields = [
    { key: "num_bon_travaux", label: "Numéro de Bon", icon: "fa-hashtag", color: "text-blue-600" },
    { key: "nom_client", label: mappedClient ? "Libellé Client (ERP)" : "Nom Client (PDF)", icon: "fa-building", color: mappedClient ? "text-emerald-600" : "text-indigo-600" },
    { key: "date_intervention", label: "Date du Document", icon: "fa-file-signature", color: "text-purple-600" },
    { key: "delai_intervention", label: "Délai / Échéance", icon: "fa-calendar-alt", color: "text-orange-600" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><i className="fas fa-check-circle text-green-500"></i>Résultats de l'extraction</h2>
        <button onClick={onReset} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">Nouveau Scan</button>
      </div>

      {mappedClient ? (
        <div className="mx-6 mt-6 bg-emerald-50 border-2 border-emerald-100 rounded-xl p-5 shadow-sm animate-in zoom-in-95">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-lg"><i className="fas fa-link text-xl"></i></div>
              <div>
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Compte ERP SAMDB Actif</p>
                <p className="text-lg font-black text-slate-800 leading-tight">{mappedClient.libelle_client || mappedClient.nom}</p>
                <p className="text-xs text-emerald-700 font-bold uppercase mt-1">Code : <span className="font-mono">{mappedClient.codeClient}</span></p>
              </div>
            </div>
            <button disabled={isTransmitting || transmitStatus === 'success'} onClick={onTransmit} className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${transmitStatus === 'success' ? 'bg-green-600 text-white' : transmitStatus === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white shadow-slate-900/20'}`}>
              {isTransmitting ? 'Envoi...' : transmitStatus === 'success' ? 'Envoyé' : 'Transmettre'}
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 border-t border-emerald-200 pt-3">
             <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Affaire</p>
                <input 
                  type="text" 
                  value={chantierNumber || ''} 
                  onChange={(e) => onChantierUpdate(e.target.value)}
                  className="w-full font-mono font-black text-slate-800 text-lg bg-white border border-emerald-300 px-2 py-1 rounded focus:outline-none focus:border-emerald-500"
                  placeholder="-"
                />
             </div>
             <div><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Catégorie</p><select value={data.categorie || ""} onChange={(e) => handleInputChange('categorie', e.target.value)} className="w-full font-bold text-slate-800 text-sm bg-white border border-emerald-300 px-2 py-1.5 rounded">{categories.map(cat => <option key={cat.code} value={cat.code}>{cat.label}</option>)}</select></div>
             <div><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Assignation</p><select value={selectedPoseurId} onChange={(e) => onPoseurSelect(e.target.value)} className="w-full font-bold text-slate-800 text-sm bg-white border border-emerald-300 px-2 py-1.5 rounded"><option value="">-- Non assigné --</option>{poseurs.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
             <div><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">BPU</p><span className="font-mono font-black text-slate-700 text-sm bg-white border border-emerald-300 px-2 py-1.5 rounded block">{mappedClient.bpu || '-'}</span></div>
             <div><p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Client</p><select value={mappedClient.id} onChange={(e) => onClientMatchUpdate?.(e.target.value)} className="w-full font-bold text-slate-800 text-sm bg-white border border-emerald-300 px-2 py-1.5 rounded">{potentialClients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></div>
          </div>
        </div>
      ) : (
        <div className="mx-6 mt-6 bg-slate-50 border border-dashed rounded-lg p-4 flex items-center gap-3"><i className="fas fa-exclamation-circle text-slate-400"></i><p className="text-xs text-slate-500 font-medium">Aucun mapping client trouvé pour "<span className="font-bold">{data.nom_client || 'Inconnu'}</span>".</p></div>
      )}

      <div className="mx-6 mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
        <div className="flex items-center gap-2 mb-2"><i className="fas fa-tools text-blue-500 text-xs"></i><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descriptif des Travaux</span></div>
        <textarea value={data.descriptif_travaux || ""} onChange={(e) => handleInputChange('descriptif_travaux', e.target.value)} rows={4} className="w-full bg-white border border-blue-100 rounded-lg p-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400 resize-none" />
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-1"><i className="fas fa-map-marker-alt text-red-600 w-4"></i><span className="text-xs font-bold text-slate-400 uppercase">Adresse d'intervention (3 Lignes)</span></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['adresse_1', 'adresse_2', 'adresse_3'].map((k) => (
              <div key={k} className="p-3 rounded-lg border bg-slate-50/50 flex flex-col focus-within:bg-white focus-within:border-blue-200 transition-all">
                <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">{k.replace('_', ' ')}</span>
                <input type="text" value={(data as any)[k] || ""} onChange={(e) => handleInputChange(k as any, e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0" placeholder="-" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1 md:col-span-2">
           <div className="flex items-center gap-2 mb-1"><i className="fas fa-user-tie text-emerald-600 w-4"></i><span className="text-xs font-bold text-slate-400 uppercase">Contact / Gardien / Locataire</span></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border bg-slate-50/50 flex flex-col focus-within:bg-white focus-within:border-emerald-200 transition-all"><span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Nom</span><input type="text" value={data.gardien_nom || ""} onChange={(e) => handleInputChange('gardien_nom', e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0" /></div>
                <div className="p-3 rounded-lg border bg-slate-50/50 flex flex-col focus-within:bg-white focus-within:border-emerald-200 transition-all"><span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Tel</span><input type="text" value={data.gardien_tel || ""} onChange={(e) => handleInputChange('gardien_tel', e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0" /></div>
                <div className="p-3 rounded-lg border bg-slate-50/50 flex flex-col focus-within:bg-white focus-within:border-emerald-200 transition-all"><span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Email</span><input type="text" value={data.gardien_email || ""} onChange={(e) => handleInputChange('gardien_email', e.target.value)} className="bg-transparent border-none p-0 text-sm font-bold text-slate-900 focus:ring-0" /></div>
            </div>
        </div>
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <div className="flex items-center gap-2 mb-1"><i className={`fas ${f.icon} ${f.color} w-4`}></i><span className="text-xs font-bold text-slate-400 uppercase">{f.label}</span></div>
            <div className="p-3 rounded-lg border bg-slate-50/50 min-h-[44px] flex items-center transition-all focus-within:bg-white focus-within:border-blue-400">
              <input type="text" value={(data as any)[f.key] || ""} onChange={(e) => handleInputChange(f.key as any, e.target.value)} className="bg-transparent border-none p-0 w-full font-bold text-slate-900 focus:ring-0" placeholder="N/A" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultCard;
