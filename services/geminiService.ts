import { GoogleGenAI, Type, Schema, Chat } from "@google/genai";
import { AnalysisResult, DailyMetric } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    riskScore: { type: Type.NUMBER, description: "A score from 0 to 100 indicating stress level." },
    riskLevel: { type: Type.STRING, enum: ["Relaxed", "Balanced", "Stressed", "Overloaded"] },
    emotionalDebt: { type: Type.NUMBER, description: "Estimated percentage of hidden stress accumulation (0-100)." },
    keyDrivers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of 2-3 main reasons (e.g., 'Not enough sleep', 'Too much multitasking')."
    },
    recommendation: { type: Type.STRING, description: "A simple, practical tip for the user (e.g., 'Take a walk', 'Turn off phone')." },
    summary: { type: Type.STRING, description: "A 2-sentence friendly summary of how they are doing." }
  },
  required: ["riskScore", "riskLevel", "emotionalDebt", "keyDrivers", "recommendation", "summary"]
};

export const analyzeBurnoutRisk = async (
  journalEntry: string,
  currentMetrics: { workHours: number; sleepHours: number; meetingDensity: number },
  mood: string,
  recentHistory: DailyMetric[]
): Promise<AnalysisResult> => {
  
  const model = "gemini-3-flash-preview";
  
  const historySummary = recentHistory.slice(-5).map(d => 
    `Date: ${d.date}, Work: ${d.workHours}h, Sleep: ${d.sleepHours}h, Mood: ${d.userMood || 'Unknown'}, Stress: ${d.burnoutRiskScore}`
  ).join('\n');

  const prompt = `
    You are 'Quiet Care', a helpful, neighborly AI assistant.
    Your goal is to help regular people catch stress before it becomes exhaustion.
    
    Context: Stress builds up slowly. We want to catch it early.
    
    Data to Analyze:
    1. Current Inputs: Work/Chore Hours: ${currentMetrics.workHours}, Sleep Hours: ${currentMetrics.sleepHours}, Busy-ness Level (1-10): ${currentMetrics.meetingDensity}.
    2. Self-Reported Mood: ${mood}
    3. Journal Entry: "${journalEntry}"
    4. Recent History (Last 5 days):
    ${historySummary}

    Task:
    Analyze the journal tone, their self-reported mood, and their physical habits.
    Use simple, everyday language. Avoid corporate buzzwords or medical jargon.
    If they report feeling 'Stressed' or 'Tired' explicitly, take that seriously.
    If sleep is low (<6h) and work is high (>9h), increase risk score.
    
    Return a JSON object assessing their "Hidden Stress" for the next few weeks.
  `;

  try {
    const response = await genAI.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "You are a kind, practical, and simple AI assistant. Speak like a wise friend, not a doctor or a boss."
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");
    
    return JSON.parse(resultText) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      riskScore: 50,
      riskLevel: "Balanced",
      emotionalDebt: 50,
      keyDrivers: ["Connection Issue"],
      recommendation: "We couldn't reach the server. Just take a deep breath for now.",
      summary: "System is momentarily offline."
    };
  }
};

export const createSentinelChat = (analysis: AnalysisResult | null, userName: string = "Friend"): Chat => {
  const context = analysis 
      ? `User's latest status is ${analysis.riskLevel} (Score: ${analysis.riskScore}). Main reasons: ${analysis.keyDrivers.join(', ')}. Tip was: ${analysis.recommendation}. Summary: ${analysis.summary}`
      : "User hasn't checked in recently.";
      
  return genAI.chats.create({
      model: "gemini-3-flash-preview",
      config: {
          systemInstruction: `You are Quiet Care, a supportive, non-judgmental friend. 
          Your user is named ${userName}.
          Your goal is to help ${userName} vent, relax, or find simple solutions to stress.
          
          Guidelines:
          - Be concise (2-3 sentences).
          - Use simple, everyday words.
          - Don't give medical advice.
          - Ask gentle questions.
          
          Current Context: ${context}
          `
      }
  });
};