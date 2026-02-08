import React, { useState, useEffect } from 'react';
import { getWiki, saveWiki } from '../services/configService';

const AdminWiki: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Identifiant unique pour la page d'aide principale
  const SLUG = 'aide-et-fonctionnalite';

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setIsLoading(true);
    const data = await getWiki(SLUG);
    if (data && data.content) {
        setContent(data.content);
        if (data.updated) setLastSaved(new Date(data.updated));
    } else {
        setContent("# Aide & Fonctionnalités\n\nBienvenue dans la documentation de BuildScan AI.\n\n## Comment utiliser l'application ?\n1. Uploader un PDF\n2. Vérifier les données\n3. Enregistrer vers n8n\n\n(Cliquez sur Modifier pour éditer ce texte)");
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveWiki(SLUG, content);
    if (success) {
        setLastSaved(new Date());
        setIsEditing(false);
    } else {
        alert("Erreur lors de la sauvegarde du Wiki.");
    }
    setIsSaving(false);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i className="fas fa-book text-emerald-500"></i>
              Wiki / Documentation
           </h2>
           <p className="text-slate-500 text-sm mt-1">Documentation interne et procédures (Format Markdown)</p>
        </div>
        <div className="flex items-center gap-4">
            {lastSaved && <span className="text-xs text-slate-400 hidden sm:inline">Dernière modif: {lastSaved.toLocaleTimeString()}</span>}
            {isEditing ? (
                <>
                    <button 
                        onClick={() => setIsEditing(false)} 
                        className="text-slate-500 hover:text-slate-800 font-bold px-4 py-2 text-sm"
                    >
                        Annuler
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                    >
                        {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                        Enregistrer
                    </button>
                </>
            ) : (
                <button 
                    onClick={() => setIsEditing(true)} 
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    <i className="fas fa-edit"></i>
                    Modifier
                </button>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
         {isLoading ? (
             <div className="flex items-center justify-center h-64">
                 <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
             </div>
         ) : isEditing ? (
             <div className="flex flex-col h-full">
                 <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-mono text-slate-500 flex justify-between">
                     <span>Mode Édition (Markdown supporté)</span>
                     <div className="flex gap-4">
                        <span>**Gras**</span>
                        <span># Titre</span>
                        <span>- Liste</span>
                     </div>
                 </div>
                 <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-[600px] p-6 focus:outline-none font-mono text-sm text-slate-800 resize-none leading-relaxed"
                    placeholder="# Titre de la documentation..."
                 />
             </div>
         ) : (
             <div className="p-8 prose prose-slate max-w-none">
                 {/* 
                   Note: Dans un environnement React standard, on utiliserait 'react-markdown'.
                   Ici, pour éviter d'ajouter des dépendances NPM complexes à builder, 
                   on affiche le contenu avec un style pre-wrap qui respecte les sauts de ligne,
                   tout en appliquant une police monospace pour la lisibilité technique.
                 */}
                 <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                    {content.split('\n').map((line, i) => {
                        // Simulation très basique de rendu Markdown pour les titres
                        if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold text-slate-900 mb-4 mt-6 pb-2 border-b">{line.replace('# ', '')}</h1>
                        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-slate-800 mb-3 mt-6">{line.replace('## ', '')}</h2>
                        if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-slate-800 mb-2 mt-4">{line.replace('### ', '')}</h3>
                        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-slate-700 mb-1">{line.replace('- ', '')}</li>
                        return <p key={i} className="mb-2 min-h-[1em]">{line}</p>
                    })}
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default AdminWiki;