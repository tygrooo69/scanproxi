import React, { useState, useCallback, useEffect } from 'react';
import { AppStatus, ConstructionOrderData, AppView } from './types';
import { analyzeConstructionDocument } from './services/geminiService';
import { fetchStorageConfig } from './services/configService';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ResultCard from './components/ResultCard';
import SqlExporter from './components/SqlExporter';
import AdminPoseurs from './components/AdminPoseurs';
import AdminClients from './components/AdminClients';
import AdminWebhook from './components/AdminWebhook';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('analyzer');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ConstructionOrderData | null>(null);

  useEffect(() => {
    const initApp = async () => {
      const config = await fetchStorageConfig();
      if (config) {
        localStorage.setItem('buildscan_webhook_url', config.webhook_url);
        localStorage.setItem('buildscan_clients', JSON.stringify(config.clients));
        localStorage.setItem('buildscan_poseurs', JSON.stringify(config.poseurs));
        localStorage.setItem('buildscan_last_sync', new Date().toISOString());
        localStorage.setItem('buildscan_data_source', 'server');
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError("Format invalide. Veuillez uploader un PDF.");
      setStatus(AppStatus.ERROR);
      return;
    }

    setStatus(AppStatus.ANALYZING);
    setError(null);
    setExtractedData(null);

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
      setError(err.message || "Une erreur inconnue est survenue.");
      setStatus(AppStatus.ERROR);
    }
  }, []);

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setExtractedData(null);
    setError(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {currentView === 'admin_poseurs' && <AdminPoseurs />}
          {currentView === 'admin_clients' && <AdminClients />}
          {currentView === 'admin_webhook' && <AdminWebhook />}
          
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
                      <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Aperçu du scan</p>
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
                    <div className="relative inline-block mb-6">
                      <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-20 animate-pulse"></div>
                      <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent shadow-lg"></div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Extraction en cours...</h3>
                    <p className="text-slate-400 text-sm mt-2">Gemini analyse la structure du document...</p>
                  </div>
                )}

                {status === AppStatus.ERROR && (
                  <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-8 animate-in shake duration-500">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                        <i className="fas fa-exclamation-triangle text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-red-800 uppercase tracking-tight">Erreur d'analyse</h3>
                        <p className="text-red-700 mt-1 font-medium">{error}</p>
                        <button onClick={reset} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-colors">
                          Réessayer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {extractedData && (
                  <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 space-y-6">
                    <ResultCard data={extractedData} onReset={reset} />
                    <SqlExporter data={extractedData} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="container mx-auto px-4 text-center flex items-center justify-center gap-4">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">BuildScan AI v2.2</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-tighter bg-blue-50 px-2 py-0.5 rounded">Serveur Node Actif</span>
        </div>
      </footer>
    </div>
  );
};

export default App;