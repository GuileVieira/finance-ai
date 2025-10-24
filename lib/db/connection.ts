import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Criar instância do Drizzle para PostgreSQL usando DATABASE_URL
export const db = drizzle(process.env.DATABASE_URL!, { schema });

export default db;