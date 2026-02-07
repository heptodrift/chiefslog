import { RankineState, AffinityState } from '../types';

export const solveRankine = (pHigh: number, tHigh: number, pLow: number): RankineState => {
  const h1 = 3000 + (tHigh - 400) * 2.1 - (pHigh - 4) * 8.5;
  const h2 = 2100 + (pLow * 1.6); 
  const h3 = 150 + (pLow - 10) * 0.45;
  const v_f = 0.00101; 
  const wPump = v_f * (pHigh * 1000 - pLow);
  const h4 = h3 + wPump;
  const wTurb = h1 - h2;
  const qIn = h1 - h4;
  const efficiency = ((wTurb - wPump) / qIn) * 100;

  return { pHigh, tHigh, pLow, h1, h2, h3, h4, wTurb, wPump, qIn, efficiency };
};

export const solveSteamTable = (P: number, T: number) => {
  // P in MPa, T in Celsius
  const Tsat = 179.9 * Math.pow(P, 0.23);
  const isSuperheated = T > Tsat;
  let h: number, s: number, v: number;

  if (isSuperheated) {
    h = 2501 + (1.88 * T) + (P * 0.5);
    s = 6.4 + (0.012 * T) - (0.48 * Math.log(P || 0.1));
    v = (0.4615 * (T + 273.15)) / (P * 1000 || 1);
  } else {
    h = 4.187 * T;
    s = 4.187 * Math.log((T + 273.15) / 273.15);
    v = 0.00101 + (T * 0.000005);
  }
  return { h, s, v, Tsat, isSuperheated };
};

export const solveAffinity = (
  rpm1: number, rpm2: number, flow1: number, head1: number, power1: number, d1: number = 1, d2: number = 1
): AffinityState => {
  const nRatio = rpm2 / rpm1;
  const dRatio = d2 / d1;
  return {
    rpm1, rpm2, flow1, head1, power1, d1, d2,
    flow2: flow1 * nRatio * dRatio,
    head2: head1 * Math.pow(nRatio, 2) * Math.pow(dRatio, 2),
    power2: power1 * Math.pow(nRatio, 3) * Math.pow(dRatio, 3)
  };
};

export const solveAsmeHead = (P: number, D: number, S: number, E: number) => {
  const R = D / 2;
  const t = (P * R) / (S * E - 0.6 * P);
  return { thickness: t };
};

export const solveElectrical = (V: number, I: number, cosPhi: number) => {
  const truePower = V * I * cosPhi * Math.sqrt(3) / 1000;
  const apparentPower = V * I * Math.sqrt(3) / 1000;
  const reactivePower = Math.sqrt(Math.pow(apparentPower, 2) - Math.pow(truePower, 2));
  return { kw: truePower, kva: apparentPower, kvar: reactivePower };
};

export const solveRefrigeration = (flow: number, hIn: number, hOut: number, work: number) => {
  const re = hIn - hOut;
  const capacityTR = (flow * re) / 3.517;
  const cop = (flow * re) / (work || 1);
  return { capacityTR, cop, re };
};

export const solveCompression = (p1: number, p2: number, vDisp: number, vAct: number) => {
  const ratio = p2 / p1;
  const volEff = (vAct / (vDisp || 1)) * 100;
  return { ratio, volEff };
};

export const solveGovernor = (noLoad: number, fullLoad: number) => {
  const droop = ((noLoad - fullLoad) / fullLoad) * 100;
  return { noLoadSpeed: noLoad, fullLoadSpeed: fullLoad, droopPercent: droop };
};

export const solveTurbineEff = (hIn: number, hOutActual: number, hOutIdeal: number) => {
  const isentropicWork = hIn - hOutIdeal;
  const actualWork = hIn - hOutActual;
  const efficiency = (actualWork / isentropicWork) * 100;
  return { efficiency, actualWork };
};

export const solveNozzle = (hIn: number, hOutIdeal: number, efficiency: number) => {
  const dhIsen = hIn - hOutIdeal;
  const dhAct = dhIsen * (efficiency / 100);
  const velocity = Math.sqrt(2000 * dhAct); 
  return { hOutAct: hIn - dhAct, velocity, dhIsen, dhAct };
};

export const solveStrength = (load: number, length: number, width: number, height: number) => {
  const M = (load * length) / 4;
  const I = (width * Math.pow(height, 3)) / 12;
  const y = height / 2;
  const stress = (M * y) / I;
  return { stress };
};

export const solveWater = (hardness: number, capacity: number, flow: number) => {
  const volumeToExhaust = capacity / (hardness / 17.1); 
  const timeHours = volumeToExhaust / (flow || 1);
  return { volumeToExhaust, timeHours };
};

export const solveExpansion = (length: number, alpha: number, deltaT: number) => {
  const expansion = length * alpha * deltaT;
  return { expansion };
};

export const solveCombustionAir = (carbon: number, hydrogen: number, excessAir: number) => {
  const theoAir = (11.5 * carbon / 100) + (34.5 * (hydrogen / 100));
  const totalAir = theoAir * (1 + (excessAir / 100));
  return { theoAir, totalAir };
};

export const solveCarbonEquivalent = (c: number, mn: number, cr: number, mo: number, v: number, ni: number, cu: number) => {
  const ce = c + (mn / 6) + ((cr + mo + v) / 5) + ((ni + cu) / 15);
  return { ce };
};

export const solveOrificeFlow = (dOuter: number, dInner: number, dp: number, rho: number) => {
  const beta = dInner / dOuter;
  const cd = 0.61;
  const areaInner = (Math.PI * Math.pow(dInner / 1000, 2)) / 4;
  const flow = cd * areaInner * Math.sqrt((2 * dp * 1000) / (rho * (1 - Math.pow(beta, 4))));
  return { flowKgs: flow, flowLpm: (flow / (rho || 1)) * 60000 };
};

export const solveLMTD = (thi: number, tho: number, tci: number, tco: number) => {
  const dt1 = thi - tco;
  const dt2 = tho - tci;
  let lmtd = 0;
  if (Math.abs(dt1 - dt2) < 0.01) {
    lmtd = (dt1 + dt2) / 2;
  } else {
    lmtd = (dt1 - dt2) / Math.log(Math.abs(dt1 / dt2) || 1);
  }
  return { lmtd, dt1, dt2 };
};

export const solveSafetyValve = (pSet: number, area: number, k: number) => {
  const pAbs = pSet + 0.101; 
  const capacity = 5.25 * (pAbs * 10) * area * k; 
  return { capacityKgs: capacity / 3600, capacityKgh: capacity };
};

export const getRandomInputs = () => {
  return {
    pHigh: [6, 8, 10, 12][Math.floor(Math.random() * 4)],
    tHigh: [450, 500, 550][Math.floor(Math.random() * 3)],
    pLow: [10, 20, 30][Math.floor(Math.random() * 3)]
  };
};