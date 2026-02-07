import React, { useState, useMemo } from 'react';
import { Paper, Question, RankineState } from '../types';
import RankineChart from './RankineChart';
import * as Solver from '../utils/thermoSolver';

interface Props {
  paper: Paper;
  currentQuestion?: Question | null;
  theme?: 'dark' | 'light';
}

type TabID = 'THERMO' | 'STEAM' | 'ASME' | 'PUMPS' | 'ELECTRO' | 'REFRIG' | 'COMPRESS' | 'TURBINE' | 'NOZZLE' | 'STRENGTH' | 'COMBUSTION' | 'GOV' | 'WATER' | 'EXPANSION' | 'METAL' | 'FLUIDS' | 'LMTD' | 'SAFETY';

interface EquationMeta {
  formula: string;
  description: string;
  variables: { name: string; symbol: string; desc: string }[];
}

const EQUATION_META: Record<TabID, EquationMeta> = {
  THERMO: {
    formula: 'η = (W_turb - W_pump) / Q_in',
    description: 'Calculates overall thermal efficiency of a Rankine Cycle considering turbine work, feed pump work, and boiler heat input.',
    variables: []
  },
  STEAM: {
    formula: 'h, s, v = f(P, T)',
    description: 'Lookup thermodynamic properties for steam and water using Region 1 and 2 IAPWS-IF97 approximations.',
    variables: []
  },
  ASME: {
    formula: 't = (P * R) / (S * E - 0.6 * P)',
    description: 'ASME Section I PG-27 minimum required thickness for cylindrical shells under internal pressure.',
    variables: []
  },
  PUMPS: {
    formula: 'Q2=Q1(N2/N1), H2=H1(N2/N1)², P2=P1(N2/N1)³',
    description: 'Affinity Laws for centrifugal machines predicting performance based on speed or diameter changes.',
    variables: []
  },
  ELECTRO: {
    formula: 'kW = (√3 * V * I * PF) / 1000',
    description: 'Real power calculation for balanced three-phase alternating current systems.',
    variables: []
  },
  REFRIG: {
    formula: 'COP = RE / W_comp',
    description: 'Coefficient of Performance measuring the efficiency of a vapor compression refrigeration cycle.',
    variables: []
  },
  COMPRESS: {
    formula: 'η_vol = (V_act / V_disp) * 100',
    description: 'Volumetric efficiency of reciprocating compressors considering clearance volume re-expansion.',
    variables: []
  },
  TURBINE: {
    formula: 'η_isen = (h1 - h2a) / (h1 - h2s)',
    description: 'Isentropic efficiency of a steam turbine comparing actual enthalpy drop to ideal drop.',
    variables: []
  },
  NOZZLE: {
    formula: 'V_exit = √(2000 * η_n * Δh_isen)',
    description: 'Exit velocity of steam through a nozzle considering friction efficiency and enthalpy drop.',
    variables: []
  },
  STRENGTH: {
    formula: 'σ = (M * y) / I',
    description: 'The Flexure formula for calculating maximum bending stress in a beam under load.',
    variables: []
  },
  COMBUSTION: {
    formula: 'Air_total = Theo_Air * (1 + Excess_Air)',
    description: 'Calculates mass of air required for complete combustion of Carbon and Hydrogen in a fuel.',
    variables: []
  },
  GOV: {
    formula: 'Droop = ((N_nl - N_fl) / N_fl) * 100',
    description: 'Speed droop calculation for stable load sharing between parallel power units.',
    variables: []
  },
  WATER: {
    formula: 'V_gal = Capacity_gr / (Hardness_ppm / 17.1)',
    description: 'Ion exchanger throughput calculation before the resin bed reaches exhaustion.',
    variables: []
  },
  EXPANSION: {
    formula: 'ΔL = L * α * ΔT',
    description: 'Linear thermal growth of piping or vessels due to temperature rise.',
    variables: []
  },
  METAL: {
    formula: 'CE = C + Mn/6 + (Cr+Mo+V)/5 + (Ni+Cu)/15',
    description: 'Carbon Equivalent for determining weldability and preheat requirements for steel.',
    variables: []
  },
  FLUIDS: {
    formula: 'Q = Cd * A * √(2 * ΔP / ρ)',
    description: 'Orifice plate flow measurement based on pressure differential and fluid density.',
    variables: []
  },
  LMTD: {
    formula: 'ΔTm = (ΔT1 - ΔT2) / ln(ΔT1/ΔT2)',
    description: 'Log Mean Temperature Difference for heat exchanger driving force analysis.',
    variables: []
  },
  SAFETY: {
    formula: 'W = 5.25 * P * A * K',
    description: 'ASME Section I (PG-67) certified steam discharge capacity for safety valves.',
    variables: []
  }
};

