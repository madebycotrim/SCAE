/**
 * Centralização da lógica de Segurança e RBAC (Regra 6).
 */
import { ErroPermissao, ErroValidacao } from './erros';
import type { ContextoSCAE } from '../tipos/ambiente';
import { Permissao, Papel, temPermissao } from './seguranca/rbac';

/** Email root do sistema — centralizado para evitar hardcode espalhado */
export const EMAIL_ROOT = 'madebycotrim@gmail.com';

/**
 * [DEPRECADA] Evite usar arrays de string mágicos.
 * Use `verificarAcesso(contexto, Permissao.ACAO_ESPECIFICA)`
 */
export function verificarPermissao(contexto: ContextoSCAE, papeisPermitidos: string[] | Papel[]) {
    const papelUsuario = contexto.data.usuarioScae?.papel;
    const eDono = contexto.data.user?.email === EMAIL_ROOT;

    if (eDono) return;

    if (!papelUsuario || !(papeisPermitidos as string[]).includes(papelUsuario)) {
        throw new ErroPermissao(`Acesso negado: Papel '${papelUsuario || 'ANONIMO'}' insuficiente.`);
    }
}

/**
 * [NOVA ABORDAGEM PROFISSIONAL]
 * Verifica se o usuário tem a CAPABILITY necessária para a ação,
 * consultando a matriz de RBAC central, isolando Papéis soltos.
 */
export function verificarAcesso(contexto: ContextoSCAE, permissaoNecessaria: Permissao) {
    const papelUsuario = contexto.data.usuarioScae?.papel as Papel | undefined;
    const eDono = contexto.data.user?.email === EMAIL_ROOT;

    // Desenvolvedor ROOT tem acesso global ilimitado
    if (eDono) return;

    if (!papelUsuario) {
        throw new ErroPermissao('Acesso negado: Usuário sem papel atribuído (ANONIMO).');
    }

    if (!temPermissao(papelUsuario, permissaoNecessaria)) {
        throw new ErroPermissao(`Acesso Bloqueado: Permissão '${permissaoNecessaria}' não concedida ao papel ${papelUsuario}.`);
    }
}

/**
 * Valida a presença do header X-Escola-ID.
 * @param request - Requisição original
 * @returns O ID da escola
 * @throws ErroValidacao se o ID estiver ausente
 */
export function extrairEscolaId(request: Request): string {
    const escolaId = request.headers.get('X-Escola-ID');
    if (!escolaId) {
        throw new ErroValidacao('ID da Escola obrigatório', 'TENANT_ID_AUSENTE');
    }
    return escolaId;
}
