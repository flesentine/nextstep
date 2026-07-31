import { useEffect, useState } from 'react';
import { Alert, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H1, H2, Pill, Screen } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { registerForPush } from '@/services/notifications';
import { saveInstallation } from '@/services/cloudCases';
import { getResearchConsent, setResearchConsent } from '@/services/researchConsent';
import { supabase } from '@/services/supabase';
import { supported } from '@/i18n';
import { useTheme } from '@/theme';

type ResearchState = 'loading' | 'signedOut' | 'ready' | 'unavailable';

export default function Settings() {
  const t = useTheme();
  const { cases, erase, syncCases } = useAppStore();
  const [researchState, setResearchState] = useState<ResearchState>('loading');
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [savingResearch, setSavingResearch] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (!active) return;
      if (!session) {
        setResearchState('signedOut');
        return;
      }
      try {
        const consent = await getResearchConsent();
        if (active) {
          setResearchEnabled(consent.enabled);
          setResearchState('ready');
        }
      } catch {
        if (active) setResearchState('unavailable');
      }
    };
    load();
    const subscription = supabase?.auth.onAuthStateChange(() => load()).data.subscription;
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const changeResearchConsent = (enabled: boolean) => {
    const title = enabled ? 'Share anonymous progress data?' : 'Stop sharing anonymous progress data?';
    const message = enabled
      ? 'NextStep will contribute only form type, milestone, month-level timing, elapsed days, and a broad decision outcome. It never contributes receipt numbers, names, status text, exact dates, or account and case IDs.'
      : 'Your keyed case contributions will be removed from the research dataset and the public cohorts will be recalculated.';
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: enabled ? 'I agree' : 'Stop sharing',
        style: enabled ? 'default' : 'destructive',
        onPress: async () => {
          try {
            setSavingResearch(true);
            const result = await setResearchConsent(enabled);
            setResearchEnabled(result.enabled);
            setResearchState('ready');
            Alert.alert(
              enabled ? 'Anonymous sharing is on' : 'Anonymous sharing is off',
              enabled
                ? `${result.casesProcessed} cloud case${result.casesProcessed === 1 ? '' : 's'} checked. Cohorts stay hidden until at least 50 observations qualify.`
                : 'Your case contributions were removed and the public release was recalculated.'
            );
          } catch (error) {
            Alert.alert('Could not update sharing', error instanceof Error ? error.message : 'Try again.');
          } finally {
            setSavingResearch(false);
          }
        }
      }
    ]);
  };

  return (
    <Screen>
      <H1>Settings</H1>
      <Card>
        <View style={s.row}>
          <View style={s.grow}>
            <H2>Account and sync</H2>
            <Text style={[s.copy, { color: t.muted }]}>
              {cases.filter(caseRecord => caseRecord.cloudId).length} of{' '}
              {cases.filter(caseRecord => caseRecord.source === 'uscis').length} USCIS cases encrypted in cloud sync.
            </Text>
          </View>
          <Pill>Private</Pill>
        </View>
        <Button title="Create or sign in to free account" onPress={() => router.push('/account')} />
        <Button
          title="Sync cases now"
          secondary
          onPress={async () => {
            try {
              const result = await syncCases();
              Alert.alert(
                'Sync finished',
                `${result.synced} synced · ${result.failed} need attention. Local cases are kept when a cloud upload fails.`
              );
            } catch (error) {
              Alert.alert('Sync unavailable', error instanceof Error ? error.message : 'Try again.');
            }
          }}
        />
      </Card>
      <Card>
        <View style={s.row}>
          <View style={s.grow}>
            <H2>Help improve public estimates</H2>
            <Text style={[s.copy, { color: t.muted }]}>
              Optional, anonymous research sharing helps build processing ranges by form and milestone.
            </Text>
          </View>
          {researchState === 'ready' ? (
            <Switch
              accessibilityLabel="Share anonymous case progress"
              accessibilityHint="Shares only de-identified, month-level research observations"
              value={researchEnabled}
              disabled={savingResearch}
              onValueChange={changeResearchConsent}
              trackColor={{ false: t.line, true: t.primary }}
            />
          ) : (
            <Pill>{researchState === 'loading' ? 'Checking' : 'Off'}</Pill>
          )}
        </View>
        <Text style={[s.noteLeft, { color: t.muted }]}>
          Shared: form type, milestone, filing/event month, elapsed days, and broad approval or denial outcome.
          Never shared: receipt number, name, status text, exact date, free text, user ID, or case ID.
        </Text>
        {researchState === 'signedOut' && (
          <Button title="Sign in to choose" secondary onPress={() => router.push('/account')} />
        )}
        {researchState === 'unavailable' && (
          <Button
            title="Try privacy setting again"
            secondary
            onPress={async () => {
              setResearchState('loading');
              try {
                const consent = await getResearchConsent();
                setResearchEnabled(consent.enabled);
                setResearchState('ready');
              } catch {
                setResearchState('unavailable');
              }
            }}
          />
        )}
        <Text style={[s.noteLeft, { color: t.muted }]}>
          Public cohorts require at least 50 observations. You can withdraw at any time; your keyed case
          contributions are then removed before cohorts are republished.
        </Text>
      </Card>
      <Card>
        <H2>Notifications</H2>
        <Text style={[s.copy, { color: t.muted }]}>Case alerts are kept separate from educational updates.</Text>
        <Button
          title="Enable case alerts"
          secondary
          onPress={async () => {
            try {
              const token = await registerForPush();
              await saveInstallation(token, Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
              Alert.alert('Alerts enabled', 'This signed-in device is registered for deduplicated server alerts.');
            } catch (error) {
              Alert.alert(
                'Could not enable alerts',
                error instanceof Error ? error.message : 'Open system settings to try again.'
              );
            }
          }}
        />
      </Card>
      <Card>
        <H2>Language</H2>
        <Text style={[s.copy, { color: t.muted }]}>{Object.values(supported).join(' · ')}</Text>
        <Text style={[s.noteLeft, { color: t.muted }]}>
          The app follows the device language. Reviewed guidance content must be professionally translated before
          store release.
        </Text>
      </Card>
      <Card>
        <H2>Your data</H2>
        <Button
          title="Export case history"
          secondary
          onPress={() =>
            Share.share({
              title: 'NextStep case export',
              message: JSON.stringify(
                {
                  exportedAt: new Date().toISOString(),
                  cases: cases.map(
                    ({ id, nickname, applicant, formType, status, milestone, lastUpdatedAt, events }) => ({
                      id,
                      nickname,
                      applicant,
                      formType,
                      status,
                      milestone,
                      lastUpdatedAt,
                      events
                    })
                  )
                },
                null,
                2
              )
            })
          }
        />
        <Button
          title="Delete all local data"
          secondary
          onPress={() =>
            Alert.alert(
              'Delete all local data?',
              'This permanently removes case history and protected identifiers from this device.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: erase }
              ]
            )
          }
        />
      </Card>
      <Card>
        <H2>Privacy promise</H2>
        <Text style={[s.copy, { color: t.ink }]}>
          No ads. No receipt numbers in analytics or logs. Identifiers are stored separately in protected device
          storage. You can export or erase your data at any time.
        </Text>
      </Card>
      <Text style={[s.note, { color: t.muted }]}>
        Independent educational software. Not affiliated with USCIS, the Department of State, EOIR, or any U.S.
        government entity. Not legal advice.
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1 },
  copy: { fontSize: 15, lineHeight: 22 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  noteLeft: { fontSize: 12, lineHeight: 18 }
});
