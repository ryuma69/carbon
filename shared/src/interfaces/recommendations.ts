export interface ExplainableRecommendation {
  id: string;
  title: string;
  description: string;
  category: 'Utilities' | 'Transport' | 'Diet' | 'Shopping';
  impactScore: number;       // 1 - 10
  easeScore: number;         // 1 - 10
  priorityScore: number;
  impactKgCo2: number;       // Estimated monthly savings
  whyChosen: {
    primaryReason: string;
    supportingData: string;
    calculationSummary: string;
  };
}
