import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)
  const { authUsername, authPasswordHash, authPasswordHashBase64 } = useRuntimeConfig()

  const username = authUsername.trim()
  const passwordHash = resolvePasswordHash(authPasswordHash, authPasswordHashBase64)

  if (!username || !passwordHash) {
    throw createError({ statusCode: 500, statusMessage: 'Authentication is not configured' })
  }

  const validUsername = body.username === username
  const validPassword = validUsername && (await verifyPassword(passwordHash, body.password))

  if (!validUsername || !validPassword) {
    // Safe to log: lengths and a format check, never the actual secret.
    // Enough to tell apart "wrong username", "hash didn't decode/parse",
    // and "hash decoded fine but just doesn't match this password" from
    // the logs alone, without needing shell access to the container.
    logger.warn('Login attempt failed', {
      requestId: event.context.requestId,
      usernameMatched: validUsername,
      configuredUsernameLength: username.length,
      suppliedUsernameLength: body.username.length,
      hashSource: authPasswordHashBase64.trim() ? 'base64' : authPasswordHash.trim() ? 'raw' : 'none',
      resolvedHashLength: passwordHash.length,
      resolvedHashLooksValid: passwordHash.startsWith('$scrypt$'),
    })
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  await setUserSession(event, {
    user: { username: body.username },
    loggedInAt: new Date().toISOString(),
  })

  return { ok: true }
})
