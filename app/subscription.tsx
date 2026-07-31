import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, H1, H2, Pill, Screen } from '@/components/ui';
import { useTheme } from '@/theme';

const features = [
  'Track as many cases as you need',
  'View transparent public progress',
  'Explore privacy-thresholded cohorts',
  'Use reminders and educational guidance'
];

export default function Subscription() {
  const t = useTheme();
  return (
    <Screen>
      <Text accessibilityRole="button" onPress={() => router.back()} style={[s.close, { color: t.primary }]}>
        Close
      </Text>
      <Pill tone="good">Free launch</Pill>
      <H1>NextStep is free while we build with the community.</H1>
      <Text style={[s.copy, { color: t.muted }]}>
        There are no subscriptions, advertisements, trials, or purchase requirements in this release.
      </Text>
      <Card>
        <H2>Included now</H2>
        {features.map(feature => (
          <View key={feature} style={s.row}>
            <Text style={[s.tick, { color: t.good }]}>✓</Text>
            <Text style={[s.copy, { color: t.ink }]}>{feature}</Text>
          </View>
        ))}
      </Card>
      <Button title="Continue using NextStep" onPress={() => router.replace('/(tabs)')} />
      <Text style={[s.note, { color: t.muted }]}>
        If optional paid features are introduced later, their price and benefits will be shown before purchase.
        Core case tracking will remain available without advertising.
      </Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  close: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  tick: { fontSize: 18, fontWeight: '900' },
  copy: { fontSize: 16, lineHeight: 23, flex: 1 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center' }
});
