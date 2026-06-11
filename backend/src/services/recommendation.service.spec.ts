import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RecommendationService } from './recommendation.service.js';
import { UserProfile } from '../shared/index.js';

// Use vi.hoisted to ensure the mockUpdateUserProfile variable is initialized when vi.mock is evaluated
const { mockUpdateUserProfile } = vi.hoisted(() => {
  return {
    mockUpdateUserProfile: vi.fn()
  };
});

vi.mock('../repositories/carbon.repository.js', () => {
  return {
    CarbonRepository: vi.fn().mockImplementation(() => {
      return {
        updateUserProfile: mockUpdateUserProfile,
      };
    })
  };
});

describe('RecommendationService', () => {
  let service: RecommendationService;

  const baseProfile: UserProfile = {
    id: 'user-profile-123',
    userId: 'user-123',
    location: { zipCode: '94043', region: 'CA' },
    housing: { type: 'house', ownership: 'own', heatingType: 'gas' },
    transport: { hasEV: false, hasGasCar: true, commuteDistanceMiles: 15, primaryMode: 'driving' },
    diet: 'omnivore',
    historicalAverages: { utilityMonthlyKg: 0, transportMonthlyKg: 0, dietMonthlyKg: 0, shoppingMonthlyKg: 0 },
    behavior: { completedActions: [], skippedActions: [], consecutiveLogDays: 3 },
    preferences: { focusArea: 'general' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RecommendationService();
  });

  describe('generateRecommendations', () => {
    it('should generate a ranked list of recommendations for a base profile', async () => {
      const recommendations = await service.generateRecommendations(baseProfile);
      expect(recommendations.length).toBeGreaterThan(0);
      
      // Ensure results are sorted by priorityScore descending
      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].priorityScore).toBeGreaterThanOrEqual(recommendations[i + 1].priorityScore);
      }
    });

    it('should filter out structural changes if the user rents', async () => {
      const tenantProfile = {
        ...baseProfile,
        housing: { ...baseProfile.housing, ownership: 'rent' as const }
      };

      const recommendations = await service.generateRecommendations(tenantProfile);
      
      const hasSolar = recommendations.some(r => r.id === 'solar-panels');
      const hasHeatPump = recommendations.some(r => r.id === 'heat-pump');
      
      expect(hasSolar).toBe(false);
      expect(hasHeatPump).toBe(false);
    });

    it('should filter out vehicle swaps if the user does not own a gas vehicle', async () => {
      const noCarProfile = {
        ...baseProfile,
        transport: { ...baseProfile.transport, hasGasCar: false }
      };

      const recommendations = await service.generateRecommendations(noCarProfile);
      
      const hasEvSwap = recommendations.some(r => r.id === 'ev-swap');
      const hasTransitCommute = recommendations.some(r => r.id === 'transit-commute');
      
      expect(hasEvSwap).toBe(false);
      expect(hasTransitCommute).toBe(false);
    });

    it('should filter out already completed recommendations', async () => {
      const completedActionId = 'unplug-idle';
      const completedProfile = {
        ...baseProfile,
        behavior: {
          ...baseProfile.behavior,
          completedActions: [completedActionId]
        }
      };

      const recommendations = await service.generateRecommendations(completedProfile);
      const hasUnplugIdle = recommendations.some(r => r.id === completedActionId);
      expect(hasUnplugIdle).toBe(false);
    });

    it('should dynamically shift weights towards Ease if user frequently skips recommendations', async () => {
      const highSkipProfile = {
        ...baseProfile,
        behavior: {
          completedActions: ['led-bulbs'],
          skippedActions: ['thermostat-shift', 'meatless-monday', 'bike-miles'],
          consecutiveLogDays: 1
        }
      };

      const recommendations = await service.generateRecommendations(highSkipProfile);
      const unplug = recommendations.find(r => r.id === 'unplug-idle');
      expect(unplug!.priorityScore).toBe(7.0);
    });

    it('should prioritize ease if the focus area is cost_saving', async () => {
      const costSavingProfile = {
        ...baseProfile,
        preferences: { focusArea: 'cost_saving' as const }
      };

      const recommendations = await service.generateRecommendations(costSavingProfile);
      expect(recommendations.length).toBeGreaterThan(0);
      recommendations.forEach(r => {
        expect(r.priorityScore).toBeDefined();
      });
    });

    it('should customize ease score if already vegetarian', async () => {
      const vegProfile = {
        ...baseProfile,
        diet: 'vegetarian' as const
      };

      const recommendations = await service.generateRecommendations(vegProfile);
      const meatlessMonday = recommendations.find(r => r.id === 'meatless-monday');
      expect(meatlessMonday!.easeScore).toBe(10);
    });

    it('should decrease transit ease score for very long commutes', async () => {
      const longCommuteProfile = {
        ...baseProfile,
        transport: { ...baseProfile.transport, commuteDistanceMiles: 40 }
      };

      const recommendations = await service.generateRecommendations(longCommuteProfile);
      const transitCommute = recommendations.find(r => r.id === 'transit-commute');
      expect(transitCommute!.easeScore).toBe(3);
    });

    it('should generate explainability text matching user profile parameters', async () => {
      const recommendations = await service.generateRecommendations(baseProfile);
      
      const utilityRec = recommendations.find(r => r.category === 'Utilities');
      expect(utilityRec!.whyChosen.primaryReason).toContain(baseProfile.housing.heatingType);
      
      const transportRec = recommendations.find(r => r.category === 'Transport');
      expect(transportRec!.whyChosen.primaryReason).toContain(String(baseProfile.transport.commuteDistanceMiles));

      const dietRec = recommendations.find(r => r.category === 'Diet');
      expect(dietRec!.whyChosen.primaryReason).toContain(baseProfile.diet);
    });
  });

  describe('adjustBehavioralWeights', () => {
    it('should add action to completedActions and remove from skippedActions when completing', async () => {
      const profile = {
        ...baseProfile,
        behavior: {
          completedActions: [],
          skippedActions: ['unplug-idle'],
          consecutiveLogDays: 5
        }
      };

      mockUpdateUserProfile.mockImplementation((userId: string, update: any) => {
        return {
          ...profile,
          behavior: update.behavior
        };
      });

      const updated = await service.adjustBehavioralWeights(profile, 'unplug-idle', 'complete');
      expect(updated.behavior.completedActions).toContain('unplug-idle');
      expect(updated.behavior.skippedActions).not.toContain('unplug-idle');
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(profile.userId, {
        behavior: {
          completedActions: ['unplug-idle'],
          skippedActions: [],
          consecutiveLogDays: 5
        }
      });
    });

    it('should add action to skippedActions and remove from completedActions when skipping', async () => {
      const profile = {
        ...baseProfile,
        behavior: {
          completedActions: ['unplug-idle'],
          skippedActions: [],
          consecutiveLogDays: 5
        }
      };

      mockUpdateUserProfile.mockImplementation((userId: string, update: any) => {
        return {
          ...profile,
          behavior: update.behavior
        };
      });

      const updated = await service.adjustBehavioralWeights(profile, 'unplug-idle', 'skip');
      expect(updated.behavior.skippedActions).toContain('unplug-idle');
      expect(updated.behavior.completedActions).not.toContain('unplug-idle');
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(profile.userId, {
        behavior: {
          completedActions: [],
          skippedActions: ['unplug-idle'],
          consecutiveLogDays: 5
        }
      });
    });
  });
});
