import { bancoLocal } from './bancoLocal';
import { obterDataCorrigida } from '../utilitarios/relogio';
import { obterVersaoAtual, TIPOS_CONSENTIMENTO } from '../utilitarios/termoConsentimento';

/**
 * Serviço de Gerenciamento de Consentimentos LGPD
 */

/**
 * Registrar consentimento de um aluno
 */
export const registrarConsentimento = async ({
    alunoMatricula,
    tipoConsentimento = TIPOS_CONSENTIMENTO.COLETA_DADOS,
    consentido = true,
    coletadoPor = null,
    validadeAnos = 2
}) => {
    const banco = await bancoLocal.iniciarBanco();

    const dataConsentimento = obterDataCorrigida();
    const validoAte = new Date(dataConsentimento);
    validoAte.setFullYear(validoAte.getFullYear() + validadeAnos);

    const consentimento = {
        id: crypto.randomUUID(),
        aluno_matricula: alunoMatricula,
        versao_termo: obterVersaoAtual(),
        tipo_consentimento: tipoConsentimento,
        consentido,
        data_consentimento: dataConsentimento.toISOString(),
        coletado_por: coletadoPor,
        valido_ate: validoAte.toISOString(),
        retirado: false,
        data_retirada: null,
        created_at: dataConsentimento.toISOString(),
        sincronizado: 0 // Flag para sincronização
    };

    await banco.put('consentimentos', consentimento);

    // Atualizar flag de consentimento válido no aluno
    const aluno = await banco.get('alunos', alunoMatricula);
    if (aluno) {
        aluno.consentimento_valido = consentido;
        await banco.put('alunos', aluno);
    }

    return consentimento;
};

/**
 * Verificar se aluno tem consentimento válido
 */
export const verificarConsentimentoValido = async (alunoMatricula) => {
    const banco = await bancoLocal.iniciarBanco();

    // Buscar todos os consentimentos do aluno
    const todosConsentimentos = await banco.getAllFromIndex(
        'consentimentos',
        'aluno_matricula',
        alunoMatricula
    );

    if (!todosConsentimentos || todosConsentimentos.length === 0) {
        return false;
    }

    const agora = obterDataCorrigida();

    // Filtrar consentimentos ativos (não retirados e dentro da validade)
    const consentimentosValidos = todosConsentimentos.filter(c => {
        if (c.retirado) return false;
        if (!c.consentido) return false;

        const validoAte = new Date(c.valido_ate);
        return validoAte > agora;
    });

    return consentimentosValidos.length > 0;
};

/**
 * Retirar consentimento
 */
export const retirarConsentimento = async (consentimentoId, retiradoPor = null) => {
    const banco = await bancoLocal.iniciarBanco();

    const consentimento = await banco.get('consentimentos', consentimentoId);

    if (!consentimento) {
        throw new Error('Consentimento não encontrado');
    }

    if (consentimento.retirado) {
        throw new Error('Consentimento já foi retirado anteriormente');
    }

    consentimento.retirado = true;
    consentimento.data_retirada = obterDataCorrigida().toISOString();
    consentimento.sincronizado = 0; // Marcar para sincronizar atualização

    await banco.put('consentimentos', consentimento);

    // Atualizar flag no aluno
    const aluno = await banco.get('alunos', consentimento.aluno_matricula);
    if (aluno) {
        aluno.consentimento_valido = false;
        await banco.put('alunos', aluno);
    }

    return consentimento;
};

/**
 * Obter histórico de consentimentos de um aluno
 */
export const obterHistoricoConsentimentos = async (alunoMatricula) => {
    const banco = await bancoLocal.iniciarBanco();

    const consentimentos = await banco.getAllFromIndex(
        'consentimentos',
        'aluno_matricula',
        alunoMatricula
    );

    // Ordenar por data (mais recente primeiro)
    consentimentos.sort((a, b) =>
        new Date(b.data_consentimento) - new Date(a.data_consentimento)
    );

    return consentimentos;
};

/**
 * Obter estatísticas de consentimento
 */
export const obterEstatisticasConsentimento = async () => {
    const banco = await bancoLocal.iniciarBanco();

    const todosAlunos = await banco.getAll('alunos');
    const todosConsentimentos = await banco.getAll('consentimentos');

    const agora = obterDataCorrigida();

    const consentimentosValidos = todosConsentimentos.filter(c => {
        if (c.retirado) return false;
        if (!c.consentido) return false;
        const validoAte = new Date(c.valido_ate);
        return validoAte > agora;
    });

    const consentimentosExpirados = todosConsentimentos.filter(c => {
        if (c.retirado) return false;
        const validoAte = new Date(c.valido_ate);
        return validoAte <= agora;
    });

    const consentimentosRetirados = todosConsentimentos.filter(c => c.retirado);

    // Alunos únicos com consentimento válido
    const alunosComConsentimento = new Set(
        consentimentosValidos.map(c => c.aluno_matricula)
    );

    return {
        totalAlunos: todosAlunos.length,
        totalConsentimentos: todosConsentimentos.length,
        consentimentosValidos: consentimentosValidos.length,
        consentimentosExpirados: consentimentosExpirados.length,
        consentimentosRetirados: consentimentosRetirados.length,
        alunosComConsentimento: alunosComConsentimento.size,
        alunosSemConsentimento: todosAlunos.length - alunosComConsentimento.size,
        taxaConformidade: todosAlunos.length > 0
            ? ((alunosComConsentimento.size / todosAlunos.length) * 100).toFixed(1)
            : 0
    };
};

export default {
    registrarConsentimento,
    verificarConsentimentoValido,
    retirarConsentimento,
    obterHistoricoConsentimentos,
    obterEstatisticasConsentimento
};
