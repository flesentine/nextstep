type DatabaseClient = {
  from: (table: string) => any;
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

type ResearchEvent = {
  source_hash: string;
  status: string;
  milestone: string;
  occurred_at: string;
};

const monthStart = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

const daysBetween = (from: string, to: string) =>
  Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000));

const hex = (bytes: Uint8Array) =>
  Array.from(bytes).map(value => value.toString(16).padStart(2, '0')).join('');

async function keyedHash(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return hex(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}

const terminalOutcome = (event: ResearchEvent) => {
  if (event.milestone !== 'decision') return null;
  if (/approved/i.test(event.status)) return 'approved';
  if (/denied/i.test(event.status)) return 'denied';
  return null;
};

export async function researchCaseKey(caseId: string) {
  const secret = Deno.env.get('RESEARCH_HASH_SECRET');
  if (!secret || secret.length < 32) {
    throw new Error('Research contribution capture is not configured.');
  }
  return keyedHash(secret, `case:${caseId}`);
}

export async function removeResearchObservations(db: DatabaseClient, caseId: string) {
  const { data, error } = await db.rpc('delete_research_case_observations', {
    p_case_key_hash: await researchCaseKey(caseId)
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function syncResearchObservations(db: DatabaseClient, caseId: string) {
  const { data: caseRow, error: caseError } = await db
    .from('cases')
    .select('id,owner_id,form_type')
    .eq('id', caseId)
    .maybeSingle();
  if (caseError) throw caseError;
  if (!caseRow) return { recorded: 0, optedIn: false };

  const { data: consent, error: consentError } = await db
    .from('research_consent')
    .select('enabled')
    .eq('user_id', caseRow.owner_id)
    .maybeSingle();
  if (consentError) throw consentError;
  if (!consent?.enabled) return { recorded: 0, optedIn: false };

  const { data: eventRows, error: eventsError } = await db
    .from('case_events')
    .select('source_hash,status,milestone,occurred_at')
    .eq('case_id', caseId)
    .order('occurred_at', { ascending: true });
  if (eventsError) throw eventsError;

  const events = (eventRows ?? []) as ResearchEvent[];
  if (events.length < 2) return { recorded: 0, optedIn: true };
  const filedEvent = events.find(event => event.milestone === 'filed') ?? events[0];
  const filedMonth = monthStart(filedEvent.occurred_at);
  if (!filedMonth) return { recorded: 0, optedIn: true };

  const earliestByMilestone = new Map<string, ResearchEvent>();
  for (const event of events) {
    if (event.milestone === 'filed' || earliestByMilestone.has(event.milestone)) continue;
    earliestByMilestone.set(event.milestone, event);
  }

  const caseKeyHash = await researchCaseKey(caseId);
  let recorded = 0;
  for (const event of earliestByMilestone.values()) {
    const eventMonth = monthStart(event.occurred_at);
    if (!eventMonth) continue;
    const secret = Deno.env.get('RESEARCH_HASH_SECRET')!;
    const contributionHash = await keyedHash(secret, `observation:${caseId}:${event.milestone}`);
    const { error } = await db.rpc('record_research_observation', {
      p_case_key_hash: caseKeyHash,
      p_contribution_hash: contributionHash,
      p_form_type: caseRow.form_type,
      p_filed_month: filedMonth,
      p_milestone: event.milestone,
      p_event_month: eventMonth,
      p_elapsed_days: daysBetween(filedEvent.occurred_at, event.occurred_at),
      p_terminal_outcome: terminalOutcome(event)
    });
    if (error) throw error;
    recorded++;
  }
  return { recorded, optedIn: true };
}
