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
    if (!confirm("Supprimer ce client ?")) return;
    
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
          <p className="text-slate-500">Données persistantes sur storage.json</p>
        </div>
        <div className="flex gap-3">
          {isSaving && <span className="flex items-center gap-2 text-xs font-bold text-blue-600 animate-pulse"><i className="fas fa-sync animate-spin"></i> Sync Serveur...</span>}
          <button 
            onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'}`}
          >
            {isAdding ? <><i className="fas fa-times"></i> Annuler</> : <><i className="fas fa-plus-circle"></i> Nouveau Client</>}
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-4">
          <input type="text" required placeholder="Nom sur PDF" className="p-2 border rounded-lg" value={newClient.nom} onChange={e => setNewClient({...newClient, nom: e.target.value})} />
          <input type="text" required placeholder="Code ERP" className="p-2 border rounded-lg font-mono" value={newClient.codeClient} onChange={e => setNewClient({...newClient, codeClient: e.target.value})} />
          <input type="text" placeholder="Type Affaire" className="p-2 border rounded-lg font-mono" value={newClient.typeAffaire} onChange={e => setNewClient({...newClient, typeAffaire: e.target.value})} />
          <button type="submit" disabled={isSaving} className="md:col-span-3 bg-emerald-600 text-white py-2 rounded-lg font-bold hover:bg-emerald-700">Enregistrer sur le serveur</button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nom Reconnu</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Code Client (ERP)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type Affaire</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map(c => (
              <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${editingId === c.id ? 'bg-blue-50/50' : ''}`}>
                <td className="px-6 py-4">
                  {editingId === c.id ? (
                    <input 
                      type="text" 
                      className="w-full p-1 border rounded text-sm font-bold" 
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
                      className="w-full p-1 border rounded text-sm font-mono" 
                      value={editForm.codeClient} 
                      onChange={e => setEditForm({...editForm, codeClient: e.target.value})}
                    />
                  ) : (
                    <span className="font-mono text-blue-600 font-bold">{c.codeClient}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === c.id ? (
                    <input 
                      type="text" 
                      className="w-full p-1 border rounded text-sm font-mono" 
                      value={editForm.typeAffaire} 
                      onChange={e => setEditForm({...editForm, typeAffaire: e.target.value})}
                    />
                  ) : (
                    <span className="font-mono text-slate-500">{c.typeAffaire || '-'}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === c.id ? (
                      <>
                        <button 
                          onClick={() => handleUpdate(c.id)} 
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
                          onClick={() => startEditing(c)} 
                          className="text-blue-400 hover:text-blue-600 p-2"
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)} 
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
            {clients.length === 0 && !isAdding && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                  Aucun client enregistré.
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