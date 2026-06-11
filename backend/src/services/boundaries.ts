import { CarbonLog, UserProfile, GridEmissionsForecast, ExplainableRecommendation } from '../shared/index.js';

export interface ICarbonCalculatorService {
  calculateEmissions(log: Omit<CarbonLog, 'id' | 'userId' | 'createdAt' | 'emissionsKg'>): number;
  identifyMajorSources(userId: string): Promise<Record<string, { emissions: number; percent: number; isExceeded: boolean }>>;
  predictTrend(userId: string): Promise<{ trendSlope: number; annualProjectedKg: number; budgetDepletionDate?: Date }>;
  getGridForecast(zipCode: string): Promise<GridEmissionsForecast[]>;
  recommendBestEnergyHour(zipCode: string): Promise<{ targetHour: number; emissionsReductionEstimateKg: number }>;
}

export interface IRecommendationEngine {
  generateRecommendations(profile: UserProfile): Promise<ExplainableRecommendation[]>;
  adjustBehavioralWeights(profile: UserProfile, actionId: string, actionType: 'complete' | 'skip'): Promise<UserProfile>;
}

export interface IEcoCoachService {
  processChatMessage(userId: string, history: any[], message: string): Promise<{ text: string; actionSuggestion?: any }>;
  parseUtilityBill(userId: string, fileBuffer: Buffer, mimeType: string): Promise<{ utilityType: string; amount: number; kwhUsed?: number; gasThermsUsed?: number }>;
}
