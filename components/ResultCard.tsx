import React, { useEffect } from 'react';
import { ConstructionOrderData, Client, Poseur, CalendarEvent } from '../types';

interface ResultCardProps {
  data: ConstructionOrderData;
  onReset: () => void;
  mappedClient: Client | null;
  chantierNumber: string | null;
  isFetchingChantier: boolean;
  onUpdate: (updates: Partial<ConstructionOrderData>) => void;
  
  poseurs: Poseur[];
  selectedPoseurId: string;
  onPoseurSelect: (id: string) => void;
  onTransmit: () => void;
  isTransmitting: boolean;
  transmitStatus: 'idle' | 'success' | 'error';
  
  // Nouveaux Props pour la validation RDV
  tentativeEvent: CalendarEvent | null;
  isRdvSaved: boolean;
  onValidateRdv: () => void;
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
    transmitStatus,
    tentativeEvent,
    isRdvSaved,
    onValidateRdv
}) => {
  
  const handleInputChange = (field: keyof ConstructionOrderData, value: string) => {
    onUpdate({ [field]: value });
  };

  useEffect(() => {
    if (data.date_intervention) {
        let formattedDate = data.date_intervention;
        if (formattedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = formattedDate.split('-');
            formattedDate = `${day}/${month}/${year}`;
        }
        else if (formattedDate.match(/^\d{2}-\d{2}-\d{4}$/)) {
            formattedDate = formattedDate.replace(/-/g, '/');
        }
        if (formattedDate !== data.date_intervention) {
            onUpdate({ date_intervention: formattedDate });
        }
    }
  }, [data.date_intervention]);

  const fields = [
    { key: "num_bon_travaux", label: "Numéro de Bon", icon: "fa-hashtag", color: "text-blue-600" },
    { key: "nom_client", label: "Nom Client (PDF)", icon: "fa-building", color: "text-indigo-600" },
    { key: "date_intervention", label: "Date du Document", icon: "fa-file-signature", color: "text-purple-600" },
    { key: "delai_intervention", label: "Délai / RDV Agenda", icon: "fa-calendar-alt", color: "text-orange-600" },
  ];

  // Helper pour afficher la date lisiblement dans le bouton
  const getButtonDateLabel = () => {
    if (!tentativeEvent) return "";
    const d = new Date(tentativeEvent.start);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-check-circle text-green-500"></i>
          Résultats de l'extraction
        </h2>
        <button 
          onClick={onReset}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
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

            <div className="flex items-center gap-3">
               {/* BOUTON VALIDATION DATE (NOUVEAU) */}
               {!isRdvSaved && tentativeEvent && (
                  <button 
                    onClick={onValidateRdv}
                    className="px-4 py-3 rounded-xl font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200 border border-emerald-400 flex items-center gap-2 animate-in slide-in-from-right-4"
                  >
                     <i className="fas fa-calendar-check text-lg"></i>
                     <div className="flex flex-col items-start leading-none">
                        <span className="text-[9px] uppercase opacity-90">Valider RDV</span>
                        <span>{getButtonDateLabel()}</span>
                     </div>
                  </button>
               )}

               {/* Indicateur si sauvegardé */}
               {isRdvSaved && (
                   <div className="px-4 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-2 shadow-sm">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      RDV Enregistré
                   </div>
               )}

               <button 
                  disabled={isTransmitting}
                  onClick={onTransmit}
                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg hover:-translate-y-0.5 ${
                    transmitStatus === 'success' ? 'bg-green-600 text-white' : 
                    transmitStatus === 'error' ? 'bg-red-600 text-white' :
                    'bg-slate-800 text-white hover:bg-slate-700 shadow-slate-900/20'
                  }`}
                >
                  {isTransmitting ? (
                      <><i className="fas fa-spinner fa-spin"></i> Envoi...</>
                  ) : transmitStatus === 'success' ? (
                      <><i className="fas fa-check"></i> Transmis !</>
                  ) : (
                      <><i className="fas fa-save text-lg"></i> Enregistrement</>
                  )}
                </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border-t border-emerald-200 pt-3">
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
             <div>
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

             <div>
                 <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Assignation Poseur</p>
                 <div className="relative">
                    <select
                        value={selectedPoseurId}
                        onChange={(e) => onPoseurSelect(e.target.value)}
                        className="w-full font-bold text-slate-800 text-sm tracking-wide bg-white border border-emerald-300 px-2 py-1.5 rounded shadow-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer"
                    >
                        <option value="">-- Non assigné --</option>
                        {poseurs.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.nom} {p.type ? `[${p.type}]` : ''}
                        </option>
                        ))}
                    </select>
                    <i className="fas fa-chevron-down absolute right-2 top-2.5 text-emerald-500 text-xs pointer-events-none"></i>
                 </div>
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

      {/* Reste du code inchangé ... */}
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