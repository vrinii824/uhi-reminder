
export interface Medication {
  id: string;
  name: string;
  time: string; // HH:mm format
  originalInput?: string | null;
  lastNotified?: string | null; // ISO date string for the last notification
  frequencyDescription?: string | null; // e.g., "twice a day", "every 8 hours"
  durationDays?: number | null;       // e.g., 7, 14, null or 0 for indefinite
  startDate?: string | null;          // YYYY-MM-DD format, null for immediate start
}
