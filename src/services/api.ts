// SEEK — Cliente HTTP & Camada de Serviços da API
// Integração desacoplada entre Frontend e Backend Node.js

const API_BASE_URL = 'http://localhost:3001/api';

export const api = {
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async login(email: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  async recoverPassword(email: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/recover-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return res.ok;
    } catch {
      return true; // Fallback mock
    }
  },

  async askSeekAI(query: string, userRole: string): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/seek-ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, userRole })
      });
      if (res.ok) {
        const data = await res.json();
        return data.answer;
      }
      return null;
    } catch {
      return null;
    }
  }
};
