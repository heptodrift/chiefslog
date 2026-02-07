/**
 * LOCAL CHIEF ENGINE - OFFLINE OPTIMIZED
 * Guaranteed performance on local hardware with zero network calls.
 */

export const getChiefAnalysis = async (question: string, userAnswer: string, isCorrect: boolean, explanation: string) => {
  const correctMessages = [
    "Precise. You've clearly spent time in the steam tables.",
    "Correct. A 2nd Class engineer needs this intuition.",
    "Validated. Your jurisdictional understanding is sharp.",
    "Spot on. Engineering is a game of precision.",
    "Solid analysis. That's the thinking we need in the control room."
  ];

  const incorrectMessages = [
    "Critical error. Relief valves would be lifting by now.",
    "Sloppy math leads to expensive repairs. Re-examine the laws.",
    "Incorrect. Consult the code books before committing.",
    "Negative. You've neglected the boundary conditions.",
    "That's a 3rd Class mistake. Step up your diagnostic speed."
  ];

  const pool = isCorrect ? correctMessages : incorrectMessages;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const getChiefTip = async (paper: string) => {
  const tips: Record<string, string[]> = {
    '2A1': ["Entropy is the enemy. Watch your heat sink temperatures.", "Rankine cycles live and die by pump work."],
    '2A2': ["Carbon is a double-edged sword: strength vs weldability.", "Fatigue doesn't show on a pressure test."],
    '2A3': ["Refrigeration is just heat moving the wrong way.", "Cooling towers are the lungs of the plant."],
    '2B1': ["The code is written in blood. Every rule has a reason.", "ASME Section I for the boiler, B31.1 for steam lines."],
    '2B2': ["Governors aren't just for speed; they're for grid stability.", "Turbine blades are expensive. Watch the vibration."],
    '2B3': ["Affinity laws are the cheat code for pump scaling.", "Cavitation feels like a paycheck for the repair crew."]
  };

  const match = paper.match(/2[AB][123]/);
  const key = match ? match[0] : '2A1';
  
  const paperTips = tips[key] || ["Safety is the first law of engineering."];
  return paperTips[Math.floor(Math.random() * paperTips.length)];
};