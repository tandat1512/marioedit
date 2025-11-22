
import { GoogleGenAI } from "@google/genai";

export const DEFAULT_GEMINI_SCENE_MODEL = "gemini-2.5-flash-image";

interface GenerateSceneParams {
  apiKey?: string;
  model: string;
  prompt: string;
  base64Image: string;
  mimeType: string;
}

export const generateSceneImage = async ({ model, prompt, base64Image, mimeType }: GenerateSceneParams) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Image } },
        { text: prompt }
      ]
    }
  });

  let dataUrl = "";
  if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }
  }
  
  if (!dataUrl) throw new Error("No image generated");

  return { dataUrl };
};
