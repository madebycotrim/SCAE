import { z } from 'zod';

/**
 * Esquema para validação de Equipes.
 */
export const esquemaEquipe = z.object({
    id: z.string().min(1, 'ID da equipe (slug) é obrigatório').max(50),
    nome_equipe: z.string().min(3, 'Nome da equipe deve ter pelo menos 3 caracteres'),
    cor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Cor inválida').optional(),
    tts_alias: z.string().nullable().optional(),
    criado_em: z.string().optional()
});

/**
 * Esquema para validação de Grupos de Equipe.
 */
export const esquemaGrupoEquipe = z.object({
    id: z.string().uuid('ID do grupo deve ser um UUID válido').optional(),
    equipe_id: z.string().min(1, 'ID da equipe é obrigatório'),
    nome_grupo: z.string().min(2, 'Nome do grupo é obrigatório'),
    escala_tipo: z.enum(['FIXA', 'ALTERNADA']),
    escala_dias: z.string().refine((val) => {
        try {
            JSON.parse(val);
            return true;
        } catch {
            return false;
        }
    }, 'Escala de dias deve ser um JSON válido'),
    criado_em: z.string().optional()
});

export type DadosEquipe = z.infer<typeof esquemaEquipe>;
export type DadosGrupoEquipe = z.infer<typeof esquemaGrupoEquipe>;
