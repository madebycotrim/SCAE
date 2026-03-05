/**
 * Centralização da lógica de Segurança e RBAC (Regra 6).
 */
import { ErroPermissao } from './erros';
import type { ContextoSCAE } from '../tipos/ambiente';

/**
 * Verifica se o usuário autenticado possui o papel necessário.
 * @param contexto - Contexto da requisição
 * @param papeisPermitidos - Lista de papéis que podem acessar a rota
 * @throws ErroPermissao se o papel for insuficiente
 */
export function verificarPermissao(contexto: ContextoSCAE, papeisPermitidos: string[]) {
    const papelUsuario = contexto.data.usuarioScae?.papel;
    const eDono = contexto.data.user?.email === 'madebycotrim@gmail.com';

    // O desenvolvedor "dono" sempre tem acesso total
    if (eDono) return;

    if (!papelUsuario || !papeisPermitidos.includes(papelUsuario)) {
        throw new ErroPermissao(`Acesso negado: Papel '${papelUsuario || 'ANONIMO'}' insuficiente.`);
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
        throw new Error('Tenant ID (X-Escola-ID) ausente nos cabeçalhos.');
    }
    return escolaId;
}
