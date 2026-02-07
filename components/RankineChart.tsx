import React from 'react';
import { RankineState } from '../types';

interface Props {
  state?: RankineState | null;
  theme?: 'dark' | 'light';
}

const RankineChart: React.FC<Props> = ({ state, theme = 'light' }) => {
  const tCoord = state ? 150 - (state.tHigh - 400) * 0.5 : 80;
  const pCoord = state ? 230 - (state.pLow / 10) * 2 : 230;

  const gridColor = theme === 'dark' ? '#334155' : '#0d3b6622';
  const labelColor = theme === 'dark' ? '#64748b' : '#0d3b6688';
  const textColor = theme === 'dark' ? '#f1f5f9' : '#0d3b66';
  const accentColor = theme === 'dark' ? '#f97316' : '#0d3b66';

  return (
    <div className={`p-4 rounded-xl border w-full aspect-video flex flex-col items-center justify-center relative overflow-hidden group transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#0d3b6611] shadow-sm'}`}>
      <div className="absolute top-3 right-3 flex gap-1.5">
        <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-orange-500 animate-pulse' : 'bg-[#0d3b66] animate-pulse'}`}></div>
        <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-slate-700' : 'bg-[#0d3b6622]'}`}></div>
      </div>
      <h3 className={`${theme === 'dark' ? 'text-orange-400' : 'text-[#0d3b66]'} text-[9px] mono mb-2 uppercase tracking-[0.2em] font-black italic`}>T-s Protocol Telemetry</h3>
      
      <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-md">
        <defs>
          <linearGradient id="domeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={theme === 'dark' ? "#1e293b" : "#faf0ca44"} />
            <stop offset="100%" stopColor={theme === 'dark' ? "#0f172a" : "#ffffff"} />
          </linearGradient>
        </defs>
        
        {/* Saturation Dome */}
        <path 
          d="M 50 250 Q 200 50 350 250" 
          fill="url(#domeGrad)" 
          stroke={labelColor} 
          strokeWidth="1.5" 
          strokeDasharray="4 4" 
        />
        
        {/* Cycle Path */}
        <path 
          d={`M 80 ${pCoord} L 80 180 L 150 180 L ${250 + (tCoord/2)} ${tCoord} L 320 ${pCoord} Z`} 
          fill={theme === 'dark' ? "rgba(249, 115, 22, 0.1)" : "rgba(13, 59, 102, 0.05)"} 
          stroke={accentColor} 
          strokeWidth="3" 
          strokeLinejoin="round"
          className="transition-all duration-1000 ease-in-out"
        />

        {/* Dynamic Nodes */}
        <g className="transition-all duration-1000">
          <circle cx="250" cy={tCoord} r="5" fill={accentColor} className="animate-pulse" />
          <text x="260" y={tCoord - 8} fill={textColor} fontSize="11" className="mono font-black">{state?.tHigh || '450'}°C</text>
        </g>
        
        <g className="transition-all duration-1000">
          <circle cx="320" cy={pCoord} r="5" fill={accentColor} />
          <text x="325" y={pCoord + 18} fill={textColor} fontSize="11" className="mono font-black">{state?.pLow || '20'} kPa</text>
        </g>

        {/* Axis Labels */}
        <text x="360" y="275" fill={labelColor} fontSize="10" className="mono font-bold">s</text>
        <text x="30" y="45" fill={labelColor} fontSize="10" className="mono font-bold">T</text>

        {/* Grid lines */}
        <line x1="40" y1="260" x2="360" y2="260" stroke={gridColor} strokeWidth="1.5" />
        <line x1="40" y1="260" x2="40" y2="40" stroke={gridColor} strokeWidth="1.5" />
      </svg>
      
      <div className="mt-3 w-full grid grid-cols-3 gap-2 px-2">
        <div className={`text-center ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-[#faf0ca22] border-[#0d3b6611]'} p-1.5 rounded-lg border`}>
            <span className={`block text-[7px] ${theme === 'dark' ? 'text-slate-500' : 'text-[#0d3b6688]'} mono uppercase tracking-widest font-black`}>Inlet P</span>
            <span className={`text-[10px] mono font-black ${theme === 'dark' ? 'text-orange-400' : 'text-[#0d3b66]'}`}>{state?.pHigh || '10.0'} MPa</span>
        </div>
        <div className={`text-center ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-[#faf0ca22] border-[#0d3b6611]'} p-1.5 rounded-lg border`}>
            <span className={`block text-[7px] ${theme === 'dark' ? 'text-slate-500' : 'text-[#0d3b6688]'} mono uppercase tracking-widest font-black`}>Exhaust P</span>
            <span className={`text-[10px] mono font-black ${theme === 'dark' ? 'text-orange-400' : 'text-[#0d3b66]'}`}>{state?.pLow || '20'} kPa</span>
        </div>
        <div className={`text-center ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-[#faf0ca22] border-[#0d3b6611]'} p-1.5 rounded-lg border`}>
            <span className={`block text-[7px] ${theme === 'dark' ? 'text-slate-500' : 'text-[#0d3b6688]'} mono uppercase tracking-widest font-black`}>EFF %</span>
            <span className={`text-[10px] mono font-black ${theme === 'dark' ? 'text-emerald-500' : 'text-emerald-600'}`}>{state?.efficiency?.toFixed(1) || '32.4'}</span>
        </div>
      </div>
    </div>
  );
};

export default RankineChart;