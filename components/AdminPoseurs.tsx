import React, { useState, useEffect } from 'react';
import { Poseur } from '../types';
import { fetchStorageConfig, updatePartialConfig } from '../services/configService';

const AdminPoseurs: React.FC = () => {
  const [poseurs, setPoseurs] = useState<Poseur[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPoseur, setNewPoseur] = useState<Omit<Poseur, 'id'>>({
    nom: '', entreprise: '', telephone: '', specialite: '', codeSalarie: ''
  });
  const [editForm, setEditForm] = useState<Omit<Poseur, 'id'>>({
    nom: '', entreprise: '', telephone: '', specialite: '', codeSalarie: ''
  });

  useEffect(() => {
    const load = async () => {
      const config = await fetchStorageConfig();
      if (config) setPoseurs(config.poseurs);
    };
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const poseurWithId: Poseur = { ...newPoseur, id: crypto.randomUUID() };
    const newList = [...poseurs, poseurWithId];
    
    const success = await updatePartialConfig({ poseurs: newList });
    if (success) {
      setPoseurs(newList);
      setNewPoseur({ nom: '', entreprise: '', telephone: '', specialite: '', codeSalarie: '' });
      setIsAdding(false);
    }
    setIsSaving(false);
  };

  const startEditing = (poseur: Poseur) => {
    setEditingId(poseur.id);
    setEditForm({
      nom: poseur.nom,
      entreprise: poseur.entreprise,
      telephone: poseur.telephone,
      specialite: poseur.specialite,
      codeSalarie: poseur.codeSalarie
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id: string) => {
    setIsSaving(true);
    const newList = poseurs.map(p => p.id === id ? { ...editForm, id } : p);
    const success = await updatePartialConfig({ poseurs: newList });
    if (success) {
      setPoseurs(newList);
      setEditingId(null);
    } else {
      alert("Erreur lors de la mise à jour.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce poseur ?")) return;
    setIsSaving(true);
    const newList = poseurs.filter(p => p.id !== id);
    const success = await updatePartialConfig({ poseurs: newList });
    if (success) setPoseurs(newList);
    setIsSaving(false);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestion de la Flotte</h2>
          <p className="text-slate-500">Poseurs enregistrés sur le serveur</p>
        </div>
        <div className="flex gap-3">
          {isSaving && <span className="flex items-center gap-2 text-xs font-bold text-blue-600 animate-pulse"><i className="fas fa-sync animate-spin"></i> Sync...</span>}
          <button onClick={() => { setIsAdding(!isAdding); setEditingId(null); }} className={`px-4 py-2 rounded-lg font-bold transition-all ${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white shadow-lg'}`}>
            {isAdding ? 'Fermer' : 'Ajouter un poseur'}
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
          <input type="text" placeholder="Nom" className="p-2 border rounded shadow-sm" value={newPoseur.nom} onChange={e => setNewPoseur({...newPoseur, nom: e.target.value})} />
          <input type="text" placeholder="Entreprise" className="p-2 border rounded shadow-sm" value={newPoseur.entreprise} onChange={e => setNewPoseur({...newPoseur, entreprise: e.target.value})} />
          <input type="text" placeholder="Téléphone" className="p-2 border rounded shadow-sm" value={newPoseur.telephone} onChange={e => setNewPoseur({...newPoseur, telephone: e.target.value})} />
          <input type="text" placeholder="Spécialité" className="p-2 border rounded shadow-sm" value={newPoseur.specialite} onChange={e => setNewPoseur({...newPoseur, specialite: e.target.value})} />
          <button type="submit" className="md:col-span-2 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700 shadow-md">Sauvegarder Nouveau</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Poseur</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Entreprise</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Spécialité</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {poseurs.map(p => (
              <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${editingId === p.id ? 'bg-blue-50/50' : ''}`}>
                <td className="px-6 py-4">
                  {editingId === p.id ? (
                    <input 
                      type="text" 
                      className="w-full p-1 border rounded text-sm font-bold" 
                      value={editForm.nom} 
                      onChange={e => setEditForm({...editForm, nom: e.target.value})}
                    />
                  ) : (
                    <span className="font-bold text-slate-700">{p.nom}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === p.id ? (
                    <input 
                      type="text" 
                      className="w-full p-1 border rounded text-sm" 
                      value={editForm.entreprise} 
                      onChange={e => setEditForm({...editForm, entreprise: e.target.value})}
                    />
                  ) : (
                    <span className="text-slate-600">{p.entreprise}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === p.id ? (
                    <input 
                      type="text" 
                      className="w-full p-1 border rounded text-sm" 
                      value={editForm.specialite} 
                      onChange={e => setEditForm({...editForm, specialite: e.target.value})}
                    />
                  ) : (
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-medium">{p.specialite || 'Général'}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === p.id ? (
                      <>
                        <button 
                          onClick={() => handleUpdate(p.id)} 
                          className="text-emerald-600 hover:text-emerald-700 p-2"
                          title="Sauvegarder"
                        >
                          <i className="fas fa-check"></i>
                        </button>
                        <button 
                          onClick={cancelEditing} 
                          className="text-slate-400 hover:text-slate-600 p-2"
                          title="Annuler"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => startEditing(p)} 
                          className="text-blue-400 hover:text-blue-600 p-2"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)} 
                          className="text-slate-300 hover:text-red-500 p-2"
                          title="Supprimer"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPoseurs;