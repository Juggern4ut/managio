const PUBLIC_API_PATHS = ['/api/auth/login', '/api/health']

export default defineEventHandler(async (event) => {
  const path = (event.path ?? '').split('?').at(0) ?? ''

  if (!path.startsWith('/api/')) return
  if (PUBLIC_API_PATHS.some(publicPath => path.startsWith(publicPath))) return

  await requireUserSession(event)
})
