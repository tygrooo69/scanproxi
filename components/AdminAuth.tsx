import React, { useState } from 'react';

interface AdminAuthProps {
  onAuthenticated: () => void;
  onCancel: () => void;
}

const AdminAuth: React.FC<AdminAuthProps> = ({ onAuthenticated, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '123456789') {
      onAuthenticated();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full border border-slate-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            <i className="fas fa-lock"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Accès Administration</h2>
          <p className="text-slate-500 text-sm mt-1">Zone sécurisée BuildScan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              autoFocus
              className={`w-full p-3 text-center text-lg font-bold tracking-widest border-2 rounded-xl focus:outline-none transition-colors ${error ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-200 focus:border-blue-500'}`}
              placeholder="•••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
            />
            {error && <p className="text-red-500 text-xs text-center mt-2 font-bold animate-pulse">Mot de passe incorrect</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button" 
              onClick={onCancel}
              className="py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm"
            >
              Retour
            </button>
            <button 
              type="submit"
              className="bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors text-sm shadow-lg shadow-slate-900/20"
            >
              Déverrouiller
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAuth;