import { PerfilEscola } from "./ProvedorEscola";

/**
 * Validação de domínio de email da escola.
 * Garante que o usuário só loga com email do domínio autorizado.
 * Ex: joao@colegioabc.com.br âœ… | joao@gmail.com âŒ
 *
 * @param email - Email do usuário autenticado via Google
 * @param configEscola - Config do escola
 * @returns true se o email pertence ao domínio da escola
 */
export function emailPertenceAEscola(email: string, configEscola: PerfilEscola): boolean {
    // Se a escola não definiu domínios autorizados, aceitar qualquer email
    if (!configEscola.dominioEmail) {
        return true;
    }

    const dominioEmail = email.split('@')[1]?.toLowerCase();
    if (!dominioEmail) return false;

    return configEscola.dominioEmail.toLowerCase() === dominioEmail;
}

