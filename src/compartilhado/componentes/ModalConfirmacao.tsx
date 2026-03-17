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
    variante?: 'perigoso' | 'padrao';
}

export default function ModalConfirmacao({
    titulo,
    mensagem,
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    aoConfirmar,
    aoCancelar,
    variante = 'padrao'
}: ModalConfirmacaoProps) {
    return (
        <ModalUniversal
            titulo={titulo}
            icone={AlertTriangle}
            aoFechar={aoCancelar}
            tamanho="sm"
        >
            <div className="flex flex-col gap-6 py-2">
                <p className="text-slate-500 text-sm leading-relaxed px-1">
                    {mensagem}
                </p>

                <div className="flex gap-3">
                    <Botao
                        variante="secundario"
                        className="flex-1"
                        onClick={aoCancelar}
                    >
                        {textoCancelar}
                    </Botao>
                    <Botao
                        variante={variante === 'perigoso' ? 'primario' : 'primario'}
                        className={`flex-1 ${variante === 'perigoso' ? 'bg-rose-600 hover:bg-rose-700 border-rose-600' : ''}`}
                        onClick={aoConfirmar}
                    >
                        {textoConfirmar}
                    </Botao>
                </div>
            </div>
        </ModalUniversal>
    );
}
