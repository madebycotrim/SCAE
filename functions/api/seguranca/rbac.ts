/**
 * Sistema de Controle de Acesso Baseado em Papéis e Permissões (RBAC).
 *
 * Mapeamento central de quem o usuário é (Role) para o que ele pode fazer (Permission).
 * Isso remove as strings mágicas e fornece tipagem estrita para toda a lógica de segurança.
 */

export const Papel = {
    CENTRAL: 'CENTRAL',           // Dona do sistema (SCAE)
    ADMIN: 'ADMIN',               // Direção / TI da Escola
    COORDENACAO: 'COORDENACAO',   // Coordenação Pedagógica
    SECRETARIA: 'SECRETARIA',     // Secretaria de Matrículas
    PORTEIRO: 'PORTEIRO',         // Leitura de Entrada/Saída
    VISUALIZACAO: 'VISUALIZACAO'  // Acesso read-only a relatórios
} as const;

export type Papel = typeof Papel[keyof typeof Papel];

export const Permissao = {
    // Escolas (Tenant / Central)
    GERENCIAR_ESCOLAS: 'escolas:gerenciar',

    // Usuários e Configurações (Admin global da escola)
    GERENCIAR_USUARIOS: 'usuarios:gerenciar',
    GERENCIAR_CONFIGURACOES: 'configuracoes:gerenciar',
    VER_AUDITORIA: 'auditoria:ler',

    // Acadêmico (Alunos, Turmas)
    GERENCIAR_ACADEMICO: 'academico:gerenciar',
    VER_ACADEMICO: 'academico:ler',
    
    // Controle de Acesso (Registros, catracas)
    REGISTRAR_ACESSO: 'acesso:registrar',
    VER_ACESSO: 'acesso:ler',
    GERENCIAR_ACESSO: 'acesso:gerenciar',

    // Relatórios e Dashboards
    VER_RELATORIOS: 'relatorios:ler'
} as const;

export type Permissao = typeof Permissao[keyof typeof Permissao];

/**
 * Matriz de Permissões
 * Define exatamente quais capacidades cada Papel possui dentro do sistema.
 */
export const MatrizPermissoes: Record<Papel, Permissao[]> = {
    CENTRAL: [
        Permissao.GERENCIAR_ESCOLAS,
        Permissao.VER_AUDITORIA,
        Permissao.VER_RELATORIOS
    ],
    ADMIN: [
        Permissao.GERENCIAR_USUARIOS,
        Permissao.GERENCIAR_CONFIGURACOES,
        Permissao.VER_AUDITORIA,
        Permissao.GERENCIAR_ACADEMICO,
        Permissao.VER_ACADEMICO,
        Permissao.GERENCIAR_ACESSO,
        Permissao.VER_ACESSO,
        Permissao.REGISTRAR_ACESSO, // opcional, mas herdado de superuser
        Permissao.VER_RELATORIOS
    ],
    COORDENACAO: [
        Permissao.VER_AUDITORIA,
        Permissao.GERENCIAR_ACADEMICO,
        Permissao.VER_ACADEMICO,
        Permissao.VER_ACESSO,
        Permissao.VER_RELATORIOS
    ],
    SECRETARIA: [
        Permissao.GERENCIAR_ACADEMICO,
        Permissao.VER_ACADEMICO,
        Permissao.VER_ACESSO,
        Permissao.VER_RELATORIOS
    ],
    PORTEIRO: [
        Permissao.REGISTRAR_ACESSO,
        Permissao.VER_ACESSO // Apenas para ver histórico rápido na portaria
    ],
    VISUALIZACAO: [
        Permissao.VER_ACADEMICO,
        Permissao.VER_ACESSO,
        Permissao.VER_RELATORIOS
    ]
};

/**
 * Função utilitária pura que testa se um papel possui uma permissão.
 */
export function temPermissao(papel: string | undefined, permissao: Permissao): boolean {
    if (!papel || !(papel in MatrizPermissoes)) return false;
    return MatrizPermissoes[papel as Papel].includes(permissao);
}
