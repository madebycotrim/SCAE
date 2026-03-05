/**
 * Utilitários de Formatação para o SCAE
 */

/**
 * Mascara um email para privacidade (Regra 8).
 * Ex: madebycotrim@gmail.com -> MA***@GMAIL.COM
 * @param email - Email a ser mascarado
 * @returns Email mascarado em letras maiúsculas
 */
export function mascararEmail(email: string | undefined | null): string {
    if (!email) return '';
    if (email.includes('sistema') || email.includes('anonimo')) return email.toUpperCase();

    const [usuario, dominio] = email.split('@');
    if (!dominio) return email.toUpperCase();

    const prefixo = usuario.substring(0, 2);
    return `${prefixo}***@${dominio}`.toUpperCase();
}
