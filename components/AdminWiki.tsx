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

  const DEFAULT_CONTENT = `# 📚 Documentation BuildScan AI

BuildScan AI est une solution d'analyse intelligente de bons de travaux pour le bâtiment, connectée à votre ERP et votre Agenda.

## 🚀 Fonctionnalités Principales

### 1. Analyse Intelligente (IA)
*   **Extraction automatique** : Numéro de bon, Adresses (3 lignes), Contacts (Gardien/Locataire), Dates.
*   **Nettoyage** : Reformatage automatique des dates (JJ/MM/AAAA) et mise en majuscule des descriptifs.
*   **Confidentialité** : Les données financières (Prix) sont ignorées.

### 2. Gestion des Clients & Poseurs
*   **Mapping Client** : Reconnaissance automatique du donneur d'ordre via le nom sur le PDF pour associer le Code ERP et le Type d'Affaire.
*   **Assignation Poseur** : Pré-sélection automatique de l'équipe selon le Type d'Affaire.

### 3. Planification (Nextcloud Calendar)
*   **Vue Agenda** : Visualisation en temps réel des plannings des poseurs.
*   **Prise de RDV** : Proposition automatique de créneaux (algorithme "Tetris").
*   **Synchro** : Création d'événements dans Nextcloud avec le PDF en pièce jointe.

### 4. Export & Intégration
*   **Webhook n8n** : Déclenche un workflow d'automatisation complet qui :
    *   Enregistre le chantier dans **ADIBAT** avec le document PDF joint.
    *   Crée l'intervention dans **Kizeo Forms**.
    *   Envoie un **email de confirmation** à la fin du traitement.
*   **Logs** : Suivi détaillé des transmissions via le terminal intégré.

---

## 🔄 Workflow d'Enregistrement (Pas à Pas)

### Étape 1 : Scan & Import
1.  Glissez un fichier PDF dans la zone **Scan PDF**.
2.  L'IA analyse le document (10-30 secondes).
3.  L'interface s'adapte : le scan se masque pour laisser place aux résultats.

### Étape 2 : Vérification & Enrichissement
1.  Vérifiez les champs extraits (Adresses, Téléphones).
2.  Le **Client** est-il reconnu ? (Encadré Vert). Sinon, ajoutez-le dans l'onglet *Administration > Clients*.
3.  Confirmez ou modifiez le **Poseur** assigné.

### Étape 3 : Planification
1.  Consultez l'agenda à droite.
2.  Le système propose un créneau ("Tentative").
3.  **Double-cliquez** sur le créneau pour confirmer l'heure et enregistrer le RDV dans l'agenda Nextcloud.

### Étape 4 : Transmission
1.  Cliquez sur le bouton **Enregistrement** (Vert).
2.  Les données sont envoyées au Webhook (n8n).
3.  Le terminal en bas confirme le succès de l'opération.`;

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
        setContent(DEFAULT_CONTENT);
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