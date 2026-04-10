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
    carregando = false
}: ModalConfirmacaoProps) {
    return (
        <ModalUniversal
            titulo={titulo}
            icone={AlertTriangle}
            aoFechar={aoCancelar}
            tamanho="sm"
        >
            <div className="flex flex-col gap-8 py-4">
                <div className="flex flex-col gap-2">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${
                        variante === 'perigo' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                        <AlertTriangle size={24} strokeWidth={2.5} />
                    </div>
                    <p className="text-slate-500 text-[13px] font-medium leading-relaxed">
                        {mensagem}
                    </p>
                </div>

                <div className="flex gap-3">
                    <Botao
                        variante="secundario"
                        fullWidth
                        tamanho="lg"
                        onClick={aoCancelar}
                        disabled={carregando}
                    >
                        {textoCancelar}
                    </Botao>
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
