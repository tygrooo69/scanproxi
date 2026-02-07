import React, { useMemo, useState, useEffect } from 'react';
import { Poseur, NextcloudConfig, ConstructionOrderData, LogEntry } from '../types';

interface CalendarManagerProps {
  poseurs: Poseur[];
  selectedPoseurId: string;
  data: ConstructionOrderData;
  onAddLog: (type: LogEntry['type'], message: string, data?: any) => void;
}

interface CalendarEvent {
  uid?: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  isTentative?: boolean; // Pour le chantier en cours d'analyse
}

const CalendarManager: React.FC<CalendarManagerProps> = ({ poseurs, selectedPoseurId, data, onAddLog }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // States pour la modale d'édition
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const nextcloudConfigString = localStorage.getItem('buildscan_nextcloud');
  const nextcloudConfig: NextcloudConfig | null = nextcloudConfigString ? JSON.parse(nextcloudConfigString) : null;
  
  const selectedPoseur = useMemo(() => 
    poseurs.find(p => p.id === selectedPoseurId), 
  [poseurs, selectedPoseurId]);

  const webInterfaceUrl = useMemo(() => {
     if (!nextcloudConfig?.url) return null;
     return `${nextcloudConfig.url.replace(/\/$/, '')}/index.php/apps/calendar/`;
  }, [nextcloudConfig]);

  // Déterminer la date du chantier pour l'affichage initial
  const jobDate = useMemo(() => {
    const dateStr = data.delai_intervention || data.date_intervention;
    if (!dateStr) return new Date();
    const parts = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (parts) {
      return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), 8, 0, 0);
    }
    return new Date();
  }, [data.delai_intervention, data.date_intervention]);

  // Récupération des événements via le Proxy Server
  const fetchEvents = async () => {
    if (!selectedPoseurId || !selectedPoseur?.nextcloud_user) return;
    
    setIsLoading(true);
    setFetchError(null);
    onAddLog('request', `Sync Nextcloud: Récupération agenda pour ${selectedPoseur.nextcloud_user}...`);

    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poseur_id: selectedPoseurId })
      });
      
      let result;
      try {
        result = await res.json();
      } catch (e) {
        throw new Error(`Erreur critique: Réponse serveur invalide (${res.status})`);
      }
      
      if (result.debugUrl) {
          onAddLog('info', `[Nextcloud DEBUG] URL ICS : ${result.debugUrl}`);
      }
      
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Erreur serveur inconnue");
      }
      
      setEvents(result.events);
      onAddLog('response', `Nextcloud: ${result.events.length} événements synchronisés.`, { 
          poseur: selectedPoseur.nom, 
          events_count: result.events.length 
      });

    } catch (e: any) {
      console.error("Erreur Fetch Calendar:", e);
      setFetchError(e.message || "Impossible de récupérer l'agenda.");
      onAddLog('error', `Erreur Nextcloud CalDAV: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedPoseurId) {
      setEvents([]);
      fetchEvents();
    }
  }, [selectedPoseurId]);

  // Gestion de l'édition / Sauvegarde
  const handleEventDoubleClick = (evt: CalendarEvent) => {
    setEditingEvent({ ...evt });
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !selectedPoseurId) return;

    setIsSaving(true);
    onAddLog('request', `Enregistrement rendez-vous vers Nextcloud...`);

    try {
      const res = await fetch('/api/calendar/event/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poseur_id: selectedPoseurId,
          event: editingEvent
        })
      });

      const result = await res.json();
      
      if (res.ok && result.success) {
         onAddLog('success', `Rendez-vous enregistré avec succès (UID: ${result.uid})`);
         setIsModalOpen(false);
         fetchEvents(); // Rafraîchir
      } else {
         throw new Error(result.error || "Erreur lors de l'enregistrement");
      }

    } catch (err: any) {
      console.error("Save error:", err);
      onAddLog('error', `Erreur sauvegarde Nextcloud: ${err.message}`);
      alert(`Erreur: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const displayEvents = useMemo(() => {
    const list: CalendarEvent[] = [...events];
    
    // Ajouter le chantier actuel comme événement "Fantôme" s'il n'existe pas déjà (basique)
    if (data.nom_client) {
      const start = jobDate;
      const end = new Date(start);
      end.setHours(start.getHours() + 4);

      // On ajoute un ID factice pour pouvoir double-cliquer
      list.push({
        uid: 'tentative-preview',
        title: `[NOUVEAU] ${data.nom_client}`,
        start: start.toISOString(),
        end: end.toISOString(),
        location: `${data.adresse_1} ${data.adresse_3}`,
        description: `Client: ${data.nom_client}\nTel: ${data.gardien_tel || 'N/A'}\n${data.descriptif_travaux}`,
        isTentative: true
      });
    }

    return list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, data, jobDate]);

  // Générer les jours de la semaine avec l'offset
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(jobDate);
    // Appliquer le décalage de semaine
    startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * 7));
    
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // ajuster pour lundi
    startOfWeek.setDate(diff);

    for (let i = 0; i < 5; i++) { // Lundi à Vendredi
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [jobDate, weekOffset]);

  // Formatage pour input datetime-local
  const toLocalISO = (dateStr: string) => {
    const d = new Date(dateStr);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

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
    <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 h-full flex flex-col relative">
       
       {/* HEADER */}
       <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sky-600/20 text-sky-400 rounded flex items-center justify-center">
              <i className="fas fa-calendar-alt text-sm"></i>
            </div>
            <div>
              <h3 className="text-white font-bold uppercase tracking-wider text-xs">Agenda <span className="text-sky-400">Nextcloud</span></h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                {selectedPoseur ? selectedPoseur.nom : 'Non assigné'}
              </p>
            </div>
          </div>
          
          {/* NAVIGATION SEMAINE */}
          <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
             <button onClick={() => setWeekOffset(prev => prev - 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">
                <i className="fas fa-chevron-left text-xs"></i>
             </button>
             <span className="text-[10px] font-mono font-bold text-slate-300 w-16 text-center">
                Sem {weekOffset > 0 ? `+${weekOffset}` : weekOffset}
             </span>
             <button onClick={() => setWeekOffset(prev => prev + 1)} className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">
                <i className="fas fa-chevron-right text-xs"></i>
             </button>
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
                <a href={webInterfaceUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors">
                   <i className="fas fa-external-link-alt"></i>
                </a>
             )}
          </div>
       </div>

       {/* CALENDRIER */}
       <div className="flex-grow flex flex-col overflow-hidden bg-slate-950">
         {!selectedPoseur ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
               <p className="text-slate-500 text-xs italic">Sélectionnez un poseur pour voir son agenda.</p>
            </div>
         ) : fetchError ? (
             <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
               <i className="fas fa-exclamation-triangle text-red-500 mb-2"></i>
               <p className="text-red-400 text-xs font-bold">{fetchError}</p>
            </div>
         ) : (
           <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              <div className="space-y-4">
                 {weekDays.map(day => {
                    const dayEvents = displayEvents.filter(e => {
                        const evtDate = new Date(e.start);
                        return evtDate.getDate() === day.getDate() && 
                               evtDate.getMonth() === day.getMonth() &&
                               evtDate.getFullYear() === day.getFullYear();
                    });

                    // Vérifie si c'est la date "originale" du document (sans offset)
                    const isJobDay = day.getDate() === jobDate.getDate() && 
                                     day.getMonth() === jobDate.getMonth() &&
                                     weekOffset === 0;

                    const isToday = new Date().getDate() === day.getDate() && 
                                    new Date().getMonth() === day.getMonth();

                    return (
                        <div key={day.toISOString()} className={`rounded-lg border ${isJobDay ? 'border-sky-800 bg-sky-900/10' : 'border-slate-800 bg-slate-900/50'} overflow-hidden`}>
                            <div className={`px-3 py-2 text-xs font-bold uppercase flex justify-between ${isJobDay ? 'text-sky-400' : isToday ? 'text-white' : 'text-slate-500'}`}>
                                <div className="flex items-center gap-2">
                                   <span>{day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                                   {isToday && <span className="bg-emerald-600 text-[8px] px-1.5 rounded text-white">AUJ</span>}
                                </div>
                                {dayEvents.length > 0 && <span className="text-[10px] bg-slate-800 px-2 rounded-full text-slate-300">{dayEvents.length}</span>}
                            </div>
                            
                            <div className="p-2 space-y-2 min-h-[40px]">
                                {dayEvents.length === 0 ? (
                                    <div className="text-[10px] text-slate-800 italic pl-2 py-1 select-none">...</div>
                                ) : (
                                    dayEvents.map((evt, idx) => (
                                        <div 
                                            key={idx}
                                            onDoubleClick={() => handleEventDoubleClick(evt)}
                                            className={`p-2 rounded text-[11px] border-l-2 flex flex-col gap-0.5 cursor-pointer hover:brightness-110 transition-all ${
                                                evt.isTentative 
                                                ? 'bg-orange-500/10 border-orange-500 text-orange-200 animate-pulse hover:animate-none' 
                                                : 'bg-slate-800 border-sky-600 text-slate-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start font-bold">
                                                <span>{new Date(evt.start).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})} - {new Date(evt.end).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                                                {evt.isTentative && <span className="text-[8px] bg-orange-500 text-black px-1 rounded font-black uppercase">Nouveau</span>}
                                            </div>
                                            <div className="truncate font-medium">{evt.title}</div>
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

       {/* MODALE D'EDITION */}
       {isModalOpen && editingEvent && (
          <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
             <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-full">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                   <h3 className="text-white font-bold flex items-center gap-2">
                      <i className="fas fa-edit text-sky-400"></i>
                      {editingEvent.isTentative ? 'Créer le Rendez-vous' : 'Modifier Rendez-vous'}
                   </h3>
                   <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times"></i></button>
                </div>
                
                <form onSubmit={handleSaveEvent} className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Titre</label>
                      <input 
                        type="text" required
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm focus:border-sky-500 outline-none"
                        value={editingEvent.title}
                        onChange={e => setEditingEvent({...editingEvent, title: e.target.value})}
                      />
                   </div>
                   
                   <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Début</label>
                        <input 
                           type="datetime-local" required
                           className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-white text-xs focus:border-sky-500 outline-none"
                           value={toLocalISO(editingEvent.start)}
                           onChange={e => setEditingEvent({...editingEvent, start: new Date(e.target.value).toISOString()})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Fin</label>
                        <input 
                           type="datetime-local" required
                           className="w-full bg-slate-900 border border-slate-600 rounded p-1.5 text-white text-xs focus:border-sky-500 outline-none"
                           value={toLocalISO(editingEvent.end)}
                           onChange={e => setEditingEvent({...editingEvent, end: new Date(e.target.value).toISOString()})}
                        />
                      </div>
                   </div>

                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Lieu</label>
                      <input 
                        type="text"
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-xs focus:border-sky-500 outline-none"
                        value={editingEvent.location || ''}
                        onChange={e => setEditingEvent({...editingEvent, location: e.target.value})}
                      />
                   </div>

                   <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description</label>
                      <textarea 
                        className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-xs focus:border-sky-500 outline-none h-20"
                        value={editingEvent.description || ''}
                        onChange={e => setEditingEvent({...editingEvent, description: e.target.value})}
                      />
                   </div>
                   
                   <button 
                     type="submit" 
                     disabled={isSaving}
                     className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-lg mt-2 flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                   >
                     {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                     {editingEvent.isTentative ? 'Confirmer & Créer' : 'Enregistrer Modifications'}
                   </button>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default CalendarManager;