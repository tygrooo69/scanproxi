import React, { useState } from 'react';
import AdminClients from './AdminClients';
import AdminPoseurs from './AdminPoseurs';
import AdminSettings from './AdminSettings';
import AdminWiki from './AdminWiki';

type AdminTab = 'clients' | 'poseurs' | 'settings' | 'wiki';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('clients');

  const menuItems = [
    { id: 'clients', label: 'Référentiel Clients', icon: 'fa-building', desc: 'Codes ERP & Mappings' },
    { id: 'poseurs', label: 'Gestion Flotte', icon: 'fa-users-cog', desc: 'Poseurs & Sous-traitants' },
    { id: 'settings', label: 'Paramètres', icon: 'fa-sliders-h', desc: 'Base de données & Webhook' },
    { id: 'wiki', label: 'Aide et Fonctionnalité', icon: 'fa-book', desc: 'Wiki & Documentation' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
          <div className="p-6 bg-slate-900 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <i className="fas fa-shield-alt text-blue-400"></i>
              Administration
            </h2>
            <p className="text-slate-400 text-xs mt-1">Zone sécurisée</p>
          </div>
          <nav className="p-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as AdminTab)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-colors ${
                  activeTab === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                }`}>
                  <i className={`fas ${item.icon}`}></i>
                </div>
                <div>
                  <div className="font-bold text-sm">{item.label}</div>
                  <div className="text-[10px] opacity-70 font-medium">{item.desc}</div>
                </div>
              </button>
            ))}
          </nav>
          <div className="p-4 mt-2 border-t border-slate-100">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Connecté en tant que</p>
              <p className="text-xs font-bold text-slate-700 mt-1">Administrateur</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-9">
        <div className="bg-transparent">
          {activeTab === 'clients' && <AdminClients />}
          {activeTab === 'poseurs' && <AdminPoseurs />}
          {activeTab === 'settings' && <AdminSettings />}
          {activeTab === 'wiki' && <AdminWiki />}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;