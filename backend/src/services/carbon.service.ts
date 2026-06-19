import { CarbonLog, GridEmissionsForecast } from '../shared/index.js';
import { ICarbonCalculatorService } from '../services/boundaries.js'; // Let's define interfaces in boundaries
import { CarbonRepository } from '../repositories/carbon.repository.js';

const carbonRepo = new CarbonRepository();

// Local copy of interface for safety
export interface ICarbonCalculator {
  calculateEmissions(log: Omit<CarbonLog, 'id' | 'userId' | 'createdAt' | 'emissionsKg'>): number;
}

export class CarbonCalculatorService implements ICarbonCalculatorService {
  calculateEmissions(log: Omit<CarbonLog, 'id' | 'userId' | 'createdAt' | 'emissionsKg'>): number {
    const { category, value, unit } = log;

    switch (category) {
      case 'Transport':
        // value is miles
        if (unit.toLowerCase() === 'miles' || unit.toLowerCase() === 'mile') {
          return value * 0.35; // average gasoline vehicle kg/mile
        } else if (unit.toLowerCase() === 'transit_miles') {
          return value * 0.09; // train/bus average
        }
        return value * 0.35;

      case 'Diet':
        // value is number of days
        const dietType = unit.toLowerCase();
        let factor = 5.6; // average omnivore
        if (dietType === 'vegan') factor = 2.5;
        else if (dietType === 'vegetarian') factor = 3.8;
        else if (dietType === 'pescatarian') factor = 4.5;
        else if (dietType === 'omnivore') factor = 5.6;
        else if (dietType === 'heavy_meat') factor = 7.2;
        return value * factor;

      case 'Utilities':
        // value is kWh or therms
        if (unit.toLowerCase() === 'kwh') {
          return value * 0.37; // default grid average (370g/kWh)
        } else if (unit.toLowerCase() === 'therms' || unit.toLowerCase() === 'therm') {
          return value * 5.3; // natural gas per therm
        }
        return value * 0.37;

      case 'Shopping':
        // value is USD spend
        return value * 0.45; // average spend footprint multiplier

      default:
        return 0;
    }
  }

  async identifyMajorSources(userId: string): Promise<Record<string, { emissions: number; percent: number; isExceeded: boolean }>> {
    const averages = await carbonRepo.getCategoryAverages(userId);
    const total = Object.values(averages).reduce((acc, curr) => acc + curr, 0);

    const benchmarks: Record<string, number> = {
      Utilities: 300, // Monthly benchmark kg
      Transport: 400,
      Diet: 150,
      Shopping: 100
    };

    const breakdown: Record<string, { emissions: number; percent: number; isExceeded: boolean }> = {};
    for (const [cat, val] of Object.entries(averages)) {
      breakdown[cat] = {
        emissions: val,
        percent: total > 0 ? (val / total) * 100 : 0,
        isExceeded: val > (benchmarks[cat] || 200)
      };
    }

    return breakdown;
  }

  async predictTrend(userId: string): Promise<{ trendSlope: number; annualProjectedKg: number; budgetDepletionDate?: Date }> {
    const hasLogs = await carbonRepo.hasAnyLogs(userId);
    
    // Default fallback
    if (!hasLogs) {
      return { trendSlope: 0, annualProjectedKg: 2400 };
    }

    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const logsYTD = await carbonRepo.getLogsByUser(userId, yearStart);

    // Group logs by week of year to calculate slope
    const weeklyEmissions: Record<number, number> = {};
    logsYTD.forEach(log => {
      const date = new Date(log.createdAt);
      const week = Math.ceil((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      weeklyEmissions[week] = (weeklyEmissions[week] || 0) + log.emissionsKg;
    });

    const weeks = Object.keys(weeklyEmissions).map(Number).sort((a, b) => a - b);
    const emissions = weeks.map(w => weeklyEmissions[w]);

    let trendSlope = 0;
    if (weeks.length >= 2) {
      const n = weeks.length;
      const sumX = weeks.reduce((a, b) => a + b, 0);
      const sumY = emissions.reduce((a, b) => a + b, 0);
      const sumXY = weeks.reduce((acc, w, i) => acc + w * emissions[i], 0);
      const sumX2 = weeks.reduce((a, b) => a + b * b, 0);
      trendSlope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    // Annual Projection using last 28 days of logs
    const fourWeeksAgo = new Date(new Date().getTime() - 28 * 24 * 60 * 60 * 1000);
    const last4WeeksLogs = await carbonRepo.getLogsByUser(userId, fourWeeksAgo);

    const monthlySum = last4WeeksLogs.reduce((acc, log) => acc + log.emissionsKg, 0);
    const weeklyAverage = last4WeeksLogs.length > 0 ? monthlySum / 4 : 50; // default weekly average of 50kg

    const daysYTD = Math.max(1, Math.ceil((new Date().getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)));
    const remainingWeeks = (365 - daysYTD) / 7;

    const emissionsYTD = logsYTD.reduce((acc, log) => acc + log.emissionsKg, 0);
    const annualProjectedKg = emissionsYTD + (weeklyAverage * remainingWeeks);

    // Budget depletion date (Budget Limit = 4500kg per year)
    const annualBudget = 4500;
    let budgetDepletionDate: Date | undefined;
    if (weeklyAverage > 0 && annualProjectedKg > annualBudget) {
      const remainingBudget = annualBudget - emissionsYTD;
      const weeksToExhaustion = remainingBudget / (weeklyAverage + trendSlope);
      if (weeksToExhaustion > 0 && weeksToExhaustion < 52) {
        budgetDepletionDate = new Date();
        budgetDepletionDate.setDate(budgetDepletionDate.getDate() + (weeksToExhaustion * 7));
      }
    }

    return { trendSlope, annualProjectedKg, budgetDepletionDate };
  }

  async getGridForecast(zipCode: string): Promise<GridEmissionsForecast[]> {
    // Standard mock solar/wind grid cycles based on ZIP location baseline seed
    const seed = zipCode ? parseInt(zipCode.substring(0, 1)) || 4 : 4;
    const baseVal = 0.3 + (seed * 0.03); // baseline varies by zone

    const forecast: GridEmissionsForecast[] = [];
    for (let hour = 0; hour < 24; hour++) {
      let variance = 0;
      if (hour >= 17 && hour <= 21) {
        variance = 0.15; // peak evening load (coal/gas peak plants)
      } else if (hour >= 11 && hour <= 15) {
        variance = -0.12; // peak daylight (solar generation input)
      } else if (hour >= 1 && hour <= 5) {
        variance = -0.08; // late night wind baseline
      }
      forecast.push({
        hour,
        emissionsIntensityFactor: Math.max(0.1, Number((baseVal + variance).toFixed(3)))
      });
    }

    return forecast;
  }

  async recommendBestEnergyHour(zipCode: string): Promise<{ targetHour: number; emissionsReductionEstimateKg: number }> {
    const forecast = await this.getGridForecast(zipCode);
    
    let lowestHour = 12; // default midday solar
    let lowestIntensity = 999;
    
    forecast.forEach(item => {
      if (item.emissionsIntensityFactor < lowestIntensity) {
        lowestIntensity = item.emissionsIntensityFactor;
        lowestHour = item.hour;
      }
    });

    const averageIntensity = forecast.reduce((acc, item) => acc + item.emissionsIntensityFactor, 0) / 24;
    
    // Assumes typical laundry load of 5 kWh
    const savings = (averageIntensity - lowestIntensity) * 5;

    return {
      targetHour: lowestHour,
      emissionsReductionEstimateKg: Number(Math.max(0.1, savings).toFixed(2))
    };
  }
}
