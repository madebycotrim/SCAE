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

/**
 * Formata um valor numérico em centavos para exibição em BRL.
 * @param centavos - Valor em centavos (ex: 1990 = R$ 19,90)
 * @returns String formatada (ex: "R$ 19,90")
 */
export const formatarReais = (centavos: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavos / 100);

/**
 * Exibe uma data ISO UTC no fuso de São Paulo.
 * @param dataIso - String de data em formato ISO (UTC)
 * @returns Data formatada (ex: "15/03/2026")
 */
export const exibirData = (dataIso: string): string =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
    }).format(new Date(dataIso));

/**
 * Exibe uma data e hora ISO UTC no fuso de São Paulo.
 * @param dataIso - String de data em formato ISO (UTC)
 * @returns Data e hora formatada (ex: "15/03/2026 14:30")
 */
export const exibirDataHora = (dataIso: string): string =>
    new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(dataIso));
