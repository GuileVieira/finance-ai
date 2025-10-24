import { drizzle } from 'drizzle-orm/pglite-js';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';
import path from 'path';

// Caminho para o arquivo de banco de dados
const dbPath = path.join(process.cwd(), 'storage_tmp', 'database.db');

// Criar instância do PGLite
const client = new PGlite(dbPath);

// Criar instância do Drizzle com PGLite
export const db = drizzle(client, { schema });

// Exportar cliente para queries diretas se necessário
export { client };

export default db;