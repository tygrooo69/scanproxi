
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStatus, ConstructionOrderData, AppView, Client, Poseur, LogEntry, CalendarEvent } from './types';
import { analyzeConstructionDocument } from './services/geminiService';
import { fetchStorageConfig } from './services/configService';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ResultCard from './components/ResultCard';
import SqlExporter from './components/SqlExporter';
import CalendarManager from './components/CalendarManager';
import AdminDashboard from './components/AdminDashboard';
import AdminAuth from './components/AdminAuth';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('analyzer');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ConstructionOrderData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Terminal Logs State (Shared)
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Data enrichment states
  const [mappedClient, setMappedClient] = useState<Client | null>(null);
  const [potentialClients, setPotentialClients] = useState<Client[]>([]); 
  const [autoChantierNumber, setAutoChantierNumber] = useState<string | null>(null);
  const [isFetchingChantier, setIsFetchingChantier] = useState(false);
  
  // On garde une référence du nom original extrait du PDF pour la recherche
  const rawExtractedNameRef = useRef<string | null>(null);
  
  // Trigger pour forcer le re-calcul du mapping (Client/Poseur) au changement de vue
  const [refreshDataTrigger, setRefreshDataTrigger] = useState(0);

  // Calendar & Poseur sync state
  const [selectedPoseurId, setSelectedPoseurId] = useState<string>("");
  const [allPoseurs, setAllPoseurs] = useState<Poseur[]>([]);
  const [tentativeEvent, setTentativeEvent] = useState<CalendarEvent | null>(null);
  const [isRdvSaved, setIsRdvSaved] = useState(false);
  const [calendarRefreshTrigger, setCalendarRefreshTrigger] = useState(0);
  
  // Transmission State
  const [transmitting, setTransmitting] = useState(false);
  const [transmitStatus, setTransmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  useEffect(() => {
    const initApp = async () => {
      console.log('🚀 Initialisation BuildScan AI...');
      const config = await fetchStorageConfig();
      if (config) {
        setAllPoseurs(config.poseurs);
      }
      setIsInitialized(true);
    };
    initApp();
  }, []);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // --- SHARED LOGGING FUNCTION ---
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

  const clearLogs = useCallback(() => setLogs([]), []);

  // --- AUTOMATISATION LOGIQUE METIER ---
  
  // 1. Détection automatique du Client (Gestion Multi-Affaires)
  useEffect(() => {
    const nameToSearch = rawExtractedNameRef.current || extractedData?.nom_client;
    
    if (!nameToSearch) {
      setMappedClient(null);
      setPotentialClients([]);
      return;
    }

    const saved = localStorage.getItem('buildscan_clients');
    if (!saved) return;

    try {
      const clients: Client[] = JSON.parse(saved);
      const searchName = nameToSearch.toLowerCase().trim();
      
      const matches = clients.filter(c => {
        const clientRefNom = c.nom.toLowerCase().trim();
        return searchName === clientRefNom || 
               searchName.includes(clientRefNom) || 
               clientRefNom.includes(searchName);
      });
      
      setPotentialClients(matches);

      if (matches.length > 0) {
          const isCurrentStillValid = mappedClient && matches.some(m => m.id === mappedClient.id);
          if (!isCurrentStillValid) {
            setMappedClient(matches[0]);
          }
      } else {
        setMappedClient(null);
      }

    } catch (e) {
      console.error("Erreur parsing clients", e);
    }
  }, [extractedData?.nom_client, refreshDataTrigger]);

  useEffect(() => {
    if (mappedClient && extractedData) {
        const targetLibelle = mappedClient.libelle_client || mappedClient.nom;
        if (extractedData.nom_client !== targetLibelle) {
            setExtractedData(prev => prev ? ({ ...prev, nom_client: targetLibelle }) : null);
            addLog('info', `Client mappé : ${targetLibelle}`);
        }
    }
  }, [mappedClient, addLog]);

  // 2. Assignation automatique du Poseur selon le Client sélectionné
  useEffect(() => {
    if (!mappedClient) return;

    let assignedPoseur: Poseur | undefined;
    let method = '';

    if (mappedClient.default_poseur && allPoseurs.length > 0) {
        assignedPoseur = allPoseurs.find(p => p.id === mappedClient.default_poseur);
        method = 'Lien Client';
    } 
    
    if (!assignedPoseur && mappedClient.typeAffaire && allPoseurs.length > 0) {
        assignedPoseur = allPoseurs.find(p => p.type === mappedClient.typeAffaire);
        method = 'Type Affaire';
    }

    if (assignedPoseur) {
        setSelectedPoseurId(assignedPoseur.id);
        addLog('info', `Poseur assigné (${method}) : ${assignedPoseur.nom}`);
    }
  }, [mappedClient, allPoseurs, addLog]);

  // 3. Récupération automatique du numéro d'affaire via Webhook
  useEffect(() => {
    const fetchChantier = async () => {
      if (!mappedClient) {
        setAutoChantierNumber(null);
        return;
      }

      const url = localStorage.getItem('buildscan_client_webhook_url');
      if (!url) return;

      setIsFetchingChantier(true);
      setAutoChantierNumber(null); 
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            typeAffaire: mappedClient.typeAffaire,
            codeClient: mappedClient.codeClient,
            nomClient: mappedClient.libelle_client || mappedClient.nom
          })
        });

        if (response.ok) {
          const result = await response.json();
          let newNumber = "";
          
          if (result.numero_affaire) newNumber = result.numero_affaire;
          else if (result.next_id) newNumber = result.next_id;
          else if (result.value) newNumber = result.value;
          else if (typeof result === 'string') newNumber = result;
          else if (typeof result === 'number') newNumber = String(result);

          if (newNumber) {
            const cleanNumber = String(newNumber).replace(/\D/g, '');
            const formattedNumber = cleanNumber.length > 6 ? cleanNumber.substring(cleanNumber.length - length - 6) : cleanNumber.padStart(6, '0');
            setAutoChantierNumber(formattedNumber);
            addLog('response', `Numéro d'affaire récupéré : ${formattedNumber}`);
          }
        }
      } catch (e) {
        console.error("Erreur Webhook Auto:", e);
        addLog('error', `Échec récupération numéro d'affaire.`);
      } finally {
        setIsFetchingChantier(false);
      }
    };

    fetchChantier();
  }, [mappedClient, addLog]);

  // --- HANDLERS ---
  const handleClientUpdate = (clientId: string) => {
      const selected = potentialClients.find(c => c.id === clientId);
      if (selected) {
          setMappedClient(selected);
          addLog('info', `Changement de compte : ${selected.libelle_client || selected.nom} (${selected.typeAffaire})`);
      }
  };

  const handleSaveRdv = async () => {
      if (!tentativeEvent || !selectedPoseurId) return;

      addLog('request', `Validation RDV le ${new Date(tentativeEvent.start).toLocaleString()}...`);

      try {
          let fileData = null;
          let fileName = null;

          if (originalFile) {
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
                  event: tentativeEvent,
                  file: fileData ? { name: fileName, data: fileData } : undefined
              })
          });

          const result = await res.json();
          
          if (res.ok && result.success) {
              addLog('success', `RDV validé et enregistré dans Nextcloud.`);
              setIsRdvSaved(true);
              setTentativeEvent(null);
              setCalendarRefreshTrigger(prev => prev + 1);
          } else {
              throw new Error(result.error || "Erreur enregistrement");
          }

      } catch (e: any) {
          addLog('error', `Echec validation RDV: ${e.message}`);
          alert("Erreur lors de la validation du RDV: " + e.message);
      }
  };


  const handleTransmit = async () => {
      if (!extractedData) return;
      
      setTransmitting(true);
      setTransmitStatus('idle');
      const webhookUrl = localStorage.getItem('buildscan_webhook_url') || "";
      
      const chantier = autoChantierNumber || (extractedData.num_bon_travaux ? extractedData.num_bon_travaux.replace(/\D/g, '').substring(0, 6) : "000000");
      const imputation = `80${chantier}0`;
      
      // Préparation des adresses et contacts concaténés
      const fullAddress = [extractedData.adresse_1, extractedData.adresse_2, extractedData.adresse_3].filter(Boolean).join(' ');
      const contactFull = [extractedData.gardien_nom, extractedData.gardien_tel].filter(Boolean).join(' - ');
      
      const selectedPoseur = allPoseurs.find(p => p.id === selectedPoseurId);
      const finalClientLabel = mappedClient?.libelle_client || mappedClient?.nom || extractedData.nom_client || '';

      const formData = new FormData();
      if (originalFile) formData.append('file', originalFile, 'document.pdf');
      
      // INFOS CLIENT (MAPPING ERP)
      formData.append('codeClient', mappedClient?.codeClient || '');
      formData.append('code_trv', mappedClient?.typeAffaire || 'O3-0');
      
      // RÈGLE : BPU = véritable code BPU du client (Transmis à n8n)
      formData.append('client_bpu', mappedClient?.bpu || '');
      formData.append('client_nom', finalClientLabel);
      
      // INFOS CHANTIER
      formData.append('num_chantier', chantier);
      formData.append('imputation', imputation);
      formData.append('num_bon_travaux', extractedData.num_bon_travaux || '');
      formData.append('nom_client_pdf', rawExtractedNameRef.current || extractedData.nom_client || '');
      formData.append('categorie', extractedData.categorie || ''); 
      
      // --- AJOUT DES CHAMPS SÉPARÉS (REQUIS PAR N8N) ---
      formData.append('adresse_1', extractedData.adresse_1 || '');
      formData.append('adresse_2', extractedData.adresse_2 || '');
      formData.append('adresse_3', extractedData.adresse_3 || '');
      formData.append('adresse_intervention', fullAddress); // Version concaténée
      
      formData.append('gardien_nom', extractedData.gardien_nom || '');
      formData.append('gardien_tel', extractedData.gardien_tel || '');
      formData.append('gardien_email', extractedData.gardien_email || '');
      formData.append('coord_gardien', contactFull); // Version concaténée
      // ------------------------------------------------

      formData.append('delai_intervention', extractedData.delai_intervention || '');
      formData.append('date_intervention', extractedData.date_intervention || '');
      formData.append('descriptif_travaux', extractedData.descriptif_travaux || '');
      
      // METADATA
      formData.append('source', "BuildScan AI");
      formData.append('timestamp', new Date().toISOString());

      if (selectedPoseur) {
        formData.append('poseur_id', selectedPoseur.id);
        formData.append('poseur_nom', selectedPoseur.nom);
        formData.append('poseur_code', selectedPoseur.codeSalarie || '');
        formData.append('poseur_type', selectedPoseur.type || '');
      }

      addLog('request', `Envoi complet vers n8n...`, { 
        imputation, 
        client: finalClientLabel,
        bpu: mappedClient?.bpu,
        categorie: extractedData.categorie
      });

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: formData
        });
        const result = await response.json().catch(() => ({}));

        if (response.ok && (result.success !== false)) {
          setTransmitStatus('success');
          addLog('response', `Réponse n8n : ${result.message || 'Succès'}`);
        } else {
          throw new Error(result.message || `Erreur n8n : ${response.status}`);
        }
      } catch (err: any) {
        setTransmitStatus('error');
        addLog('error', `Échec transmission: ${err.message}`);
      } finally {
        setTransmitting(false);
      }
  };

  const handlePdfDoubleClick = () => {
    setIsPdfModalOpen(true);
    setIsCalendarVisible(false);
  };

  const handleViewChange = async (view: AppView) => {
    if (view === 'analyzer') {
      const config = await fetchStorageConfig();
      if (config) setAllPoseurs(config.poseurs);
      setRefreshDataTrigger(prev => prev + 1);
      setCurrentView('analyzer');
      return;
    }
    
    if (view === 'admin') {
      if (isAuthenticated) setCurrentView('admin');
      else setShowAuthModal(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthModal(false);
    setCurrentView('admin');
  };

  const handleAuthCancel = () => {
    setShowAuthModal(false);
    if (currentView !== 'analyzer') setCurrentView('analyzer');
  };

  const handleDataUpdate = (updates: Partial<ConstructionOrderData>) => {
    if (extractedData) {
      setExtractedData(prev => prev ? ({ ...prev, ...updates }) : null);
    }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError("Format invalide. Veuillez uploader un PDF.");
      setStatus(AppStatus.ERROR);
      return;
    }

    setStatus(AppStatus.ANALYZING);
    setError(null);
    setExtractedData(null);
    setMappedClient(null);
    setPotentialClients([]);
    setAutoChantierNumber(null);
    setOriginalFile(file);
    rawExtractedNameRef.current = null;
    clearLogs();
    setTentativeEvent(null);
    setIsRdvSaved(false);
    
    // NOUVEAU: On masque l'agenda à la fin du scan pour favoriser la vue Side-by-Side
    setIsCalendarVisible(false);
    setIsSidebarOpen(false); 
    
    // Reset transmission state
    setTransmitStatus('idle');
    setTransmitting(false);
    
    addLog('info', 'Analyse du document démarrée...');

    try {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);

      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;
      const data = await analyzeConstructionDocument(base64Data, file.type);
      
      rawExtractedNameRef.current = data.nom_client;
      
      setExtractedData(data);
      setStatus(AppStatus.SUCCESS);
      setIsHeaderVisible(false);
      // On s'assure que l'agenda est masqué après le scan réussi
      setIsCalendarVisible(false);
      addLog('success', 'Extraction IA terminée.', { pdf_client: data.nom_client });
    } catch (err: any) {
      console.error("Analyse échouée:", err);
      let msg = err.message || "Une erreur inconnue est survenue.";
      if (msg.includes("429") || msg.toLowerCase().includes("quota")) msg = "Quota dépassé. Veuillez patienter.";
      setError(msg);
      setStatus(AppStatus.ERROR);
      addLog('error', `Échec de l'analyse: ${msg}`);
    }
  }, [addLog, clearLogs]);

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setExtractedData(null);
    setMappedClient(null);
    setPotentialClients([]);
    setAutoChantierNumber(null);
    rawExtractedNameRef.current = null;
    setError(null);
    setOriginalFile(null);
    setSelectedPoseurId("");
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    clearLogs();
    setTentativeEvent(null);
    setIsRdvSaved(false);
    setIsSidebarOpen(true);
    setIsHeaderVisible(true);
    setIsCalendarVisible(true);
    
    setTransmitStatus('idle');
    setTransmitting(false);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Connexion à la Base de Données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden relative">
      {isPdfModalOpen && filePreviewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full h-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
              <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between shrink-0">
                  <span className="font-bold text-sm uppercase tracking-wider"><i className="fas fa-file-pdf mr-2"></i> Aperçu Document (Mode Copie)</span>
                  <button onClick={() => setIsPdfModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors"><i className="fas fa-times"></i></button>
              </div>
              <div className="flex-grow bg-slate-200">
                  <iframe src={`${filePreviewUrl}#toolbar=0&navpanes=0`} className="w-full h-full" title="PDF Fullscreen"></iframe>
              </div>
           </div>
        </div>
      )}

      {!isHeaderVisible && (
         <button onClick={() => setIsHeaderVisible(true)} className="absolute top-2 right-4 z-50 bg-slate-800 text-slate-400 hover:text-white p-2 rounded-b-lg shadow-md text-xs font-bold transition-all opacity-50 hover:opacity-100"><i className="fas fa-chevron-down"></i> Menu</button>
      )}

      {isHeaderVisible && <Header currentView={currentView} onViewChange={handleViewChange} />}
      {showAuthModal && <AdminAuth onAuthenticated={handleAuthSuccess} onCancel={handleAuthCancel} />}

      <main className={`flex-grow container mx-auto px-4 py-8 max-w-[98%] transition-all ${!isHeaderVisible ? 'pt-4' : ''}`}>
        <div className="mx-auto">
          {currentView === 'admin' && <AdminDashboard />}
          {currentView === 'analyzer' && (
            <div className="flex flex-col lg:flex-row gap-6 transition-all duration-300">
              <div className={`${isSidebarOpen ? 'lg:w-[350px] shrink-0' : 'w-0 overflow-hidden'} transition-all duration-300`}>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                   <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight"><i className="fas fa-file-pdf text-blue-600"></i> Scan PDF</h2>
                      <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400"><i className="fas fa-times"></i></button>
                   </div>
                  <FileUploader onFileSelect={handleFileSelect} disabled={status === AppStatus.ANALYZING} />
                  {filePreviewUrl && (
                    <div className="mt-6 animate-in fade-in zoom-in-95 duration-300 group">
                      <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aperçu</p>
                      </div>
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 min-h-[500px] flex items-center justify-center shadow-inner hover:ring-2 hover:ring-blue-400 transition-all">
                        <iframe src={`${filePreviewUrl}#toolbar=0`} title="PDF Preview" className="w-full h-[500px] border-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!isSidebarOpen && status !== AppStatus.SUCCESS && (
                 <div className="absolute left-4 top-24 z-40"><button onClick={() => setIsSidebarOpen(true)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"><i className="fas fa-file-pdf"></i></button></div>
              )}

              <div className="flex-grow flex flex-col gap-6 min-w-0">
                {status === AppStatus.IDLE && (
                  <div className="bg-blue-600 rounded-2xl p-10 text-center text-white shadow-xl shadow-blue-900/20 mx-auto max-w-2xl mt-10">
                    <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm"><i className="fas fa-robot text-4xl"></i></div>
                    <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Analyseur BuildScan</h3>
                    <p className="text-blue-100 font-medium">Glissez un PDF pour extraire les données chantiers vers l'ERP et l'Agenda.</p>
                  </div>
                )}

                {status === AppStatus.ANALYZING && (
                  <div className="bg-white border-2 border-blue-50 rounded-2xl p-16 text-center shadow-sm mx-auto max-w-2xl mt-10">
                    <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4 shadow-lg"></div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Extraction en cours...</h3>
                  </div>
                )}

                {status === AppStatus.ERROR && (
                  <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-8 animate-in shake duration-500 mx-auto max-w-2xl mt-10">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0"><i className="fas fa-exclamation-triangle text-xl"></i></div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-black text-red-800 uppercase tracking-tight">Échec de l'IA</h3>
                        <p className="text-red-700 mt-1 font-medium italic">{error}</p>
                        <button onClick={reset} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">Réessayer</button>
                      </div>
                    </div>
                  </div>
                )}

                {extractedData && (
                  <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-6">
                    <div className={`grid gap-6 items-start ${isCalendarVisible ? 'grid-cols-1 xl:grid-cols-3' : 'grid-cols-1 xl:grid-cols-2'}`}>
                        {/* PDF SCAN À GAUCHE - INTERACTIF */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[850px] animate-in slide-in-from-left-4 duration-500">
                          <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between shrink-0">
                            <span className="text-[10px] font-black uppercase tracking-widest"><i className="fas fa-file-pdf mr-2"></i> Document Source</span>
                            <div className="flex items-center gap-2">
                               <button onClick={handlePdfDoubleClick} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded font-bold uppercase transition-colors">Plein Écran</button>
                            </div>
                          </div>
                          <div className="flex-grow bg-slate-100 relative">
                             <iframe 
                               src={`${filePreviewUrl}#navpanes=0&scrollbar=1`} 
                               className="w-full h-full border-none" 
                               title="PDF View Interactive"
                             />
                          </div>
                        </div>

                        {/* FORMULAIRE DE RÉSULTATS */}
                        <div className="h-full">
                          <ResultCard 
                              data={extractedData} 
                              onReset={reset} 
                              mappedClient={mappedClient}
                              potentialClients={potentialClients}
                              onClientMatchUpdate={handleClientUpdate}
                              chantierNumber={autoChantierNumber}
                              isFetchingChantier={isFetchingChantier}
                              onUpdate={handleDataUpdate}
                              poseurs={allPoseurs}
                              selectedPoseurId={selectedPoseurId}
                              onPoseurSelect={setSelectedPoseurId}
                              onTransmit={handleTransmit}
                              isTransmitting={transmitting}
                              transmitStatus={transmitStatus}
                              tentativeEvent={tentativeEvent}
                              isRdvSaved={isRdvSaved}
                              onValidateRdv={handleSaveRdv}
                              isCalendarVisible={isCalendarVisible}
                              onToggleCalendar={() => setIsCalendarVisible(!isCalendarVisible)}
                              rawPdfClientName={rawExtractedNameRef.current}
                          />
                        </div>

                        {/* AGENDA (SI ACTIVÉ PAR L'UTILISATEUR) */}
                        {isCalendarVisible && (
                          <div className="h-[850px] animate-in fade-in slide-in-from-right-4 duration-300">
                              <CalendarManager 
                                  poseurs={allPoseurs}
                                  selectedPoseurId={selectedPoseurId}
                                  data={extractedData}
                                  onAddLog={addLog}
                                  chantierNumber={autoChantierNumber}
                                  originalFile={originalFile}
                                  onUpdate={handleDataUpdate}
                                  onTentativeChange={setTentativeEvent}
                                  onRdvStatusChange={setIsRdvSaved}
                                  refreshTrigger={calendarRefreshTrigger}
                                  onClose={() => setIsCalendarVisible(false)}
                              />
                          </div>
                        )}
                    </div>
                    <SqlExporter data={extractedData} mappedClient={mappedClient} prefilledChantierNumber={autoChantierNumber} logs={logs} onAddLog={addLog} onClearLogs={clearLogs} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="container mx-auto px-4 text-center"><span className="text-slate-400 text-xs font-bold uppercase tracking-widest">BuildScan AI v2.7 • Nextcloud Ed.</span></div>
      </footer>
    </div>
  );
};

export default App;
