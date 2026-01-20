
import React, { useState, useCallback, useEffect } from 'react';
import { AppStatus, ConstructionOrderData, AppView } from './types';
import { analyzeConstructionDocument } from './services/geminiService';
import { fetchStorageConfig, syncLocalStorageWithFile } from './services/configService';
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

  // Initialisation automatique depuis storage.json
  useEffect(() => {
    const initStorage = async () => {
      console.log("🔍 BuildScan AI : Vérification de la configuration locale...");
      const config = await fetchStorageConfig();
      if (config) {
        syncLocalStorageWithFile(config);
        console.log("✨ BuildScan AI : Synchronisation effectuée avec succès.");
      } else {
        console.warn("⚠️ BuildScan AI : Impossible de charger storage.json. Le système utilisera les dernières données locales connues.");
      }
    };
    initStorage();
  }, []);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError("Veuillez sélectionner un fichier au format PDF.");
      setStatus(AppStatus.ERROR);
      return;
    }

    setStatus(AppStatus.ANALYZING);
    setError(null);
    setExtractedData(null);

    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }

    try {
      const url = URL.createObjectURL(file);
      setFilePreviewUrl(url);

      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;
      const data = await analyzeConstructionDocument(base64Data, file.type);
      
      setExtractedData(data);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Une erreur est survenue lors de l'analyse du PDF.");
      setStatus(AppStatus.ERROR);
    }
  }, [filePreviewUrl]);

  const reset = () => {
    setStatus(AppStatus.IDLE);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setExtractedData(null);
    setError(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'admin_poseurs':
        return <AdminPoseurs />;
      case 'admin_clients':
        return <AdminClients />;
      case 'admin_webhook':
        return <AdminWebhook />;
      default:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <i className="fas fa-file-pdf text-blue-600"></i>
                  Document Source (PDF)
                </h2>
                <FileUploader onFileSelect={handleFileSelect} disabled={status === AppStatus.ANALYZING} />
                {filePreviewUrl && (
                  <div className="mt-6">
                    <p className="text-sm font-medium text-slate-500 mb-2 uppercase tracking-wider">Aperçu du PDF</p>
                    <div className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-100 min-h-[500px] flex items-center justify-center">
                      <iframe 
                        src={`${filePreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                        title="PDF Preview"
                        className="w-full h-[500px] border-none shadow-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="lg:col-span-7 space-y-6">
              {status === AppStatus.IDLE && !error && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-robot text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">Analyse de PDF Construction</h3>
                  <p className="text-blue-700">Téléchargez un bon de commande pour une extraction automatique et un mapping client ERP.</p>
                </div>
              )}
              {status === AppStatus.ANALYZING && (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mb-4"></div>
                  <h3 className="text-xl font-bold text-slate-800">Lecture du PDF en cours...</h3>
                  <p className="text-slate-500 mt-2 italic">Gemini identifie le client et structure les données pour samdb...</p>
                </div>
              )}
              {status === AppStatus.ERROR && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-3"></i>
                  <h3 className="text-lg font-bold text-red-800">Échec de l'analyse</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  <button onClick={reset} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Réessayer</button>
                </div>
              )}
              {extractedData && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  <ResultCard data={extractedData} onReset={reset} />
                  <SqlExporter data={extractedData} />
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm flex items-center justify-center gap-4">
          <span>BuildScan AI &copy; {new Date().getFullYear()}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Mode Fichier Local Actif (storage.json)</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
