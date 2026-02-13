
import React, { useState, useEffect } from 'react';
import { getWiki, saveWiki } from '../services/configService';

const AdminWiki: React.FC = () => {
  const [content, setContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const SLUG = 'aide-et-fonctionnalite';

  const DEFAULT_CONTENT = `# 📚 Documentation BuildScan AI

BuildScan AI est une solution d'analyse intelligente de bons de travaux pour le bâtiment, connectée à votre ERP via n8n.

## 🚀 Fonctionnalités Principales

### 1. Analyse Intelligente (IA)
*   **Extraction automatique** : Numéro de bon, Adresses (3 lignes), Contacts (Gardien/Locataire), Dates.
*   **Nettoyage** : Reformatage automatique des dates (JJ/MM/AAAA) et mise en majuscule des descriptifs.
*   **Confidentialité** : Les données financières (Prix) sont ignorées.

### 2. Gestion des Clients & Poseurs
*   **Mapping Client** : Reconnaissance automatique du donneur d'ordre via le nom sur le PDF pour associer le Code ERP et le Type d'Affaire.
*   **Assignation Poseur** : Pré-sélection automatique du responsable selon le Type d'Affaire.

### 3. Export & Intégration (Workflow n8n)
*   **Webhook n8n** : Déclenche un workflow d'automatisation complet qui :
    *   Enregistre le chantier dans l'ERP avec le document PDF joint.
    *   Prépare les interventions techniques.
*   **Logs** : Suivi détaillé des transmissions via le terminal intégré.

---

## 🔄 Workflow d'Enregistrement

### Étape 1 : Scan & Import
1.  Glissez un fichier PDF dans la zone **Scan PDF**.
2.  L'IA analyse le document (10-20 secondes).

### Étape 2 : Vérification
1.  Vérifiez les champs extraits.
2.  Le **Client** doit être reconnu (Encadré Vert). Sinon, ajoutez-le dans l'onglet *Clients*.
3.  Vérifiez l'assignation du **Poseur**.

### Étape 3 : Transmission
1.  Cliquez sur le bouton **Transmettre**.
2.  Les données sont envoyées au Webhook n8n.
3.  Le terminal en bas confirme le succès.`;

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
        alert("Erreur.");
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
        </div>
        <div className="flex items-center gap-4">
            {isEditing ? (
                <>
                    <button onClick={() => setIsEditing(false)} className="text-slate-500 font-bold px-4 py-2 text-sm">Annuler</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Enregistrer</button>
                </>
            ) : (
                <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Modifier</button>
            )}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] p-8">
         {isLoading ? (
             <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div></div>
         ) : isEditing ? (
             <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full h-[600px] p-4 font-mono text-sm border-none focus:outline-none" />
         ) : (
             <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                {content.split('\n').map((line, i) => {
                    if (line.startsWith('# ')) return <h1 key={i} className="text-3xl font-bold text-slate-900 mb-4 mt-6 border-b pb-2">{line.replace('# ', '')}</h1>
                    if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-slate-800 mb-3 mt-6">{line.replace('## ', '')}</h2>
                    if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-bold text-slate-800 mb-2 mt-4">{line.replace('### ', '')}</h3>
                    if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc mb-1">{line.replace('- ', '')}</li>
                    return <p key={i} className="mb-2 min-h-[1em]">{line}</p>
                })}
             </div>
         )}
      </div>
    </div>
  );
};

export default AdminWiki;
