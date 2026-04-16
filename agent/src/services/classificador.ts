/**
 * services/classificador.ts
 * Inteligência de Horários para o Agente Local.
 * Determina se um acesso é Entrada, Saída ou Atraso baseado nas janelas da escola.
 */

import { config } from '../infra/config';

export type TipoMovimentacao = 'ENTRADA' | 'SAIDA' | 'FORA_DE_HORARIO' | 'TURNO_ERRADO' | 'ATRASO';

interface ResultadoClassificacao {
    tipo: TipoMovimentacao;
    mensagem: string;
}

/**
 * Classifica um acesso baseado na hora atual e no turno do aluno.
 */
export function classificarAcesso(matricula: string, turnoAluno?: string): ResultadoClassificacao {
    const agora = new Date();
    const horaAtual = agora.getHours().toString().padStart(2, '0') + ':' + agora.getMinutes().toString().padStart(2, '0');
    
    const janelas = config.janelas || [];
    
    if (janelas.length === 0) {
        return { tipo: 'ENTRADA', mensagem: 'Sem regras de horário' };
    }

    // 1. Procurar janela que engloba o horário atual
    const janelasAtivas = janelas.filter(j => horaAtual >= j.horaInicio && horaAtual <= j.horaFim);

    if (janelasAtivas.length === 0) {
        // Se não há janela aberta, precisamos decidir se é um atraso ou apenas fora de horário
        // Regra simples: Se passou da hora de entrada matutina mas não chegou na saída...
        // Por enquanto, marcamos como FORA_DE_HORARIO
        return { tipo: 'FORA_DE_HORARIO', mensagem: 'Fora das janelas permitidas' };
    }

    // 2. Filtrar pela compatibilidade de TURNO se possível
    // Se a descrição da janela contiver o turno do aluno (Ex: "Turno Matutino" contém "MATUTINO")
    const janelasCompativeis = janelasAtivas.filter(j => {
        if (!turnoAluno) return true; // Se não sabemos o turno, permitimos a janela
        const desc = (j.descricao || '').toUpperCase();
        const turno = turnoAluno.toUpperCase();
        return desc.includes(turno) || turno.includes(desc);
    });

    if (janelasCompativeis.length === 0) {
        return { tipo: 'TURNO_ERRADO', mensagem: `Aluno do turno ${turnoAluno} tentando acessar em outro horário.` };
    }

    // 3. Pega a primeira janela compatível
    const janela = janelasCompativeis[0];
    
    if (janela.tipoAcesso === 'ENTRADA') {
        return { tipo: 'ENTRADA', mensagem: 'Chegada autorizada' };
    } else {
        return { tipo: 'SAIDA', mensagem: 'Saída autorizada' };
    }
}
