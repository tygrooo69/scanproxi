
import React, { useState, useEffect } from 'react';
import { Poseur } from '../types';
import { fetchStorageConfig, addPoseur, updatePoseur, deletePoseur } from '../services/configService';

const AdminPoseurs: React.FC = () => {
  const [poseurs, setPoseurs] = useState<Poseur[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = { nom: '', entreprise: '', telephone: '', specialite: '', codeSalarie: '', type: '' };
  const [newPoseur, setNewPoseur] = useState<Omit<Poseur, 'id'>>(initialForm);
  const [editForm, setEditForm] = useState<Omit<Poseur, 'id'>>(initialForm);

  const reloadData = async () => {
    const config = await fetchStorageConfig();
    if (config) {
      setPoseurs(config.poseurs);
      const types = Array.from(new Set(config.clients.map(c => c.typeAffaire).filter(Boolean)));
      setAvailableTypes(types.sort());
    }
  };

  useEffect(() => { reloadData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await addPoseur(newPoseur);
    if (result) { setNewPoseur(initialForm); setIsAdding(false); await reloadData(); }
    setIsSaving(false);
  };

  const handleUpdate = async (id: string) => {
    setIsSaving(true);
    if (await updatePoseur(id, editForm)) { setEditingId(null); await reloadData(); }
    setIsSaving(false);
  };

  const startEditing = (p: Poseur) => {
    setEditingId(p.id);
    setEditForm({ nom: p.nom, entreprise: p.entreprise, telephone: p.telephone, specialite: p.specialite, codeSalarie: p.codeSalarie, type: p.type || '' });
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestion Flotte</h2>
          <p className="text-slate-500 text-sm font-medium">Référentiel des salariés et sous-traitants.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className={`px-6 py-2.5 rounded-xl font-black uppercase text-xs transition-all shadow-lg ${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}>
          {isAdding ? 'Annuler' : '+ Ajouter Salarié'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-8 rounded-2xl border-2 border-indigo-100 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-5 animate-in slide-in-from-top-4">
          <input placeholder="Nom Complet" className="w-full p-3 border rounded-xl" value={newPoseur.nom} onChange={e => setNewPoseur({...newPoseur, nom: e.target.value})} required />
          <input placeholder="Entreprise" className="w-full p-3 border rounded-xl" value={newPoseur.entreprise} onChange={e => setNewPoseur({...newPoseur, entreprise: e.target.value})} />
          <input placeholder="Téléphone" className="w-full p-3 border rounded-xl" value={newPoseur.telephone} onChange={e => setNewPoseur({...newPoseur, telephone: e.target.value})} />
          <input placeholder="Code Salarié" className="w-full p-3 border rounded-xl font-mono" value={newPoseur.codeSalarie} onChange={e => setNewPoseur({...newPoseur, codeSalarie: e.target.value})} />
          <input placeholder="Spécialité" className="w-full p-3 border rounded-xl" value={newPoseur.specialite} onChange={e => setNewPoseur({...newPoseur, specialite: e.target.value})} />
          <select className="w-full p-3 border rounded-xl bg-slate-50 font-bold" value={newPoseur.type} onChange={e => setNewPoseur({...newPoseur, type: e.target.value})}>
             <option value="">-- Aucun mapping auto --</option>
             {availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <button type="submit" disabled={isSaving} className="col-span-2 bg-emerald-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg">Enregistrer</button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-100">
        {poseurs.map((p) => (
          <div key={p.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-slate-50 transition-all gap-6 border-b-8 border-slate-50 last:border-b-0">
            {editingId === p.id ? (
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl border border-indigo-100">
                <input className="border p-2 rounded text-sm font-bold" value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} />
                <input className="border p-2 rounded text-sm" value={editForm.entreprise} onChange={e => setEditForm({...editForm, entreprise: e.target.value})} />
                <input className="border p-2 rounded text-sm" value={editForm.telephone} onChange={e => setEditForm({...editForm, telephone: e.target.value})} />
                <input className="border p-2 rounded text-sm" value={editForm.specialite} onChange={e => setEditForm({...editForm, specialite: e.target.value})} />
                <input className="border p-2 rounded text-sm font-mono" value={editForm.codeSalarie} onChange={e => setEditForm({...editForm, codeSalarie: e.target.value})} />
                <select className="border p-2 rounded text-sm font-bold" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}>
                  <option value="">-- Aucun --</option>
                  {availableTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
                <div className="md:col-span-3 flex gap-3 justify-end mt-4 pt-4 border-t border-slate-200">
                    <button onClick={() => setEditingId(null)} className="px-5 py-2 rounded-lg text-xs font-bold uppercase">Annuler</button>
                    <button onClick={() => handleUpdate(p.id)} className="bg-emerald-600 text-white px-8 py-2.5 rounded-lg text-xs font-black uppercase shadow-lg">Enregistrer</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${p.type ? 'bg-indigo-600' : 'bg-slate-400'}`}><i className="fas fa-user-hard-hat"></i></div>
                  <div>
                    <div className="flex items-center gap-3"><span className="font-black text-slate-800 text-lg uppercase">{p.nom}</span>{p.type && <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-widest">{p.type}</span>}</div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1"><span>{p.entreprise || 'SAMDB'}</span><span className="text-slate-200">•</span><span>{p.specialite || 'Poseur'}</span><span className="text-slate-200">•</span><span className="font-mono">{p.codeSalarie}</span></div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => startEditing(p)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent transition-all"><i className="fas fa-edit"></i></button>
                  <button onClick={async () => { if(confirm("Supprimer?")) { await deletePoseur(p.id); reloadData(); } }} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent transition-all"><i className="fas fa-trash"></i></button>
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
