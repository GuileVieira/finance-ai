import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Verificar se DATABASE_URL está configurado
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Criar instância do Drizzle para PostgreSQL usando DATABASE_URL
export const db = drizzle(databaseUrl, { schema });

export default db;