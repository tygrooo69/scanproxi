import React from 'react';
import { AppView } from '../types';

interface HeaderProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const lastSync = localStorage.getItem('buildscan_last_sync');
  const dataSource = localStorage.getItem('buildscan_data_source');
  
  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewChange('analyzer')}>
          <div className="bg-blue-600 p-2 rounded-lg">
            <i className="fas fa-hard-hat text-2xl"></i>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight uppercase">BuildScan <span className="text-blue-400">AI</span></h1>
              {dataSource === 'server' ? (
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                  <i className="fas fa-cloud"></i> Synced
                </span>
              ) : (
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1">
                  <i className="fas fa-save"></i> Local Only
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Extraction Intelligente ERP SAMDB</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => onViewChange('analyzer')}
              className={`text-[11px] px-4 py-2 rounded font-bold transition-all flex items-center gap-2 ${currentView === 'analyzer' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:text-white'}`}
            >
              <i className="fas fa-search"></i> Analyseur
            </button>
            <button 
              onClick={() => onViewChange('admin')}
              className={`text-[11px] px-4 py-2 rounded font-bold transition-all flex items-center gap-2 ${currentView === 'admin' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              <i className="fas fa-lock"></i> Administration
            </button>
          </div>
          
          <div className="text-[9px] text-slate-500 font-mono text-right leading-none border-l border-slate-700 pl-4">
            <span className="block mb-1 text-slate-400">DATA_REVISION</span>
            <span>{lastSync ? new Date(lastSync).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;