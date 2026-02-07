import React, { useMemo, useState, useEffect } from 'react';
import { Poseur, NextcloudConfig, ConstructionOrderData } from '../types';

interface CalendarManagerProps {
  poseurs: Poseur[];
  selectedPoseurId: string;
  data: ConstructionOrderData;
}

interface CalendarEvent {
  title: string;
  start: string;
  end: string;
  location?: string;
  isTentative?: boolean; // Pour le chantier en cours d'analyse
}

const CalendarManager: React.FC<CalendarManagerProps> = ({ poseurs, selectedPoseurId, data }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const nextcloudConfigString = localStorage.getItem('buildscan_nextcloud');
  const nextcloudConfig: NextcloudConfig | null = nextcloudConfigString ? JSON.parse(nextcloudConfigString) : null;
  
  const selectedPoseur = useMemo(() => 
    poseurs.find(p => p.id === selectedPoseurId), 
  [poseurs, selectedPoseurId]);

  const webInterfaceUrl = useMemo(() => {
     if (!nextcloudConfig?.url) return null;
     return `${nextcloudConfig.url.replace(/\/$/, '')}/index.php/apps/calendar/`;
  }, [nextcloudConfig]);

  // Déterminer la date du chantier pour l'affichage
  const jobDate = useMemo(() => {
    // Essaie de parser la date d'intervention ou delai
    const dateStr = data.delai_intervention || data.date_intervention;
    if (!dateStr) return new Date();

    // Tentative de parsing simple FR (JJ/MM/AAAA)
    const parts = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (parts) {
      return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), 8, 0, 0); // 8h00 par défaut
    }
    return new Date(); // Fallback aujourd'hui
  }, [data.delai_intervention, data.date_intervention]);

  // Récupération des événements via le Proxy Server
  const fetchEvents = async () => {
    if (!selectedPoseurId || !selectedPoseur?.nextcloud_user) return;
    
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poseur_id: selectedPoseurId })
      });
      
      if (!res.ok) throw new Error("Erreur Serveur");
      
      const result = await res.json();
      if (result.success) {
        setEvents(result.events);
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      console.error("Erreur Fetch Calendar:", e);
      setFetchError("Impossible de récupérer l'agenda.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPoseurId) {
      setEvents([]); // Reset à chaque changement
      fetchEvents();
    }
  }, [selectedPoseurId]);

  // Fusionner les événements réels et le chantier proposé pour l'affichage
  const displayEvents = useMemo(() => {
    const list: CalendarEvent[] = [...events];
    
    // Ajouter le chantier actuel comme événement "Fantôme"
    if (data.nom_client) {
      const start = jobDate;
      const end = new Date(start);
      end.setHours(start.getHours() + 4); // Durée arbitraire de 4h

      list.push({
        title: `[NOUVEAU] ${data.nom_client}`,
        start: start.toISOString(),
        end: end.toISOString(),
        location: `${data.adresse_1} ${data.adresse_3}`,
        isTentative: true
      });
    }

    // Trier par date
    return list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, data, jobDate]);

  // Générer les jours de la semaine autour de la date du chantier
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(jobDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // ajuster pour lundi
    startOfWeek.setDate(diff);

    for (let i = 0; i < 5; i++) { // Lundi à Vendredi
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [jobDate]);

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
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                {selectedPoseur ? `Disponibilités : ${selectedPoseur.nom}` : 'Sélectionnez un poseur'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
             <button 
                onClick={fetchEvents}
                disabled={isLoading || !selectedPoseur}
                className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                title="Actualiser"
             >
                <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
             </button>
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
       </div>

       <div className="flex-grow flex flex-col overflow-hidden bg-slate-950">
         {!selectedPoseur ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
               <p className="text-slate-500 text-xs italic">Sélectionnez un poseur pour voir son agenda.</p>
            </div>
         ) : fetchError ? (
             <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
               <i className="fas fa-exclamation-triangle text-red-500 mb-2"></i>
               <p className="text-red-400 text-xs font-bold">{fetchError}</p>
               <p className="text-slate-600 text-[10px]">Vérifiez la connexion Nextcloud dans Admin.</p>
            </div>
         ) : (
           <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              {/* Vue Semaine Simplifiée */}
              <div className="space-y-4">
                 {weekDays.map(day => {
                    const dayEvents = displayEvents.filter(e => {
                        const evtDate = new Date(e.start);
                        return evtDate.getDate() === day.getDate() && 
                               evtDate.getMonth() === day.getMonth() &&
                               evtDate.getFullYear() === day.getFullYear();
                    });

                    const isJobDay = day.getDate() === jobDate.getDate() && day.getMonth() === jobDate.getMonth();

                    return (
                        <div key={day.toISOString()} className={`rounded-lg border ${isJobDay ? 'border-sky-800 bg-sky-900/10' : 'border-slate-800 bg-slate-900/50'} overflow-hidden`}>
                            <div className={`px-3 py-2 text-xs font-bold uppercase flex justify-between ${isJobDay ? 'text-sky-400' : 'text-slate-500'}`}>
                                <span>{day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                                {dayEvents.length > 0 && <span className="text-[10px] bg-slate-800 px-2 rounded-full text-slate-300">{dayEvents.length} évts</span>}
                            </div>
                            
                            <div className="p-2 space-y-2">
                                {dayEvents.length === 0 ? (
                                    <div className="text-[10px] text-slate-700 italic pl-2 py-1">Aucun événement</div>
                                ) : (
                                    dayEvents.map((evt, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`p-2 rounded text-[11px] border-l-2 flex flex-col gap-0.5 ${
                                                evt.isTentative 
                                                ? 'bg-orange-500/10 border-orange-500 text-orange-200 animate-pulse' 
                                                : 'bg-slate-800 border-sky-600 text-slate-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start font-bold">
                                                <span>{new Date(evt.start).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})} - {new Date(evt.end).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                                                {evt.isTentative && <span className="text-[8px] bg-orange-500 text-black px-1 rounded font-black uppercase">Prévu</span>}
                                            </div>
                                            <div className="truncate font-medium" title={evt.title}>{evt.title}</div>
                                            {evt.location && <div className="text-[9px] text-slate-500 truncate"><i className="fas fa-map-marker-alt mr-1"></i>{evt.location}</div>}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                 })}
              </div>
           </div>
         )}
       </div>
       
       {/* Légende */}
       <div className="bg-slate-900 border-t border-slate-800 p-3 flex gap-4 justify-center text-[10px]">
          <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 bg-sky-600 rounded-sm"></div>
             <span className="text-slate-400">Occupé (Nextcloud)</span>
          </div>
          <div className="flex items-center gap-1.5">
             <div className="w-2 h-2 bg-orange-500 rounded-sm animate-pulse"></div>
             <span className="text-slate-400">Ce Chantier</span>
          </div>
       </div>
    </div>
  );
};

export default CalendarManager;