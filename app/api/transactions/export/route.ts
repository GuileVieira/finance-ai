import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/get-session';
import TransactionsService, { TransactionFilters } from '@/lib/services/transactions.service';
import { initializeDatabase } from '@/lib/db/init-db';

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 [EXPORT-API] Starting export request processing');
        await initializeDatabase();

        const session = await requireAuth();
        console.log('👤 [EXPORT-API] User authenticated:', session.userId);

        let body = {};
        try {
            body = await request.json();
        } catch (e) {
            console.warn('⚠️ [EXPORT-API] No JSON body found or invalid JSON');
        }

        // Extract filters from body
        // Ensure we handle defaults safely
        const filters: TransactionFilters & { limit?: number; page?: number } = {
            companyId: session.companyId,
            ...body,
            // Force no pagination for export (or very large limit)
            limit: 1000000,
            page: 1,
        };

        console.log('📊 [EXPORT-API] Exporting transactions with filters:', JSON.stringify(filters, null, 2));

        const result = await TransactionsService.getTransactions(filters);
        const transactions = result.transactions;

        console.log(`✅ [EXPORT-API] Found ${transactions?.length || 0} transactions`);

        if (!transactions || transactions.length === 0) {
            console.log('Empty transactions list');
            // Return CSV with just headers if empty
            const headers = [
                'Data',
                'Descrição',
                'Categoria',
                'Conta',
                'Valor',
                'Tipo',
                'Status'
            ].join(',');

            return new NextResponse(headers, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="transacoes-vazia-${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        }

        // Generate CSV
        const headers = [
            'Data',
            'Descrição',
            'Categoria',
            'Conta',
            'Valor',
            'Tipo',
            'Status'
        ].join(',');

        const rows = transactions.map((t: any) => {
            try {
                const date = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('pt-BR') : '';
                // Escape quotes in description and memo
                const description = `"${(t.description || '').replace(/"/g, '""')}"`;
                const category = `"${(t.categoryName || 'Sem Categoria').replace(/"/g, '""')}"`;
                const account = `"${(t.accountName || '').replace(/"/g, '""')}"`;
                const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0);
                const formattedAmount = amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                const type = t.type === 'credit' ? 'Receita' : 'Despesa';
                const status = t.verified ? 'Verificado' : 'Pendente';

                return [
                    date,
                    description,
                    category,
                    account,
                    formattedAmount,
                    type,
                    status
                ].join(',');
            } catch (rowError) {
                console.error('❌ Error processing transaction row:', rowError, t);
                return '';
            }
        }).filter(row => row !== ''); // Filter out failed rows

        const csvContent = [headers, ...rows].join('\n');
        console.log('📝 [EXPORT-API] CSV generated successfully, length:', csvContent.length);

        // Return CSV file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="transacoes-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error('❌ Error exporting transactions:', error);
        // Print full error stack
        if (error instanceof Error) {
            console.error(error.stack);
        }
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal Server Error', stack: error instanceof Error ? error.stack : undefined },
            { status: 500 }
        );
    }
}
