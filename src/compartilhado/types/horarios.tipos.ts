export type TipoAcessoHorario = 'ENTRADA' | 'SAIDA' | 'AMBOS';

export const TIPO_ACESSO_HORARIO = {
    ENTRADA: 'ENTRADA' as TipoAcessoHorario,
    SAIDA: 'SAIDA' as TipoAcessoHorario,
    AMBOS: 'AMBOS' as TipoAcessoHorario
} as const;

export interface JanelaHorario {
    id?: string;
    diaSemana?: number; // 0-6 (Domingo a Sábado)
    horaInicio: string; // HH:mm
    horaFim: string; // HH:mm
    tipoAcesso: TipoAcessoHorario;
    ativo?: boolean;
    descricao?: string;
}

export interface ConfiguracaoHorarios {
    tenant_id: string;
    janelas: JanelaHorario[];
    atualizado_em: string;
}
