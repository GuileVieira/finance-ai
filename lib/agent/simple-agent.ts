// Simple Agent - Front-end Wrapper para API principal
// Este é apenas um wrapper para testes que chama a API work-categorize

export const agentTools = []; // Sem ferramentas próprias - usa API principal

export async function runSimpleAgent(
  description: string,
  amount: number
): Promise<{
  category: string;
  confidence: number;
  reasoning: string;
  source: 'rule_based' | 'ai' | 'company_research';
  processingTime: number;
}> {
  const startTime = Date.now();

  try {
    console.log('🔄 Simple Agent: Chamando API principal (work-categorize)...');

    // Chamar a API principal de categorização
    const response = await fetch('http://localhost:3000/api/ai/work-categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        amount,
        // Passar contexto adicional se disponível
        memo: undefined,
        fileName: undefined,
        bankName: undefined,
        date: undefined,
        balance: undefined
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Erro na API de categorização');
    }

    const data = result.data;

    console.log('✅ Simple Agent: Resposta da API principal recebida:', data);

    return {
      category: data.category,
      confidence: data.confidence,
      reasoning: data.reasoning || 'Classificado via API principal',
      source: data.source || 'ai',
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    console.error('❌ Simple Agent: Erro ao chamar API principal:', error);

    return {
      category: "Utilidades e Insumos",
      confidence: 0.1,
      reasoning: `Erro no wrapper: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      source: 'ai',
      processingTime: Date.now() - startTime
    };
  }
}