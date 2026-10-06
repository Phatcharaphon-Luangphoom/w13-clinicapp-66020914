import sql from 'mssql';

const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;

export async function getPool() {
  if (!connectionString) {
    throw new Error('database_not_configured');
  }
  return await sql.connect(connectionString);
}

export { sql };