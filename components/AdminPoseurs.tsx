import React, { useState, useEffect } from 'react';
import { Poseur } from '../types';
import { fetchStorageConfig, updatePartialConfig } from '../services/configService';

const AdminPoseurs: React.FC = () => {
  const [poseurs, setPoseurs] = useState<Poseur[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialPoseurState = {
    nom: '', entreprise: '', telephone: '', specialite: '', codeSalarie: ''
  };

  const [newPoseur, setNewPoseur] = useState<Omit<Poseur, 'id'>>(initialPoseurState);
  const [editForm, setEditForm] = useState<Omit<Poseur, 'id'>>(initialPoseurState);

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
      setNewPoseur(initialPoseurState);
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
    if (!confirm("Voulez-vous supprimer ce poseur de l'annuaire ?")) return;
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
          <p className="text-slate-500">Annuaire des poseurs et sous-traitants enregistrés.</p>
        </div>
        <div className="flex items-center gap-4">
          {isSaving && (
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-pulse border border-emerald-100 uppercase tracking-widest">
              <i className="fas fa-save animate-bounce"></i> Écriture storage.json
            </div>
          )}
          <button 
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); }} 
            className={`px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${
              isAdding 
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {isAdding ? 'Annuler' : <><i className="fas fa-user-plus"></i> Nouveau Poseur</>}
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-8 rounded-2xl border-2 border-indigo-50 shadow-xl shadow-indigo-900/5 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom du Poseur</label>
            <input type="text" required placeholder="Nom complet" className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={newPoseur.nom} onChange={e => setNewPoseur({...newPoseur, nom: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entreprise</label>
            <input type="text" placeholder="Entité juridique" className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={newPoseur.entreprise} onChange={e => setNewPoseur({...newPoseur, entreprise: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Téléphone</label>
            <input type="tel" placeholder="06..." className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={newPoseur.telephone} onChange={e => setNewPoseur({...newPoseur, telephone: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Spécialité</label>
            <input type="text" placeholder="Menuiserie, Plomberie..." className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={newPoseur.specialite} onChange={e => setNewPoseur({...newPoseur, specialite: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code Salarié / ID</label>
            <input type="text" placeholder="ADM-01" className="w-full p-2.5 border rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 outline-none" value={newPoseur.codeSalarie} onChange={e => setNewPoseur({...newPoseur, codeSalarie: e.target.value})} />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-emerald-600 text-white h-[46px] rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all">
              Confirmer l'ajout
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Poseur / Salarié</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entreprise</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Spécialité</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {poseurs.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors ${editingId === p.id ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <div className="space-y-2">
                        <input type="text" className="w-full p-1.5 border border-indigo-300 rounded text-sm font-bold" value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} />
                        <input type="text" className="w-full p-1.5 border border-indigo-200 rounded text-[10px] font-mono" placeholder="Code" value={editForm.codeSalarie} onChange={e => setEditForm({...editForm, codeSalarie: e.target.value})} />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800">{p.nom}</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tighter">ID: {p.codeSalarie || 'N/A'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <input type="text" className="w-full p-1.5 border border-indigo-300 rounded text-sm" value={editForm.entreprise} onChange={e => setEditForm({...editForm, entreprise: e.target.value})} />
                    ) : (
                      <span className="text-slate-600 font-medium">{p.entreprise}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <input type="text" className="w-full p-1.5 border border-indigo-300 rounded text-sm" value={editForm.telephone} onChange={e => setEditForm({...editForm, telephone: e.target.value})} />
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <i className="fas fa-phone-alt text-[10px]"></i>
                        <span>{p.telephone || 'Non renseigné'}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === p.id ? (
                      <input type="text" className="w-full p-1.5 border border-indigo-300 rounded text-sm" value={editForm.specialite} onChange={e => setEditForm({...editForm, specialite: e.target.value})} />
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-black uppercase tracking-tighter">{p.specialite || 'Général'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === p.id ? (
                        <>
                          <button onClick={() => handleUpdate(p.id)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-emerald-700 shadow-md">
                            <i className="fas fa-check"></i> OK
                          </button>
                          <button onClick={cancelEditing} className="bg-slate-400 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-slate-500 shadow-md">
                            <i className="fas fa-times"></i> ANNULER
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEditing(p)} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">
                            <i className="fas fa-edit"></i> Modifier
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="bg-white border border-slate-200 text-slate-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 hover:text-white hover:border-red-600 transition-all">
                            <i className="fas fa-trash-alt"></i> Supprimer
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
    </div>
  );
};

export default AdminPoseurs;