import { db } from '../lib/db/connection';
import { sql } from 'drizzle-orm';

// Apple-inspired vibrant color palette - 20 distinct colors
const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#A855F7', // Purple
  '#0EA5E9', // Sky
  '#D946EF', // Fuchsia
  '#22C55E', // Green
  '#E11D48', // Rose
  '#2563EB', // Blue 600
  '#0891B2', // Cyan 600
  '#CA8A04', // Yellow 600
  '#7C3AED', // Violet 600
];

async function main() {
  const result = await db.execute(sql`SELECT id, name, color_hex FROM financeai_categories ORDER BY name`);
  
  // Handle both array and {rows} formats
  const categories: any[] = Array.isArray(result) ? result : (result as any).rows || [];
  
  console.log(`Found ${categories.length} categories`);
  
  if (categories.length === 0) {
    console.log('No categories found! Checking table...');
    const tables = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%categor%'`);
    const tableList: any[] = Array.isArray(tables) ? tables : (tables as any).rows || [];
    console.log('Tables found:', tableList);
    process.exit(1);
  }
  
  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const newColor = COLORS[i % COLORS.length];
    await db.execute(sql`UPDATE financeai_categories SET color_hex = ${newColor} WHERE id = ${cat.id}`);
    console.log(`  ${cat.name}: ${cat.color_hex} → ${newColor}`);
  }

  console.log('\nDone! All categories updated with vibrant colors.');
  process.exit(0);
}

main().catch(console.error);
