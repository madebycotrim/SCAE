/**
 * Tipos compartilhados para o backend Cloudflare Pages Functions.
 * Define bindings D1, variáveis de ambiente e contexto tipado.
 */

// ============================================================
// Bindings do Ambiente (Cloudflare wrangler.toml / Pages Settings)
// ============================================================

export interface AmbienteSCAE {
    /** Banco D1 principal do sistema */
    DB_SCAE: D1Database;
    /** Segredo para assinar JWTs do portal do titular (LGPD) */
    JWT_SECRET: string;
    /** Bypass de autenticação para desenvolvimento local (valor: '1') */
    DEV_AUTH_BYPASS?: string;
    /** Tenant padrão quando não enviado no header */
    DEFAULT_TENANT_ID?: string;
}

// ============================================================
// Contexto tipado para handlers
// ============================================================

export interface DadosContexto {
    user?: DadosTokenFirebase;
    usuarioScae?: UsuarioDB;
}

export interface ContextoSCAE {
    request: Request;
    env: AmbienteSCAE;
    data: DadosContexto;
    next: () => Promise<Response>;
}

// ============================================================
// Payload do Token Firebase (JWT decodificado)
// ============================================================

export interface DadosTokenFirebase {
    email?: string;
    uid?: string;
    sub?: string;
    iss?: string;
    aud?: string;
    [chave: string]: unknown;
}

// ============================================================
// Entidades D1 (tabelas do banco)
// ============================================================

export interface AlunoDB {
    matricula: string;
    tenant_id: string;
    nome_completo?: string;
    turma_id?: string;
    ativo: number;
    sincronizado?: number;
    anonimizado?: number;
    base_legal?: string;
    finalidade_coleta?: string;
    prazo_retencao_meses?: number;
    criado_em?: string;
    atualizado_em?: string;
    data_exclusao?: string;
}

export interface TurmaDB {
    id: string;
    tenant_id: string;
    ano_letivo?: string;
    serie?: string;
    letra?: string;
    turno?: string;
    sala?: string;
    professor_regente?: string;
    sincronizado?: number;
    criado_em?: string;
}

export interface RegistroAcessoDB {
    id: string;
    tenant_id: string;
    aluno_matricula: string;
    tipo_movimentacao: string;
    metodo_leitura?: string;
    timestamp_acesso: string;
    sincronizado: number;
    prazo_retencao_meses?: number;
}

export interface UsuarioDB {
    email: string;
    tenant_id: string;
    papel?: string;
    ativo: number;
    nome_completo?: string;
    criado_por?: string;
    pendente?: number;
    criado_em?: string;
    atualizado_em?: string;
    data_exclusao?: string;
}

export interface LogAuditoriaDB {
    id: string;
    tenant_id?: string;           // nullable: logs offline sem tenant
    timestamp?: string;           // campo local do app
    created_at?: string;          // alias
    data_criacao?: string;        // campo canônico
    usuario_email?: string;
    acao?: string;
    entidade_tipo?: string;
    entidade_id?: string;
    dados_anteriores?: string;
    dados_novos?: string;
    ip_address?: string;
    user_agent?: string;
    sincronizado?: number;
}

export interface AlertaEvasaoDB {
    id: string;
    tenant_id: string;
    aluno_matricula: string;
    motivo: string;
    status: 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO';
    criado_em?: string;
    data_resolucao?: string;
}

export interface ResponsavelDB {
    id: string;
    tenant_id: string;
    nome_completo: string;
    telefone: string;
    email?: string;
    fcm_token?: string;
    // LGPD
    id_consentimento?: string;
    base_legal?: string;
    finalidade_coleta?: string;
    prazo_retencao_meses?: number;
    anonimizado?: number;
    data_anonimizacao?: string;
    criado_em?: string;
    atualizado_em?: string;
    data_exclusao?: string;
}

// ============================================================
// Payloads de request (body JSON)
// ============================================================

export interface PayloadRegistroAcesso {
    id: string;
    aluno_matricula: string;
    tipo_movimentacao: string;
    metodo_validacao?: string;
    timestamp: string;
}

export interface PayloadCriacaoAluno {
    matricula: string;
    nome_completo: string;
    turma_id?: string;
    ativo?: boolean;
}

export interface PayloadCriacaoTurma {
    id: string;
    serie?: string;
    letra?: string;
    turno?: string;
    ano_letivo?: string;
    criado_em?: string;
    sala?: string;
}

export interface PayloadCriacaoUsuario {
    email: string;
    papel?: string;
    role?: string;               // alias legado
    ativo?: boolean;
    nome_completo?: string;
    criado_por?: string;
    pendente?: boolean;
    criado_em?: string;
    atualizado_em?: string;
}

export interface PayloadAutenticacaoPortal {
    telefone: string;
    aluno_matricula: string;
}

export interface PayloadAtualizacaoAlerta {
    status: 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO';
}

export interface ResultadoSincronizacao {
    id: string;
    status: 'sincronizado' | 'erro';
    erro?: string;
}
