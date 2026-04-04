import { extrairEscolaId } from '../_seguranca';

/**
 * Valida se a requisição veio de um Agente Local.
 * Simplificado: Identifica apenas pelo Header X-Escola-ID.
 */
export function validarAgente(request: Request, _env: any) {
    // Por enquanto, apenas extraímos o ID da escola do header.
    // Como é ambiente de dev/solo, removemos a validação de Bearer Token.
    return extrairEscolaId(request);
}
