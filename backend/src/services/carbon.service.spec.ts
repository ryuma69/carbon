import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CarbonCalculatorService } from './carbon.service.js';

// Use vi.hoisted to ensure these mock variables are initialized when vi.mock is evaluated
const { mockGetCategoryAverages, mockGetLogsByUser, mockHasAnyLogs } = vi.hoisted(() => {
  return {
    mockGetCategoryAverages: vi.fn(),
    mockGetLogsByUser: vi.fn(),
    mockHasAnyLogs: vi.fn()
  };
});

vi.mock('../repositories/carbon.repository.js', () => {
  return {
    CarbonRepository: vi.fn().mockImplementation(() => {
      return {
        getCategoryAverages: mockGetCategoryAverages,
        getLogsByUser: mockGetLogsByUser,
        hasAnyLogs: mockHasAnyLogs,
      };
    })
  };
});

describe('CarbonCalculatorService', () => {
  let service: CarbonCalculatorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CarbonCalculatorService();
  });

  describe('calculateEmissions', () => {
    it('should calculate Transport emissions correctly for miles', () => {
      const emissions = service.calculateEmissions({
        category: 'Transport',
        value: 100,
        unit: 'miles'
      });
      expect(emissions).toBe(35); // 100 * 0.35
    });

    it('should calculate Transport emissions correctly for transit_miles', () => {
      const emissions = service.calculateEmissions({
        category: 'Transport',
        value: 100,
        unit: 'transit_miles'
      });
      expect(emissions).toBe(9); // 100 * 0.09
    });

    it('should calculate Transport emissions correctly for unknown unit (default)', () => {
      const emissions = service.calculateEmissions({
        category: 'Transport',
        value: 50,
        unit: 'unknown_unit'
      });
      expect(emissions).toBe(17.5); // 50 * 0.35
    });

    it('should calculate Transport emissions correctly for km and ev_miles', () => {
      const kmEmissions = service.calculateEmissions({
        category: 'Transport',
        value: 100,
        unit: 'km'
      });
      expect(kmEmissions).toBeCloseTo(100 * 0.621371 * 0.35, 4);

      const evEmissions = service.calculateEmissions({
        category: 'Transport',
        value: 100,
        unit: 'ev_miles'
      });
      expect(evEmissions).toBe(11.1); // 100 * 0.111
    });

    it('should calculate Diet emissions for various diet types', () => {
      const vegan = service.calculateEmissions({ category: 'Diet', value: 10, unit: 'vegan' });
      expect(vegan).toBe(25); // 10 * 2.5

      const vegetarian = service.calculateEmissions({ category: 'Diet', value: 10, unit: 'vegetarian' });
      expect(vegetarian).toBe(38); // 10 * 3.8

      const pescatarian = service.calculateEmissions({ category: 'Diet', value: 10, unit: 'pescatarian' });
      expect(pescatarian).toBe(45); // 10 * 4.5

      const omnivore = service.calculateEmissions({ category: 'Diet', value: 10, unit: 'omnivore' });
      expect(omnivore).toBe(56); // 10 * 5.6

      const heavyMeat = service.calculateEmissions({ category: 'Diet', value: 10, unit: 'heavy_meat' });
      expect(heavyMeat).toBe(72); // 10 * 7.2

      const unknownDiet = service.calculateEmissions({ category: 'Diet', value: 10, unit: 'keto' });
      expect(unknownDiet).toBe(56); // 10 * 5.6 (default omnivore)
    });

    it('should calculate Utilities emissions for kWh, therms, and ccf', () => {
      const electricity = service.calculateEmissions({ category: 'Utilities', value: 200, unit: 'kWh' });
      expect(electricity).toBe(74); // 200 * 0.37

      const gas = service.calculateEmissions({ category: 'Utilities', value: 20, unit: 'therms' });
      expect(gas).toBe(106); // 20 * 5.3

      const ccfGas = service.calculateEmissions({ category: 'Utilities', value: 10, unit: 'ccf' });
      expect(ccfGas).toBeCloseTo(10 * 1.037 * 5.3, 4);

      const defaultUtility = service.calculateEmissions({ category: 'Utilities', value: 100, unit: 'gallons' });
      expect(defaultUtility).toBe(37); // 100 * 0.37
    });

    it('should calculate Shopping emissions correctly', () => {
      const shopping = service.calculateEmissions({ category: 'Shopping', value: 100, unit: 'USD' });
      expect(shopping).toBe(45); // 100 * 0.45
    });

    it('should return 0 for unknown category', () => {
      const unknown = service.calculateEmissions({ category: 'Unknown' as any, value: 100, unit: 'units' });
      expect(unknown).toBe(0);
    });
  });

  describe('identifyMajorSources', () => {
    it('should calculate category breakdown and flag exceeded categories', async () => {
      mockGetCategoryAverages.mockResolvedValue({
        Utilities: 350,
        Transport: 200,
        Diet: 160,
        Shopping: 50
      });

      const breakdown = await service.identifyMajorSources('user-123');
      expect(mockGetCategoryAverages).toHaveBeenCalledWith('user-123');

      expect(breakdown.Utilities.emissions).toBe(350);
      expect(breakdown.Utilities.isExceeded).toBe(true);
      expect(breakdown.Utilities.percent).toBeCloseTo((350 / 760) * 100, 2);

      expect(breakdown.Transport.emissions).toBe(200);
      expect(breakdown.Transport.isExceeded).toBe(false);

      expect(breakdown.Diet.emissions).toBe(160);
      expect(breakdown.Diet.isExceeded).toBe(true);

      expect(breakdown.Shopping.emissions).toBe(50);
      expect(breakdown.Shopping.isExceeded).toBe(false);
    });

    it('should handle zero emissions total cleanly', async () => {
      mockGetCategoryAverages.mockResolvedValue({
        Utilities: 0,
        Transport: 0,
        Diet: 0,
        Shopping: 0
      });

      const breakdown = await service.identifyMajorSources('user-123');
      expect(breakdown.Utilities.percent).toBe(0);
      expect(breakdown.Utilities.isExceeded).toBe(false);
    });
  });

  describe('predictTrend', () => {
    it('should return fallback data if user has no logs', async () => {
      mockHasAnyLogs.mockResolvedValue(false);
      mockGetLogsByUser.mockResolvedValue([]);

      const result = await service.predictTrend('user-123');
      expect(result).toEqual({
        trendSlope: 0,
        annualProjectedKg: 2400,
        budgetDepletionDate: undefined
      });
    });

    it('should calculate linear regression trend slope and projection', async () => {
      mockHasAnyLogs.mockResolvedValue(true);
      const now = new Date();
      const logs = [
        { id: '1', userId: 'user-123', category: 'Transport', value: 10, unit: 'miles', emissionsKg: 200, createdAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '2', userId: 'user-123', category: 'Transport', value: 10, unit: 'miles', emissionsKg: 220, createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '3', userId: 'user-123', category: 'Transport', value: 10, unit: 'miles', emissionsKg: 240, createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() },
        { id: '4', userId: 'user-123', category: 'Transport', value: 10, unit: 'miles', emissionsKg: 260, createdAt: now.toISOString() }
      ];
      mockGetLogsByUser.mockResolvedValue(logs);

      const result = await service.predictTrend('user-123');
      expect(result.trendSlope).toBeGreaterThan(0);
      expect(result.annualProjectedKg).toBeGreaterThan(0);
      expect(result.budgetDepletionDate).toBeInstanceOf(Date);
    });
  });

  describe('getGridForecast', () => {
    it('should return 24 hours of grid emissions forecast', async () => {
      const forecast = await service.getGridForecast('94043');
      expect(forecast.length).toBe(24);
      forecast.forEach((f, idx) => {
        expect(f.hour).toBe(idx);
        expect(f.emissionsIntensityFactor).toBeGreaterThanOrEqual(0.1);
      });
    });

    it('should have peak intensity at 18:00 (peak hour) greater than midday 13:00 (solar hour)', async () => {
      const forecast = await service.getGridForecast('94043');
      const peakHour = forecast.find(f => f.hour === 18);
      const solarHour = forecast.find(f => f.hour === 13);
      expect(peakHour!.emissionsIntensityFactor).toBeGreaterThan(solarHour!.emissionsIntensityFactor);
    });
  });

  describe('recommendBestEnergyHour', () => {
    it('should return the lowest intensity hour and savings estimate', async () => {
      const best = await service.recommendBestEnergyHour('94043');
      expect(best.targetHour).toBeDefined();
      expect(best.targetHour).toBeGreaterThanOrEqual(0);
      expect(best.targetHour).toBeLessThan(24);
      expect(best.emissionsReductionEstimateKg).toBeGreaterThan(0);
    });
  });
});
