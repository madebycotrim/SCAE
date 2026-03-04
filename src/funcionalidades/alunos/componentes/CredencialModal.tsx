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
            <div className="flex flex-col items-center space-y-10 py-4">
                {/* Visual do Cartão */}
                <div className="relative group">
                    {/* Glow effect */}
                    <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500/20 to-blue-600/20 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all duration-700 blur-2xl" />

                    <div className="relative p-8 bg-white border border-slate-200 rounded-[3rem] shadow-2xl shadow-indigo-100 flex flex-col items-center">
                        <div className="w-60 h-60 bg-slate-950 rounded-[2rem] flex items-center justify-center overflow-hidden relative border-[10px] border-white shadow-inner">
                            <QrCode size={160} strokeWidth={1} className="text-white" />
                        </div>

                        <div className="mt-8 text-center space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Registro SIGE</p>
                            <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                                {matricula}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="w-full space-y-6">
                    <div className="flex flex-col items-center gap-3 px-6 text-center">
                        <div className="w-8 h-1 bg-slate-100 rounded-full" />
                        <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-widest">
                            Apresente este código no leitor óptico para validar sua movimentação escolar em tempo real.
                        </p>
                    </div>

                    <Botao
                        variante="secundario"
                        fullWidth
                        tamanho="lg"
                        icone={X}
                        onClick={aoFechar}
                    >
                        Fechar Visualização
                    </Botao>
                </div>
            </div>
        </ModalUniversal>
    );
}
