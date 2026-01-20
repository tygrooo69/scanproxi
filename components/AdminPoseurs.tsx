
import React, { useState, useEffect } from 'react';
import { Poseur } from '../types';
import { fetchStorageConfig, updatePartialConfig } from '../services/configService';

const AdminPoseurs: React.FC = () => {
  const [poseurs, setPoseurs] = useState<Poseur[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newPoseur, setNewPoseur] = useState<Omit<Poseur, 'id'>>({
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

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ?")) return;
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
          <button onClick={() => setIsAdding(!isAdding)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">
            {isAdding ? 'Fermer' : 'Ajouter un poseur'}
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl border grid grid-cols-2 gap-4">
          <input type="text" placeholder="Nom" className="p-2 border rounded" value={newPoseur.nom} onChange={e => setNewPoseur({...newPoseur, nom: e.target.value})} />
          <input type="text" placeholder="Entreprise" className="p-2 border rounded" value={newPoseur.entreprise} onChange={e => setNewPoseur({...newPoseur, entreprise: e.target.value})} />
          <button type="submit" className="col-span-2 bg-emerald-600 text-white py-2 rounded font-bold">Sauvegarder</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Poseur</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Entreprise</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {poseurs.map(p => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold">{p.nom}</td>
                <td className="px-6 py-4">{p.entreprise}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(p.id)} className="text-slate-300 hover:text-red-500"><i className="fas fa-trash-alt"></i></button>
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
