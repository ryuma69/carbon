import type { CarbonLog, UserProfile, ExplainableRecommendation, GridEmissionsForecast } from 'shared';

const API_BASE = 'https://carbon-oqvf.onrender.com/api';

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    };
  }

  async login(email: string, password: string): Promise<{ token: string; userId: string; email: string }> {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  }

  async register(payload: any): Promise<{ token: string; userId: string; email: string }> {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  }

  async getProfile(): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/users/profile`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  }

  async updateProfile(payload: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  }

  async logEmissions(category: string, value: number, unit: string): Promise<CarbonLog> {
    const res = await fetch(`${API_BASE}/carbon/log`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ category, value, unit })
    });
    if (!res.ok) throw new Error('Failed to submit emissions log');
    return res.json();
  }

  async getLogs(): Promise<CarbonLog[]> {
    const res = await fetch(`${API_BASE}/carbon/logs`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to retrieve logs');
    return res.json();
  }

  async getDashboardSummary(): Promise<{ averages: Record<string, number>; breakdown: any; forecast: any }> {
    const res = await fetch(`${API_BASE}/carbon/summary`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to retrieve dashboard analytics');
    return res.json();
  }

  async getRecommendations(): Promise<ExplainableRecommendation[]> {
    const res = await fetch(`${API_BASE}/carbon/recommendations`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to compile recommendations');
    return res.json();
  }

  async updateRecommendationState(actionId: string, type: 'complete' | 'skip'): Promise<UserProfile> {
    const res = await fetch(`${API_BASE}/carbon/recommendation/action`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ actionId, type })
    });
    if (!res.ok) throw new Error('Failed to update recommendation status');
    return res.json();
  }

  async getGridForecast(): Promise<{ forecast: GridEmissionsForecast[]; recommendation: { targetHour: number; emissionsReductionEstimateKg: number } }> {
    const res = await fetch(`${API_BASE}/carbon/grid-forecast`, {
      headers: this.getHeaders()
    });
    if (!res.ok) throw new Error('Failed to query electrical grid forecast');
    return res.json();
  }

  async sendChatMessage(history: { role: 'user' | 'model'; text: string }[], message: string): Promise<{ text: string; actionSuggestion?: any }> {
    const res = await fetch(`${API_BASE}/assistant/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ history, message })
    });
    if (!res.ok) throw new Error('Failed to process message');
    return res.json();
  }

  async uploadUtilityBill(file: File): Promise<{ utilityType: string; amount: number; kwhUsed?: number; gasThermsUsed?: number }> {
    const formData = new FormData();
    formData.append('bill', file);

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/assistant/scan-bill`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      body: formData
    });
    if (!res.ok) throw new Error('Utility bill scanner failed');
    return res.json();
  }
}

export const api = new ApiClient();
