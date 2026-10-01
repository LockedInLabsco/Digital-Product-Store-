/**
 * The single source of truth for what timezone "today"/"this week" means
 * in the Work system (e.g. a future daily-view engine deciding what's
 * due today, or a recurring-task engine deciding whether today matches a
 * recurrence rule). Centralized here — per the Phase 1 product decision —
 * specifically so it can later move into the existing site_settings
 * table (src/lib/supabase/settings.ts) and become configurable without
 * hunting down a hardcoded string anywhere else in the codebase.
 *
 * Not yet called from any Phase 1 code path (no daily view or recurrence
 * engine exists yet) — it exists now so later phases have one place to
 * import from instead of re-deciding this.
 */
export const WORK_TIMEZONE = 'Asia/Colombo'

/** Today's calendar date in WORK_TIMEZONE, as 'YYYY-MM-DD' — the same
 * shape as a Postgres `date` column, so it can be compared/stored
 * directly against due_date/start_date without further parsing. */
export function getWorkTimezoneToday(referenceDate: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: WORK_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate)
}
