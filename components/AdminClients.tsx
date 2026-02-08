import React, { useState, useEffect } from 'react';
import { Client, Poseur } from '../types';
import { fetchStorageConfig, addClient, updateClient, deleteClient } from '../services/configService';

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [poseurs, setPoseurs] = useState<Poseur[]>([]); // État pour la liste des poseurs
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = { nom: '', codeClient: '', typeAffaire: '', bpu: '', default_poseur: '' };
  const [newClient, setNewClient] = useState<Omit<Client, 'id'>>(initialForm);
  const [editForm, setEditForm] = useState<Omit<Client, 'id'>>(initialForm);

  const reloadData = async () => {
    const config = await fetchStorageConfig();
    if (config) {
      setClients(config.clients);
      setPoseurs(config.poseurs);
    }
  };

  useEffect(() => { reloadData(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nom || !newClient.codeClient) return;
    setIsSaving(true);
    const result = await addClient(newClient);
    if (result) {
      setNewClient(initialForm);
      setIsAdding(false);
      await reloadData();
    } else {
      alert("Erreur serveur lors de l'ajout.");
    }
    setIsSaving(false);
  };

  const handleUpdate = async (id: string) => {
    setIsSaving(true);
    const success = await updateClient(id, editForm);
    if (success) {
      setEditingId(null);
      await reloadData();
    } else {
      alert("Erreur serveur lors de la mise à jour.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce client du référentiel ?")) return;
    setIsSaving(true);
    const success = await deleteClient(id);
    if (success) await reloadData();
    setIsSaving(false);
  };

  const startEditing = (client: Client) => {
    setEditingId(client.id);
    setEditForm({ 
        nom: client.nom, 
        codeClient: client.codeClient, 
        typeAffaire: client.typeAffaire, 
        bpu: client.bpu || '',
        default_poseur: client.default_poseur || ''
    });
  };

  const getPoseurName = (id?: string) => {
      if (!id) return null;
      const p = poseurs.find(pos => pos.id === id);
      return p ? p.nom : id;
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Référentiel Clients</h2>
          <p className="text-slate-500">Base de données PocketBase.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm ${
              isAdding ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {isAdding ? 'Annuler' : <><i className="fas fa-plus-circle"></i> Ajouter</>}
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white border-2 border-blue-100 rounded-2xl p-6 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-5 animate-in slide-in-from-top-4">
          <input type="text" required placeholder="Nom (PDF)" className="w-full p-2.5 border rounded-xl" value={newClient.nom} onChange={e => setNewClient({...newClient, nom: e.target.value})} />
          <input type="text" required placeholder="Code ERP" className="w-full p-2.5 border rounded-xl font-mono" value={newClient.codeClient} onChange={e => setNewClient({...newClient, codeClient: e.target.value})} />
          <input type="text" placeholder="Type Affaire" className="w-full p-2.5 border rounded-xl font-mono" value={newClient.typeAffaire} onChange={e => setNewClient({...newClient, typeAffaire: e.target.value})} />
          <input type="text" placeholder="Code BPU" className="w-full p-2.5 border rounded-xl font-mono" value={newClient.bpu} onChange={e => setNewClient({...newClient, bpu: e.target.value})} />
          
          <div className="md:col-span-4">
             <label className="text-xs font-bold text-slate-400 uppercase ml-1">Poseur par défaut</label>
             <select 
                className="w-full p-2.5 border rounded-xl bg-slate-50"
                value={newClient.default_poseur}
                onChange={e => setNewClient({...newClient, default_poseur: e.target.value})}
             >
                <option value="">-- Aucun poseur assigné --</option>
                {poseurs.map(p => (
                    <option key={p.id} value={p.id}>{p.nom} {p.type ? `(${p.type})` : ''}</option>
                ))}
             </select>
          </div>

          <button type="submit" disabled={isSaving} className="md:col-span-4 bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg transition-all">
            {isSaving ? 'Enregistrement...' : 'Créer dans PocketBase'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Nom PDF</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Code ERP</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Type / Poseur</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">BPU</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/80">
                <td className="px-6 py-4">
                  {editingId === c.id ? <input type="text" className="w-full p-2 border rounded" value={editForm.nom} onChange={e => setEditForm({...editForm, nom: e.target.value})} /> : <span className="font-bold">{c.nom}</span>}
                </td>
                <td className="px-6 py-4">
                  {editingId === c.id ? <input type="text" className="w-full p-2 border rounded font-mono" value={editForm.codeClient} onChange={e => setEditForm({...editForm, codeClient: e.target.value})} /> : <code className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">{c.codeClient}</code>}
                </td>
                <td className="px-6 py-4">
                  {editingId === c.id ? (
                      <div className="space-y-2">
                          <input type="text" placeholder="Type" className="w-full p-2 border rounded font-mono text-xs" value={editForm.typeAffaire} onChange={e => setEditForm({...editForm, typeAffaire: e.target.value})} />
                          <select 
                            className="w-full p-2 border rounded text-xs"
                            value={editForm.default_poseur}
                            onChange={e => setEditForm({...editForm, default_poseur: e.target.value})}
                          >
                             <option value="">-- Poseur --</option>
                             {poseurs.map(p => (
                                <option key={p.id} value={p.id}>{p.nom}</option>
                             ))}
                          </select>
                      </div>
                  ) : (
                      <div className="flex flex-col">
                          <span className="text-sm">{c.typeAffaire}</span>
                          {c.default_poseur && (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded w-fit mt-1">
                                  <i className="fas fa-user-hard-hat mr-1"></i>
                                  {getPoseurName(c.default_poseur)}
                              </span>
                          )}
                      </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === c.id ? <input type="text" className="w-full p-2 border rounded font-mono" value={editForm.bpu} onChange={e => setEditForm({...editForm, bpu: e.target.value})} /> : <span className="font-mono text-slate-500">{c.bpu || '-'}</span>}
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  {editingId === c.id ? (
                    <>
                      <button onClick={() => handleUpdate(c.id)} className="text-emerald-600 hover:text-emerald-800"><i className="fas fa-check"></i></button>
                      <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditing(c)} className="text-blue-500 hover:text-blue-700"><i className="fas fa-edit"></i></button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-600"><i className="fas fa-trash"></i></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminClients;