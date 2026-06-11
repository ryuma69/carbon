import { UserProfile, ExplainableRecommendation } from 'shared';
import { IRecommendationEngine } from './boundaries.js';
import { CarbonRepository } from '../repositories/carbon.repository.js';

const carbonRepo = new CarbonRepository();

interface StaticRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'Utilities' | 'Transport' | 'Diet' | 'Shopping';
  baseImpact: number; // 1-10
  baseEase: number; // 1-10
  impactKgCo2: number; // typical monthly reduction
  structuralOnly: boolean; // requires owning property
  vehicleOnly: boolean; // requires gas vehicle
}

const RECOMMENDATION_POOL: StaticRecommendation[] = [
  {
    id: 'unplug-idle',
    title: 'Unplug Standby Devices',
    description: 'Unplug chargers and TVs when not in use. Idle gadgets represent up to 10% of home electrical usage.',
    category: 'Utilities',
    baseImpact: 2,
    baseEase: 10,
    impactKgCo2: 12,
    structuralOnly: false,
    vehicleOnly: false
  },
  {
    id: 'cold-wash',
    title: 'Wash Laundry on Cold Cycle',
    description: 'Heating water represents 90% of washing machine energy. Cold washes preserve clothes and save CO2.',
    category: 'Utilities',
    baseImpact: 3,
    baseEase: 8,
    impactKgCo2: 18,
    structuralOnly: false,
    vehicleOnly: false
  },
  {
    id: 'led-bulbs',
    title: 'Install LED Lighting',
    description: 'Replace remaining incandescent bulbs. LEDs consume 80% less power and last 25 times longer.',
    category: 'Utilities',
    baseImpact: 4,
    baseEase: 7,
    impactKgCo2: 25,
    structuralOnly: false,
    vehicleOnly: false
  },
  {
    id: 'thermostat-shift',
    title: 'Lower Thermostat by 2°F',
    description: 'Shift your thermostat down during winter. Saving home heating fuels represents a high-yield offset.',
    category: 'Utilities',
    baseImpact: 5,
    baseEase: 8,
    impactKgCo2: 45,
    structuralOnly: false,
    vehicleOnly: false
  },
  {
    id: 'heat-pump',
    title: 'Upgrade to Electric Heat Pump',
    description: 'Swap gas/oil heating for an efficient electric heat pump. Eliminates direct combustion emissions.',
    category: 'Utilities',
    baseImpact: 9,
    baseEase: 2,
    impactKgCo2: 220,
    structuralOnly: true,
    vehicleOnly: false
  },
  {
    id: 'solar-panels',
    title: 'Install Rooftop Solar Panels',
    description: 'Generate green electricity locally and supply clean energy back to the regional power grid.',
    category: 'Utilities',
    baseImpact: 10,
    baseEase: 1,
    impactKgCo2: 350,
    structuralOnly: true,
    vehicleOnly: false
  },
  {
    id: 'transit-commute',
    title: 'Swap Driving for Public Transit',
    description: 'Take the bus or subway for your commute twice a week instead of driving alone in a gasoline car.',
    category: 'Transport',
    baseImpact: 7,
    baseEase: 5,
    impactKgCo2: 85,
    structuralOnly: false,
    vehicleOnly: true
  },
  {
    id: 'bike-miles',
    title: 'Bike or Walk Short Trips',
    description: 'For trips under 2 miles, bike or walk. Saves oil fuels and provides cardiovascular health benefits.',
    category: 'Transport',
    baseImpact: 4,
    baseEase: 6,
    impactKgCo2: 30,
    structuralOnly: false,
    vehicleOnly: false
  },
  {
    id: 'ev-swap',
    title: 'Switch to an Electric Vehicle',
    description: 'Swap your gasoline internal combustion engine for an EV. Zero direct exhaust carbon outputs.',
    category: 'Transport',
    baseImpact: 9,
    baseEase: 2,
    impactKgCo2: 240,
    structuralOnly: false,
    vehicleOnly: true
  },
  {
    id: 'meatless-monday',
    title: 'Implement Meatless Mondays',
    description: 'Switch all meals to vegetarian options for one day a week. Reduces heavy cattle agricultural impact.',
    category: 'Diet',
    baseImpact: 5,
    baseEase: 8,
    impactKgCo2: 35,
    structuralOnly: false,
    vehicleOnly: false
  },
  {
    id: 'plant-diet',
    title: 'Adopt a Vegetarian Diet',
    description: 'Fully shift daily food consumption from beef/poultry to plants, milk, and cheese alternatives.',
    category: 'Diet',
    baseImpact: 8,
    baseEase: 4,
    impactKgCo2: 120,
    structuralOnly: false,
    vehicleOnly: false
  },
  {
    id: 'local-buying',
    title: 'Source Local & Organic Foods',
    description: 'Minimize Scope 3 transport footprints (food miles) by purchasing local farm produce.',
    category: 'Diet',
    baseImpact: 3,
    baseEase: 6,
    impactKgCo2: 20,
    structuralOnly: false,
    vehicleOnly: false
  },
  {
    id: 'clothes-swap',
    title: 'Buy Secondhand Garments',
    description: 'Purchase recycled clothing items. Fast fashion manufacturing is carbon-heavy.',
    category: 'Shopping',
    baseImpact: 4,
    baseEase: 7,
    impactKgCo2: 15,
    structuralOnly: false,
    vehicleOnly: false
  }
];

