/**
 * Esquemas de validação Zod para a entidade Aluno (Regra 6).
 */
import { z } from 'zod';

export const esquemaAluno = z.object({
    matricula: z.string()
        .min(1, 'A matrícula é obrigatória')
        .max(20, 'A matrícula deve ter no máximo 20 caracteres'),
    nome_completo: z.string()
        .min(3, 'O nome deve ter no mínimo 3 caracteres')
        .max(100, 'O nome deve ter no máximo 100 caracteres'),
    turma_id: z.string().nullable().optional(),
    ativo: z.union([z.boolean(), z.number()]).transform(v => Boolean(v)).default(true),
    email_responsavel: z.string().email('E-mail do responsável inválido').nullable().optional().or(z.literal(''))
});

export type DadosCriacaoAluno = z.infer<typeof esquemaAluno>;
