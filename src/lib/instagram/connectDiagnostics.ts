/**
 * Temporary, safe structured logging for diagnosing the "Connect
 * Instagram" callback flow in production (Vercel function logs). This
 * file changes NO behavior — every call site here is a pure log
 * statement alongside logic that already exists unchanged.
 *
 * Hard rule enforced by convention at every call site (not by any
 * runtime check — there is nothing here to redact, because nothing
 * sensitive is ever passed in): NEVER pass an access token, the Meta
 * app secret, the OAuth authorization code, or any encrypted token
 * ciphertext into `details`. Only structural facts — which stage was
 * reached, counts, booleans, non-secret ids (Page id, Instagram account
 * id, username — all already public-ish/display data), and Meta's own
 * public error codes/messages (never the credentials used to make the
 * call that produced them).
 */
import 'server-only'

const PREFIX = '[Instagram Connect Diagnostic]'

export function logConnectStage(stage: string, details?: Record<string, unknown>): void {
  if (details) {
    console.log(PREFIX, stage, JSON.stringify(details))
  } else {
    console.log(PREFIX, stage)
  }
}
