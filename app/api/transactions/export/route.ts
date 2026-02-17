import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/get-session';
import TransactionsService, { TransactionFilters } from '@/lib/services/transactions.service';
import { initializeDatabase } from '@/lib/db/init-db';
import { createLogger } from '@/lib/logger';

const log = createLogger('tx-export');

export async function POST(request: NextRequest) {
    try {
        log.info('Starting export request processing');
        await initializeDatabase();

        const session = await requireAuth();
        log.info({ userId: session.userId }, 'User authenticated');

        let body = {};
        try {
            body = await request.json();
        } catch (e) {
            log.warn('No JSON body found or invalid JSON');
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

        log.info({ filters }, 'Exporting transactions with filters');

        const result = await TransactionsService.getTransactions(filters);
        const transactions = result.transactions;

        log.info({ count: transactions?.length || 0 }, 'Found transactions');

        if (!transactions || transactions.length === 0) {
            log.info('Empty transactions list');
            // Return CSV with just headers if empty
            const headers = [
                'Data',
                'Descrição',
                'Categoria',
                'Conta',
                'Valor',
                'Tipo',
                'Conciliado'
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
            'Conciliado'
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
                log.error({ err: rowError, transactionId: t.id }, 'Error processing transaction row');
                return '';
            }
        }).filter(row => row !== ''); // Filter out failed rows

        const csvContent = [headers, ...rows].join('\n');
        log.info({ length: csvContent.length }, 'CSV generated successfully');

        // Return CSV file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="transacoes-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        log.error({ err: error }, 'Error exporting transactions');
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Internal Server Error', stack: error instanceof Error ? error.stack : undefined },
            { status: 500 }
        );
    }
}
