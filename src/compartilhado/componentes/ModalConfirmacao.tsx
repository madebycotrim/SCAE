import ModalUniversal from './ModalUniversal';
import { AlertTriangle } from 'lucide-react';
import { Botao } from './UI';

interface ModalConfirmacaoProps {
    titulo: string;
    mensagem: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    aoConfirmar: () => void;
    aoCancelar: () => void;
    variante?: 'perigo' | 'padrao';
    carregando?: boolean;
    semCancelar?: boolean;
}

/**
 * ModalConfirmacao — Diálogo de confirmação padronizado com visual premium.
 * Utilizado para substituir o window.confirm em ações críticas.
 */
export default function ModalConfirmacao({
    titulo,
    mensagem,
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    aoConfirmar,
    aoCancelar,
    variante = 'padrao',
    carregando = false,
    semCancelar = false
}: ModalConfirmacaoProps) {
    return (
        <ModalUniversal
            titulo={titulo}
            icone={AlertTriangle}
            aoFechar={aoCancelar}
            tamanho="sm"
            cor={variante === 'perigo' ? 'red' : 'indigo'}
        >
            <div className="flex flex-col gap-8 py-2">
                <p className="text-slate-500 text-[14px] font-medium leading-relaxed px-1">
                    {mensagem}
                </p>

                <div className="flex gap-3">
                    {!semCancelar && (
                        <Botao
                            variante="secundario"
                            fullWidth
                            tamanho="lg"
                            onClick={aoCancelar}
                            disabled={carregando}
                        >
                            {textoCancelar}
                        </Botao>
                    )}
                    <Botao
                        variante={variante === 'perigo' ? 'perigo' : 'primario'}
                        fullWidth
                        tamanho="lg"
                        onClick={aoConfirmar}
                        carregando={carregando}
                    >
                        {textoConfirmar}
                    </Botao>
                </div>
            </div>
        </ModalUniversal>
    );
}
