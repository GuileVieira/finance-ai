import { mockCategories } from '../lib/mock-categories';

console.log('Total de categorias:', mockCategories.length);

// Contar por tipo
const byType = mockCategories.reduce((acc, cat) => {
    acc[cat.type] = (acc[cat.type] || 0) + 1;
    return acc;
}, {} as Record<string, number>);

console.log('\nPor tipo:');
Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
});

// Contar por dreGroup
const byDreGroup = mockCategories.reduce((acc, cat) => {
    acc[cat.dreGroup || 'N/A'] = (acc[cat.dreGroup || 'N/A'] || 0) + 1;
    return acc;
}, {} as Record<string, number>);

console.log('\nPor dreGroup:');
Object.entries(byDreGroup).forEach(([group, count]) => {
    console.log(`  ${group}: ${count}`);
});

// Contar por categoryGroup
const byCategoryGroup = mockCategories.reduce((acc, cat) => {
    acc[cat.categoryGroup || 'N/A'] = (acc[cat.categoryGroup || 'N/A'] || 0) + 1;
    return acc;
}, {} as Record<string, number>);

console.log('\nPor categoryGroup:');
Object.entries(byCategoryGroup).forEach(([group, count]) => {
    console.log(`  ${group}: ${count}`);
});
