
import React, { useState, useEffect } from 'react';
import { Client } from '../types';

const AdminClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, 'id'>>({
    nom: '',
    codeClient: '',
    typeAffaire: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem('buildscan_clients');
    if (saved) {
      try {
        setClients(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur chargement clients", e);
      }
    }
  }, []);

  const saveClients = (updatedList: Client[]) => {
    setClients(updatedList);
    localStorage.setItem('buildscan_clients', JSON.stringify(updatedList));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nom || !newClient.codeClient) return;

    const clientWithId: Client = {
      ...newClient,
      id: crypto.randomUUID()
    };

    const newList = [...clients, clientWithId];
    saveClients(newList);
    setNewClient({ nom: '', codeClient: '', typeAffaire: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce client ?")) {
      const newList = clients.filter(c => c.id !== id);
      saveClients(newList);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Référentiel Clients</h2>
          <p className="text-slate-500">Mappez les noms des PDF aux codes clients ERP (samdb).</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'}`}
        >
          {isAdding ? <><i className="fas fa-times"></i> Annuler</> : <><i className="fas fa-plus-circle"></i> Nouveau Client</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm animate-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-id-card text-blue-600"></i>
            Associer un nouveau client
          </h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nom sur le PDF</label>
              <input 
                type="text" 
                required
                className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ex: OPH DE DRANCY"
                value={newClient.nom}
                onChange={e => setNewClient({...newClient, nom: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Code Client ERP</label>
              <input 
                type="text" 
                required
                className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="ex: 411DRA038"
                value={newClient.codeClient}
                onChange={e => setNewClient({...newClient, codeClient: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Type Affaire</label>
              <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="ex: O3-0"
                value={newClient.typeAffaire}
                onChange={e => setNewClient({...newClient, typeAffaire: e.target.value})}
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md">
                Enregistrer l'association
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nom Reconnu</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Code Client (ERP)</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type Affaire</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                  Aucun client enregistré dans le référentiel.
                </td>
              </tr>
            ) : (
              clients.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{c.nom}</td>
                  <td className="px-6 py-4 font-mono text-blue-600 font-bold">{c.codeClient}</td>
                  <td className="px-6 py-4 font-mono text-slate-500">{c.typeAffaire || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(c.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-2"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminClients;
