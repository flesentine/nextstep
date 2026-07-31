import { StyleSheet, Text, View } from 'react-native';
import { Card, H1, H2, Pill, Screen } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme';

export default function Household() {
  const t = useTheme();
  const cases = useAppStore(state => state.cases);
  const groups = Object.entries(
    cases.reduce<Record<string, number>>(
      (result, caseRecord) => ({
        ...result,
        [caseRecord.applicant]: (result[caseRecord.applicant] ?? 0) + 1
      }),
      {}
    )
  );

  return (
    <Screen>
      <View style={s.row}>
        <H1>Household</H1>
        <Pill tone="good">Free launch</Pill>
      </View>
      <Text style={[s.copy, { color: t.muted }]}>
        Organize every applicant’s journey in one calm place. All currently available household organization is
        free during launch.
      </Text>
      {groups.length ? (
        groups.map(([name, count]) => (
          <Card key={name}>
            <View style={s.avatar}>
              <Text style={[s.initial, { color: t.primary }]}>{name[0]?.toUpperCase()}</Text>
            </View>
            <H2>{name}</H2>
            <Text style={[s.copy, { color: t.muted }]}>
              {count} tracked {count === 1 ? 'case' : 'cases'}
            </Text>
          </Card>
        ))
      ) : (
        <Card>
          <H2>No household members yet</H2>
          <Text style={[s.copy, { color: t.muted }]}>Applicant names from your cases will appear here.</Text>
        </Card>
      )}
      <Card style={{ backgroundColor: t.primarySoft }}>
        <Pill>Coming later</Pill>
        <H2>Invite trusted family members</H2>
        <Text style={[s.copy, { color: t.ink }]}>
          Secure invitations and per-case sharing will be added only after household permissions pass production
          testing.
        </Text>
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  copy: { fontSize: 16, lineHeight: 23 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#DCEAE6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  initial: { fontWeight: '900', fontSize: 18 }
});
