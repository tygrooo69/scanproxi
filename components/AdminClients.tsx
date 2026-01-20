
import React, { useState, useEffect } from 'react';
import { Client } from '../types';
import { fetchStorageConfig, updatePartialConfig } from '../services/configService';

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, 'id'>>({
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
            onClick={() => setIsAdding(!isAdding)}
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
              <th className="px-6 py-4 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-700">{c.nom}</td>
                <td className="px-6 py-4 font-mono text-blue-600 font-bold">{c.codeClient}</td>
                <td className="px-6 py-4 font-mono text-slate-500">{c.typeAffaire || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleDelete(c.id)} className="text-slate-300 hover:text-red-500 p-2"><i className="fas fa-trash-alt"></i></button>
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
