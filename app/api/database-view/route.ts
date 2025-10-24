import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Esta é uma página HTML simples para visualizar dados do banco
    const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visualizador do Banco de Dados</title>
        <script src="https://unpkg.com/htmx.org@1.9.10/dist/htmx.min.js"></script>
        <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
        <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; background: #f3f4f6; }
            .container { max-width: 1200px; margin: 0 auto; }
            .card { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
            .stat { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .stat h3 { margin: 0; font-size: 14px; opacity: 0.9; }
            .stat .number { font-size: 32px; font-weight: bold; margin: 10px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f9fafb; font-weight: 600; }
            tr:hover { background: #f9fafb; }
            .btn { background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; }
            .btn:hover { background: #2563eb; }
            .badge { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .credit { background: #10b981; color: white; }
            .debit { background: #ef4444; color: white; }
            .revenue { background: #059669; color: white; }
            .cost { background: #f59e0b; color: white; }
        </style>
    </head>
    <body x-data="{
        stats: { companies: 0, accounts: 0, categories: 0, transactions: 0, uploads: 0 },
        tables: { companies: [], accounts: [], categories: [], transactions: [] },
        loading: true,
        error: null
    }" x-init="loadData()">
        <div class="container">
            <div class="card">
                <h1 style="margin: 0 0 20px 0; color: #1f2937;">🗄️ Visualizador do Banco de Dados Financeiro</h1>
                <p style="color: #6b7280; margin: 0 0 20px 0;">
                    Sistema PGLite + Drizzle ORM | Arquivo: storage_tmp/database.db
                </p>

                <!-- Estatísticas -->
                <div class="stats" x-show="!loading">
                    <div class="stat">
                        <h3>🏢 Empresas</h3>
                        <div class="number" x-text="stats.companies"></div>
                    </div>
                    <div class="stat">
                        <h3>🏦 Contas</h3>
                        <div class="number" x-text="stats.accounts"></div>
                    </div>
                    <div class="stat">
                        <h3>📊 Categorias</h3>
                        <div class="number" x-text="stats.categories"></div>
                    </div>
                    <div class="stat">
                        <h3>📝 Transações</h3>
                        <div class="number" x-text="stats.transactions"></div>
                    </div>
                    <div class="stat">
                        <h3>📁 Uploads</h3>
                        <div class="number" x-text="stats.uploads"></div>
                    </div>
                </div>

                <div x-show="loading" style="text-align: center; padding: 40px;">
                    <div style="color: #3b82f6;">⏳ Carregando dados do banco...</div>
                </div>

                <div x-show="error" style="text-align: center; padding: 40px;">
                    <div style="color: #ef4444;">❌ Erro: <span x-text="error"></span></div>
                    <button class="btn" onclick="loadData()" style="margin-top: 20px;">Tentar Novamente</button>
                </div>

                <!-- Botão de atualização -->
                <div x-show="!loading" style="margin: 20px 0;">
                    <button class="btn" onclick="loadData()">🔄 Atualizar Dados</button>
                </div>

                <!-- Tabela de Transações Recentes -->
                <div x-show="!loading && tables.transactions.length > 0">
                    <h3 style="color: #1f2937; margin-bottom: 15px;">📋 Transações Recentes</h3>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Descrição</th>
                                <th>Tipo</th>
                                <th>Valor</th>
                                <th>Categoria</th>
                                <th>Conta</th>
                            </tr>
                        </thead>
                        <tbody>
                            <template x-for="transaction in tables.transactions.slice(0, 20)" :key="transaction.id">
                                <tr>
                                    <td x-text="new Date(transaction.transaction_date).toLocaleDateString('pt-BR')"></td>
                                    <td x-text="transaction.description"></td>
                                    <td>
                                        <span class="badge"
                                              :class="transaction.type === 'credit' ? 'credit' : 'debit'"
                                              x-text="transaction.type === 'credit' ? 'Crédito' : 'Débito'">
                                        </span>
                                    </td>
                                    <td>
                                        <span :style="transaction.type === 'credit' ? 'color: #10b981; font-weight: bold;' : 'color: #ef4444; font-weight: bold;'">
                                            <span x-text="transaction.type === 'credit' ? '+' : '-'"></span>
                                            R$ <span x-text="Math.abs(Number(transaction.amount)).toFixed(2)"></span>
                                        </span>
                                    </td>
                                    <td x-text="transaction.categoryName || 'Não classificado'"></td>
                                    <td x-text="transaction.accountName || 'N/A'"></td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>

                <!-- Categorias -->
                <div x-show="!loading && tables.categories.length > 0" style="margin-top: 30px;">
                    <h3 style="color: #1f2937; margin-bottom: 15px;">📊 Categorias</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
                        <template x-for="category in tables.categories" :key="category.id">
                            <div class="card" style="padding: 15px;">
                                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                                    <div style="width: 20px; height: 20px; background: #6b7280; border-radius: 4px; margin-right: 10px;"></div>
                                    <div>
                                        <strong x-text="category.name"></strong>
                                        <span class="badge"
                                              :class="category.type === 'revenue' ? 'revenue' : 'cost'"
                                              :style="category.color_hex ? \`background: \${category.color_hex};\` : ''"
                                              x-text="category.type">
                                        </span>
                                    </div>
                                </div>
                                <div style="color: #6b7280; font-size: 14px;">
                                    Tipo: <span x-text="category.type"></span>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <script>
            async function loadData() {
                Alpine.store.app.loading = true;
                Alpine.store.app.error = null;

                try {
                    // Carregar estatísticas
                    const statsResponse = await fetch('/api/test');
                    const statsData = await statsResponse.json();
                    if (statsData.success) {
                        Alpine.store.app.stats = statsData.data.statistics;
                    }

                    // Carregar transações
                    const transactionsResponse = await fetch('/api/transactions?limit=50');
                    const transactionsData = await transactionsResponse.json();
                    if (transactionsData.success) {
                        Alpine.store.app.tables.transactions = transactionsData.data.transactions || [];
                    }

                    // Carregar categorias (via API companies)
                    const companiesResponse = await fetch('/api/companies');
                    const companiesData = await companiesResponse.json();
                    if (companiesData.success) {
                        Alpine.store.app.tables.companies = companiesData.data.companies || [];
                    }

                } catch (error) {
                    Alpine.store.app.error = error.message;
                } finally {
                    Alpine.store.app.loading = false;
                }
            }

            // Auto-atualizar a cada 30 segundos
            setInterval(loadData, 30000);
        </script>
    </body>
    </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}