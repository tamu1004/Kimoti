export const MOODS = ['good', 'normal', 'tired', 'down', 'upset'] as const
export type Mood = (typeof MOODS)[number]

export const AVAILABILITIES = ['open', 'light', 'wait', 'want_talk'] as const
export type Availability = (typeof AVAILABILITIES)[number]

export const CAUSES = ['not_partner', 'partner', 'unspecified'] as const
export type Cause = (typeof CAUSES)[number]

export const REQUEST_TAGS = [
  'leave_alone',
  'listen',
  'no_advice',
  'as_usual',
] as const
export type RequestTag = (typeof REQUEST_TAGS)[number]

export const PRESET_IDS = [
  'good',
  'normal',
  'bad_open',
  'bad_not_partner',
  'bad_down',
  'bad_cooldown',
  'bad_talk_now',
  'busy',
  'tired',
  'happy_talk',
] as const
export type PresetId = (typeof PRESET_IDS)[number]

export const REACTION_KINDS = ['ok', 'waiting', 'take_your_time'] as const
export type ReactionKind = (typeof REACTION_KINDS)[number]

export type Tone = 'positive' | 'neutral' | 'negative'

export type SignalPreset = {
  id: PresetId
  label: string
  emoji: string
  mood: Mood
  availability: Availability
  cause: Cause | null
  tone: Tone
  showRequestChips: boolean
  revisitRequired: boolean
  defaultRevisitOptionId: RevisitOptionId
}

export const REVISIT_OPTION_IDS = [
  'm30',
  'h1',
  'h2',
  'today',
  'undecided',
  'custom',
] as const
export type RevisitOptionId = (typeof REVISIT_OPTION_IDS)[number]

export const REQUEST_TAG_LABELS: Record<RequestTag, string> = {
  leave_alone: 'そっとしておいて',
  listen: '話を聞いてほしい',
  no_advice: 'アドバイスはいらない',
  as_usual: '普段どおりでいい',
}

export const REACTION_LABELS: Record<ReactionKind, string> = {
  ok: '了解',
  waiting: '待ってるね',
  take_your_time: 'ゆっくりでいいよ',
}

export const SIGNAL_PRESETS: Record<PresetId, SignalPreset> = {
  good: {
    id: 'good',
    label: '良い',
    emoji: '☀️',
    mood: 'good',
    availability: 'open',
    cause: null,
    tone: 'positive',
    showRequestChips: false,
    revisitRequired: false,
    defaultRevisitOptionId: 'undecided',
  },
  normal: {
    id: 'normal',
    label: '普通',
    emoji: '🌤',
    mood: 'normal',
    availability: 'open',
    cause: null,
    tone: 'neutral',
    showRequestChips: false,
    revisitRequired: false,
    defaultRevisitOptionId: 'undecided',
  },
  bad_open: {
    id: 'bad_open',
    label: 'いまはあまり元気じゃない（話しかけていい）',
    emoji: '🌧',
    mood: 'upset',
    availability: 'open',
    cause: 'unspecified',
    tone: 'negative',
    showRequestChips: true,
    revisitRequired: false,
    defaultRevisitOptionId: 'h1',
  },
  bad_not_partner: {
    id: 'bad_not_partner',
    label: 'いまは話したくない（あなたとは関係ない）',
    emoji: '🌙',
    mood: 'upset',
    availability: 'wait',
    cause: 'not_partner',
    tone: 'negative',
    showRequestChips: true,
    revisitRequired: false,
    defaultRevisitOptionId: 'h1',
  },
  bad_down: {
    id: 'bad_down',
    label: '気分が落ちている',
    emoji: '🍂',
    mood: 'down',
    availability: 'light',
    cause: null,
    tone: 'negative',
    showRequestChips: true,
    revisitRequired: false,
    defaultRevisitOptionId: 'h1',
  },
  bad_cooldown: {
    id: 'bad_cooldown',
    label: '冷静になりたい',
    emoji: '🫧',
    mood: 'upset',
    availability: 'wait',
    cause: 'unspecified',
    tone: 'negative',
    showRequestChips: true,
    revisitRequired: true,
    defaultRevisitOptionId: 'h1',
  },
  bad_talk_now: {
    id: 'bad_talk_now',
    label: 'いま話したい',
    emoji: '💬',
    mood: 'upset',
    availability: 'want_talk',
    cause: 'partner',
    tone: 'negative',
    showRequestChips: true,
    revisitRequired: false,
    defaultRevisitOptionId: 'h1',
  },
  busy: {
    id: 'busy',
    label: '忙しい・集中したい',
    emoji: '🎧',
    mood: 'normal',
    availability: 'wait',
    cause: null,
    tone: 'neutral',
    showRequestChips: false,
    revisitRequired: false,
    defaultRevisitOptionId: 'h1',
  },
  tired: {
    id: 'tired',
    label: '疲れた・眠い',
    emoji: '😴',
    mood: 'tired',
    availability: 'light',
    cause: null,
    tone: 'neutral',
    showRequestChips: false,
    revisitRequired: false,
    defaultRevisitOptionId: 'h1',
  },
  happy_talk: {
    id: 'happy_talk',
    label: '嬉しい・聞いてほしい',
    emoji: '🌼',
    mood: 'good',
    availability: 'want_talk',
    cause: null,
    tone: 'positive',
    showRequestChips: true,
    revisitRequired: false,
    defaultRevisitOptionId: 'undecided',
  },
}

export const PRESET_LIST: SignalPreset[] = PRESET_IDS.map(
  (id) => SIGNAL_PRESETS[id],
)

export const NOTE_MAX_LENGTH = 40
export const NICKNAME_MIN_LENGTH = 1
export const NICKNAME_MAX_LENGTH = 12
export const MAX_REVISIT_HOURS = 24

export function isPresetId(value: string): value is PresetId {
  return (PRESET_IDS as readonly string[]).includes(value)
}

export function isNegativePreset(id: PresetId): boolean {
  return SIGNAL_PRESETS[id].tone === 'negative'
}

export type SignalRecord = {
  preset: PresetId
  mood: Mood
  availability: Availability
  cause: Cause | null
  request_tags: RequestTag[]
  note: string | null
  revisit_at: Date | null
  expires_at: Date
  extend_count: number
  updated_at: Date
}

export function expandPreset(
  presetId: PresetId,
  extras?: {
    request_tags?: RequestTag[]
    note?: string | null
    cause?: Cause | null
  },
): Pick<
  SignalRecord,
  'preset' | 'mood' | 'availability' | 'cause' | 'request_tags' | 'note'
> {
  const preset = SIGNAL_PRESETS[presetId]
  return {
    preset: presetId,
    mood: preset.mood,
    availability: preset.availability,
    cause: extras?.cause ?? preset.cause,
    request_tags: extras?.request_tags ?? [],
    note: extras?.note ?? null,
  }
}
