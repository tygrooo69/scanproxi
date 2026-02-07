import React, { useMemo } from 'react';
import { Poseur, NextcloudConfig, ConstructionOrderData } from '../types';

interface CalendarManagerProps {
  poseurs: Poseur[];
  selectedPoseurId: string;
  data: ConstructionOrderData;
}

const CalendarManager: React.FC<CalendarManagerProps> = ({ poseurs, selectedPoseurId, data }) => {
  const nextcloudConfigString = localStorage.getItem('buildscan_nextcloud');
  const nextcloudConfig: NextcloudConfig | null = nextcloudConfigString ? JSON.parse(nextcloudConfigString) : null;
  
  const selectedPoseur = useMemo(() => 
    poseurs.find(p => p.id === selectedPoseurId), 
  [poseurs, selectedPoseurId]);

  // Construction de l'URL CalDAV
  // URL Format: https://exemple.fr/remote.php/dav/calendars/%poseur nextcloud%/personal/
  const calendarUrl = useMemo(() => {
    if (!nextcloudConfig?.url || !selectedPoseur?.nextcloud_user) return null;
    
    // Nettoyage du trailing slash de l'URL de base
    const baseUrl = nextcloudConfig.url.replace(/\/$/, '');
    return `${baseUrl}/remote.php/dav/calendars/${selectedPoseur.nextcloud_user}/personal/`;
  }, [nextcloudConfig, selectedPoseur]);

  // Lien direct vers l'interface Web Nextcloud (pour UX)
  // Souvent format: https://nextcloud.com/index.php/apps/calendar/p/UUID ou simplement /apps/calendar
  const webInterfaceUrl = useMemo(() => {
     if (!nextcloudConfig?.url) return null;
     return `${nextcloudConfig.url.replace(/\/$/, '')}/index.php/apps/calendar/`;
  }, [nextcloudConfig]);

  if (!nextcloudConfig) {
    return (
      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 p-6 flex flex-col items-center justify-center text-center h-full">
         <div className="w-12 h-12 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mb-3">
            <i className="fas fa-calendar-times"></i>
         </div>
         <p className="text-white font-bold text-sm">Calendrier non configuré</p>
         <p className="text-slate-500 text-[10px] mt-1">Rendez-vous dans Administration pour configurer Nextcloud.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 h-full flex flex-col">
       <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-600/20 text-sky-400 rounded flex items-center justify-center">
              <i className="fas fa-calendar-alt text-sm"></i>
            </div>
            <div>
              <h3 className="text-white font-bold uppercase tracking-wider text-xs">Agenda <span className="text-sky-400">Nextcloud</span></h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Planification Poseur</p>
            </div>
          </div>
          
          {webInterfaceUrl && (
            <a 
              href={webInterfaceUrl} 
              target="_blank" 
              rel="noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
              title="Ouvrir Nextcloud Web"
            >
              <i className="fas fa-external-link-alt"></i>
            </a>
          )}
       </div>

       <div className="p-6 flex-grow flex flex-col gap-4">
         {!selectedPoseur ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-700 rounded-lg bg-slate-900/50">
               <p className="text-slate-500 text-xs italic">Sélectionnez un poseur dans le panneau d'export SQL pour voir son calendrier.</p>
            </div>
         ) : !selectedPoseur.nextcloud_user ? (
             <div className="flex-grow flex flex-col items-center justify-center text-center p-4 border border-dashed border-amber-900/30 rounded-lg bg-amber-900/10">
               <i className="fas fa-exclamation-triangle text-amber-500 mb-2"></i>
               <p className="text-amber-500 text-xs font-bold">Poseur sans compte Nextcloud</p>
               <p className="text-slate-500 text-[10px] mt-1">Modifiez la fiche poseur dans l'administration.</p>
            </div>
         ) : (
           <>
              <div className="bg-sky-900/20 border border-sky-800 rounded-lg p-3">
                 <div className="flex justify-between items-start mb-2">
                   <p className="text-[10px] text-sky-400 font-bold uppercase">Lien CalDAV Actif</p>
                   <span className="bg-sky-600 text-white text-[9px] px-1.5 rounded font-bold">Live</span>
                 </div>
                 <code className="block text-[9px] font-mono text-slate-300 break-all bg-black/30 p-2 rounded border border-white/5 select-all">
                   {calendarUrl}
                 </code>
              </div>

              <div className="space-y-3 mt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prévisualisation Événement</p>
                
                <div className="bg-slate-800 p-3 rounded border border-slate-700 space-y-2">
                    <div className="flex gap-2 text-xs">
                        <span className="text-slate-500 w-16">Date:</span>
                        <span className="text-white font-bold">{data.delai_intervention || data.date_intervention || "A définir"}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                        <span className="text-slate-500 w-16">Titre:</span>
                        <span className="text-white font-bold truncate">{data.nom_client} - {data.adresse_3}</span>
                    </div>
                     <div className="flex gap-2 text-xs">
                        <span className="text-slate-500 w-16">Lieu:</span>
                        <span className="text-slate-300 truncate">{data.adresse_1} {data.adresse_3}</span>
                    </div>
                </div>

                <button 
                  disabled
                  className="w-full bg-slate-700 text-slate-400 border border-slate-600 py-2 rounded-lg font-bold text-xs uppercase tracking-wider cursor-not-allowed flex items-center justify-center gap-2"
                  title="Fonctionnalité CalDAV en cours de développement"
                >
                   <i className="fas fa-plus"></i> Ajouter au Calendrier
                </button>
                <p className="text-[9px] text-center text-slate-600 italic">L'écriture directe CalDAV sera activée prochainement.</p>
              </div>
           </>
         )}
       </div>
    </div>
  );
};

export default CalendarManager;