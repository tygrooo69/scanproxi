import React, { useMemo, useState, useEffect } from 'react';
import { Poseur, NextcloudConfig, ConstructionOrderData, LogEntry, CalendarEvent } from '../types';

interface CalendarManagerProps {
  poseurs: Poseur[];
  selectedPoseurId: string;
  data: ConstructionOrderData;
  onAddLog: (type: LogEntry['type'], message: string, data?: any) => void;
  chantierNumber: string | null;
  originalFile: File | null;
  onUpdate?: (updates: Partial<ConstructionOrderData>) => void;
  
  // New props for sync
  onTentativeChange?: (event: CalendarEvent | null) => void;
  onRdvStatusChange?: (isSaved: boolean) => void;
  refreshTrigger?: number; // Pour forcer le rafraichissement depuis le parent
}

const CalendarManager: React.FC<CalendarManagerProps> = ({ 
  poseurs, 
  selectedPoseurId, 
  data, 
  onAddLog, 
  chantierNumber, 
  originalFile,
  onUpdate,
  onTentativeChange,
  onRdvStatusChange,
  refreshTrigger = 0
}) => {
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
    // Si delai_intervention contient une heure (format HHhMM), on ignore pour trouver la date de base
    // Le regex cherche JJ/MM/AAAA
    const dateStr = data.delai_intervention || data.date_intervention;
    if (!dateStr) return new Date();
    const parts = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (parts) {
      // On initialise à 8h30 par défaut
      return new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]), 8, 30, 0);
    }
    const d = new Date();
    d.setHours(8, 30, 0, 0);
    return d;
  }, [data.delai_intervention, data.date_intervention]);

  // Récupération des événements via le Proxy Server
  const fetchEvents = async () => {
    if (!selectedPoseurId || !selectedPoseur?.nextcloud_user) return;
    
    setIsLoading(true);
    setFetchError(null);
    // onAddLog('request', `Sync Nextcloud: Récupération agenda...`);

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
      
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Erreur serveur inconnue");
      }
      
      setEvents(result.events);

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
  }, [selectedPoseurId, refreshTrigger]);

  // Logique pure pour trouver le prochain créneau (Tetris)
  const findNextAvailableSlot = (baseDate: Date, existingEvents: CalendarEvent[]) => {
      let tentativeStart = new Date(baseDate);
      tentativeStart.setHours(8, 30, 0, 0);

      const DURATION_MINUTES = 120; // 2 heures
      const MAX_START_HOUR = 15;
      const MAX_START_MINUTE = 30;

      const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

      while(isWeekend(tentativeStart)) {
         tentativeStart.setDate(tentativeStart.getDate() + 1);
         tentativeStart.setHours(8, 30, 0, 0);
      }

      let isSlotFound = false;
      let safetyCounter = 0;

      while (!isSlotFound && safetyCounter < 100) {
         safetyCounter++;

         if (tentativeStart.getHours() > MAX_START_HOUR || 
            (tentativeStart.getHours() === MAX_START_HOUR && tentativeStart.getMinutes() > MAX_START_MINUTE)) {
            tentativeStart.setDate(tentativeStart.getDate() + 1);
            tentativeStart.setHours(8, 30, 0, 0);
            while(isWeekend(tentativeStart)) {
               tentativeStart.setDate(tentativeStart.getDate() + 1);
            }
            continue;
         }

         const tentativeEnd = new Date(tentativeStart.getTime() + DURATION_MINUTES * 60000);

         const dayEvents = existingEvents.filter(e => {
            const evtDate = new Date(e.start);
            return evtDate.toDateString() === tentativeStart.toDateString();
         });

         const collision = dayEvents.find(e => {
            const eStart = new Date(e.start).getTime();
            const eEnd = new Date(e.end).getTime();
            const tStart = tentativeStart.getTime();
            const tEnd = tentativeEnd.getTime();
            return (tStart < eEnd && tEnd > eStart);
         });

         if (collision) {
            tentativeStart = new Date(collision.end);
         } else {
            isSlotFound = true;
         }
      }
      
      return { start: tentativeStart, end: new Date(tentativeStart.getTime() + DURATION_MINUTES * 60000) };
  };

  // Gestion des événements (Affichage + Calcul Tentative)
  const displayEvents = useMemo(() => {
    const list: CalendarEvent[] = [...events];
    let tentative: CalendarEvent | null = null;
    let savedFound = false;

    // Vérifier si le bon de travail est DÉJÀ dans l'agenda
    if (data.num_bon_travaux && events.length > 0) {
        // Recherche un événement qui contient le numéro de bon dans le titre ou la description
        // On nettoie le num bon pour éviter les erreurs de format
        const cleanBon = data.num_bon_travaux.replace(/[^a-zA-Z0-9]/g, '');
        
        const existingEvent = events.find(e => {
            const t = (e.title || '').replace(/[^a-zA-Z0-9]/g, '');
            const d = (e.description || '').replace(/[^a-zA-Z0-9]/g, '');
            return (t.includes(cleanBon) || d.includes(cleanBon)) && cleanBon.length > 3;
        });

        if (existingEvent) {
            savedFound = true;
        }
    }

    // Notifier le parent si c'est sauvegardé ou non
    // On utilise un timeout pour éviter l'update pendant le render
    setTimeout(() => {
        if (onRdvStatusChange) onRdvStatusChange(savedFound);
    }, 0);

    // Si pas sauvegardé, on propose un créneau (Tetris)
    if (!savedFound && data.nom_client) {
      
      const slot = findNextAvailableSlot(jobDate, list);

      const titleParts = [
        chantierNumber ? `${chantierNumber}` : null,
        data.num_bon_travaux ? `${data.num_bon_travaux}` : null,
        data.nom_client
      ].filter(Boolean);

      const title = titleParts.join(' - ');

      tentative = {
        uid: 'tentative-preview',
        title: title,
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
        location: `${data.adresse_1} ${data.adresse_3}`,
        description: `Client: ${data.nom_client}\nTel: ${data.gardien_tel || 'N/A'}\n${data.descriptif_travaux}\nRef: ${data.num_bon_travaux}`,
        isTentative: true
      };

      list.push(tentative);
    }

    // Notifier le parent du changement de tentative (pour le bouton Validation)
    setTimeout(() => {
        if (onTentativeChange) onTentativeChange(tentative);
    }, 0);

    return list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, data, jobDate, chantierNumber]); // Dependancies

  // Update du délai d'intervention si tentative change
  useEffect(() => {
      const tentative = displayEvents.find(e => e.isTentative);
      if (tentative && onUpdate && data.nom_client) {
          const startDate = new Date(tentative.start);
          const day = String(startDate.getDate()).padStart(2, '0');
          const month = String(startDate.getMonth() + 1).padStart(2, '0');
          const year = startDate.getFullYear();
          const hour = String(startDate.getHours()).padStart(2, '0');
          const min = String(startDate.getMinutes()).padStart(2, '0');
          
          const formattedString = `${day}/${month}/${year} ${hour}h${min}`;
          
          if (data.delai_intervention !== formattedString) {
              onUpdate({ delai_intervention: formattedString });
          }
      }
  }, [displayEvents]); // Trigger when calculated events change

  // Gestion des jours semaine
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(jobDate);
    startOfWeek.setDate(startOfWeek.getDate() + (weekOffset * 7));
    
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    for (let i = 0; i < 5; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [jobDate, weekOffset]);

  const toLocalISO = (dateStr: string) => {
    const d = new Date(dateStr);
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEventDoubleClick = (evt: CalendarEvent) => {
    setEditingEvent({ ...evt });
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !selectedPoseurId) return;

    setIsSaving(true);
    onAddLog('request', `Enregistrement manuel rendez-vous...`);

    try {
      let fileData = null;
      let fileName = null;

      if (editingEvent.isTentative && originalFile) {
        fileName = originalFile.name;
        fileData = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]); 
          reader.onerror = reject;
          reader.readAsDataURL(originalFile);
        });
      }

      const res = await fetch('/api/calendar/event/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poseur_id: selectedPoseurId,
          event: editingEvent,
          file: fileData ? { name: fileName, data: fileData } : undefined
        })
      });

      const result = await res.json();
      
      if (res.ok && result.success) {
         onAddLog('success', `Rendez-vous enregistré (Manuel).`);
         setIsModalOpen(false);
         fetchEvents();
      } else {
         throw new Error(result.error);
      }
    } catch (err: any) {
      onAddLog('error', `Erreur sauvegarde: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper pour vérifier si un event est celui enregistré pour ce bon
  const isSavedEvent = (evt: CalendarEvent) => {
      if (evt.isTentative) return false;
      if (!data.num_bon_travaux) return false;
      const cleanBon = data.num_bon_travaux.replace(/[^a-zA-Z0-9]/g, '');
      const t = (evt.title || '').replace(/[^a-zA-Z0-9]/g, '');
      const d = (evt.description || '').replace(/[^a-zA-Z0-9]/g, '');
      return (t.includes(cleanBon) || d.includes(cleanBon)) && cleanBon.length > 3;
  };

  if (!nextcloudConfig) {
    return (
      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-800 p-6 flex flex-col items-center justify-center text-center h-full">
         <p className="text-white font-bold text-sm">Calendrier non configuré</p>
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
          
          <button 
            onClick={fetchEvents}
            disabled={isLoading || !selectedPoseur}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
          </button>
       </div>

       {/* CALENDRIER */}
       <div className="flex-grow flex flex-col overflow-hidden bg-slate-950">
         {!selectedPoseur ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-4">
               <p className="text-slate-500 text-xs italic">Sélectionnez un poseur.</p>
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

                    const isJobDay = day.getDate() === jobDate.getDate() && 
                                     day.getMonth() === jobDate.getMonth() &&
                                     weekOffset === 0;

                    const isToday = new Date().getDate() === day.getDate() && 
                                    new Date().getMonth() === day.getMonth();

                    return (
                        <div key={day.toISOString()} className={`rounded-lg border ${isJobDay ? 'border-sky-800 bg-sky-900/10' : 'border-slate-800 bg-slate-900/50'} overflow-hidden`}>
                            <div className={`px-3 py-2 text-xs font-bold uppercase flex justify-between ${isJobDay ? 'text-sky-400' : isToday ? 'text-white' : 'text-slate-500'}`}>
                                <span>{day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                                {dayEvents.length > 0 && <span className="text-[10px] bg-slate-800 px-2 rounded-full text-slate-300">{dayEvents.length}</span>}
                            </div>
                            
                            <div className="p-2 space-y-2 min-h-[40px]">
                                {dayEvents.length === 0 ? (
                                    <div className="text-[10px] text-slate-800 italic pl-2">...</div>
                                ) : (
                                    dayEvents.map((evt, idx) => {
                                        const saved = isSavedEvent(evt);
                                        return (
                                        <div 
                                            key={idx}
                                            onDoubleClick={() => handleEventDoubleClick(evt)}
                                            className={`p-2 rounded text-[11px] border-l-2 flex flex-col gap-0.5 cursor-pointer hover:brightness-110 transition-all ${
                                                evt.isTentative 
                                                ? 'bg-orange-500/10 border-orange-500 text-orange-200 animate-pulse hover:animate-none' 
                                                : saved
                                                    ? 'bg-emerald-600 border-emerald-400 text-white animate-pulse' // STYLE VERT CLIGNOTANT ICI
                                                    : 'bg-slate-800 border-sky-600 text-slate-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start font-bold">
                                                <span>{new Date(evt.start).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                                                {evt.isTentative && <span className="text-[8px] bg-orange-500 text-black px-1 rounded font-black uppercase">NEW</span>}
                                                {saved && <span className="text-[8px] bg-white text-emerald-700 px-1 rounded font-black uppercase"><i className="fas fa-check"></i> SAVED</span>}
                                            </div>
                                            <div className="truncate font-medium">{evt.title}</div>
                                        </div>
                                    )})
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
          <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-slate-800 border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl flex flex-col max-h-full">
                <form onSubmit={handleSaveEvent} className="p-4 space-y-4">
                   <h3 className="text-white font-bold mb-4">Édition Rapide</h3>
                   <input 
                     type="text" required
                     className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                     value={editingEvent.title}
                     onChange={e => setEditingEvent({...editingEvent, title: e.target.value})}
                   />
                   {/* ... champs simplifiés pour l'exemple ... */}
                   <div className="flex gap-2 pt-2">
                       <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded font-bold">Enregistrer</button>
                       <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-600 text-white py-2 rounded font-bold">Fermer</button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default CalendarManager;