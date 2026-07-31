import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, H1, H2, Pill, Screen } from '@/components/ui';
import {
  finishOnboarding,
  rememberResearchConsentIntent
} from '@/services/onboarding';
import { useTheme } from '@/theme';

export default function Welcome() {
  const t = useTheme();
  const [step, setStep] = useState<'intro' | 'research'>('intro');
  const [busy, setBusy] = useState(false);

  const continueWithoutSharing = async () => {
    setBusy(true);
    await finishOnboarding();
    router.replace('/(tabs)');
  };

  const chooseAnonymousSharing = async () => {
    setBusy(true);
    await rememberResearchConsentIntent();
    await finishOnboarding();
    router.replace({ pathname: '/account', params: { research: '1', onboarding: '1' } });
  };

  if (step === 'research') {
    return (
      <Screen>
        <Pill tone="accent">Optional community research</Pill>
        <H1>Help everyone see how cases are moving.</H1>
        <Text style={[s.copy, { color: t.muted }]}>
          Official statistics are broad. With enough volunteers, NextStep can show realistic milestone ranges by
          form type—without exposing anyone’s case.
        </Text>
        <Card>
          <H2>What would be shared</H2>
          <Text style={[s.point, { color: t.ink }]}>✓ Form type and milestone reached</Text>
          <Text style={[s.point, { color: t.ink }]}>✓ Filing and event month—not exact dates</Text>
          <Text style={[s.point, { color: t.ink }]}>✓ Elapsed days and broad approval or denial outcome</Text>
        </Card>
        <Card style={{ backgroundColor: t.primarySoft }}>
          <H2>What is never shared</H2>
          <Text style={[s.point, { color: t.ink }]}>Receipt numbers, names, status text, free text, exact dates, user IDs, or case IDs.</Text>
          <Text style={[s.noteLeft, { color: t.muted }]}>
            Groups stay hidden until at least 50 observations qualify. You can stop sharing and remove your keyed
            contributions at any time.
          </Text>
        </Card>
        <Button
          title={busy ? 'Opening secure sign-in…' : 'Share anonymously'}
          disabled={busy}
          onPress={chooseAnonymousSharing}
        />
        <Button
          title="Not now"
          secondary
          disabled={busy}
          onPress={continueWithoutSharing}
        />
        <Text style={[s.note, { color: t.muted }]}>
          Sharing requires a free account so NextStep can honor your choice and prevent duplicate contributions. It
          is off unless you choose it.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={s.hero}>
        <Text style={[s.eyebrow, { color: t.primary }]}>NEXTSTEP</Text>
        <H1>Your case, explained one step at a time.</H1>
        <Text style={[s.copy, { color: t.muted }]}>
          Track official updates, understand what they mean, and keep the next task clear—without ads.
        </Text>
      </View>
      <Card>
        <Text style={[s.point, { color: t.ink }]}>✓ Receipt numbers are encrypted for cloud tracking</Text>
        <Text style={[s.point, { color: t.ink }]}>✓ No government affiliation or legal advice</Text>
        <Text style={[s.point, { color: t.ink }]}>✓ Verify every update at its official source</Text>
      </Card>
      <Button title="Continue" onPress={() => setStep('research')} />
      <Text style={[s.note, { color: t.muted }]}>Next, choose whether you want to help improve anonymous public estimates.</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { gap: 14, paddingVertical: 24 },
  eyebrow: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  copy: { fontSize: 19, lineHeight: 28 },
  point: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  noteLeft: { fontSize: 13, lineHeight: 20 }
});
