import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDED_KEY = 'nextstep_onboarded';
const RESEARCH_INTENT_KEY = 'nextstep_research_consent_pending';

export async function finishOnboarding() {
  await AsyncStorage.setItem(ONBOARDED_KEY, '1');
}

export async function rememberResearchConsentIntent() {
  await AsyncStorage.setItem(RESEARCH_INTENT_KEY, '1');
}

export async function hasResearchConsentIntent() {
  return (await AsyncStorage.getItem(RESEARCH_INTENT_KEY)) === '1';
}

export async function clearResearchConsentIntent() {
  await AsyncStorage.removeItem(RESEARCH_INTENT_KEY);
}
