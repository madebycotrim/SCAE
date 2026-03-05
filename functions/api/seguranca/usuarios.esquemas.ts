import { z } from 'zod';

export const esquemaUsuario = z.object({
    email: z.string().email('E-mail inválido'),
    nome_completo: z.string().min(3, 'Nome muito curto').nullable().optional(),
    papel: z.enum(['ADMIN', 'COORDENACAO', 'SECRETARIA', 'PORTEIRO']).optional(),
    ativo: z.boolean().default(true),
    criado_por: z.string().nullable().optional(),
    pendente: z.boolean().default(false),
    criado_em: z.string().optional()
});

export type DadosCriacaoUsuario = z.infer<typeof esquemaUsuario>;
