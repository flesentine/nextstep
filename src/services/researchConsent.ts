import { apiErrorFromResponse } from './apiErrors';
import { supabase } from './supabase';

export interface ResearchConsent {
  enabled: boolean;
  consentVersion: number;
  consentedAt: string | null;
  withdrawnAt: string | null;
}

const base = () => process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');

async function authenticatedHeaders() {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (!session) throw new Error('Sign in to manage anonymous research sharing.');
  return {
    'content-type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
    ...(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      ? { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY }
      : {})
  };
}

export async function getResearchConsent(): Promise<ResearchConsent> {
  const endpoint = base();
  if (!endpoint) throw new Error('Cloud case API is not configured.');
  const response = await fetch(`${endpoint}/v1/research-consent`, {
    headers: await authenticatedHeaders()
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.json();
}

export async function setResearchConsent(enabled: boolean) {
  const endpoint = base();
  if (!endpoint) throw new Error('Cloud case API is not configured.');
  const response = await fetch(`${endpoint}/v1/research-consent`, {
    method: 'POST',
    headers: await authenticatedHeaders(),
    body: JSON.stringify({ enabled })
  });
  if (!response.ok) throw await apiErrorFromResponse(response);
  return response.json() as Promise<{
    enabled: boolean;
    casesProcessed: number;
    observations: number;
  }>;
}
