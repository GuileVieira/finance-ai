import { z } from 'zod';

export const accountSchema = z.object({
    company_id: z.string().min(1, 'Empresa é obrigatória'),
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    bank_name: z.string().optional(),
    bank_code: z.string().min(1, 'Banco é obrigatório'),
    agency_number: z.string().optional(),
    account_number: z.string().min(1, 'Número da conta é obrigatório'),
    account_type: z.enum(['checking', 'savings', 'investment']),
    opening_balance: z.number(),
    active: z.boolean().default(true),
});

export type AccountSchema = z.infer<typeof accountSchema>;
