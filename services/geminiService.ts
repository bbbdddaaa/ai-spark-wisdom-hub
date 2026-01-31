
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client. 
// Guidelines: Use a named parameter { apiKey: process.env.API_KEY }.
// The key is handled externally and must not be requested from the user.

export const analyzePost = async (title: string, content: string) => {
  try {
    // Create a new GoogleGenAI instance right before making an API call 
    // to ensure it always uses the most up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this AI-related post and provide 3 relevant short tags and a one-sentence summary to make it more appealing.
      Title: ${title}
      Content: ${content}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of 3 short tags.'
            },
            summary: {
              type: Type.STRING,
              description: 'A one-sentence summary.'
            }
          },
          required: ["tags", "summary"]
        }
      }
    });

    // Access the .text property directly (it is not a method).
    const text = response.text;
    return JSON.parse(text || '{}');
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return { tags: ['AI', 'Guide', 'Story'], summary: 'Sharing my AI journey with the world.' };
  }
};

export const suggestSparkRewards = async (content: string) => {
  // A hypothetical feature where AI evaluates the quality and suggests a reward multiplier.
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Rate the educational value of this AI sharing content on a scale of 1-10. Return only the number.
      Content: ${content}`,
    });
    // Access the .text property directly.
    const text = response.text;
    return parseInt(text?.trim() || '5') || 5;
  } catch (error) {
    return 5;
  }
};