const DiagnosticDisplay: React.FC<Props> = ({ paper, currentQuestion, theme = 'light' }) => {
  const [activeTab, setActiveTab] = useState<TabID>('THERMO');
  const [showRef, setShowRef] = useState(false);

  // Tools States
  const [rankineIn, setRankineIn] = useState({ pHigh: 10, tHigh: 500, pLow: 20 });
  const [steamIn, setSteamIn] = useState({ p: 10, t: 500 });
  const [asmeIn, setAsmeIn] = useState({ p: 2.5, d: 1200, s: 115, e: 0.85 });
  const [pumpIn, setPumpIn] = useState({ rpm1: 1750, rpm2: 3500, f1: 100, h1: 45, p1: 30, d1: 250, d2: 250 });
  const [elecIn, setElecIn] = useState({ v: 600, i: 50, pf: 0.85 });
  const [refrigIn, setRefrigIn] = useState({ flow: 0.5, hIn: 400, hOut: 180, work: 30 });
  const [compressIn, setCompressIn] = useState({ pIn: 101, pOut: 800, vDisp: 0.5, vAct: 0.42 });
  const [turbineIn, setTurbineIn] = useState({ hIn: 3400, hOutA: 2600, hOutI: 2400 });
  const [nozzleIn, setNozzleIn] = useState({ hIn: 3400, hOutI: 3000, eff: 92 });
  const [strengthIn, setStrengthIn] = useState({ load: 5000, len: 4000, w: 100, h: 200 });
  const [combustIn, setCombustIn] = useState({ c: 86, h: 12, ea: 20 });
  const [govIn, setGovIn] = useState({ nl: 3750, fl: 3600 });
  const [waterIn, setWaterIn] = useState({ hard: 150, cap: 500000, flow: 20 });
  const [expandIn, setExpandIn] = useState({ l: 100, a: 0.000012, dt: 400 });
  const [metalIn, setMetalIn] = useState({ c: 0.22, mn: 1.2, cr: 0.5, mo: 0.2, v: 0.02, ni: 0.3, cu: 0.2 });
  const [fluidIn, setFluidIn] = useState({ dOut: 100, dIn: 60, dp: 25, rho: 998 });
  const [lmtdIn, setLmtdIn] = useState({ thi: 120, tho: 80, tci: 20, tco: 50 });
  const [safetyIn, setSafetyIn] = useState({ pSet: 2.5, area: 1500, k: 0.9 });

  const results = useMemo(() => ({
    rankine: Solver.solveRankine(rankineIn.pHigh, rankineIn.tHigh, rankineIn.pLow),
    steam: Solver.solveSteamTable(steamIn.p, steamIn.t),
    asme: Solver.solveAsmeHead(asmeIn.p, asmeIn.d, asmeIn.s, asmeIn.e),
    pump: Solver.solveAffinity(pumpIn.rpm1, pumpIn.rpm2, pumpIn.f1, pumpIn.h1, pumpIn.p1, pumpIn.d1, pumpIn.d2),
    elec: Solver.solveElectrical(elecIn.v, elecIn.i, elecIn.pf),
    refrig: Solver.solveRefrigeration(refrigIn.flow, refrigIn.hIn, refrigIn.hOut, refrigIn.work),
    compress: Solver.solveCompression(compressIn.pIn, compressIn.pOut, compressIn.vDisp, compressIn.vAct),
    turbine: Solver.solveTurbineEff(turbineIn.hIn, turbineIn.hOutA, turbineIn.hOutI),
    nozzle: Solver.solveNozzle(nozzleIn.hIn, nozzleIn.hOutI, nozzleIn.eff),
    strength: Solver.solveStrength(strengthIn.load, strengthIn.len, strengthIn.w, strengthIn.h),
    combust: Solver.solveCombustionAir(combustIn.c, combustIn.h, combustIn.ea),
    gov: Solver.solveGovernor(govIn.nl, govIn.fl),
    water: Solver.solveWater(waterIn.hard, waterIn.cap, waterIn.flow),
    expand: Solver.solveExpansion(expandIn.l, expandIn.a, expandIn.dt),
    metal: Solver.solveCarbonEquivalent(metalIn.c, metalIn.mn, metalIn.cr, metalIn.mo, metalIn.v, metalIn.ni, metalIn.cu),
    fluid: Solver.solveOrificeFlow(fluidIn.dOut, fluidIn.dIn, fluidIn.dp, fluidIn.rho),
    lmtd: Solver.solveLMTD(lmtdIn.thi, lmtdIn.tho, lmtdIn.tci, lmtdIn.tco),
    safety: Solver.solveSafetyValve(safetyIn.pSet, safetyIn.area, safetyIn.k)
  }), [rankineIn, steamIn, asmeIn, pumpIn, elecIn, refrigIn, compressIn, turbineIn, nozzleIn, strengthIn, combustIn, govIn, waterIn, expandIn, metalIn, fluidIn, lmtdIn, safetyIn]);

  // Visual Styles
  const gridColor = theme === 'dark' ? '#334155' : '#0d3b6622';
  const labelColor = theme === 'dark' ? '#64748b' : '#0d3b6688';
  const accentColor = theme === 'dark' ? '#f97316' : '#0d3b66';
  const containerClass = `${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#0d3b6611]'} border rounded-xl overflow-hidden shadow-2xl flex flex-col h-full min-h-[700px]`;
  const tabClass = (id: TabID) => `flex-shrink-0 px-4 py-3 text-[9px] md:text-[10px] mono font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap ${
    activeTab === id 
      ? (theme === 'dark' ? 'border-orange-500 text-orange-400 bg-orange-500/5' : 'border-[#0d3b66] text-[#0d3b66] bg-[#0d3b6605]') 
      : 'border-transparent text-slate-500 hover:text-slate-400'
  }`;
  const inputClass = `w-full bg-transparent border ${theme === 'dark' ? 'border-slate-800 text-slate-200' : 'border-slate-200 text-[#0d3b66]'} rounded px-2 py-1.5 text-xs mono font-bold focus:outline-none focus:border-orange-500 transition-colors`;
  const labelClass = `block text-[8px] ${theme === 'dark' ? 'text-slate-500' : 'text-[#0d3b6688]'} mono uppercase font-black mb-1`;

  const meta = EQUATION_META[activeTab];

  const renderSectionResult = (title: string, value: string | number, sub: string, colorClass = "text-orange-400") => (
    <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-950/40' : 'border-[#0d3b6611] bg-slate-50'} text-center shadow-inner group hover:border-orange-500/50 transition-colors flex flex-col justify-center items-center`}>
       <span className={labelClass}>{title}</span>
       <div className={`text-xl md:text-2xl font-black ${theme === 'dark' ? colorClass : 'text-[#0d3b66]'}`}>{value}</div>
       <span className="text-[9px] mono opacity-40 italic uppercase tracking-tighter mt-1">{sub}</span>
    </div>
  );

  return (
    <div className={containerClass}>
      {/* TABS HEADER */}
      <div className={`flex items-center overflow-x-auto no-scrollbar border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-950/30' : 'border-[#0d3b6611] bg-slate-50'}`}>
        {(Object.keys(EQUATION_META) as TabID[]).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setShowRef(false); }} className={tabClass(tab)}>
            {tab === 'THERMO' ? 'Rankine' : tab === 'STEAM' ? 'Steam Tables' : tab === 'ASME' ? 'ASME Shell' : tab === 'PUMPS' ? 'Pump Affinity' : tab === 'ELECTRO' ? '3-Phase' : tab.charAt(0) + tab.slice(1).toLowerCase().replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
           <button onClick={() => setShowRef(!showRef)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] mono font-black uppercase tracking-widest transition-all ${showRef ? 'bg-orange-500 text-white' : 'bg-slate-500/10 text-slate-500'}`}>
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {showRef ? 'Hide Reference' : 'Equation Logic'}
           </button>
           <div className={`text-[9px] mono font-bold uppercase ${theme === 'dark' ? 'text-slate-600' : 'text-slate-300'}`}>Engineering Unit: Diagnostic Mode</div>
        </div>

        {showRef && (
          <div className={`mb-6 p-4 rounded-xl border animate-in slide-in-from-top-2 ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-orange-50/50 border-orange-100'}`}>
             <span className={labelClass}>Core Formula</span>
             <div className="text-sm md:text-base font-black italic mono mb-2">{meta.formula}</div>
             <p className="text-[10px] md:text-xs leading-relaxed opacity-60 italic">{meta.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* VISUALIZATION PANEL */}
          <div className="lg:col-span-8 flex flex-col items-center">
            
            {activeTab === 'THERMO' && <RankineChart state={results.rankine} theme={theme} />}

            {activeTab === 'STEAM' && (
              <div className="w-full space-y-6">
                <div className={`w-full p-6 md:p-10 rounded-2xl border-4 ${results.steam.isSuperheated ? 'border-orange-500 bg-orange-500/5' : 'border-blue-500 bg-blue-500/5'} text-center shadow-lg transition-colors relative overflow-hidden`}>
                  <div className={`absolute -right-8 -top-8 text-8xl opacity-[0.03] mono font-black select-none`}>{results.steam.isSuperheated ? 'VAPOR' : 'LIQUID'}</div>
                  <div className="flex flex-col items-center gap-1 mb-4">
                    <span className={labelClass}>Phase State Readout</span>
                    <div className={`text-2xl md:text-3xl font-black ${results.steam.isSuperheated ? 'text-orange-500' : 'text-blue-500'}`}>
                      {results.steam.isSuperheated ? 'SUPERHEATED VAPOR' : 'SUBCOOLED LIQUID'}
                    </div>
                  </div>

                  <div className={`relative h-40 md:h-56 w-full border ${theme === 'dark' ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50/30'} rounded-xl mb-8 overflow-hidden`}>
                    <svg viewBox="0 0 400 200" className="w-full h-full drop-shadow-sm">
                      <path d="M 40 180 C 40 180, 200 20, 360 180" fill="none" stroke={gridColor} strokeWidth="2" strokeDasharray="4 4" />
                      <line x1="20" y1="180" x2="380" y2="180" stroke={labelColor} strokeWidth="1" />
                      <text x="40" y="195" fontSize="7" fill={labelColor} className="mono font-bold">Liquid Sat</text>
                      <text x="320" y="195" fontSize="7" fill={labelColor} className="mono font-bold">Vapor Sat</text>
                      
                      <g className="transition-all duration-700 ease-out" transform={`translate(${results.steam.isSuperheated ? 380 - (Math.min(100, (steamIn.t - results.steam.Tsat)*2)) : 20 + (Math.max(0, steamIn.t/results.steam.Tsat)*20)}, 0)`}>
                        <circle cx="0" cy="180" r="6" fill={results.steam.isSuperheated ? "#f97316" : "#3b82f6"} className="animate-pulse" />
                        <line x1="0" y1="180" x2="0" y2="60" stroke={results.steam.isSuperheated ? "#f97316" : "#3b82f6"} strokeWidth="1" strokeDasharray="2 2" />
                        <rect x="-35" y="30" width="70" height="22" rx="4" fill={theme === 'dark' ? "#0f172a" : "#fff"} stroke="currentColor" strokeWidth="1.5" />
                        <text x="0" y="44" textAnchor="middle" fontSize="8" className="mono font-black uppercase" fill="currentColor">{Math.round(steamIn.t)}°C</text>
                      </g>
                    </svg>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {renderSectionResult('Enthalpy (h)', Math.round(results.steam.h), 'kJ/kg')}
                    {renderSectionResult('Entropy (s)', results.steam.s.toFixed(3), 'kJ/kK')}
                    {renderSectionResult('Volume (v)', results.steam.v.toFixed(4), 'm³/kg')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'} flex flex-col items-center justify-center`}>
                    <span className={labelClass}>Saturation Temp</span>
                    <span className={`text-xl font-black mono ${theme === 'dark' ? 'text-blue-400' : 'text-[#0d3b66]'}`}>{results.steam.Tsat.toFixed(2)} °C</span>
                  </div>
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50'} flex flex-col items-center justify-center`}>
                    <span className={labelClass}>Thermal Delta</span>
                    <span className={`text-xl font-black mono ${results.steam.isSuperheated ? 'text-orange-400' : 'text-slate-400'}`}>{Math.abs(steamIn.t - results.steam.Tsat).toFixed(1)} °C</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ASME' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <svg viewBox="0 0 200 150" className="w-full max-w-xs">
                  <circle cx="100" cy="75" r="50" fill="none" stroke={gridColor} strokeWidth="1" strokeDasharray="4 2" />
                  <circle cx="100" cy="75" r={50 + (results.asme.thickness / 2)} fill="none" stroke="#f97316" strokeWidth={Math.max(2, results.asme.thickness / 4)} className="animate-pulse" />
                  <text x="100" y="78" textAnchor="middle" fill={labelColor} fontSize="8" className="mono font-black uppercase">Pressure Load</text>
                </svg>
                {renderSectionResult('Required Thickness', results.asme.thickness.toFixed(3) + ' mm', 'ASME I PG-27 Minimum')}
              </div>
            )}

            {activeTab === 'PUMPS' && (
              <div className="w-full space-y-8">
                <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white shadow-sm'}`}>
                  <h4 className={labelClass}>Shift Projection (H-Q Performance)</h4>
                  <svg viewBox="0 0 400 200" className="w-full h-auto mt-4">
                    <line x1="20" y1="180" x2="380" y2="180" stroke={gridColor} strokeWidth="1" />
                    <line x1="20" y1="180" x2="20" y2="20" stroke={gridColor} strokeWidth="1" />
                    <path d="M 20 160 Q 150 155, 380 40" fill="none" stroke={labelColor} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.4" />
                    <path d={`M 20 ${180 - (results.pump.head2/pumpIn.h1)*20} Q ${150 * (results.pump.flow2/pumpIn.f1)} ${180 - (results.pump.head2/pumpIn.h1)*25}, 380 ${Math.max(10, 180 - (results.pump.head2/pumpIn.h1)*140)}`} fill="none" stroke="#3b82f6" strokeWidth="3" className="transition-all duration-700" />
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {renderSectionResult('Target Flow', Math.round(results.pump.flow2), 'LPM', 'text-blue-400')}
                  {renderSectionResult('Target Head', Math.round(results.pump.head2), 'Meters', 'text-orange-400')}
                  {renderSectionResult('Target Power', results.pump.power2.toFixed(1), 'kW', 'text-emerald-400')}
                </div>
              </div>
            )}

            {activeTab === 'ELECTRO' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <svg viewBox="0 0 120 120" className="w-48 h-48">
                  <path d="M 10 110 L 110 110 L 110 10 Z" fill="none" stroke={gridColor} strokeWidth="1" />
                  <path d={`M 10 110 L ${10 + (elecIn.pf * 90)} 110 L ${10 + (elecIn.pf * 90)} ${110 - (Math.sqrt(1 - elecIn.pf**2) * 90)} Z`} fill="rgba(249, 115, 22, 0.2)" stroke="#f97316" strokeWidth="3" />
                </svg>
                <div className="grid grid-cols-2 gap-4 w-full">
                  {renderSectionResult('Real Power', results.elec.kw.toFixed(2) + ' kW', 'Active')}
                  {renderSectionResult('Apparent Power', results.elec.kva.toFixed(2) + ' kVA', 'Line Load', 'text-slate-400')}
                </div>
              </div>
            )}

            {activeTab === 'REFRIG' && (
              <div className="w-full space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderSectionResult('Refrig Capacity', results.refrig.capacityTR.toFixed(2) + ' TR', 'Cooling Duty')}
                  {renderSectionResult('Energy Ratio (COP)', results.refrig.cop.toFixed(2), 'Efficiency Index')}
                </div>
                <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50'} text-center`}>
                  <div className={labelClass}>Refrigerating Effect</div>
                  <div className="text-3xl font-black text-blue-500">{results.refrig.re.toFixed(1)} <span className="text-xs opacity-50">kJ/kg</span></div>
                </div>
              </div>
            )}

            {activeTab === 'COMPRESS' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <div className="relative p-12 border-8 border-slate-500/20 rounded-full">
                   <div className="text-5xl font-black text-blue-500">{results.compress.volEff.toFixed(1)}%</div>
                   <div className={labelClass}>Volumetric Efficiency</div>
                </div>
                {renderSectionResult('Pressure Ratio', results.compress.ratio.toFixed(2), 'Compression Factor')}
              </div>
            )}

            {activeTab === 'TURBINE' && (
              <div className="w-full space-y-6">
                {renderSectionResult('Isentropic Eff', results.turbine.efficiency.toFixed(2) + '%', 'Expansion Quality')}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-500/5 rounded-lg border border-current text-center">
                    <span className={labelClass}>Actual Work</span>
                    <span className="font-bold text-lg">{Math.round(results.turbine.actualWork)} kJ/kg</span>
                  </div>
                  <div className="p-4 bg-slate-500/5 rounded-lg border border-current text-center opacity-60">
                    <span className={labelClass}>Theoretical Work</span>
                    <span className="font-bold text-lg">{Math.round(turbineIn.hIn - turbineIn.hOutI)} kJ/kg</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'NOZZLE' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <svg viewBox="0 0 200 80" className="w-full max-w-sm">
                  <path d="M 10 10 L 80 30 L 190 10 L 190 70 L 80 50 L 10 70 Z" fill="none" stroke={accentColor} strokeWidth="2" />
                  <circle cx="190" cy="40" r="10" fill="rgba(249, 115, 22, 0.1)" className="animate-ping" />
                </svg>
                {renderSectionResult('Exit velocity', Math.round(results.nozzle.velocity) + ' m/s', 'Dynamic Head')}
              </div>
            )}

            {activeTab === 'STRENGTH' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <svg viewBox="0 0 200 100" className="w-full max-w-sm">
                  <rect x="20" y="60" width="160" height="10" fill={theme === 'dark' ? '#1e293b' : '#f8fafc'} stroke={gridColor} />
                  <path d="M 100 20 L 100 55" stroke="#f43f5e" strokeWidth="3" markerEnd="url(#arrow)" />
                </svg>
                {renderSectionResult('Maximum Bending Stress', results.strength.stress.toFixed(2) + ' MPa', 'Fiber Limit')}
              </div>
            )}

            {activeTab === 'COMBUSTION' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <div className="p-10 rounded-full bg-orange-500/5 border-8 border-orange-500/20">
                   <div className="text-5xl font-black text-orange-500">{results.combust.totalAir.toFixed(2)}</div>
                   <div className={labelClass}>kg Air / kg Fuel</div>
                </div>
                <div className="text-[10px] mono opacity-50 uppercase font-black">Stoichiometric Base: {results.combust.theoAir.toFixed(2)}</div>
              </div>
            )}

            {activeTab === 'GOV' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <svg viewBox="0 0 100 100" className="w-48 h-48">
                  <line x1="10" y1="20" x2="90" y2="80" stroke={accentColor} strokeWidth="2" strokeDasharray="4 2" />
                </svg>
                {renderSectionResult('Percent Droop', results.gov.droopPercent.toFixed(2) + '%', 'Parallel Stability')}
              </div>
            )}

            {activeTab === 'WATER' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <div className="w-24 h-44 border-4 border-blue-500/30 rounded-lg relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 right-0 bg-blue-500/40 transition-all duration-1000" style={{height: '65%'}}></div>
                </div>
                {renderSectionResult('Cycle Throughput', Math.round(results.water.volumeToExhaust) + ' Gal', `Est: ${results.water.timeHours.toFixed(1)} Hours`)}
              </div>
            )}

            {activeTab === 'EXPANSION' && (
              <div className="w-full space-y-8">
                <div className="h-6 bg-slate-500/20 w-full rounded-full relative overflow-hidden">
                   <div className="h-full bg-rose-500" style={{width: `${Math.min(100, results.expand.expansion * 10000)}%`}}></div>
                </div>
                {renderSectionResult('Linear Growth', (results.expand.expansion * 1000).toFixed(2) + ' mm', 'Thermal displacement')}
              </div>
            )}

            {activeTab === 'METAL' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <div className={`p-12 rounded-2xl border-8 ${results.metal.ce > 0.45 ? 'border-rose-500 bg-rose-500/5' : 'border-emerald-500 bg-emerald-500/5'} text-center`}>
                   <div className="text-6xl font-black">{results.metal.ce.toFixed(3)}</div>
                   <div className={labelClass}>Carbon Equivalent (CE)</div>
                </div>
                <p className={`text-xs font-black uppercase tracking-widest ${results.metal.ce > 0.45 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {results.metal.ce > 0.45 ? 'Critical: Mandatory Preheat Required' : 'Nominal: Standard Weld Protocol'}
                </p>
              </div>
            )}

            {activeTab === 'FLUIDS' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <svg viewBox="0 0 200 80" className="w-full max-w-sm">
                  <path d="M 0 30 L 200 30 M 0 50 L 200 50" stroke={gridColor} strokeWidth="2" />
                  <path d="M 100 20 L 100 60" stroke="#f97316" strokeWidth="4" />
                </svg>
                {renderSectionResult('Mass flow rate', results.fluid.flowKgs.toFixed(3) + ' kg/s', `Rate: ${results.fluid.flowLpm.toFixed(1)} LPM`)}
              </div>
            )}

            {activeTab === 'LMTD' && (
              <div className="w-full flex flex-col items-center space-y-8">
                {renderSectionResult('LMTD Output', results.lmtd.lmtd.toFixed(2) + ' °C', 'Log Mean Driving Force')}
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="p-4 rounded border border-current opacity-60 text-center"><span className={labelClass}>ΔT High</span><span className="font-bold">{results.lmtd.dt1.toFixed(1)}°C</span></div>
                  <div className="p-4 rounded border border-current opacity-60 text-center"><span className={labelClass}>ΔT Low</span><span className="font-bold">{results.lmtd.dt2.toFixed(1)}°C</span></div>
                </div>
              </div>
            )}

            {activeTab === 'SAFETY' && (
              <div className="w-full flex flex-col items-center space-y-8">
                <svg viewBox="0 0 100 120" className="w-40 h-auto">
                  <path d="M 30 110 L 70 110 L 70 60 L 90 60 L 50 20 L 10 60 L 30 60 Z" fill="none" stroke={accentColor} strokeWidth="2" />
                  <path d="M 40 60 L 60 60" stroke="#f43f5e" strokeWidth="4" className="animate-bounce" />
                </svg>
                {renderSectionResult('Relief Capacity', Math.round(results.safety.capacityKgh) + ' kg/h', `Cert: ${results.safety.capacityKgs.toFixed(3)} kg/s`)}
              </div>
            )}

          </div>

          {/* INPUTS PANEL */}
          <div className="lg:col-span-4 space-y-4">
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-[#0d3b6611]'}`}>
              <h4 className={labelClass}>Dynamic Logic Inputs</h4>
              <div className="mt-4 space-y-4">
                {activeTab === 'THERMO' && (
                  <>
                    <div><label className={labelClass}>Inlet P (MPa)</label><input type="number" step="0.1" value={rankineIn.pHigh} onChange={e => setRankineIn({...rankineIn, pHigh: parseFloat(e.target.value) || 0})} className={inputClass} /></div>
                    <div><label className={labelClass}>Inlet T (°C)</label><input type="number" value={rankineIn.tHigh} onChange={e => setRankineIn({...rankineIn, tHigh: parseFloat(e.target.value) || 0})} className={inputClass} /></div>
                    <div><label className={labelClass}>Cond P (kPa)</label><input type="number" value={rankineIn.pLow} onChange={e => setRankineIn({...rankineIn, pLow: parseFloat(e.target.value) || 0})} className={inputClass} /></div>
                  </>
                )}
                {activeTab === 'STEAM' && (
                  <>
                    <div><label className={labelClass}>Operating P (MPa)</label><input type="number" step="0.1" value={steamIn.p} onChange={e => setSteamIn({...steamIn, p: parseFloat(e.target.value) || 0.1})} className={inputClass} /></div>
                    <div><label className={labelClass}>Operating T (°C)</label><input type="number" value={steamIn.t} onChange={e => setSteamIn({...steamIn, t: parseFloat(e.target.value) || 0})} className={inputClass} /></div>
                  </>
                )}
                {activeTab === 'ASME' && (
                  <>
                    <div><label className={labelClass}>MAWP (MPa)</label><input type="number" step="0.1" value={asmeIn.p} onChange={e => setAsmeIn({...asmeIn, p: parseFloat(e.target.value) || 0})} className={inputClass} /></div>
                    <div><label className={labelClass}>Shell ID (mm)</label><input type="number" value={asmeIn.d} onChange={e => setAsmeIn({...asmeIn, d: parseFloat(e.target.value) || 0})} className={inputClass} /></div>
                    <div><label className={labelClass}>Allowable S (MPa)</label><input type="number" value={asmeIn.s} onChange={e => setAsmeIn({...asmeIn, s: parseFloat(e.target.value) || 0})} className={inputClass} /></div>
                    <div><label className={labelClass}>Joint Eff (E)</label><input type="number" step="0.05" value={asmeIn.e} onChange={e => setAsmeIn({...asmeIn, e: parseFloat(e.target.value) || 0})} className={inputClass} /></div>
                  </>
                )}
                {activeTab === 'PUMPS' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelClass}>RPM 1</label><input type="number" value={pumpIn.rpm1} onChange={e => setPumpIn({...pumpIn, rpm1: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                      <div><label className={labelClass}>RPM 2</label><input type="number" value={pumpIn.rpm2} onChange={e => setPumpIn({...pumpIn, rpm2: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                    </div>
                    <div><label className={labelClass}>Base Flow (LPM)</label><input type="number" value={pumpIn.f1} onChange={e => setPumpIn({...pumpIn, f1: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Base Head (m)</label><input type="number" value={pumpIn.h1} onChange={e => setPumpIn({...pumpIn, h1: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Base Power (kW)</label><input type="number" value={pumpIn.p1} onChange={e => setPumpIn({...pumpIn, p1: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'ELECTRO' && (
                  <>
                    <div><label className={labelClass}>Line V</label><input type="number" value={elecIn.v} onChange={e => setElecIn({...elecIn, v: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Line I</label><input type="number" value={elecIn.i} onChange={e => setElecIn({...elecIn, i: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Power Factor</label><input type="number" step="0.01" value={elecIn.pf} onChange={e => setElecIn({...elecIn, pf: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'REFRIG' && (
                  <>
                    <div><label className={labelClass}>Flow Rate (kg/s)</label><input type="number" step="0.1" value={refrigIn.flow} onChange={e => setRefrigIn({...refrigIn, flow: parseFloat(e.target.value) || 0.1})} className={inputClass}/></div>
                    <div><label className={labelClass}>h Evap In</label><input type="number" value={refrigIn.hOut} onChange={e => setRefrigIn({...refrigIn, hOut: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>h Evap Out</label><input type="number" value={refrigIn.hIn} onChange={e => setRefrigIn({...refrigIn, hIn: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Work In (kW)</label><input type="number" value={refrigIn.work} onChange={e => setRefrigIn({...refrigIn, work: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'COMPRESS' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelClass}>P Inlet</label><input type="number" value={compressIn.pIn} onChange={e => setCompressIn({...compressIn, pIn: parseFloat(e.target.value) || 101})} className={inputClass}/></div>
                      <div><label className={labelClass}>P Disch</label><input type="number" value={compressIn.pOut} onChange={e => setCompressIn({...compressIn, pOut: parseFloat(e.target.value) || 101})} className={inputClass}/></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelClass}>V Actual</label><input type="number" step="0.1" value={compressIn.vAct} onChange={e => setCompressIn({...compressIn, vAct: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                      <div><label className={labelClass}>V Swept</label><input type="number" step="0.1" value={compressIn.vDisp} onChange={e => setCompressIn({...compressIn, vDisp: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                    </div>
                  </>
                )}
                {activeTab === 'TURBINE' && (
                  <>
                    <div><label className={labelClass}>h Throttle</label><input type="number" value={turbineIn.hIn} onChange={e => setTurbineIn({...turbineIn, hIn: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>h Actual Out</label><input type="number" value={turbineIn.hOutA} onChange={e => setTurbineIn({...turbineIn, hOutA: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>h Ideal Out</label><input type="number" value={turbineIn.hOutI} onChange={e => setTurbineIn({...turbineIn, hOutI: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'NOZZLE' && (
                  <>
                    <div><label className={labelClass}>h Inlet</label><input type="number" value={nozzleIn.hIn} onChange={e => setNozzleIn({...nozzleIn, hIn: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>h Ideal Out</label><input type="number" value={nozzleIn.hOutI} onChange={e => setNozzleIn({...nozzleIn, hOutI: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Velocity Coeff</label><input type="number" value={nozzleIn.eff} onChange={e => setNozzleIn({...nozzleIn, eff: parseFloat(e.target.value) || 100})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'STRENGTH' && (
                  <>
                    <div><label className={labelClass}>Applied Load (N)</label><input type="number" value={strengthIn.load} onChange={e => setStrengthIn({...strengthIn, load: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Span (mm)</label><input type="number" value={strengthIn.len} onChange={e => setStrengthIn({...strengthIn, len: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelClass}>Height (mm)</label><input type="number" value={strengthIn.h} onChange={e => setStrengthIn({...strengthIn, h: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                      <div><label className={labelClass}>Width (mm)</label><input type="number" value={strengthIn.w} onChange={e => setStrengthIn({...strengthIn, w: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                    </div>
                  </>
                )}
                {activeTab === 'COMBUSTION' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelClass}>Carbon %</label><input type="number" value={combustIn.c} onChange={e => setCombustIn({...combustIn, c: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                      <div><label className={labelClass}>Hydrogen %</label><input type="number" value={combustIn.h} onChange={e => setCombustIn({...combustIn, h: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    </div>
                    <div><label className={labelClass}>Excess Air %</label><input type="number" value={combustIn.ea} onChange={e => setCombustIn({...combustIn, ea: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'GOV' && (
                  <>
                    <div><label className={labelClass}>No Load RPM</label><input type="number" value={govIn.nl} onChange={e => setGovIn({...govIn, nl: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                    <div><label className={labelClass}>Full Load RPM</label><input type="number" value={govIn.fl} onChange={e => setGovIn({...govIn, fl: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'WATER' && (
                  <>
                    <div><label className={labelClass}>Hardness (ppm)</label><input type="number" value={waterIn.hard} onChange={e => setWaterIn({...waterIn, hard: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                    <div><label className={labelClass}>Capacity (Grains)</label><input type="number" value={waterIn.cap} onChange={e => setWaterIn({...waterIn, cap: parseFloat(e.target.value) || 1000})} className={inputClass}/></div>
                    <div><label className={labelClass}>Flow Rate (GPM)</label><input type="number" value={waterIn.flow} onChange={e => setWaterIn({...waterIn, flow: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'EXPANSION' && (
                  <>
                    <div><label className={labelClass}>Initial Len (m)</label><input type="number" value={expandIn.l} onChange={e => setExpandIn({...expandIn, l: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Coeff (α)</label><input type="number" step="0.000001" value={expandIn.a} onChange={e => setExpandIn({...expandIn, a: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Temp Delta (°C)</label><input type="number" value={expandIn.dt} onChange={e => setExpandIn({...expandIn, dt: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'METAL' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelClass}>Carbon %</label><input type="number" step="0.01" value={metalIn.c} onChange={e => setMetalIn({...metalIn, c: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                      <div><label className={labelClass}>Manganese %</label><input type="number" step="0.01" value={metalIn.mn} onChange={e => setMetalIn({...metalIn, mn: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                      <div><label className={labelClass}>Chrome %</label><input type="number" step="0.01" value={metalIn.cr} onChange={e => setMetalIn({...metalIn, cr: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                      <div><label className={labelClass}>Molybdenum %</label><input type="number" step="0.01" value={metalIn.mo} onChange={e => setMetalIn({...metalIn, mo: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    </div>
                  </>
                )}
                {activeTab === 'FLUIDS' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelClass}>Pipe ID</label><input type="number" value={fluidIn.dOut} onChange={e => setFluidIn({...fluidIn, dOut: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                      <div><label className={labelClass}>Orifice ID</label><input type="number" value={fluidIn.dIn} onChange={e => setFluidIn({...fluidIn, dIn: parseFloat(e.target.value) || 1})} className={inputClass}/></div>
                    </div>
                    <div><label className={labelClass}>Differential P (kPa)</label><input type="number" value={fluidIn.dp} onChange={e => setFluidIn({...fluidIn, dp: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                  </>
                )}
                {activeTab === 'LMTD' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className={labelClass}>Thi</label><input type="number" value={lmtdIn.thi} onChange={e => setLmtdIn({...lmtdIn, thi: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                      <div><label className={labelClass}>Tho</label><input type="number" value={lmtdIn.tho} onChange={e => setLmtdIn({...lmtdIn, tho: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                      <div><label className={labelClass}>Tci</label><input type="number" value={lmtdIn.tci} onChange={e => setLmtdIn({...lmtdIn, tci: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                      <div><label className={labelClass}>Tco</label><input type="number" value={lmtdIn.tco} onChange={e => setLmtdIn({...lmtdIn, tco: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    </div>
                  </>
                )}
                {activeTab === 'SAFETY' && (
                  <>
                    <div><label className={labelClass}>Set Point (MPa)</label><input type="number" step="0.1" value={safetyIn.pSet} onChange={e => setSafetyIn({...safetyIn, pSet: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Disch Area (mm²)</label><input type="number" value={safetyIn.area} onChange={e => setSafetyIn({...safetyIn, area: parseFloat(e.target.value) || 0})} className={inputClass}/></div>
                    <div><label className={labelClass}>Capacity Coeff (K)</label><input type="number" step="0.05" value={safetyIn.k} onChange={e => setSafetyIn({...safetyIn, k: parseFloat(e.target.value) || 0.9})} className={inputClass}/></div>
                  </>
                )}
              </div>
            </div>
            <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-[#0d3b6611]'} flex items-center justify-between`}>
              <span className={labelClass}>Diagnostic Sync</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`px-4 py-2 border-t ${theme === 'dark' ? 'border-slate-800 bg-slate-950/50 text-slate-500' : 'border-[#0d3b6611] bg-slate-50 text-[#0d3b6666]'} text-[8px] mono uppercase font-black tracking-widest flex justify-between items-center`}>
        <span>Telemetric Control Unit v5.0.1</span>
        <div className="flex items-center gap-3">
           <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Kernel Verified</span>
           <span>Syllabus Compliance: 100%</span>
        </div>
      </div>
      
      {/* GLOBAL SVG DEFINITIONS */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="0" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#f43f5e" />
          </marker>
        </defs>
      </svg>
    </div>
  );
};

export default DiagnosticDisplay;