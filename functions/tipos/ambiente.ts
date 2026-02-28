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
    nome_completo: string;
    turma_id?: string;
    status: string;
    anonimizado?: number;
    base_legal?: string;
    finalidade_coleta?: string;
    prazo_retencao_meses?: number;
}

export interface TurmaDB {
    id: string;
    tenant_id: string;
    serie?: string;
    letra?: string;
    turno?: string;
    ano_letivo?: string;
    data_criacao?: string;
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
    data_criacao?: string;
    data_atualizacao?: string;
}

export interface LogAuditoriaDB {
    id: string;
    tenant_id: string;
    data_criacao: string;
    usuario_email?: string;
    acao?: string;
    entidade_tipo?: string;
    entidade_id?: string;
    dados_anteriores?: string;
    dados_novos?: string;
    ip_address?: string;
    user_agent?: string;
    colecao?: string;
}

export interface AlertaEvasaoDB {
    id: string;
    tenant_id: string;
    aluno_matricula: string;
    motivo: string;
    status: 'PENDENTE' | 'EM_ANALISE' | 'RESOLVIDO';
    data_criacao?: string;
    data_resolucao?: string;
}

export interface ResponsavelDB {
    id: string;
    tenant_id: string;
    nome_completo: string;
    telefone: string;
    email?: string;
    fcm_token?: string;
    id_consentimento?: string;
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
    status?: string;
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
    role?: string;
    ativo?: boolean;
    nome_completo?: string;
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
