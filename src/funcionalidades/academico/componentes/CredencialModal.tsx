import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { QrCode, X } from 'lucide-react';
import { Botao } from '@compartilhado/componentes/UI';

interface CredencialModalProps {
    matricula: string;
    aoFechar: () => void;
}

export default function CredencialModal({ matricula, aoFechar }: CredencialModalProps) {
    return (
        <ModalUniversal
            titulo="Credencial de Acesso"
            subtitulo="Identidade digital para validação institucional"
            icone={QrCode}
            aoFechar={aoFechar}
            tamanho="sm"
        >
            <div className="flex flex-col items-center space-y-8 py-2">
                {/* Visual da Credencial V2 */}
                <div className="relative group">
                    <div className="relative p-6 bg-white border border-slate-200 rounded-xl shadow-suave flex flex-col items-center">
                        <div className="w-56 h-56 bg-white rounded-lg flex items-center justify-center overflow-hidden relative border border-slate-100 p-4">
                            <QrCode size={200} strokeWidth={1.5} className="text-slate-900" />
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 leading-none">Identidade Estudantil</p>
                            <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tighter">
                                {matricula}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-5">
                    <div className="flex flex-col items-center gap-2.5 px-4 text-center">
                        <p className="text-[9px] font-bold text-slate-400 leading-normal uppercase tracking-widest max-w-[200px]">
                            Apresente ao terminal de leitura para validação de acesso.
                        </p>
                    </div>

                    <Botao
                        variante="secundario"
                        fullWidth
                        tamanho="lg"
                        onClick={aoFechar}
                    >
                        Fechar
                    </Botao>
                </div>
            </div>
        </ModalUniversal>
    );
}

