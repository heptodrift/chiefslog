export enum Paper {
  P2A1 = '2A1 - ASME I & VIII, Admin, Mechanics',
  P2A2 = '2A2 - Thermodynamics, Metallurgy, Testing',
  P2A3 = '2A3 - Boilers, Pumps, Water Treatment',
  P2B1 = '2B1 - Prime Movers, IC Engines, Piping',
  P2B2 = '2B2 - Control Systems, Fuels, Environmental',
  P2B3 = '2B3 - Electrotechnology, Compression, Refrigeration'
}

export enum CodeBook {
  ASME_I = 'ASME Section I (Power Boilers)',
  ASME_II = 'ASME Section II (Materials)',
  ASME_VIII = 'ASME Section VIII (Pressure Vessels)',
  ASME_IX = 'ASME Section IX (Welding)',
  ASME_B311 = 'ASME B31.1 (Power Piping)',
  CSA_B51 = 'CSA B51 (Boiler/PV Code)',
  API_612 = 'API 612 (Special Purpose Turbines)',
  API_611 = 'API 611 (General Purpose Turbines)',
  NONE = 'Select Source...'
}

export interface Question {
  id: string;
  paper: Paper;
  topic: string;
  type: 'calculation' | 'code_lookup';
  prompt: string;
  options: { [key: string]: string };
  correctKey: string;
  explanation: string;
  requiresCitation: boolean;
  correctCitation?: CodeBook;
}

export interface HistoryEntry {
  questionId: string;
  paper: Paper;
  topic: string;
  isCorrect: boolean;
  timestamp: number;
}

export interface ExamRecord {
  id: string;
  paper: Paper;
  score: number;
  total: number;
  timestamp: number;
  passed: boolean;
}

export interface RankineState {
  pHigh: number;
  tHigh: number;
  pLow: number;
  h1: number;
  h2: number;
  h3: number;
  h4: number;
  wTurb: number;
  wPump: number;
  qIn: number;
  efficiency: number;
}

export interface AffinityState {
  flow1: number;
  head1: number;
  power1: number;
  rpm1: number;
  rpm2: number;
  d1: number;
  d2: number;
  flow2: number;
  head2: number;
  power2: number;
}