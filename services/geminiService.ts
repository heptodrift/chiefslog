
import { GoogleGenAI } from "@google/genai";

/**
 * THE CHIEF'S NEURAL CORE - Powered by Gemini 3 Flash
 * Provides real-time engineering mentorship and diagnostic debriefs.
 */

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getChiefAnalysis = async (
  question: string, 
  userAnswer: string, 
  isCorrect: boolean, 
  explanation: string,
  topic: string
) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Question Context: ${question}
User selected: ${userAnswer}
Status: ${isCorrect ? 'Correct' : 'Incorrect'}
Reference Material: ${explanation}
Topic Area: ${topic}`,
      config: {
        systemInstruction: `You are the "Chief Engineer" providing a requested technical debrief. 
        Your tone is veteran, technical, and authoritative. 
        Analyze WHY the user was right or wrong. 
        Focus on the physical principles (heat transfer, stress/strain, legislation logic).
        Keep it under 50 words. Use formatting like 'MAWP', 'Rankine', or 'ASME Section I' to emphasize technicality.`,
        temperature: 0.7,
      },
    });

    return response.text || "Analysis link failed. Check your code books.";
  } catch (error) {
    console.error("Chief Engine Offline:", error);
    return "Diagnostic signal lost. Re-evaluate using standard Rankine tables.";
  }
};

export const getChiefTip = async (paper: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a quick 'Chief's Tip' for a student studying for their ${paper} exam.`,
      config: {
        systemInstruction: "Provide a one-sentence, highly technical tip for 2nd Class Power Engineering. Be brief and professional.",
        temperature: 0.9,
      },
    });
    return response.text || "Safety is the first law of the plant.";
  } catch {
    return "Check your blowdown valves daily.";
  }
};
