import { GoogleGenAI, Type } from '@google/genai';
import { IEcoCoachService } from './boundaries.js';

export class GeminiService implements IEcoCoachService {
  private ai: GoogleGenAI | null = null;
  private isMock = true;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim() !== '') {
      this.ai = new GoogleGenAI({ apiKey });
      this.isMock = false;
      console.log('Gemini Service initialized with API Key.');
    } else {
      console.warn('GEMINI_API_KEY not found or empty. EcoLens will run in MOCK mode.');
    }
  }

  async processChatMessage(userId: string, history: any[], message: string): Promise<{ text: string; actionSuggestion?: any }> {
    if (this.isMock) {
      return this.getMockChatMessageResponse(message);
    }

    try {
      // Format history to match SDK expectation: [{ role: 'user' | 'model', parts: [{ text: '...' }] }]
      const contents = history.map(item => ({
        role: item.role === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }]
      }));

      // Add user message
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await this.ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction: `You are an expert environmental carbon assistant coach named Eco-Coach. 
Your goal is to help users track, understand, and reduce their carbon footprint. 
Analyze if their message describes an action they want to log (e.g. driving distance, vegetarian meal, utility consumption).
If it describes a loggable event, set shouldLogEmissions to true and provide category, value, and unit in the JSON.
Otherwise, set shouldLogEmissions to false and reply conversationally.
Always respond strictly in JSON matching the specified schema. Keep replies concise and encouraging.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              replyText: { type: Type.STRING },
              shouldLogEmissions: { type: Type.BOOLEAN },
              category: { type: Type.STRING, enum: ['Utilities', 'Transport', 'Diet', 'Shopping'] },
              value: { type: Type.NUMBER },
              unit: { type: Type.STRING }
            },
            required: ['replyText', 'shouldLogEmissions']
          }
        }
      });

      const responseText = response.text || '{}';
      const data = JSON.parse(responseText);

      const result: { text: string; actionSuggestion?: any } = {
        text: data.replyText
      };

      if (data.shouldLogEmissions && data.category && data.value) {
        result.actionSuggestion = {
          category: data.category,
          value: data.value,
          unit: data.unit || this.getDefaultUnitForCategory(data.category)
        };
      }

      return result;
    } catch (error) {
      console.error('Gemini chat processing error, falling back to mock:', error);
      return this.getMockChatMessageResponse(message);
    }
  }

  async parseUtilityBill(userId: string, fileBuffer: Buffer, mimeType: string): Promise<{ utilityType: string; amount: number; kwhUsed?: number; gasThermsUsed?: number }> {
    if (this.isMock) {
      return this.getMockBillParsingResponse(mimeType);
    }

    try {
      const response = await this.ai!.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType
            }
          },
          {
            text: 'Analyze this utility invoice document. Extract the billing category (Electricity, Gas, or Water), the total invoice cost, and the exact quantity of energy units consumed.'
          }
        ],
        config: {
          systemInstruction: 'You are an optical characters parser. Analyze utility invoices and output structural JSON matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              utilityType: { type: Type.STRING, enum: ['Electricity', 'Gas'] },
              amount: { type: Type.NUMBER },
              quantity: { type: Type.NUMBER }
            },
            required: ['utilityType', 'amount', 'quantity']
          }
        }
      });

      const responseText = response.text || '{}';
      const data = JSON.parse(responseText);
      const result: any = {
        utilityType: data.utilityType,
        amount: data.amount
      };

      if (data.utilityType === 'Electricity') {
        result.kwhUsed = data.quantity;
      } else if (data.utilityType === 'Gas') {
        result.gasThermsUsed = data.quantity;
      }

      return result;
    } catch (error) {
      console.error('Gemini OCR parsing error, falling back to mock:', error);
      return this.getMockBillParsingResponse(mimeType);
    }
  }

  private getDefaultUnitForCategory(category: string): string {
    switch (category) {
      case 'Transport': return 'miles';
      case 'Utilities': return 'kWh';
      case 'Diet': return 'days';
      case 'Shopping': return 'USD';
      default: return '';
    }
  }

  private getMockChatMessageResponse(message: string): { text: string; actionSuggestion?: any } {
    const textLower = message.toLowerCase();

    if (textLower.includes('drove') || textLower.includes('drive') || textLower.includes('mile')) {
      const match = textLower.match(/\d+/);
      const miles = match ? parseInt(match[0]) : 15;
      return {
        text: `Awesome! I detected that you drove ${miles} miles. Would you like to log this to your transportation carbon footprint?`,
        actionSuggestion: {
          category: 'Transport',
          value: miles,
          unit: 'miles'
        }
      };
    }

    if (textLower.includes('meatless') || textLower.includes('vegan') || textLower.includes('vegetarian') || textLower.includes('salad')) {
      return {
        text: `Nice job choosing a plant-based option! I can log 1 day of vegetarian meals to your footprint logs. Ready to submit?`,
        actionSuggestion: {
          category: 'Diet',
          value: 1,
          unit: textLower.includes('vegan') ? 'vegan' : 'vegetarian'
        }
      };
    }

    if (textLower.includes('utility') || textLower.includes('electric') || textLower.includes('gas') || textLower.includes('bill')) {
      return {
        text: `To log utility emissions, you can either tell me the exact kWh used (e.g. "I used 250 kWh of electricity") or use the Document Scanner drawer in the sidebar to upload a receipt. For now, would you like to log a mock electric usage of 200 kWh?`,
        actionSuggestion: {
          category: 'Utilities',
          value: 200,
          unit: 'kWh'
        }
      };
    }

    return {
      text: `Hello there! I'm Eco-Coach. I can help you track emissions (e.g. "I drove 25 miles") and give you green action recommendations. What sustainable choices are we mapping today?`
    };
  }

  private getMockBillParsingResponse(mimeType: string): { utilityType: string; amount: number; kwhUsed?: number; gasThermsUsed?: number } {
    // Return mock parsed numbers representing a typical monthly bill
    const isGas = mimeType.includes('pdf') || Math.random() > 0.5;

    if (isGas) {
      return {
        utilityType: 'Gas',
        amount: 65.4,
        gasThermsUsed: 12
      };
    }

    return {
      utilityType: 'Electricity',
      amount: 110.2,
      kwhUsed: 280
    };
  }
}
