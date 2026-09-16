import { z } from 'zod'

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)
  const { authUsername, authPasswordHash } = useRuntimeConfig()

  if (!authUsername || !authPasswordHash) {
    throw createError({ statusCode: 500, statusMessage: 'Authentication is not configured' })
  }

  const validUsername = body.username === authUsername
  const validPassword = validUsername && (await verifyPassword(authPasswordHash, body.password))

  if (!validUsername || !validPassword) {
    logger.warn('Login attempt failed', { requestId: event.context.requestId })
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  await setUserSession(event, {
    user: { username: body.username },
    loggedInAt: new Date().toISOString(),
  })

  return { ok: true }
})
