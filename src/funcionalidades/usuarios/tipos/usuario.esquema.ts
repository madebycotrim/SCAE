import { z } from 'zod';

export const PAPEIS_PERMITIDOS = ['CENTRAL', 'ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO', 'VISUALIZACAO'] as const;
export type PapelUsuario = typeof PAPEIS_PERMITIDOS[number];

export const usuarioSchema = z.object({
    email: z.string().email('Formato de e-mail inválido').min(5, 'O e-mail é obrigatório'),
    papel: z.enum(PAPEIS_PERMITIDOS),
    ativo: z.boolean().default(true),
    nome_completo: z.string().optional().nullable()
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;

// Tipo para exibição no frontend (inclui campos adicionais da API)
export interface UsuarioVisualizacao extends UsuarioFormData {
    escola_id?: string;
    criado_em?: string;
    atualizado_em?: string;
    pendente?: boolean;
    criado_por?: string;
}
