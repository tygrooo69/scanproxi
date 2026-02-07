import React, { useState, useCallback, useEffect } from 'react';
import { AppStatus, ConstructionOrderData, AppView, Client, Poseur, LogEntry } from './types';
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

  // Terminal Logs State (Shared)
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Data enrichment states
  const [mappedClient, setMappedClient] = useState<Client | null>(null);
  const [autoChantierNumber, setAutoChantierNumber] = useState<string | null>(null);
  const [isFetchingChantier, setIsFetchingChantier] = useState(false);
  
  // Calendar & Poseur sync state
  const [selectedPoseurId, setSelectedPoseurId] = useState<string>("");
  const [allPoseurs, setAllPoseurs] = useState<Poseur[]>([]);
  
  // Transmission State (Moved from SqlExporter)
  const [transmitting, setTransmitting] = useState(false);
  const [transmitStatus, setTransmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  useEffect(() => {
    const initApp = async () => {
      console.log('🚀 Initialisation BuildScan AI...');
      const config = await fetchStorageConfig(); // Pré-chargement du cache
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
  
  // 1. Détection automatique du Client et Poseur
  useEffect(() => {
    if (!extractedData?.nom_client) {
      setMappedClient(null);
      return;
    }

    const saved = localStorage.getItem('buildscan_clients');
    if (!saved) return;

    try {
      const clients: Client[] = JSON.parse(saved);
      const searchName = extractedData.nom_client.toLowerCase().trim();
      
      const found = clients.find(c => {
        const clientRefNom = c.nom.toLowerCase().trim();
        return searchName === clientRefNom || 
               searchName.includes(clientRefNom) || 
               clientRefNom.includes(searchName);
      });
      
      setMappedClient(found || null);

      // Auto-assignation Poseur
      if (found && found.typeAffaire && allPoseurs.length > 0) {
         const match = allPoseurs.find(p => p.type === found.typeAffaire);
         if (match) {
            setSelectedPoseurId(match.id);
            addLog('info', `Poseur pré-sélectionné : ${match.nom} (Type: ${match.type})`);
         }
      }

    } catch (e) {
      console.error("Erreur parsing clients", e);
    }
  }, [extractedData?.nom_client, allPoseurs, addLog]);

  // 2. Récupération automatique du numéro d'affaire via Webhook
  useEffect(() => {
    const fetchChantier = async () => {
      if (!mappedClient) {
        setAutoChantierNumber(null);
        return;
      }

      const url = localStorage.getItem('buildscan_client_webhook_url');
      if (!url) return;

      setIsFetchingChantier(true);
      try {
        console.log(`📡 Appel Webhook Auto pour ${mappedClient.nom} (${mappedClient.typeAffaire})...`);
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            typeAffaire: mappedClient.typeAffaire,
            codeClient: mappedClient.codeClient,
            nomClient: mappedClient.nom
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
            const formattedNumber = cleanNumber.length > 6 ? cleanNumber.substring(cleanNumber.length - 6) : cleanNumber.padStart(6, '0');
            setAutoChantierNumber(formattedNumber);
            console.log("✅ Numéro récupéré :", formattedNumber);
          }
        }
      } catch (e) {
        console.error("Erreur Webhook Auto:", e);
      } finally {
        setIsFetchingChantier(false);
      }
    };

    fetchChantier();
  }, [mappedClient]);


  // --- TRANSMISSION WEBHOOK (Moved from SqlExporter) ---
  const handleTransmit = async () => {
      if (!extractedData) return;
      
      setTransmitting(true);
      setTransmitStatus('idle');
      const webhookUrl = localStorage.getItem('buildscan_webhook_url') || "http://194.116.0.110:5678/webhook-test/857f9b11-6d28-4377-a63b-c431ff3fc324";
      
      // Calcul des données dérivées pour l'envoi
      const chantier = autoChantierNumber || (extractedData.num_bon_travaux ? extractedData.num_bon_travaux.replace(/\D/g, '').substring(0, 6) : "000000");
      const imputation = `80${chantier}0`;
      const fullAddress = [extractedData.adresse_1, extractedData.adresse_2, extractedData.adresse_3].filter(Boolean).join(' ');
      const contactFull = [extractedData.gardien_nom, extractedData.gardien_tel].filter(Boolean).join(' - ');
      const selectedPoseur = allPoseurs.find(p => p.id === selectedPoseurId);

      const formData = new FormData();
      
      if (originalFile) {
        formData.append('file', originalFile, 'document.pdf');
      }
      
      formData.append('codeClient', mappedClient?.codeClient || '');
      formData.append('code_trv', mappedClient?.typeAffaire || 'O3-0');
      formData.append('client_bpu', mappedClient?.bpu || '');
      formData.append('client_nom', mappedClient?.nom || '');
      formData.append('num_chantier', chantier);
      formData.append('imputation', imputation);
      formData.append('source', "BuildScan AI");
      formData.append('timestamp', new Date().toISOString());

      formData.append('num_bon_travaux', extractedData.num_bon_travaux || '');
      formData.append('nom_client', extractedData.nom_client || '');
      
      formData.append('adresse_1', extractedData.adresse_1 || '');
      formData.append('adresse_2', extractedData.adresse_2 || '');
      formData.append('adresse_3', extractedData.adresse_3 || '');
      formData.append('adresse_intervention', fullAddress);

      formData.append('gardien_nom', extractedData.gardien_nom || '');
      formData.append('gardien_tel', extractedData.gardien_tel || '');
      formData.append('gardien_email', extractedData.gardien_email || '');
      formData.append('coord_gardien', contactFull);
      
      formData.append('delai_intervention', extractedData.delai_intervention || '');
      formData.append('date_intervention', extractedData.date_intervention || '');
      formData.append('descriptif_travaux', extractedData.descriptif_travaux || '');
      formData.append('libelle', extractedData.nom_client || '');

      if (selectedPoseur) {
        formData.append('poseur_id', selectedPoseur.id);
        formData.append('poseur_nom', selectedPoseur.nom);
        formData.append('poseur_code', selectedPoseur.codeSalarie || '');
        formData.append('poseur_type', selectedPoseur.type || '');
      }

      addLog('request', `Envoi vers n8n...`, { 
          imputation, 
          poseur: selectedPoseur?.nom 
      });

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          setTransmitStatus('success');
          addLog('response', `Réponse n8n : Succès (HTTP ${response.status})`);
        } else {
          throw new Error(`Erreur n8n : ${response.status}`);
        }
      } catch (err: any) {
        console.error("Erreur Webhook:", err);
        setTransmitStatus('error');
        addLog('error', `Échec transmission: ${err.message}`);
      } finally {
        setTransmitting(false);
        setTimeout(() => setTransmitStatus('idle'), 3000);
      }
  };


  const handleViewChange = (view: AppView) => {
    if (view === 'analyzer') {
      setCurrentView('analyzer');
      return;
    }
    
    if (view === 'admin') {
      if (isAuthenticated) {
        setCurrentView('admin');
      } else {
        setShowAuthModal(true);
      }
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
  
  const handlePoseurSelect = (id: string, poseurs: Poseur[]) => {
      setSelectedPoseurId(id);
      // setAllPoseurs(poseurs); // Déjà géré au chargement
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
    setAutoChantierNumber(null);
    setOriginalFile(file);
    // Reset logs on new file
    clearLogs();
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
      
      setExtractedData(data);
      setStatus(AppStatus.SUCCESS);
      // AUTO HIDE UI ELEMENTS ON SUCCESS
      setIsSidebarOpen(false); 
      setIsHeaderVisible(false);

      addLog('success', 'Extraction IA terminée avec succès.', { client: data.nom_client });
    } catch (err: any) {
      console.error("Analyse échouée:", err);
      let msg = err.message || "Une erreur inconnue est survenue.";
      if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
        msg = "Quota dépassé (Erreur 429). Veuillez patienter 60 secondes.";
      }
      setError(msg);
      setStatus(AppStatus.ERROR);
      addLog('error', `Échec de l'analyse: ${msg}`);
    }
  }, [addLog, clearLogs]);

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setExtractedData(null);
    setMappedClient(null);
    setAutoChantierNumber(null);
    setError(null);
    setOriginalFile(null);
    setSelectedPoseurId("");
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    clearLogs();
    // Re-ouvrir la sidebar et le header si on reset
    setIsSidebarOpen(true);
    setIsHeaderVisible(true);
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
      
      {/* HEADER TOGGLE BUTTON (Visible only when header is hidden) */}
      {!isHeaderVisible && (
         <button 
           onClick={() => setIsHeaderVisible(true)}
           className="absolute top-2 right-4 z-50 bg-slate-800 text-slate-400 hover:text-white p-2 rounded-b-lg shadow-md text-xs font-bold transition-all opacity-50 hover:opacity-100"
           title="Afficher le menu"
         >
           <i className="fas fa-chevron-down"></i> Menu
         </button>
      )}

      {/* HEADER (Conditionally rendered) */}
      {isHeaderVisible && <Header currentView={currentView} onViewChange={handleViewChange} />}
      
      {showAuthModal && (
        <AdminAuth onAuthenticated={handleAuthSuccess} onCancel={handleAuthCancel} />
      )}

      <main className={`flex-grow container mx-auto px-4 py-8 max-w-[98%] transition-all ${!isHeaderVisible ? 'pt-4' : ''}`}>
        <div className="mx-auto">
          {currentView === 'admin' && <AdminDashboard />}
          
          {currentView === 'analyzer' && (
            <div className="flex flex-col lg:flex-row gap-6 transition-all duration-300">
              
              {/* COLONNE GAUCHE : UPLOAD (Masquable) */}
              <div className={`${isSidebarOpen ? 'lg:w-[350px] shrink-0' : 'w-0 overflow-hidden'} transition-all duration-300`}>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                   <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
                        <i className="fas fa-file-pdf text-blue-600"></i>
                        Scan PDF
                      </h2>
                      <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400"><i className="fas fa-times"></i></button>
                   </div>
                  <FileUploader onFileSelect={handleFileSelect} disabled={status === AppStatus.ANALYZING} />
                  
                  {filePreviewUrl && (
                    <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                      <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest text-center">Aperçu</p>
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 min-h-[500px] flex items-center justify-center shadow-inner">
                        <iframe src={`${filePreviewUrl}#toolbar=0`} title="PDF Preview" className="w-full h-[500px] border-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BOUTON TOGGLE Sidebar (Si sidebar fermée) */}
              {!isSidebarOpen && (
                 <div className="absolute left-4 top-24 z-40">
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
                        title="Afficher Scan"
                    >
                        <i className="fas fa-file-pdf"></i>
                    </button>
                 </div>
              )}

              {/* COLONNE DROITE : RESULTATS */}
              <div className="flex-grow flex flex-col gap-6 min-w-0">
                {/* BOUTON TOGGLE Sidebar Desktop */}
                {isSidebarOpen && status === AppStatus.SUCCESS && (
                     <div className="hidden lg:flex justify-start">
                        <button 
                            onClick={() => setIsSidebarOpen(false)}
                            className="text-xs font-bold text-slate-400 hover:text-blue-600 flex items-center gap-2"
                        >
                            <i className="fas fa-chevron-left"></i> Masquer le Scan (Plein écran)
                        </button>
                     </div>
                )}

                {status === AppStatus.IDLE && (
                  <div className="bg-blue-600 rounded-2xl p-10 text-center text-white shadow-xl shadow-blue-900/20 mx-auto max-w-2xl mt-10">
                    <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <i className="fas fa-robot text-4xl"></i>
                    </div>
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
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                        <i className="fas fa-exclamation-triangle text-xl"></i>
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-black text-red-800 uppercase tracking-tight">Échec de l'IA</h3>
                        <p className="text-red-700 mt-1 font-medium italic">{error}</p>
                        <button onClick={reset} className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200">
                          Réessayer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {extractedData && (
                  <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-6">
                    {/* LAYOUT GRID: RESULTATS (GAUCHE) + CALENDRIER (DROITE) */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                        {/* 1. RESULTATS */}
                        <ResultCard 
                            data={extractedData} 
                            onReset={reset} 
                            mappedClient={mappedClient}
                            chantierNumber={autoChantierNumber}
                            isFetchingChantier={isFetchingChantier}
                            onUpdate={handleDataUpdate}
                            // Props ajoutées pour transmission et poseur
                            poseurs={allPoseurs}
                            selectedPoseurId={selectedPoseurId}
                            onPoseurSelect={setSelectedPoseurId}
                            onTransmit={handleTransmit}
                            isTransmitting={transmitting}
                            transmitStatus={transmitStatus}
                        />
                        
                        {/* 2. CALENDRIER (A DROITE) */}
                        <div className="h-full min-h-[600px]">
                            <CalendarManager 
                                poseurs={allPoseurs}
                                selectedPoseurId={selectedPoseurId}
                                data={extractedData}
                                onAddLog={addLog}
                                chantierNumber={autoChantierNumber}
                                originalFile={originalFile}
                                onUpdate={handleDataUpdate}
                            />
                        </div>
                    </div>

                    {/* 3. TERMINAL (EN BAS) */}
                    <SqlExporter 
                      data={extractedData} 
                      originalFile={originalFile || undefined} 
                      mappedClient={mappedClient}
                      prefilledChantierNumber={autoChantierNumber}
                      onPoseurSelect={(id) => setSelectedPoseurId(id)}
                      logs={logs}
                      onAddLog={addLog}
                      onClearLogs={clearLogs}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="container mx-auto px-4 text-center">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">BuildScan AI v2.7 • Nextcloud Ed.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;