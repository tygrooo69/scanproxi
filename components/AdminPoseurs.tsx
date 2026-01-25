import React, { useState, useEffect } from 'react';
import { Poseur } from '../types';
import { fetchStorageConfig, addPoseur, updatePoseur, deletePoseur } from '../services/configService';

const AdminPoseurs: React.FC = () => {
  const [poseurs, setPoseurs] = useState<Poseur[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = { nom: '', entreprise: '', telephone: '', specialite: '', codeSalarie: '' };
  const [newPoseur, setNewPoseur] = useState<Omit<Poseur, 'id'>>(initialForm);
  const [editForm, setEditForm] = useState<Omit<Poseur, 'id'>>(initialForm);

  const reloadPoseurs = async () => {
    const config = await fetchStorageConfig();
    if (config) setPoseurs(config.poseurs);
  };

  useEffect(() => { reloadPoseurs(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await addPoseur(newPoseur);
    if (result) {
      setNewPoseur(initialForm);
      setIsAdding(false);
      await reloadPoseurs();
    }
    setIsSaving(false);
  };

  const handleUpdate = async (id: string) => {
    setIsSaving(true);
    const success = await updatePoseur(id, editForm);
    if (success) {
      setEditingId(null);
      await reloadPoseurs();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce poseur ?")) return;
    setIsSaving(true);
    const success = await deletePoseur(id);
    if (success) await reloadPoseurs();
    setIsSaving(false);
  };

  const startEditing = (p: Poseur) => {
    setEditingId(p.id);
    setEditForm({ nom: p.nom, entreprise: p.entreprise, telephone: p.telephone, specialite: p.specialite, codeSalarie: p.codeSalarie });
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
          <input placeholder="Nom" className="p-2 border rounded" value={newPoseur.nom} onChange={e => setNewPoseur({...newPoseur, nom: e.target.value})} />
          <input placeholder="Entreprise" className="p-2 border rounded" value={newPoseur.entreprise} onChange={e => setNewPoseur({...newPoseur, entreprise: e.target.value})} />
          <input placeholder="Téléphone" className="p-2 border rounded" value={newPoseur.telephone} onChange={e => setNewPoseur({...newPoseur, telephone: e.target.value})} />
          <input placeholder="Code Salarié" className="p-2 border rounded" value={newPoseur.codeSalarie} onChange={e => setNewPoseur({...newPoseur, codeSalarie: e.target.value})} />
          <button type="submit" disabled={isSaving} className="col-span-2 bg-emerald-600 text-white py-2 rounded font-bold">Ajouter</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {poseurs.map(p => (
          <div key={p.id} className="p-4 border-b last:border-0 flex items-center justify-between hover:bg-slate-50">
            {editingId === p.id ? (
              <div className="w-full flex gap-2">
                <input className="border p-1 rounded flex-1" value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} />
                <button onClick={() => handleUpdate(p.id)} className="bg-emerald-500 text-white px-3 rounded">OK</button>
                <button onClick={() => setEditingId(null)} className="bg-slate-400 text-white px-3 rounded">X</button>
              </div>
            ) : (
              <>
                <div>
                  <div className="font-bold">{p.nom}</div>
                  <div className="text-xs text-slate-500">{p.entreprise} • {p.telephone}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditing(p)} className="text-indigo-600"><i className="fas fa-edit"></i></button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-500"><i className="fas fa-trash"></i></button>
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