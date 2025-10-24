const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Diretório dos exemplos
const examplesDir = path.join(__dirname, '../docs/examples');

// Função para analisar todos os arquivos Excel
function analyzeAllFiles() {
  const results = {
    summary: {
      totalFiles: 0,
      totalSheets: 0,
      banks: [],
      fileTypes: {}
    },
    files: {},
    allSheets: [],
    categories: new Set(),
    transactionPatterns: new Set()
  };

  // Arquivos encontrados
  const files = [
    'extratos/Extrato CEF ago23.xls',
    'extratos/2023.08 - KINGX - Extrato Itaú.xlsx',
    'extratos/2023.08 - KINGX - Pagamentos Itaú.xls',
    'extratos/Extrato BB ago23.xlsx',
    'extratos/Extrato Santander Ago23.xls',
    'extratos/Agosto Safra .xls',
    'extratos/MovimentaçãoPixBB ago23.xls',
    'planilhas/XMIND - GESTÃO CAIXA KING X v92.1.xlsx'
  ];

  files.forEach(fileName => {
    const filePath = path.join(examplesDir, fileName);

    try {
      if (fs.existsSync(filePath)) {
        console.log(`🔍 Analisando: ${fileName}`);
        const fileAnalysis = analyzeExcelFile(filePath, fileName);

        results.files[fileName] = fileAnalysis;
        results.summary.totalFiles++;
        results.summary.totalSheets += fileAnalysis.sheets.length;

        // Adicionar informações ao resumo
        if (fileAnalysis.bank) {
          if (!results.summary.banks.includes(fileAnalysis.bank)) {
            results.summary.banks.push(fileAnalysis.bank);
          }
        }

        // Coletar todas as abas
        fileAnalysis.sheets.forEach(sheet => {
          results.allSheets.push({
            file: fileName,
            sheetName: sheet.name,
            type: sheet.type,
            rowCount: sheet.rowCount,
            columnCount: sheet.columnCount,
            headers: sheet.headers,
            sampleData: sheet.sampleData,
            bank: fileAnalysis.bank
          });

          // Extrair categorias e padrões
          if (sheet.sampleData && sheet.sampleData.length > 0) {
            sheet.sampleData.forEach(row => {
              // Provar colunas que possam conter categorias
              Object.values(row).forEach(value => {
                if (typeof value === 'string' && value.length > 0) {
                  // Padrões de categorias comuns
                  if (value.includes('Aluguel') || value.includes('Salário') ||
                      value.includes('Fornecedor') || value.includes('Cliente') ||
                      value.includes('Serviço') || value.includes('Produto') ||
                      value.includes('Imposto') || value.includes('Taxa') ||
                      value.includes('Receita') || value.includes('Despesa')) {
                    results.categories.add(value);
                  }

                  // Padrões de transações
                  if (value.includes('PIX') || value.includes('TED') ||
                      value.includes('DOC') || value.includes('Transferência') ||
                      value.includes('Pagamento') || value.includes('Depósito') ||
                      value.includes('Saque') || value.includes('Estorno')) {
                    results.transactionPatterns.add(value);
                  }
                }
              });
            });
          }
        });

        console.log(`✅ Concluído: ${fileName} (${fileAnalysis.sheets.length} abas)`);
      } else {
        console.log(`❌ Arquivo não encontrado: ${fileName}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao analisar ${fileName}:`, error.message);
    }
  });

  // Converter Sets para Arrays
  results.categories = Array.from(results.categories).sort();
  results.transactionPatterns = Array.from(results.transactionPatterns).sort();

  return results;
}

// Função para analisar um arquivo Excel específico
function analyzeExcelFile(filePath, fileName) {
  const workbook = XLSX.readFile(filePath);
  const sheets = [];

  // Identificar banco pelo nome do arquivo
  let bank = null;
  if (fileName.includes('BB') || fileName.includes('Banco do Brasil')) bank = 'Banco do Brasil';
  else if (fileName.includes('Itaú')) bank = 'Itaú';
  else if (fileName.includes('Santander')) bank = 'Santander';
  else if (fileName.includes('CEF') || fileName.includes('Caixa')) bank = 'Caixa Econômica Federal';
  else if (fileName.includes('Safra')) bank = 'Banco Safra';
  else if (fileName.includes('XMIND') || fileName.includes('KING X')) bank = 'XMIND - KING X';

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (jsonData.length > 0) {
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1, Math.min(6, jsonData.length)); // Primeiras 5 linhas de dados

      // Determinar tipo da aba baseado no nome e conteúdo
      let sheetType = 'unknown';
      const sheetNameLower = sheetName.toLowerCase();

      if (sheetNameLower.includes('extrato') || sheetNameLower.includes('movimento') ||
          sheetNameLower.includes('transação') || sheetNameLower.includes('lançamento')) {
        sheetType = 'transactions';
      } else if (sheetNameLower.includes('resumo') || sheetNameLower.includes('saldo') ||
                 sheetNameLower.includes('consolidado')) {
        sheetType = 'summary';
      } else if (sheetNameLower.includes('categoria') || sheetNameLower.includes('classificação') ||
                 sheetNameLower.includes('grupo')) {
        sheetType = 'categories';
      } else if (sheetNameLower.includes('fluxo') || sheetNameLower.includes('cash flow') ||
                 sheetNameLower.includes('caixa')) {
        sheetType = 'cash_flow';
      } else if (sheetNameLower.includes('receita') || sheetNameLower.includes('despesa') ||
                 sheetNameLower.includes('dre') || sheetNameLower.includes('resultado')) {
        sheetType = 'financial_statement';
      } else if (sheetNameLower.includes('pix') || sheetNameLower.includes('pagamento') ||
                 sheetNameLower.includes('transferência')) {
        sheetType = 'payments';
      }

      sheets.push({
        name: sheetName,
        type: sheetType,
        rowCount: jsonData.length,
        columnCount: headers ? headers.length : 0,
        headers: headers,
        sampleData: dataRows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        })
      });
    }
  });

  return {
    fileName,
    bank,
    sheetCount: workbook.SheetNames.length,
    sheets
  };
}

