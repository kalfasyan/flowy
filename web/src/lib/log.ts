import type { RecordModel } from 'pocketbase';

// What someone can log for a day; the values match backend/migrations/1761400000_cycle.go.

export type Flow = '' | 'spotting' | 'light' | 'medium' | 'heavy';

export interface DayLog extends RecordModel {
  user: string;
  date: string;
  flow: Flow;
  symptoms: string[];
  moods: string[];
  sex: '' | 'protected' | 'unprotected';
  pill: boolean;
  temperature: number;
  weight: number;
  notes: string;
}

export const flows: { value: Flow; label: string }[] = [
  { value: 'spotting', label: 'Spotting' },
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

/** Spotting is logged but doesn't count as a period. */
export const isBleeding = (flow: Flow) => flow === 'light' || flow === 'medium' || flow === 'heavy';

export const symptoms: { value: string; label: string; icon: string }[] = [
  { value: 'cramps', label: 'Cramps', icon: '🌀' },
  { value: 'headache', label: 'Headache', icon: '🤕' },
  { value: 'backache', label: 'Backache', icon: '🦴' },
  { value: 'bloating', label: 'Bloating', icon: '🎈' },
  { value: 'tender_breasts', label: 'Tender breasts', icon: '💗' },
  { value: 'acne', label: 'Acne', icon: '🔴' },
  { value: 'fatigue', label: 'Fatigue', icon: '🥱' },
  { value: 'nausea', label: 'Nausea', icon: '🤢' },
  { value: 'cravings', label: 'Cravings', icon: '🍫' },
  { value: 'insomnia', label: 'Insomnia', icon: '🌙' },
  { value: 'discharge', label: 'Discharge', icon: '💧' },
];

export const moods: { value: string; label: string; icon: string }[] = [
  { value: 'happy', label: 'Happy', icon: '😊' },
  { value: 'calm', label: 'Calm', icon: '😌' },
  { value: 'energetic', label: 'Energetic', icon: '⚡' },
  { value: 'sensitive', label: 'Sensitive', icon: '🥺' },
  { value: 'sad', label: 'Sad', icon: '😢' },
  { value: 'anxious', label: 'Anxious', icon: '😰' },
  { value: 'irritable', label: 'Irritable', icon: '😠' },
  { value: 'tired', label: 'Tired', icon: '😴' },
];

/** Whether a day log has anything in it worth keeping. */
export function isEmpty(log: Partial<DayLog>): boolean {
  return (
    !log.flow &&
    !log.symptoms?.length &&
    !log.moods?.length &&
    !log.sex &&
    !log.pill &&
    !log.temperature &&
    !log.weight &&
    !log.notes?.trim()
  );
}
