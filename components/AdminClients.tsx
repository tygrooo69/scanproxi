import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { fetchStorageConfig, updatePartialConfig } from '../services/configService';

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newClient, setNewClient] = useState<Omit<Client, 'id'>>({
    nom: '',
    codeClient: '',
    typeAffaire: ''
  });
  const [editForm, setEditForm] = useState<Omit<Client, 'id'>>({
    nom: '',
    codeClient: '',
    typeAffaire: ''
  });

  useEffect(() => {
    const load = async () => {
      const config = await fetchStorageConfig();
      if (config) setClients(config.clients);
    };
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nom || !newClient.codeClient) return;

    setIsSaving(true);
    const clientWithId: Client = { ...newClient, id: crypto.randomUUID() };
    const newList = [...clients, clientWithId];
    
    const success = await updatePartialConfig({ clients: newList });
    if (success) {
      setClients(newList);
      setNewClient({ nom: '', codeClient: '', typeAffaire: '' });
      setIsAdding(false);
    } else {
      alert("Erreur lors de la sauvegarde sur le serveur.");
    }
    setIsSaving(false);
  };

  const startEditing = (client: Client) => {
    setEditingId(client.id);
    setEditForm({
      nom: client.nom,
      codeClient: client.codeClient,
      typeAffaire: client.typeAffaire
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id: string) => {
    setIsSaving(true);
    const newList = clients.map(c => c.id === id ? { ...editForm, id } : c);
    const success = await updatePartialConfig({ clients: newList });
    if (success) {
      setClients(newList);
      setEditingId(null);
    } else {
      alert("Erreur lors de la mise à jour sur le serveur.");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce client du référentiel ?")) return;
    
    setIsSaving(true);
    const newList = clients.filter(c => c.id !== id);
    const success = await updatePartialConfig({ clients: newList });
    if (success) setClients(newList);
    setIsSaving(false);
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Référentiel Clients</h2>
          <p className="text-slate-500">Gérez les correspondances entre les noms PDF et vos codes ERP.</p>
        </div>
        <div className="flex items-center gap-4">
          {isSaving && (
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full animate-pulse border border-blue-100 uppercase tracking-widest">
              <i className="fas fa-sync-alt animate-spin"></i> Sync Serveur
            </div>
          )}
          <button 
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
            className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm ${
              isAdding 
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {isAdding ? <><i className="fas fa-times"></i> Annuler</> : <><i className="fas fa-plus-circle"></i> Ajouter un Client</>}
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white border-2 border-blue-100 rounded-2xl p-6 shadow-xl shadow-blue-900/5 grid grid-cols-1 md:grid-cols-3 gap-5 animate-in slide-in-from-top-4 duration-300">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nom sur document PDF</label>
            <input type="text" required placeholder="ex: OPH DE DRANCY" className="w-full p-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={newClient.nom} onChange={e => setNewClient({...newClient, nom: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Code Client ERP</label>
            <input type="text" required placeholder="ex: 411DRA038" className="w-full p-2.5 border rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={newClient.codeClient} onChange={e => setNewClient({...newClient, codeClient: e.target.value})} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Type Affaire</label>
            <input type="text" placeholder="ex: O3-0" className="w-full p-2.5 border rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={newClient.typeAffaire} onChange={e => setNewClient({...newClient, typeAffaire: e.target.value})} />
          </div>
          <button type="submit" disabled={isSaving} className="md:col-span-3 bg-emerald-600 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2">
            <i className="fas fa-cloud-upload-alt"></i> Enregistrer dans storage.json
          </button>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nom Reconnu (PDF)</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Code ERP</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type Affaire</th>
              <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions de Gestion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map(c => (
              <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors ${editingId === c.id ? 'bg-blue-50/50' : ''}`}>
                <td className="px-6 py-4">
                  {editingId === c.id ? (
                    <input 
                      type="text" 
                      className="w-full p-2 border border-blue-300 rounded-lg text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={editForm.nom} 
                      onChange={e => setEditForm({...editForm, nom: e.target.value})}
                    />
                  ) : (
                    <span className="font-bold text-slate-700">{c.nom}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === c.id ? (
                    <input 
                      type="text" 
                      className="w-full p-2 border border-blue-300 rounded-lg text-sm font-mono shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={editForm.codeClient} 
                      onChange={e => setEditForm({...editForm, codeClient: e.target.value})}
                    />
                  ) : (
                    <code className="text-blue-600 bg-blue-50 px-2 py-1 rounded font-bold">{c.codeClient}</code>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === c.id ? (
                    <input 
                      type="text" 
                      className="w-full p-2 border border-blue-300 rounded-lg text-sm font-mono shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                      value={editForm.typeAffaire} 
                      onChange={e => setEditForm({...editForm, typeAffaire: e.target.value})}
                    />
                  ) : (
                    <span className="text-slate-500 font-medium italic">{c.typeAffaire || '-'}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === c.id ? (
                      <>
                        <button 
                          onClick={() => handleUpdate(c.id)} 
                          className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-emerald-700 shadow-md flex items-center gap-1.5"
                        >
                          <i className="fas fa-check"></i> Valider
                        </button>
                        <button 
                          onClick={cancelEditing} 
                          className="bg-slate-400 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-slate-500 shadow-md flex items-center gap-1.5"
                        >
                          <i className="fas fa-times"></i> Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => startEditing(c)} 
                          className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1.5"
                        >
                          <i className="fas fa-edit"></i> Modifier
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)} 
                          className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-red-600 hover:text-white transition-all flex items-center gap-1.5"
                        >
                          <i className="fas fa-trash-alt"></i> Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && !isAdding && (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center">
                  <div className="text-slate-300 mb-2"><i className="fas fa-folder-open text-4xl"></i></div>
                  <p className="text-slate-400 italic">Aucun client dans le référentiel.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminClients;