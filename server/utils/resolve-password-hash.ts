// Some deployment platforms' env var UIs mangle `$` (their own
// ${...}-style templating) or add a stray trailing newline/space —
// trimming both forms and preferring base64 (no special characters at
// all) sidesteps needing to know which platform-specific quirk happened.
export function resolvePasswordHash(authPasswordHash: string, authPasswordHashBase64: string): string {
  const base64 = authPasswordHashBase64.trim()
  if (base64) {
    return Buffer.from(base64, 'base64').toString('utf-8').trim()
  }
  return authPasswordHash.trim()
}
