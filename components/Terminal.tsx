
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface TerminalProps {
  logs: LogEntry[];
  onClear: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ logs, onClear }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-black rounded-lg border border-slate-700 shadow-2xl overflow-hidden font-mono text-[11px] leading-relaxed">
      <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          </div>
          <span className="text-slate-400 font-bold ml-2 uppercase tracking-tighter">Transmission_Log.sh</span>
        </div>
        <button 
          onClick={onClear}
          className="text-slate-500 hover:text-white transition-colors"
          title="Effacer la console"
        >
          <i className="fas fa-trash-alt"></i>
        </button>
      </div>
      
      <div 
        ref={scrollRef}
        className="h-64 overflow-y-auto p-4 space-y-2 bg-slate-950/50 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
      >
        {logs.length === 0 ? (
          <div className="text-slate-600 italic">En attente de transmission...</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="animate-in fade-in slide-in-from-left-1 duration-200">
              <div className="flex items-start gap-2">
                <span className="text-slate-600 shrink-0">[{log.timestamp}]</span>
                <span className={`font-bold shrink-0 ${
                  log.type === 'request' ? 'text-blue-400' : 
                  log.type === 'response' ? 'text-emerald-400' : 
                  log.type === 'error' ? 'text-red-400' : 
                  'text-slate-400'
                }`}>
                  {log.type.toUpperCase()}:
                </span>
                <span className="text-slate-300 break-words">{log.message}</span>
              </div>
              {log.data && (
                <pre className="mt-1 ml-14 p-2 bg-white/5 rounded text-[10px] text-slate-400 overflow-x-auto border border-white/5">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
      
      <div className="bg-slate-900/50 px-4 py-1.5 border-t border-slate-800 flex items-center justify-between text-[9px]">
        <div className="text-slate-500">SAMDB Bridge v2.1</div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 animate-pulse">●</span>
          <span className="text-slate-400 uppercase font-bold">Socket Active</span>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
