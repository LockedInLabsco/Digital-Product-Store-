/**
 * Minimal, permanent, production-safe event logging for the "Connect
 * Instagram" flow. Deliberately NOT a general-purpose debug logger: the
 * verbose per-call/per-Page diagnostic dumps used to root-cause the
 * business_management/no_pages production issue have been removed now
 * that it's fixed (see git history if that level of detail is ever
 * needed again for a new issue). What's left is a small, stable set of
 * lifecycle events — oauth_started, oauth_callback_success,
 * oauth_callback_failure, account_connected, account_reauthorized,
 * account_disconnected — intended to stay in place indefinitely as
 * ordinary operational logging, not a temporary investigation aid.
 *
 * Hard rule enforced by convention at every call site (not by any
 * runtime check — there is nothing here to redact, because nothing
 * sensitive is ever passed in): NEVER pass an access token, the Meta
 * app secret, the OAuth authorization code, or any encrypted token
 * ciphertext into `details`. Only structural facts — an error code, a
 * workspace/connected-account id, a boolean outcome.
 */
import 'server-only'

const PREFIX = '[Instagram Connect]'

export function logConnectStage(stage: string, details?: Record<string, unknown>): void {
  if (details) {
    console.log(PREFIX, stage, JSON.stringify(details))
  } else {
    console.log(PREFIX, stage)
  }
}
