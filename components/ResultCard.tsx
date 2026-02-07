import React, { useEffect } from 'react';
import { ConstructionOrderData, Client, Poseur } from '../types';

interface ResultCardProps {
  data: ConstructionOrderData;
  onReset: () => void;
  mappedClient: Client | null;
  chantierNumber: string | null;
  isFetchingChantier: boolean;
  onUpdate: (updates: Partial<ConstructionOrderData>) => void;
  
  // Nouveaux Props pour l'intégration des actions
  poseurs: Poseur[];
  selectedPoseurId: string;
  onPoseurSelect: (id: string) => void;
  onTransmit: () => void;
  isTransmitting: boolean;
  transmitStatus: 'idle' | 'success' | 'error';
}

const ResultCard: React.FC<ResultCardProps> = ({ 
    data, 
    onReset, 
    mappedClient, 
    chantierNumber, 
    isFetchingChantier, 
    onUpdate,
    poseurs,
    selectedPoseurId,
    onPoseurSelect,
    onTransmit,
    isTransmitting,
    transmitStatus
}) => {
  
  const handleInputChange = (field: keyof ConstructionOrderData, value: string) => {
    onUpdate({ [field]: value });
  };

  // Effect pour reformater la date du document en JJ/MM/AAAA si elle est en format YYYY-MM-DD
  useEffect(() => {
    if (data.date_intervention && data.date_intervention.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = data.date_intervention.split('-');
        onUpdate({ date_intervention: `${day}/${month}/${year}` });
    }
  }, [data.date_intervention]);

  const fields = [
    { key: "num_bon_travaux", label: "Numéro de Bon", icon: "fa-hashtag", color: "text-blue-600" },
    { key: "nom_client", label: "Nom Client (PDF)", icon: "fa-building", color: "text-indigo-600" },
    { key: "date_intervention", label: "Date du Document (JJ/MM/AAAA)", icon: "fa-file-signature", color: "text-purple-600" },
    { key: "delai_intervention", label: "Délai / RDV Agenda", icon: "fa-calendar-alt", color: "text-orange-600" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-check-circle text-green-500"></i>
          Résultats de l'extraction
        </h2>
        <button 
          onClick={onReset}
          className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          Nouveau Scan
        </button>
      </div>

      {mappedClient ? (
        <div className="mx-6 mt-6 bg-emerald-50 border-2 border-emerald-100 rounded-xl p-5 shadow-sm animate-in zoom-in-95 duration-300 relative">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-lg shadow-emerald-200">
                <i className="fas fa-link text-xl"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Lien ERP SAMDB Actif</p>
                  <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase">Match</span>
                </div>
                <p className="text-lg font-black text-slate-800">
                  Code Client : <span className="text-emerald-700 font-mono">{mappedClient.codeClient}</span>
                </p>
              </div>
            </div>

            {/* BOUTON ENREGISTREMENT (En haut à droite) */}
            <div>
               <button 
                  disabled={isTransmitting}
                  onClick={onTransmit}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                    transmitStatus === 'success' ? 'bg-green-600 text-white' : 
                    transmitStatus === 'error' ? 'bg-red-600 text-white' :
                    'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-900/20'
                  }`}
                >
                  {isTransmitting ? (
                      <><i className="fas fa-spinner fa-spin"></i> Envoi...</>
                  ) : transmitStatus === 'success' ? (
                      <><i className="fas fa-check"></i> Transmis !</>
                  ) : (
                      <><i className="fas fa-save"></i> Enregistrement</>
                  )}
                </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-emerald-200 pt-3">
             <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Type Affaire</p>
                <div className="bg-white/60 border border-emerald-200 rounded px-2 py-1 inline-block">
                  <span className="font-mono font-black text-slate-700">{mappedClient.typeAffaire || 'Standard'}</span>
                </div>
             </div>
             <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Code BPU</p>
                <div className="bg-white/60 border border-emerald-200 rounded px-2 py-1 inline-block min-w-[60px]">
                  <span className="font-mono font-black text-slate-700">{mappedClient.bpu || '-'}</span>
                </div>
             </div>
             <div className="md:col-span-1 col-span-2">
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Numéro Affaire Webhook</p>
                {isFetchingChantier ? (
                   <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold animate-pulse">
                     <i className="fas fa-circle-notch fa-spin"></i> Récupération...
                   </div>
                ) : chantierNumber ? (
                  <div className="flex items-center gap-2">
                     <span className="font-mono font-black text-slate-800 text-lg tracking-wide bg-white border border-emerald-300 px-2 rounded shadow-sm">
                       {chantierNumber}
                     </span>
                     <i className="fas fa-check text-emerald-500"></i>
                  </div>
                ) : (
                   <span className="text-[10px] text-emerald-500 italic">Non disponible</span>
                )}
             </div>
          </div>

          {/* LISTE DEROULANTE POSEUR (En bas à droite de l'encadré vert) */}
          <div className="mt-4 pt-3 border-t border-emerald-200">
             <div className="flex justify-end items-center gap-2">
                 <label className="text-[10px] font-bold text-emerald-700 uppercase">Assignation Poseur :</label>
                 <select
                    value={selectedPoseurId}
                    onChange={(e) => onPoseurSelect(e.target.value)}
                    className="bg-white border border-emerald-300 text-slate-700 text-xs rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none w-48 font-bold"
                 >
                    <option value="">-- Non assigné --</option>
                    {poseurs.map(p => (
                    <option key={p.id} value={p.id}>
                        {p.nom} {p.type ? `[${p.type}]` : ''}
                    </option>
                    ))}
                </select>
             </div>
          </div>
        </div>
      ) : (
        <div className="mx-6 mt-6 bg-slate-50 border border-slate-200 border-dashed rounded-lg p-4 flex items-center gap-3">
          <i className="fas fa-exclamation-circle text-slate-400"></i>
          <p className="text-xs text-slate-500 font-medium">
            Aucun mapping client trouvé pour "<span className="font-bold">{data.nom_client || 'Inconnu'}</span>". 
            Rendez-vous dans l'onglet <span className="font-bold underline">Clients</span> pour l'ajouter ou corrigez le nom ci-dessous.
          </p>
        </div>
      )}

      {/* Affichage du Descriptif des Travaux (Editable) */}
      <div className="mx-6 mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl focus-within:ring-2 focus-within:ring-blue-200 transition-all">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-tools text-blue-500 text-xs"></i>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descriptif des Travaux</span>
        </div>
        <textarea
          value={data.descriptif_travaux || ""}
          onChange={(e) => handleInputChange('descriptif_travaux', e.target.value)}
          rows={4}
          className="w-full bg-white border border-blue-100 rounded-lg p-3 text-sm font-semibold text-slate-800 leading-relaxed focus:outline-none focus:border-blue-400 resize-y"
          placeholder="Saisissez le descriptif des travaux..."
        />
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Champs d'adresse spécifiques (Editables) */}
        <div className="space-y-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <i className="fas fa-map-marker-alt text-red-600 w-4"></i>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adresse d'intervention (3 Lignes)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { key: 'adresse_1', label: 'Ligne 1' },
              { key: 'adresse_2', label: 'Ligne 2' },
              { key: 'adresse_3', label: 'Ligne 3' }
            ].map((addr) => (
              <div key={addr.key} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col focus-within:bg-white focus-within:border-blue-200 transition-colors">
                <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">{addr.label}</span>
                <input
                  type="text"
                  value={(data as any)[addr.key] || ""}
                  onChange={(e) => handleInputChange(addr.key as keyof ConstructionOrderData, e.target.value)}
                  className="bg-transparent border-none p-0 text-sm font-medium text-slate-900 focus:ring-0 placeholder:text-slate-300 w-full"
                  placeholder="-"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Informations Gardien (Editables) */}
        <div className="space-y-1 md:col-span-2">
           <div className="flex items-center gap-2 mb-1">
              <i className="fas fa-user-tie text-emerald-600 w-4"></i>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact / Gardien</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col relative overflow-hidden focus-within:bg-white focus-within:border-emerald-200 transition-colors">
                   <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Nom</span>
                   <input
                     type="text"
                     value={data.gardien_nom || ""}
                     onChange={(e) => handleInputChange('gardien_nom', e.target.value)}
                     className="bg-transparent border-none p-0 text-sm font-medium text-slate-900 focus:ring-0 placeholder:text-slate-300 w-full"
                     placeholder="-"
                   />
                </div>
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col relative overflow-hidden focus-within:bg-white focus-within:border-emerald-200 transition-colors">
                   <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Téléphone</span>
                   <input
                     type="text"
                     value={data.gardien_tel || ""}
                     onChange={(e) => handleInputChange('gardien_tel', e.target.value)}
                     className="bg-transparent border-none p-0 text-sm font-medium text-slate-900 focus:ring-0 placeholder:text-slate-300 w-full"
                     placeholder="-"
                   />
                   <i className="fas fa-phone absolute right-3 top-3 text-emerald-100 pointer-events-none"></i>
                </div>
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col relative overflow-hidden focus-within:bg-white focus-within:border-emerald-200 transition-colors">
                   <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Email</span>
                   <input
                     type="text"
                     value={data.gardien_email || ""}
                     onChange={(e) => handleInputChange('gardien_email', e.target.value)}
                     className="bg-transparent border-none p-0 text-sm font-medium text-slate-900 focus:ring-0 placeholder:text-slate-300 w-full"
                     placeholder="-"
                   />
                   <i className="fas fa-envelope absolute right-3 top-3 text-blue-100 pointer-events-none"></i>
                </div>
            </div>
        </div>

        {/* Autres champs standards (Editables) */}
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <i className={`fas ${field.icon} ${field.color} w-4`}></i>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{field.label}</span>
            </div>
            <div className={`p-3 rounded-lg border border-slate-100 bg-slate-50/50 min-h-[44px] flex items-center transition-all focus-within:bg-white focus-within:border-slate-300 border-l-4 border-l-slate-200`}>
              <input
                type="text"
                value={(data as any)[field.key] || ""}
                onChange={(e) => handleInputChange(field.key as keyof ConstructionOrderData, e.target.value)}
                className="bg-transparent border-none p-0 w-full font-medium text-slate-900 focus:ring-0 placeholder:text-slate-300 placeholder:italic"
                placeholder="Non renseigné"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 px-6 py-3 flex items-start gap-3 border-t border-blue-100 mt-auto">
        <i className="fas fa-shield-alt text-blue-500 mt-1"></i>
        <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase tracking-tight">
          Protection des données : Les informations financières (Prix, TVA) ont été exclues du scan conformément au protocole de sécurité.
        </p>
      </div>
    </div>
  );
};

export default ResultCard;