// Função principal
function main() {
  console.log('🚀 Iniciando análise de arquivos financeiros...\n');

  const analysis = analyzeAllFiles();

  // Salvar resultado completo
  const outputPath = path.join(__dirname, '../docs/analysis-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));

  // Gerar relatório legível
  generateReadableReport(analysis);

  console.log('\n✅ Análise concluída!');
  console.log(`📊 Resultados salvos em: ${outputPath}`);
}

// Gerar relatório legível
function generateReadableReport(analysis) {
  let report = '# Análise de Arquivos Financeiros - FinanceAI\n\n';

  // Resumo
  report += '## 📊 Resumo Geral\n\n';
  report += `- **Total de Arquivos**: ${analysis.summary.totalFiles}\n`;
  report += `- **Total de Abas**: ${analysis.summary.totalSheets}\n`;
  report += `- **Bancos Identificados**: ${analysis.summary.banks.join(', ')}\n`;
  report += `- **Categorias Encontradas**: ${analysis.categories.length}\n`;
  report += `- **Padrões de Transação**: ${analysis.transactionPatterns.length}\n\n`;

  // Categorias encontradas
  if (analysis.categories.length > 0) {
    report += '## 🏷️ Categorias Financeiras Identificadas\n\n';
    analysis.categories.forEach(category => {
      report += `- ${category}\n`;
    });
    report += '\n';
  }

  // Padrões de transação
  if (analysis.transactionPatterns.length > 0) {
    report += '## 💳 Padrões de Transação Identificados\n\n';
    analysis.transactionPatterns.forEach(pattern => {
      report += `- ${pattern}\n`;
    });
    report += '\n';
  }

  // Detalhes por arquivo
  report += '## 📁 Detalhes por Arquivo\n\n';

  Object.entries(analysis.files).forEach(([fileName, fileData]) => {
    report += `### ${fileName}\n\n`;
    if (fileData.bank) {
      report += `**Banco**: ${fileData.bank}\n`;
    }
    report += `**Abas**: ${fileData.sheets.length}\n\n`;

    fileData.sheets.forEach(sheet => {
      report += `#### ${sheet.name} (${sheet.type})\n`;
      report += `- Linhas: ${sheet.rowCount}\n`;
      report += `- Colunas: ${sheet.columnCount}\n`;
      if (sheet.headers && sheet.headers.length > 0) {
        report += `- Headers: ${sheet.headers.slice(0, 8).join(', ')}${sheet.headers.length > 8 ? '...' : ''}\n`;
      }
      if (sheet.sampleData && sheet.sampleData.length > 0) {
        report += `- Amostra de dados: ${sheet.sampleData.length} linhas\n`;
      }
      report += '\n';
    });
  });

  // Salvar relatório
  const reportPath = path.join(__dirname, '../docs/analysis-report.md');
  fs.writeFileSync(reportPath, report);

  console.log(`📄 Relatório legível salvo em: ${reportPath}`);
}

// Executar análise
if (require.main === module) {
  main();
}

module.exports = { analyzeAllFiles, analyzeExcelFile };