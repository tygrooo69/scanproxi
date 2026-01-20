
import React, { useState, useEffect } from 'react';
import { Poseur } from '../types';

const AdminPoseurs: React.FC = () => {
  const [poseurs, setPoseurs] = useState<Poseur[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newPoseur, setNewPoseur] = useState<Omit<Poseur, 'id'>>({
    nom: '',
    entreprise: '',
    telephone: '',
    specialite: '',
    codeSalarie: ''
  });

  // Charger depuis localStorage
  useEffect(() => {
    const saved = localStorage.getItem('buildscan_poseurs');
    if (saved) {
      try {
        setPoseurs(JSON.parse(saved));
      } catch (e) {
        console.error("Erreur lors du chargement des poseurs", e);
      }
    }
  }, []);

  // Sauvegarder dans localStorage
  const savePoseurs = (updatedList: Poseur[]) => {
    setPoseurs(updatedList);
    localStorage.setItem('buildscan_poseurs', JSON.stringify(updatedList));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoseur.nom || !newPoseur.entreprise) return;

    const poseurWithId: Poseur = {
      ...newPoseur,
      id: crypto.randomUUID()
    };

    const newList = [...poseurs, poseurWithId];
    savePoseurs(newList);
    setNewPoseur({ nom: '', entreprise: '', telephone: '', specialite: '', codeSalarie: '' });
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Supprimer ce poseur de la liste ?")) {
      const newList = poseurs.filter(p => p.id !== id);
      savePoseurs(newList);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestion de la Flotte</h2>
          <p className="text-slate-500">Administrez la liste des poseurs et sous-traitants enregistrés.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'}`}
        >
          {isAdding ? <><i className="fas fa-times"></i> Annuler</> : <><i className="fas fa-user-plus"></i> Ajouter un poseur</>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white border border-blue-200 rounded-xl p-6 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-edit text-blue-600"></i>
            Nouveau Profil Poseur
          </h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Nom Complet</label>
              <input 
                type="text" 
                required
                className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ex: Jean Dupont"
                value={newPoseur.nom}
                onChange={e => setNewPoseur({...newPoseur, nom: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Code Salarié</label>
              <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                placeholder="ex: SAL-001"
                value={newPoseur.codeSalarie}
                onChange={e => setNewPoseur({...newPoseur, codeSalarie: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Entreprise</label>
              <input 
                type="text" 
                required
                className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="ex: Batipro SARL"
                value={newPoseur.entreprise}
                onChange={e => setNewPoseur({...newPoseur, entreprise: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Téléphone</label>
              <input 
                type="tel" 
                className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="06 00 00 00 00"
                value={newPoseur.telephone}
                onChange={e => setNewPoseur({...newPoseur, telephone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Spécialité</label>
              <select 
                className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={newPoseur.specialite}
                onChange={e => setNewPoseur({...newPoseur, specialite: e.target.value})}
              >
                <option value="">Toutes</option>
                <option value="Menuiserie">Menuiserie</option>
                <option value="Isolation">Isolation</option>
                <option value="Toiture">Toiture</option>
                <option value="Maçonnerie">Maçonnerie</option>
              </select>
            </div>
            <div className="lg:col-span-3 flex justify-end">
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-md">
                Enregistrer le poseur
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Poseur</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Code</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Entreprise</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Spécialité</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {poseurs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    Aucun poseur enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                poseurs.map(poseur => (
                  <tr key={poseur.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                          {poseur.nom.substring(0, 2)}
                        </div>
                        <span className="font-bold text-slate-700">{poseur.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600 uppercase">
                        {poseur.codeSalarie || '-'}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{poseur.entreprise}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        {poseur.specialite || 'Général'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{poseur.telephone || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(poseur.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2"
                        title="Supprimer"
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

      <div className="bg-blue-900 text-white p-6 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-3xl opacity-50"><i className="fas fa-file-export"></i></div>
          <div>
            <h4 className="font-bold uppercase tracking-tight text-blue-200 text-xs">Synchronisation</h4>
            <p className="text-sm">Cette liste est utilisée pour assigner les interventions lors de l'analyse des bons.</p>
          </div>
        </div>
        <button className="text-xs bg-blue-800 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-all border border-blue-700">
          Exporter CSV
        </button>
      </div>
    </div>
  );
};

export default AdminPoseurs;
