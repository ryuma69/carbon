export interface UserProfile {
  id: string;
  userId: string;
  location: {
    zipCode: string;
    region: string;
  };
  housing: {
    type: 'apartment' | 'house';
    ownership: 'rent' | 'own';
    heatingType: 'electric' | 'gas' | 'oil';
  };
  transport: {
    hasEV: boolean;
    hasGasCar: boolean;
    commuteDistanceMiles: number;
    primaryMode: 'driving' | 'transit' | 'walking_biking';
  };
  diet: 'vegan' | 'vegetarian' | 'pescatarian' | 'omnivore' | 'heavy_meat';
  historicalAverages: {
    utilityMonthlyKg: number;
    transportMonthlyKg: number;
    dietMonthlyKg: number;
    shoppingMonthlyKg: number;
  };
  behavior: {
    completedActions: string[];
    skippedActions: string[];
    consecutiveLogDays: number;
  };
  preferences: {
    focusArea: 'general' | 'cost_saving' | 'carbon_only' | 'dietary';
  };
}

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  profile?: UserProfile;
}
