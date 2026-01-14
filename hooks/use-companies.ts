import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Company, CompanyFormData } from '@/lib/types/companies';
import { toast } from 'sonner';

// Keys Factory
export const companyKeys = {
    all: ['companies'] as const,
    lists: () => [...companyKeys.all, 'list'] as const,
    detail: (id: string) => [...companyKeys.all, 'detail', id] as const,
};

// --- Hooks ---

export function useCompanies() {
    return useQuery({
        queryKey: companyKeys.lists(),
        queryFn: async () => {
            const response = await fetch('/api/companies');
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Falha ao buscar empresas');
            }

            // O mapeamento já é feito na API/Frontend Page, mas aqui retornamos os dados "crus" da API ou mapeamos se necessário?
            // A API retorna `companiesWithRevenue` que tem `calculatedRevenue`.
            // Vamos assumir que o frontend page faz o mapApiToFrontend se precisar, ou podemos fazer aqui.
            // Para manter consistência com use-accounts, seria ideal mapear aqui se o tipo Company exigir snake_case.
            // Olhando app/settings/companies/page.tsx, ele faz o mapeamento.
            // Vamos retornar o dado "raw" da API e quem usar decide, ou melhor, vamos tipar como 'any' por enquanto ou criar um mapper.
            // Simplicidade: vamos retornar o objeto da API e o componente trata.
            return result.data.companies;
        },
        staleTime: 1000 * 60 * 5, // 5 min
    });
}

export function useCompaniesForSelect() {
    const { data: companies, isLoading } = useCompanies();

    const companyOptions = companies?.map((company: any) => ({
        value: company.id,
        label: company.name
        // cnpj?
    })) || [];

    return {
        companyOptions,
        isLoading
    };
}