export class RecommendationService implements IRecommendationEngine {
  async generateRecommendations(profile: UserProfile): Promise<ExplainableRecommendation[]> {
    // 1. Dynamic Weight Adjustment logic based on user history
    const completedCount = profile.behavior.completedActions.length;
    const skippedCount = profile.behavior.skippedActions.length;

    let wImpact = 0.6;
    let wEase = 0.4;

    // If the user is consistently skipping tasks (high-friction fatigue), tilt towards Ease
    if (skippedCount > 0) {
      const skipRatio = skippedCount / Math.max(1, completedCount + skippedCount);
      wEase = Math.min(0.7, 0.4 + (skipRatio * 0.3));
      wImpact = 1.0 - wEase;
    }

    // Adjust weights based on focus Area
    if (profile.preferences.focusArea === 'cost_saving') {
      // Prioritize low-cost operational shifts (high ease/low expense)
      wEase = Math.max(wEase, 0.5);
      wImpact = 1.0 - wEase;
    }

    // 2. Filter Recommendation Pool
    const filteredPool = RECOMMENDATION_POOL.filter(rec => {
      // Exclude structural changes if the user is renting
      if (rec.structuralOnly && profile.housing.ownership === 'rent') {
        return false;
      }
      // Exclude vehicle shifts if the user does not own a gas vehicle
      if (rec.vehicleOnly && !profile.transport.hasGasCar) {
        return false;
      }
      // Exclude already completed actions
      if (profile.behavior.completedActions.includes(rec.id)) {
        return false;
      }
      return true;
    });

    // 3. Score & Rank Recommendations
    const results: ExplainableRecommendation[] = filteredPool.map(rec => {
      let easeScore = rec.baseEase;
      
      // Personalize Ease score dynamically based on user profile
      if (rec.category === 'Diet' && profile.diet === 'vegetarian') {
        // If already vegetarian, simple diet tweaks are very easy
        easeScore = Math.min(10, easeScore + 2);
      }
      if (rec.id === 'transit-commute' && profile.transport.commuteDistanceMiles > 30) {
        // Long commutes make public transit swaps harder
        easeScore = Math.max(1, easeScore - 2);
      }

      const impactScore = rec.baseImpact;
      const priorityScore = (wImpact * impactScore) + (wEase * easeScore);

      // Create Transparent Explanations
      let primaryReason = `Recommended to lower your general carbon footprint.`;
      let supportingData = `This action saves an estimated ${rec.impactKgCo2}kg of CO2e monthly.`;
      let calculationSummary = `Calculated based on standard EPA carbon multipliers.`;

      if (rec.category === 'Utilities') {
        primaryReason = `Your home utility heating type is configured as '${profile.housing.heatingType}'.`;
        supportingData = `Because you ${profile.housing.ownership} an ${profile.housing.type}, this operational swap fits your living layout.`;
        calculationSummary = `Lowering energy usage by 10% translates to a reduction of ${rec.impactKgCo2}kg of CO2e.`;
      } else if (rec.category === 'Transport') {
        primaryReason = `Your daily commute distance is logged as ${profile.transport.commuteDistanceMiles} miles.`;
        supportingData = `Swapping a portion of your ${profile.transport.primaryMode} trips avoids burning petroleum.`;
        calculationSummary = `Avoiding gasoline emissions for this distance saves around ${rec.impactKgCo2}kg of CO2e.`;
      } else if (rec.category === 'Diet') {
        primaryReason = `Your baseline diet type is configured as '${profile.diet}'.`;
        supportingData = `Shifting livestock sourcing is the highest-yield Scope 3 food offset.`;
        calculationSummary = `Swapping red meat for plant proteins saves ${rec.impactKgCo2}kg of CO2e monthly.`;
      }

      return {
        id: rec.id,
        title: rec.title,
        description: rec.description,
        category: rec.category,
        impactScore,
        easeScore,
        priorityScore: Number(priorityScore.toFixed(2)),
        impactKgCo2: rec.impactKgCo2,
        whyChosen: {
          primaryReason,
          supportingData,
          calculationSummary
        }
      };
    });

    // Sort by descending Priority Score
    return results.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  async adjustBehavioralWeights(profile: UserProfile, actionId: string, actionType: 'complete' | 'skip'): Promise<UserProfile> {
    const completed = [...profile.behavior.completedActions];
    const skipped = [...profile.behavior.skippedActions];

    if (actionType === 'complete') {
      if (!completed.includes(actionId)) {
        completed.push(actionId);
      }
      // Remove from skipped list if it was previously skipped
      const idx = skipped.indexOf(actionId);
      if (idx > -1) skipped.splice(idx, 1);
    } else {
      if (!skipped.includes(actionId)) {
        skipped.push(actionId);
      }
      // Remove from completed if it was marked complete before
      const idx = completed.indexOf(actionId);
      if (idx > -1) completed.splice(idx, 1);
    }

    const updatedProfile = await carbonRepo.updateUserProfile(profile.userId, {
      behavior: {
        completedActions: completed,
        skippedActions: skipped,
        consecutiveLogDays: profile.behavior.consecutiveLogDays
      }
    });

    return updatedProfile;
  }
}
