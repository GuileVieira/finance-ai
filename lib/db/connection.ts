import { drizzle } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

// Verificar se DATABASE_URL está configurado
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Criar instância do Drizzle para PostgreSQL usando DATABASE_URL
export const db = drizzle(databaseUrl, { schema });

/**
 * Executa uma operação no banco de dados com uma sessão de usuário identificada,
 * permitindo que o Row-Level Security (RLS) funcione corretamente.
 */
export async function withUser<T>(userId: string, callback: (tx: any) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    // Define a variável de sessão para o RLS
    // O SET LOCAL garante que o valor vale apenas para esta transação
    await tx.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
    return callback(tx);
  });
}

export default db;