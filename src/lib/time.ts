import { format } from 'date-fns';

/** The browser's IANA zone, e.g. "America/Los_Angeles". */
export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Turns the two pickers' wall-clock values into an absolute instant.
 *
 * `new Date('2031-06-15T12:00:00')` — no trailing Z, no offset — is parsed in
 * the browser's own zone, which is the moment the sender actually meant. The
 * naive string must never leave the client: the edge function runs in UTC and
 * would read the same text as noon UTC.
 */
export function toInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

/** Today in the sender's zone, formatted the way a date input wants its `min`. */
export function todayLocal(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function describeUnlock(instant: Date, timeZone: string): string {
  return `${format(instant, "MMMM d, yyyy 'at' h:mm a")} (${timeZone})`;
}
