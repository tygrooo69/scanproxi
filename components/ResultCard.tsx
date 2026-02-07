import React from 'react';
import { ConstructionOrderData, Client } from '../types';

interface ResultCardProps {
  data: ConstructionOrderData;
  onReset: () => void;
  mappedClient: Client | null;
  chantierNumber: string | null;
  isFetchingChantier: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({ data, onReset, mappedClient, chantierNumber, isFetchingChantier }) => {
  const fields = [
    { label: "Numéro de Bon", value: data.num_bon_travaux, icon: "fa-hashtag", color: "text-blue-600" },
    { label: "Nom Client (PDF)", value: data.nom_client, icon: "fa-building", color: "text-indigo-600" },
    { label: "Contact / Gardien", value: data.coord_gardien, icon: "fa-user-tie", color: "text-emerald-600" },
    { label: "Date du Document", value: data.date_intervention, icon: "fa-file-signature", color: "text-purple-600" },
    { label: "Délai d'intervention", value: data.delai_intervention, icon: "fa-calendar-alt", color: "text-orange-600" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
        <div className="mx-6 mt-6 bg-emerald-50 border-2 border-emerald-100 rounded-xl p-5 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4">
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
            <div className="text-right hidden sm:block">
               <span className="text-xs bg-white border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full font-bold">
                 {mappedClient.nom}
               </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-emerald-200 pt-3">
             <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Type Affaire Détecté</p>
                <div className="bg-white/60 border border-emerald-200 rounded px-2 py-1 inline-block">
                  <span className="font-mono font-black text-slate-700">{mappedClient.typeAffaire || 'Standard'}</span>
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
          </div>
        </div>
      ) : (
        <div className="mx-6 mt-6 bg-slate-50 border border-slate-200 border-dashed rounded-lg p-4 flex items-center gap-3">
          <i className="fas fa-exclamation-circle text-slate-400"></i>
          <p className="text-xs text-slate-500 font-medium">
            Aucun mapping client trouvé pour "<span className="font-bold">{data.nom_client || 'Inconnu'}</span>". 
            Rendez-vous dans l'onglet <span className="font-bold underline">Clients</span> pour l'ajouter.
          </p>
        </div>
      )}

      {/* Affichage du Descriptif des Travaux */}
      <div className="mx-6 mt-6 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <i className="fas fa-tools text-blue-500 text-xs"></i>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descriptif des Travaux</span>
        </div>
        <p className="text-sm font-semibold text-slate-800 leading-relaxed">
          {data.descriptif_travaux || "Aucun descriptif trouvé dans le document."}
        </p>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Champs d'adresse spécifiques */}
        <div className="space-y-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <i className="fas fa-map-marker-alt text-red-600 w-4"></i>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adresse d'intervention (3 Lignes)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col">
               <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Ligne 1</span>
               <span className="font-medium text-slate-900 truncate" title={data.adresse_1 || ''}>{data.adresse_1 || '-'}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col">
               <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Ligne 2</span>
               <span className="font-medium text-slate-900 truncate" title={data.adresse_2 || ''}>{data.adresse_2 || '-'}</span>
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col">
               <span className="text-[9px] text-slate-400 font-bold uppercase mb-1">Ligne 3</span>
               <span className="font-medium text-slate-900 truncate" title={data.adresse_3 || ''}>{data.adresse_3 || '-'}</span>
            </div>
          </div>
        </div>

        {/* Autres champs */}
        {fields.map((field, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <i className={`fas ${field.icon} ${field.color} w-4`}></i>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{field.label}</span>
            </div>
            <div className={`p-3 rounded-lg border border-slate-100 bg-slate-50/50 min-h-[44px] flex items-center transition-all ${!field.value ? 'italic text-slate-400' : 'font-medium text-slate-900 border-l-4 border-l-slate-200'}`}>
              {field.value || 'Non renseigné'}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 px-6 py-3 flex items-start gap-3 border-t border-blue-100">
        <i className="fas fa-shield-alt text-blue-500 mt-1"></i>
        <p className="text-[10px] text-blue-700 leading-relaxed font-bold uppercase tracking-tight">
          Protection des données : Les informations financières (Prix, TVA) ont été exclues du scan conformément au protocole de sécurité.
        </p>
      </div>
    </div>
  );
};

export default ResultCard;