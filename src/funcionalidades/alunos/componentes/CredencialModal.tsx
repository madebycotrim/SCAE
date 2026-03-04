import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { QrCode } from 'lucide-react';

interface CredencialModalProps {
    matricula: string;
    aoFechar: () => void;
}

export default function CredencialModal({ matricula, aoFechar }: CredencialModalProps) {
    return (
        <ModalUniversal
            titulo="Credencial Digital"
            subtitulo="Cartão de identificação para acesso escolar."
            icone={QrCode}
            aoFechar={aoFechar}
        >
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-3xl border-2 border-slate-100 shadow-inner space-y-6">
                <div className="relative group">
                    <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[2rem] opacity-10 group-hover:opacity-20 transition-opacity blur-xl" />
                    <div className="relative p-6 bg-white border-2 border-slate-900 rounded-[2.5rem] shadow-2xl">
                        <div className="w-56 h-56 bg-slate-900 rounded-[1.5rem] flex items-center justify-center overflow-hidden relative border-8 border-white shadow-inner">
                            <QrCode size={140} strokeWidth={1.5} className="text-white opacity-90" />
                        </div>
                    </div>
                </div>

                <div className="text-center space-y-1">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Matrícula Ativa</p>
                    <h3 className="text-2xl font-black text-slate-800 font-mono tracking-tighter">
                        {matricula}
                    </h3>
                </div>

                <div className="w-full h-px bg-slate-200" />

                <p className="text-[11px] font-bold text-slate-400 text-center leading-relaxed max-w-[200px] uppercase tracking-wider">
                    Apresente esta credencial no terminal de acesso para registro automático de entrada e saída.
                </p>
            </div>
        </ModalUniversal>
    );
}

