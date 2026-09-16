/**
 * Generates a password hash for AUTH_PASSWORD_HASH in .env, using the same
 * scrypt implementation nuxt-auth-utils uses to verify it at login time.
 *
 * Usage: npm run auth:hash -- "your-password"
 */
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'

const password = process.argv[2]

if (!password) {
  console.error('Usage: npm run auth:hash -- "your-password"')
  process.exit(1)
}

const hash = new Hash(new Scrypt({}))
const hashed = await hash.make(password)

console.log('NUXT_AUTH_PASSWORD_HASH for local `npm run dev` (paste as-is):')
console.log(hashed)
console.log()
console.log('NUXT_AUTH_PASSWORD_HASH for docker compose (env_file values go through')
console.log('Compose variable interpolation, so every literal $ must be escaped as $$):')
console.log(hashed.replaceAll('$', '$$$$'))
