/**
 * Classes de erro padronizadas do SCAE (Regra 11).
 */

export class ErroBase extends Error {
    constructor(
        public readonly mensagem: string,
        public readonly codigo: string,                     // ex: AUTH_001
        public readonly status: number = 500,
        public readonly contexto?: Record<string, unknown>, // sem PII
        public readonly causaOriginal?: unknown,
    ) {
        super(mensagem);
        this.name = this.constructor.name;
    }

    toJSON() {
        return {
            erro: {
                codigo: this.codigo,
                mensagem: this.mensagem,
                ...(process.env.NODE_ENV === 'development' && { contexto: this.contexto, causa: this.causaOriginal })
            }
        };
    }
}

export class ErroValidacao extends ErroBase {
    constructor(mensagem: string, codigo: string = 'VALIDACAO_001', contexto?: Record<string, unknown>) {
        super(mensagem, codigo, 400, contexto);
    }
}

export class ErroNaoAutenticado extends ErroBase {
    constructor(mensagem: string = 'Não autenticado', codigo: string = 'AUTH_401') {
        super(mensagem, codigo, 401);
    }
}

export class ErroPermissao extends ErroBase {
    constructor(mensagem: string = 'Acesso negado', codigo: string = 'PERMISSAO_403') {
        super(mensagem, codigo, 403);
    }
}

export class ErroNaoEncontrado extends ErroBase {
    constructor(mensagem: string = 'Recurso não encontrado', codigo: string = 'NOT_FOUND_404') {
        super(mensagem, codigo, 404);
    }
}

export class ErroConflito extends ErroBase {
    constructor(mensagem: string, codigo: string = 'CONFLIT_409') {
        super(mensagem, codigo, 409);
    }
}

export class ErroInterno extends ErroBase {
    constructor(mensagem: string = 'Erro interno do servidor', codigo: string = 'INTERNAL_500') {
        super(mensagem, codigo, 500);
    }
}
