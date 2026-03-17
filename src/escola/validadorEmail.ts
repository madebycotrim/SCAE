import { PerfilEscola } from "./ProvedorEscola";

/**
 * ValidaÁ„o de domÌnio de email da escola.
 * Garante que o usu·rio sÛ loga com email do domÌnio autorizado.
 * Ex: joao@colegioabc.com.br ‚úÖ | joao@gmail.com ‚ùå
 *
 * @param email - Email do usu·rio autenticado via Google
 * @param configEscola - Config do escola
 * @returns true se o email pertence ao domÌnio da escola
 */
export function emailPertenceAEscola(email: string, configEscola: PerfilEscola): boolean {
    // Se a escola n„o definiu domÌnios autorizados, aceitar qualquer email
    if (!configEscola.dominioEmail) {
        return true;
    }

    const dominioEmail = email.split('@')[1]?.toLowerCase();
    if (!dominioEmail) return false;

    return configEscola.dominioEmail.toLowerCase() === dominioEmail;
}

