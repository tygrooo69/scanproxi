import React, { useState, useEffect } from 'react';
import { Poseur } from '../types';
import { fetchStorageConfig, addPoseur, updatePoseur, deletePoseur } from '../services/configService';

const AdminPoseurs: React.FC = () => {
  const [poseurs, setPoseurs] = useState<Poseur[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = { nom: '', entreprise: '', telephone: '', specialite: '', codeSalarie: '', type: '', nextcloud_user: '' };
  const [newPoseur, setNewPoseur] = useState<Omit<Poseur, 'id'>>(initialForm);
  const [editForm, setEditForm] = useState<Omit<Poseur, 'id'>>(initialForm);

  const reloadData = async () => {
    const config = await fetchStorageConfig();
    if (config) {
      setPoseurs(config.poseurs);
      
      // Extraction des Types Affaire uniques depuis la liste des clients
      const types = Array.from(new Set(config.clients.map(c => c.typeAffaire).filter(Boolean)));
      setAvailableTypes(types.sort());
    }
  };

  useEffect(() => { reloadData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await addPoseur(newPoseur);
    if (result) {
      setNewPoseur(initialForm);
      setIsAdding(false);
      await reloadData();
    }
    setIsSaving(false);
  };

  const handleUpdate = async (id: string) => {
    setIsSaving(true);
    const success = await updatePoseur(id, editForm);
    if (success) {
      setEditingId(null);
      await reloadData();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce poseur ?")) return;
    setIsSaving(true);
    const success = await deletePoseur(id);
    if (success) await reloadData();
    setIsSaving(false);
  };

  const startEditing = (p: Poseur) => {
    setEditingId(p.id);
    setEditForm({ 
      nom: p.nom, 
      entreprise: p.entreprise, 
      telephone: p.telephone, 
      specialite: p.specialite, 
      codeSalarie: p.codeSalarie,
      type: p.type || '',
      nextcloud_user: p.nextcloud_user || ''
    });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Gestion Flotte</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold">
          {isAdding ? 'Annuler' : '+ Poseur'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg grid grid-cols-1 md:grid-cols-2 gap-4">
          <input placeholder="Nom" className="p-2 border rounded" value={newPoseur.nom} onChange={e => setNewPoseur({...newPoseur, nom: e.target.value})} required />
          <input placeholder="Entreprise" className="p-2 border rounded" value={newPoseur.entreprise} onChange={e => setNewPoseur({...newPoseur, entreprise: e.target.value})} />
          <input placeholder="Téléphone" className="p-2 border rounded" value={newPoseur.telephone} onChange={e => setNewPoseur({...newPoseur, telephone: e.target.value})} />
          <input placeholder="Code Salarié" className="p-2 border rounded" value={newPoseur.codeSalarie} onChange={e => setNewPoseur({...newPoseur, codeSalarie: e.target.value})} />
          
          <div className="md:col-span-1">
             <input placeholder="Spécialité" className="w-full p-2 border rounded" value={newPoseur.specialite} onChange={e => setNewPoseur({...newPoseur, specialite: e.target.value})} />
          </div>

          <div className="md:col-span-1">
             <select 
               className="w-full p-2 border rounded bg-slate-50 border-slate-200 text-slate-700"
               value={newPoseur.type} 
               onChange={e => setNewPoseur({...newPoseur, type: e.target.value})}
             >
               <option value="">-- Type Affaire --</option>
               {availableTypes.map(type => (
                 <option key={type} value={type}>{type}</option>
               ))}
             </select>
          </div>
          
           <div className="col-span-2">
             <label className="text-[10px] font-bold text-slate-400 uppercase">Utilisateur Nextcloud (Pour Calendrier)</label>
             <input placeholder="ex: jean.dupont" className="w-full p-2 border rounded mt-1" value={newPoseur.nextcloud_user} onChange={e => setNewPoseur({...newPoseur, nextcloud_user: e.target.value})} />
          </div>

          <button type="submit" disabled={isSaving} className="col-span-2 bg-emerald-600 text-white py-2 rounded font-bold">Ajouter</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {poseurs.map(p => (
          <div key={p.id} className="p-4 border-b last:border-0 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 gap-4">
            {editingId === p.id ? (
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50 p-4 rounded border border-slate-200">
                <input className="border p-2 rounded text-sm" value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} placeholder="Nom" />
                <input className="border p-2 rounded text-sm" value={editForm.entreprise} onChange={e => setEditForm({...editForm, entreprise: e.target.value})} placeholder="Entreprise" />
                <input className="border p-2 rounded text-sm" value={editForm.telephone} onChange={e => setEditForm({...editForm, telephone: e.target.value})} placeholder="Téléphone" />
                <input className="border p-2 rounded text-sm" value={editForm.specialite} onChange={e => setEditForm({...editForm, specialite: e.target.value})} placeholder="Spécialité" />
                <input className="border p-2 rounded text-sm" value={editForm.codeSalarie} onChange={e => setEditForm({...editForm, codeSalarie: e.target.value})} placeholder="Code Salarié" />
                
                <select 
                   className="border p-2 rounded text-sm"
                   value={editForm.type} 
                   onChange={e => setEditForm({...editForm, type: e.target.value})}
                 >
                   <option value="">-- Type Affaire --</option>
                   {availableTypes.map(type => (
                     <option key={type} value={type}>{type}</option>
                   ))}
                 </select>

                <input className="border p-2 rounded text-sm md:col-span-2" value={editForm.nextcloud_user} onChange={e => setEditForm({...editForm, nextcloud_user: e.target.value})} placeholder="User Nextcloud" />

                <div className="md:col-span-3 flex gap-2 justify-end mt-2">
                    <button onClick={() => handleUpdate(p.id)} className="bg-emerald-500 text-white px-4 py-1.5 rounded text-sm font-bold">Enregistrer</button>
                    <button onClick={() => setEditingId(null)} className="bg-slate-400 text-white px-4 py-1.5 rounded text-sm font-bold">Annuler</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{p.nom}</span>
                    {p.type && (
                       <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                         {p.type}
                       </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-1">
                    <span className="bg-slate-100 px-1.5 rounded border border-slate-200">{p.entreprise}</span>
                    <span>•</span>
                    <span>{p.telephone}</span>
                    <span>•</span>
                    <span>{p.specialite}</span>
                    {p.codeSalarie && (
                        <>
                            <span>•</span>
                            <span className="font-mono text-slate-400 font-bold">{p.codeSalarie}</span>
                        </>
                    )}
                    {p.nextcloud_user && (
                         <>
                            <span>•</span>
                            <span className="text-sky-600 font-bold"><i className="fas fa-cloud"></i> {p.nextcloud_user}</span>
                        </>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => startEditing(p)} className="text-indigo-600 hover:text-indigo-800"><i className="fas fa-edit"></i></button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPoseurs;