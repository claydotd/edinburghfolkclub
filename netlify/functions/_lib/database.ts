let databaseConfigured: boolean | undefined

export async function getDatabaseClient() {
  const { getDatabase } = await import('@netlify/database')
  return getDatabase()
}

/**
 * Admin-only. Throws only for unexpected database errors.
 * A missing Netlify Database does not open a connection.
 * Public reads must not call this.
 */
export async function databaseIsConfigured(): Promise<boolean> {
  if (databaseConfigured !== undefined) return databaseConfigured
  try {
    await getDatabaseClient()
    databaseConfigured = true
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (
      message.includes('not been configured') ||
      message.includes('connectionString')
    ) {
      databaseConfigured = false
    } else {
      throw err
    }
  }
  return databaseConfigured
}
