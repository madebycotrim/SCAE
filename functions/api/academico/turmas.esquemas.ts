import { z } from 'zod';

export const esquemaTurma = z.object({
    id: z.string().min(1, 'ID da turma é obrigatório').max(50),
    serie: z.string().nullable().optional(),
    letra: z.string().nullable().optional(),
    turno: z.string().nullable().optional(),
    ano_letivo: z.number().int().optional(),
    criado_em: z.string().optional()
});

export type DadosCriacaoTurma = z.infer<typeof esquemaTurma>;
