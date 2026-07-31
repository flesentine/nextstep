import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, H1, Pill, Screen } from '@/components/ui';
import {
  clearResearchConsentIntent,
  hasResearchConsentIntent
} from '@/services/onboarding';
import { setResearchConsent } from '@/services/researchConsent';
import { sendMagicLink, supabase } from '@/services/supabase';
import { useTheme } from '@/theme';

export default function Account() {
  const t = useTheme();
  const params = useLocalSearchParams<{ research?: string; onboarding?: string }>();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [researchIntent, setResearchIntent] = useState(params.research === '1');
  const activating = useRef(false);

  useEffect(() => {
    let active = true;
    hasResearchConsentIntent().then(value => {
      if (active) setResearchIntent(value);
    });

    const activateIfReady = async () => {
      if (activating.current || !(await hasResearchConsentIntent())) return;
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!session) return;
      activating.current = true;
      try {
        const result = await setResearchConsent(true);
        await clearResearchConsentIntent();
        if (active) setResearchIntent(false);
        Alert.alert(
          'Anonymous sharing is on',
          `${result.casesProcessed} cloud case${result.casesProcessed === 1 ? '' : 's'} checked. Future milestones will contribute automatically.`
        );
        router.replace('/(tabs)');
      } catch (error) {
        Alert.alert('Could not enable sharing', error instanceof Error ? error.message : 'You can try again in Settings.');
      } finally {
        activating.current = false;
      }
    };

    activateIfReady();
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      if (session) setTimeout(() => void activateIfReady(), 0);
    }).data.subscription;
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const submit = async () => {
    try {
      setBusy(true);
      await sendMagicLink(email.trim());
      Alert.alert(
        'Check your email',
        researchIntent
          ? 'Use the secure sign-in link. Anonymous sharing will turn on after sign-in and can be changed anytime.'
          : 'Use the secure sign-in link to enable sync and alerts.'
      );
    } catch (error) {
      Alert.alert('Sign-in unavailable', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (researchIntent || await hasResearchConsentIntent()) await clearResearchConsentIntent();
    if (params.onboarding === '1') router.replace('/(tabs)');
    else router.back();
  };

  return (
    <Screen>
      <Text accessibilityRole="button" onPress={cancel} style={[s.close, { color: t.primary }]}>Cancel</Text>
      <Pill>{researchIntent ? 'Anonymous research + free account' : 'Optional account'}</Pill>
      <H1>{researchIntent ? 'Make your milestones count.' : 'Keep your journey in sync'}</H1>
      <Text style={[s.copy, { color: t.muted }]}>
        {researchIntent
          ? 'A free account lets NextStep prevent duplicate contributions and remove yours if you change your mind. Your receipt number and identity never enter the research dataset.'
          : 'Guest cases remain on this device. A free account enables encrypted sync and server-side case alerts.'}
      </Text>
      <Card>
        <Text style={[s.label, { color: t.ink }]}>Email address</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={t.muted}
          style={[s.input, { borderColor: t.line, color: t.ink, backgroundColor: t.background }]}
        />
        <Button
          title={busy ? 'Sending…' : 'Email me a secure sign-in link'}
          disabled={busy || !email.includes('@')}
          onPress={submit}
        />
      </Card>
      <Text style={[s.note, { color: t.muted }]}>
        Apple and Google sign-in hooks use the same Supabase identity and can be enabled with their provider
        credentials.
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  close: { fontSize: 16, fontWeight: '800' },
  copy: { fontSize: 17, lineHeight: 25 },
  label: { fontWeight: '800' },
  input: { borderWidth: 1, borderRadius: 13, minHeight: 52, paddingHorizontal: 14, fontSize: 16 },
  note: { fontSize: 13, lineHeight: 20, textAlign: 'center' }
});
