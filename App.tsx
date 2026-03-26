
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppStatus, ConstructionOrderData, AppView, Client, Poseur, LogEntry } from './types';
import { analyzeConstructionDocument } from './services/geminiService';
import { fetchStorageConfig } from './services/configService';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ResultCard from './components/ResultCard';
import SqlExporter from './components/SqlExporter';
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
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Terminal Logs State
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Data enrichment states
  const [mappedClient, setMappedClient] = useState<Client | null>(null);
  const [potentialClients, setPotentialClients] = useState<Client[]>([]); 
  const [autoChantierNumber, setAutoChantierNumber] = useState<string | null>(null);
  const [isFetchingChantier, setIsFetchingChantier] = useState(false);
  
  const rawExtractedNameRef = useRef<string | null>(null);
  const [refreshDataTrigger, setRefreshDataTrigger] = useState(0);

  const [selectedPoseurId, setSelectedPoseurId] = useState<string>("");
  const [allPoseurs, setAllPoseurs] = useState<Poseur[]>([]);
  
  const [transmitting, setTransmitting] = useState(false);
  const [transmitStatus, setTransmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  useEffect(() => {
    const initApp = async () => {
      const config = await fetchStorageConfig();
      if (config) setAllPoseurs(config.poseurs);
      setIsInitialized(true);
    };
    initApp();
  }, []);

  useEffect(() => {
    return () => { if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl); };
  }, [filePreviewUrl]);

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

  const handlePdfDoubleClick = useCallback(() => setIsPdfModalOpen(true), []);

  const handleViewChange = (view: AppView) => {
    if (view === 'admin' && !isAuthenticated) {
      setShowAuthModal(true);
    } else {
      setCurrentView(view);
    }
  };

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
        return searchName === clientRefNom || searchName.includes(clientRefNom) || clientRefNom.includes(searchName);
      });
      setPotentialClients(matches);
      if (matches.length > 0) {
          const isCurrentStillValid = mappedClient && matches.some(m => m.id === mappedClient.id);
          if (!isCurrentStillValid) setMappedClient(matches[0]);
      } else {
        setMappedClient(null);
      }
    } catch (e) { console.error("Erreur parsing clients", e); }
  }, [extractedData?.nom_client, refreshDataTrigger, mappedClient]);

  useEffect(() => {
    if (mappedClient && extractedData) {
        const targetLibelle = mappedClient.libelle_client || mappedClient.nom;
        if (extractedData.nom_client !== targetLibelle) {
            setExtractedData(prev => prev ? ({ ...prev, nom_client: targetLibelle }) : null);
            addLog('info', `Client mappé : ${targetLibelle}`);
        }
    }
  }, [mappedClient, addLog]);

  useEffect(() => {
    if (!mappedClient) return;
    let assignedPoseur: Poseur | undefined;
    if (mappedClient.default_poseur && allPoseurs.length > 0) {
        assignedPoseur = allPoseurs.find(p => p.id === mappedClient.default_poseur);
    } 
    if (!assignedPoseur && mappedClient.typeAffaire && allPoseurs.length > 0) {
        assignedPoseur = allPoseurs.find(p => p.type === mappedClient.typeAffaire);
    }
    if (assignedPoseur) {
        setSelectedPoseurId(assignedPoseur.id);
        addLog('info', `Poseur assigné : ${assignedPoseur.nom}`);
    }
  }, [mappedClient, allPoseurs, addLog]);

  useEffect(() => {
    const fetchChantier = async () => {
      if (!mappedClient) { setAutoChantierNumber(null); return; }
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
          let newNumber = result.numero_affaire || result.next_id || result.value || result;
          if (newNumber) {
            const cleanNumber = String(newNumber).replace(/\D/g, '');
            const formattedNumber = cleanNumber.length > 6 ? cleanNumber.substring(cleanNumber.length - 6) : cleanNumber.padStart(6, '0');
            setAutoChantierNumber(formattedNumber);
            addLog('response', `Numéro d'affaire récupéré : ${formattedNumber}`);
          }
        } else {
          const errorText = await response.text().catch(() => "Impossible de lire le corps de l'erreur");
          addLog('error', `Erreur API Numéro Affaire (${response.status}): ${response.statusText}`, { details: errorText });
        }
      } catch (e: any) { 
        addLog('error', `Échec réseau récupération numéro d'affaire: ${e.message}`); 
      } finally { setIsFetchingChantier(false); }
    };
    fetchChantier();
  }, [mappedClient, addLog]);

  const handleTransmit = async () => {
      if (!extractedData) return;
      setTransmitting(true);
      setTransmitStatus('idle');
      const webhookUrl = localStorage.getItem('buildscan_webhook_url') || "";
      if (!webhookUrl) {
          addLog('error', 'URL Webhook manquante. Veuillez la configurer dans les réglages.');
          setTransmitStatus('error');
          setTransmitting(false);
          return;
      }

      const chantier = autoChantierNumber || (extractedData.num_bon_travaux ? extractedData.num_bon_travaux.replace(/\D/g, '').substring(0, 6) : "000000");
      const imputation = `80${chantier}0`;
      const fullAddress = [extractedData.adresse_1, extractedData.adresse_2, extractedData.adresse_3].filter(Boolean).join(' ');
      const contactFull = [extractedData.gardien_nom, extractedData.gardien_tel].filter(Boolean).join(' - ');
      const selectedPoseur = allPoseurs.find(p => p.id === selectedPoseurId);
      const finalClientLabel = mappedClient?.libelle_client || mappedClient?.nom || extractedData.nom_client || '';

      const formData = new FormData();
      if (originalFile) formData.append('file', originalFile, originalFile.name || 'document.pdf');
      
      const payload: any = {
        codeClient: mappedClient?.codeClient || '',
        code_trv: mappedClient?.typeAffaire || 'O3-0',
        client_bpu: mappedClient?.bpu || '',
        bpu: mappedClient?.bpu || '',
        client_nom: finalClientLabel,
        num_chantier: chantier,
        imputation: imputation,
        num_bon_travaux: extractedData.num_bon_travaux || '',
        nom_client_pdf: rawExtractedNameRef.current || extractedData.nom_client || '',
        categorie: extractedData.categorie || '',
        adresse_1: extractedData.adresse_1 || '',
        adresse_2: extractedData.adresse_2 || '',
        adresse_3: extractedData.adresse_3 || '',
        adresse_intervention: fullAddress,
        gardien_nom: extractedData.gardien_nom || '',
        gardien_tel: extractedData.gardien_tel || '',
        gardien_email: extractedData.gardien_email || '',
        coord_gardien: contactFull,
        delai_intervention: extractedData.delai_intervention || '',
        date_intervention: extractedData.date_intervention || '',
        descriptif_travaux: extractedData.descriptif_travaux || '',
        poseur_nom: selectedPoseur?.nom || '',
        poseur_code: selectedPoseur?.codeSalarie || ''
      };

      Object.entries(payload).forEach(([key, val]) => formData.append(key, val as string));

      // LOG DÉTAILLÉ DANS LE TERMINAL
      addLog('request', `Transmission vers n8n démarrée...`, { 
        target_url: webhookUrl,
        payload_summary: payload
      });

      try {
        const response = await fetch(webhookUrl, { method: 'POST', body: formData });
        
        let result: any = {};
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          result = await response.json().catch(() => ({}));
        } else {
          result = { text: await response.text().catch(() => "") };
        }

        if (response.ok && (result.success !== false)) {
          setTransmitStatus('success');
          addLog('success', `Transmission réussie à n8n.`, result);
        } else {
          const errorMsg = result.message || result.error || (typeof result === 'string' ? result : `Erreur HTTP ${response.status}`);
          throw new Error(errorMsg);
        }
      } catch (err: any) {
        setTransmitStatus('error');
        addLog('error', `Échec transmission: ${err.message}`, { 
          error_type: err.name,
          stack: err.stack?.split('\n')[0] 
        });
      } finally { setTransmitting(false); }
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') { setError("Format invalide."); setStatus(AppStatus.ERROR); return; }
    setStatus(AppStatus.ANALYZING);
    setError(null);
    setExtractedData(null);
    setOriginalFile(file);
    clearLogs();
    setIsSidebarOpen(false); 
    setTransmitStatus('idle');
    try {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);
      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;
      const data = await analyzeConstructionDocument(base64Data as string, file.type);
      rawExtractedNameRef.current = data.nom_client;
      setExtractedData(data);
      setStatus(AppStatus.SUCCESS);
      setIsHeaderVisible(false);
      addLog('success', 'Extraction IA terminée.', { pdf_client: data.nom_client });
    } catch (err: any) {
      setError(err.message || "Erreur analyse.");
      setStatus(AppStatus.ERROR);
      addLog('error', `Échec de l'analyse: ${err.message}`);
    }
  }, [addLog, clearLogs]);

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setExtractedData(null);
    setMappedClient(null);
    setOriginalFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    clearLogs();
    setIsSidebarOpen(true);
    setIsHeaderVisible(true);
    setTransmitStatus('idle');
  };

  if (!isInitialized) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold">Initialisation...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-x-hidden relative">
      {isPdfModalOpen && filePreviewUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white w-full h-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
              <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                  <span className="font-bold text-sm uppercase">Aperçu Document</span>
                  <button onClick={() => setIsPdfModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors"><i className="fas fa-times"></i></button>
              </div>
              <div className="flex-grow bg-slate-200">
                  <iframe src={`${filePreviewUrl}#toolbar=0&navpanes=0`} className="w-full h-full"></iframe>
              </div>
           </div>
        </div>
      )}
      {!isHeaderVisible && <button onClick={() => setIsHeaderVisible(true)} className="absolute top-2 right-4 z-50 bg-slate-800 text-slate-400 p-2 rounded-b-lg text-xs font-bold opacity-50 hover:opacity-100">Menu</button>}
      {isHeaderVisible && <Header currentView={currentView} onViewChange={handleViewChange} />}
      {showAuthModal && <AdminAuth onAuthenticated={() => { setIsAuthenticated(true); setShowAuthModal(false); setCurrentView('admin'); }} onCancel={() => setShowAuthModal(false)} />}
      <main className={`flex-grow container mx-auto px-4 py-8 max-w-[98%] ${!isHeaderVisible ? 'pt-4' : ''}`}>
        {currentView === 'admin' && <AdminDashboard />}
        {currentView === 'analyzer' && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className={`${isSidebarOpen ? 'lg:w-[350px]' : 'w-0 overflow-hidden'} transition-all`}>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
                <h2 className="text-xl font-black mb-4 uppercase tracking-tight">Scan PDF</h2>
                <FileUploader onFileSelect={handleFileSelect} disabled={status === AppStatus.ANALYZING} />
                {filePreviewUrl && <iframe src={`${filePreviewUrl}#toolbar=0`} className="w-full h-[500px] border-none mt-6 rounded-xl bg-slate-100 shadow-inner" />}
              </div>
            </div>
            <div className="flex-grow flex flex-col gap-6 min-w-0">
              {status === AppStatus.IDLE && <div className="bg-blue-600 rounded-2xl p-10 text-center text-white shadow-xl mx-auto max-w-2xl mt-10">Analyseur BuildScan - Glissez un PDF</div>}
              {status === AppStatus.ANALYZING && <div className="bg-white border-2 border-blue-50 rounded-2xl p-16 text-center mx-auto max-w-2xl mt-10 font-bold uppercase">Extraction...</div>}
              {extractedData && (
                <div className="space-y-6">
                  <div className="grid gap-6 items-start grid-cols-1 xl:grid-cols-2">
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[850px]">
                        <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest">Document Source</span><button onClick={handlePdfDoubleClick} className="text-[10px] bg-slate-700 px-2 py-1 rounded font-bold uppercase transition-colors">Plein Écran</button></div>
                        <iframe src={`${filePreviewUrl}#navpanes=0&scrollbar=1`} className="w-full h-full border-none" />
                      </div>
                      <ResultCard 
                          data={extractedData} 
                          onReset={reset} 
                          mappedClient={mappedClient}
                          potentialClients={potentialClients}
                          onClientMatchUpdate={(id) => { const s = potentialClients.find(c => c.id === id); if(s) setMappedClient(s); }}
                          chantierNumber={autoChantierNumber}
                          isFetchingChantier={isFetchingChantier}
                          onUpdate={(upd) => setExtractedData(prev => prev ? ({...prev, ...upd}) : null)}
                          poseurs={allPoseurs}
                          selectedPoseurId={selectedPoseurId}
                          onPoseurSelect={setSelectedPoseurId}
                          onTransmit={handleTransmit}
                          isTransmitting={transmitting}
                          transmitStatus={transmitStatus}
                          rawPdfClientName={rawExtractedNameRef.current}
                      />
                  </div>
                  <SqlExporter data={extractedData} mappedClient={mappedClient} prefilledChantierNumber={autoChantierNumber} logs={logs} onAddLog={addLog} onClearLogs={clearLogs} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">BuildScan AI v2.7 • ERP Connector</footer>
    </div>
  );
};

export default App;
