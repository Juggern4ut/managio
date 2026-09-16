import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '../../db/schema'

let pool: Pool | undefined
let db: ReturnType<typeof drizzle<typeof schema>> | undefined

export function useDb() {
  if (!db) {
    const { databaseUrl } = useRuntimeConfig()
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured')
    }
    pool = new Pool({ connectionString: databaseUrl })
    db = drizzle(pool, { schema })
  }
  return db
}

export async function checkDbConnection() {
  await useDb().execute('select 1')
}
