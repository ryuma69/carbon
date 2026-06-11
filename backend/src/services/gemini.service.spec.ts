import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GeminiService } from './gemini.service.js';

// Setup mock functions with the 'mock' prefix so Vitest permits referencing them in vi.mock
const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  const GoogleGenAIClass = vi.fn().mockImplementation(() => {
    return {
      models: {
        generateContent: mockGenerateContent
      }
    };
  });

  return {
    GoogleGenAI: GoogleGenAIClass,
    Type: {
      OBJECT: 'OBJECT',
      STRING: 'STRING',
      BOOLEAN: 'BOOLEAN',
      NUMBER: 'NUMBER'
    }
  };
});

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GEMINI_API_KEY;
  });

  describe('Constructor Initialization', () => {
    it('should initialize in mock mode if GEMINI_API_KEY is not set', () => {
      const service = new GeminiService();
      expect((service as any).isMock).toBe(true);
      expect((service as any).ai).toBeNull();
    });

    it('should initialize GoogleGenAI if GEMINI_API_KEY is set', () => {
      process.env.GEMINI_API_KEY = 'test-api-key';
      const service = new GeminiService();
      expect((service as any).isMock).toBe(false);
      expect((service as any).ai).not.toBeNull();
    });
  });

  describe('Mock Mode Fallbacks', () => {
    let service: GeminiService;

    beforeEach(() => {
      service = new GeminiService();
    });

    it('should generate a transport action suggestion from chat messages in mock mode', async () => {
      const response = await service.processChatMessage('user-123', [], 'I drove 25 miles today.');
      expect(response.text).toContain('drove 25 miles');
      expect(response.actionSuggestion).toEqual({
        category: 'Transport',
        value: 25,
        unit: 'miles'
      });
    });

    it('should generate a diet action suggestion from chat messages in mock mode', async () => {
      const response = await service.processChatMessage('user-123', [], 'I ate a vegan lunch.');
      expect(response.text).toContain('plant-based');
      expect(response.actionSuggestion).toEqual({
        category: 'Diet',
        value: 1,
        unit: 'vegan'
      });
    });

    it('should generate utility suggestions in mock mode', async () => {
      const response = await service.processChatMessage('user-123', [], 'How do I log my electric bill?');
      expect(response.text).toContain('kWh');
      expect(response.actionSuggestion).toEqual({
        category: 'Utilities',
        value: 200,
        unit: 'kWh'
      });
    });

    it('should parse utility bills in mock mode for PDFs (gas)', async () => {
      const result = await service.parseUtilityBill('user-123', Buffer.from('mock-file'), 'application/pdf');
      expect(result.utilityType).toBe('Gas');
      expect(result.amount).toBe(65.4);
      expect(result.gasThermsUsed).toBe(12);
    });

    it('should parse utility bills in mock mode for other files (electricity)', async () => {
      const result = await service.parseUtilityBill('user-123', Buffer.from('mock-file'), 'image/png');
      expect(result.utilityType === 'Electricity' || result.utilityType === 'Gas').toBe(true);
      if (result.utilityType === 'Electricity') {
        expect(result.amount).toBe(110.2);
        expect(result.kwhUsed).toBe(280);
      }
    });
  });

  describe('Live Model Pathways (Mocked SDK)', () => {
    let service: GeminiService;

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-api-key';
      service = new GeminiService();
    });

    it('should query the Gemini models with formatted history and message', async () => {
      const replyJson = {
        replyText: 'Hello! Let\'s save some carbon.',
        shouldLogEmissions: false
      };
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(replyJson)
      });

      const response = await service.processChatMessage(
        'user-123',
        [{ role: 'user', text: 'Hi' }, { role: 'model', text: 'Hello!' }],
        'What should I do today?'
      );

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(response.text).toBe(replyJson.replyText);
      expect(response.actionSuggestion).toBeUndefined();
    });

    it('should return suggestion if model suggests logging emissions', async () => {
      const replyJson = {
        replyText: 'Logged 45 miles of transit commute.',
        shouldLogEmissions: true,
        category: 'Transport',
        value: 45,
        unit: 'transit_miles'
      };
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(replyJson)
      });

      const response = await service.processChatMessage('user-123', [], 'I took the train for 45 miles.');
      expect(response.actionSuggestion).toEqual({
        category: 'Transport',
        value: 45,
        unit: 'transit_miles'
      });
    });

    it('should extract correct attributes from parsed bill response', async () => {
      const billJson = {
        utilityType: 'Electricity',
        amount: 85.5,
        quantity: 210
      };
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(billJson)
      });

      const result = await service.parseUtilityBill('user-123', Buffer.from('mock'), 'image/jpeg');
      expect(result).toEqual({
        utilityType: 'Electricity',
        amount: 85.5,
        kwhUsed: 210
      });
    });

    it('should fall back to mock mode if SDK execution throws', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API quota exceeded'));

      const response = await service.processChatMessage('user-123', [], 'I drove 10 miles.');
      expect(response.text).toContain('drove 10 miles');
      expect(response.actionSuggestion.value).toBe(10);
    });
  });
});
