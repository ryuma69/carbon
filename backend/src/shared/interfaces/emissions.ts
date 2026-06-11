export interface CarbonLog {
  id: string;
  userId: string;
  category: 'Utilities' | 'Transport' | 'Diet' | 'Shopping';
  value: number; // e.g. miles driven, kWh used, days, spend dollars
  unit: string;  // e.g. miles, kWh, therms, days, USD
  emissionsKg: number; // calculated CO2 in kg
  createdAt: string;
}

export interface GridEmissionsForecast {
  hour: number; // 0-23
  emissionsIntensityFactor: number; // kg CO2e / kWh
}
