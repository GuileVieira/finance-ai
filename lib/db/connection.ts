import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Verificar se DATABASE_URL está configurado
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️ DATABASE_URL não está configurado. Usando modo de desenvolvimento.');
}

// Criar instância do Drizzle para PostgreSQL usando DATABASE_URL
export const db = databaseUrl ? drizzle(databaseUrl, { schema }) : null;

export default db;