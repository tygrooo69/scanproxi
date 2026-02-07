import React, { useState, useCallback, useEffect } from 'react';
import { AppStatus, ConstructionOrderData, AppView, Client } from './types';
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
  
  // Data enrichment states
  const [mappedClient, setMappedClient] = useState<Client | null>(null);
  const [autoChantierNumber, setAutoChantierNumber] = useState<string | null>(null);
  const [isFetchingChantier, setIsFetchingChantier] = useState(false);
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  useEffect(() => {
    const initApp = async () => {
      console.log('🚀 Initialisation BuildScan AI...');
      await fetchStorageConfig(); // Pré-chargement du cache
      setIsInitialized(true);
    };
    initApp();
  }, []);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  // --- AUTOMATISATION LOGIQUE METIER ---
  
  // 1. Détection automatique du Client dès que les données sont extraites
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
    } catch (e) {
      console.error("Erreur parsing clients", e);
    }
  }, [extractedData?.nom_client]); // Dépendance affinée sur le nom uniquement

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

  // Handler pour la mise à jour manuelle des données extraites
  const handleDataUpdate = (updates: Partial<ConstructionOrderData>) => {
    if (extractedData) {
      setExtractedData({ ...extractedData, ...updates });
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
    setAutoChantierNumber(null);
    setOriginalFile(file);

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
    } catch (err: any) {
      console.error("Analyse échouée:", err);
      let msg = err.message || "Une erreur inconnue est survenue.";
      if (msg.includes("429") || msg.toLowerCase().includes("quota")) {
        msg = "Quota dépassé (Erreur 429). Veuillez patienter 60 secondes.";
      }
      setError(msg);
      setStatus(AppStatus.ERROR);
    }
  }, []);

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setExtractedData(null);
    setMappedClient(null);
    setAutoChantierNumber(null);
    setError(null);
    setOriginalFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header currentView={currentView} onViewChange={handleViewChange} />
      
      {showAuthModal && (
        <AdminAuth onAuthenticated={handleAuthSuccess} onCancel={handleAuthCancel} />
      )}

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {currentView === 'admin' && <AdminDashboard />}
          
          {currentView === 'analyzer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-black mb-4 flex items-center gap-2 uppercase tracking-tight">
                    <i className="fas fa-file-pdf text-blue-600"></i>
                    Document Source
                  </h2>
                  <FileUploader onFileSelect={handleFileSelect} disabled={status === AppStatus.ANALYZING} />
                  
                  {filePreviewUrl && (
                    <div className="mt-6 animate-in fade-in zoom-in-95 duration-300">
                      <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest text-center">Aperçu du scan</p>
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-100 min-h-[500px] flex items-center justify-center shadow-inner">
                        <iframe src={`${filePreviewUrl}#toolbar=0`} title="PDF Preview" className="w-full h-[500px] border-none" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-7 space-y-6">
                {status === AppStatus.IDLE && (
                  <div className="bg-blue-600 rounded-2xl p-10 text-center text-white shadow-xl shadow-blue-900/20">
                    <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                      <i className="fas fa-robot text-4xl"></i>
                    </div>
                    <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Analyseur BuildScan</h3>
                    <p className="text-blue-100 font-medium">Glissez un PDF pour extraire les données chantiers vers l'ERP.</p>
                  </div>
                )}

                {status === AppStatus.ANALYZING && (
                  <div className="bg-white border-2 border-blue-50 rounded-2xl p-16 text-center shadow-sm">
                    <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4 shadow-lg"></div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Extraction en cours...</h3>
                  </div>
                )}

                {status === AppStatus.ERROR && (
                  <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-8 animate-in shake duration-500">
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
                    <ResultCard 
                      data={extractedData} 
                      onReset={reset} 
                      mappedClient={mappedClient}
                      chantierNumber={autoChantierNumber}
                      isFetchingChantier={isFetchingChantier}
                      onUpdate={handleDataUpdate}
                    />
                    <SqlExporter 
                      data={extractedData} 
                      originalFile={originalFile || undefined} 
                      mappedClient={mappedClient}
                      prefilledChantierNumber={autoChantierNumber}
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
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">BuildScan AI v2.5 • PocketBase Ed.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;