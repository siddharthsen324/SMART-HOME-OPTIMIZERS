
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SYSTEM_PROMPTS } from "../constants";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async scanFurniture(base64Image: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: SYSTEM_PROMPTS.FURNITURE_SCANNER }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING },
            dimensions: {
              type: Type.OBJECT,
              properties: {
                width: { type: Type.NUMBER },
                depth: { type: Type.NUMBER },
                height: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }

  async scanRoom(base64Image: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: SYSTEM_PROMPTS.ROOM_SCANNER }
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            width: { type: Type.NUMBER },
            depth: { type: Type.NUMBER }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  }

  async optimizeLayout(roomWidth: number, roomDepth: number, items: any[]) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    // Create a simplified version of items for the prompt to reduce token usage and noise
    const simplifiedItems = items.map(item => ({
      id: item.id,
      name: item.name,
      w: item.dimensions.width,
      d: item.dimensions.depth
    }));

    const promptText = `
      Task: Optimize furniture layout for a room size ${roomWidth}x${roomDepth}cm.
      Items to place: ${JSON.stringify(simplifiedItems)}
      
      Instructions:
      1. Use the EXACT "id" for each item.
      2. Set "x" and "y" so items stay within bounds (0 to ROOM_SIZE - item_size).
      3. Set "rotation" to 0, 90, 180, or 270.
      4. Minimize overlaps and maximize central walking space.
      5. Return a JSON array of objects.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "The original item ID" },
              x: { type: Type.NUMBER, description: "X coordinate in cm" },
              y: { type: Type.NUMBER, description: "Y coordinate in cm" },
              rotation: { type: Type.NUMBER, description: "Rotation in degrees" }
            },
            required: ["id", "x", "y", "rotation"]
          }
        }
      }
    });

    const text = response.text || '[]';
    return JSON.parse(text);
  }

  async askChatbot(message: string, history: any[] = []) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: SYSTEM_PROMPTS.CHATBOT,
        tools: [{ googleSearch: {} }]
      }
    });
    
    const response: GenerateContentResponse = await chat.sendMessage({ message });
    return {
      text: response.text,
      sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  }
}

export const geminiService = new GeminiService();
