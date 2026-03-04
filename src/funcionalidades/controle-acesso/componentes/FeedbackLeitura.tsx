import { ShieldCheck, UserX, Clock, UserCircle2, Ban } from 'lucide-react';
import { format } from 'date-fns';

export interface RegistroLeitura {
    tipo: 'SUCESSO' | 'ERRO';
    aluno?: import('@compartilhado/types/bancoLocal.tipos').AlunoLocal | null;
    mensagem: string;
    hora: string;
}

export function FeedbackLeitura({ registro, aoEncerrar }: { registro: RegistroLeitura | null, aoEncerrar?: () => void }) {
    if (!registro) return null;

    const ehSucesso = registro.tipo === 'SUCESSO';

    // Cor do dia baseada na data atual para segurança visual do porteiro
    const dataHoje = format(new Date(), 'yyyy-MM-dd');
    const hashData = dataHoje.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const matizCorDia = hashData % 360;
    const corDiaEstilo = {
        borderColor: `hsl(${matizCorDia}, 70%, 50%)`,
        boxShadow: `0 0 40px hsl(${matizCorDia}, 70%, 50%, 0.3)`
    };

    return (
        <div className={`
            fixed inset-0 z-[100] flex items-center justify-center p-6
            transition-all duration-500 animate-in fade-in zoom-in-95
            ${ehSucesso ? 'bg-emerald-950/95' : 'bg-rose-950/95'}
            backdrop-blur-2xl
        `} onClick={aoEncerrar}>

            {/* Moldura de Segurança (Cor do Dia) */}
            <div className="absolute inset-4 border-[8px] rounded-[3rem] pointer-events-none opacity-40 transition-all" style={corDiaEstilo}></div>

            <div className="relative z-10 max-w-2xl w-full text-center space-y-8 animate-in slide-in-from-bottom-12 duration-700">

                {/* Ícone Gigante com Efeito de Glow */}
                <div className="relative inline-block group">
                    <div className={`absolute inset-0 blur-3xl opacity-40 group-hover:opacity-60 transition-opacity rounded-full ${ehSucesso ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                    <div className={`
                        relative w-40 h-40 rounded-[3rem] flex items-center justify-center 
                        border-2 backdrop-blur-3xl shadow-2xl transition-transform duration-500 group-hover:rotate-6
                        ${ehSucesso ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-400' : 'bg-rose-500/20 border-rose-400/30 text-rose-400'}
                    `}>
                        {ehSucesso ? (
                            <ShieldCheck size={80} strokeWidth={2.5} className="drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                        ) : (
                            <Ban size={80} strokeWidth={2.5} className="drop-shadow-[0_0_15px_rgba(248,113,113,0.5)]" />
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <h2 className={`
                        text-7xl font-black uppercase tracking-tighter leading-none
                        ${ehSucesso ? 'text-emerald-400' : 'text-rose-400'}
                    `}>
                        {ehSucesso ? 'Liberado' : 'Bloqueado'}
                    </h2>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] ml-2">Protocolo de Segurança SCAE</p>
                </div>

                {/* Card do Aluno Premium */}
                {registro.aluno ? (
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md shadow-2xl space-y-4 animate-in zoom-in-90 delay-150 fill-mode-both">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 border border-white/10 text-white/60">
                                <UserCircle2 size={32} />
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase tracking-tight leading-tight">
                                {registro.aluno.nome_completo}
                            </h3>
                            <div className="flex items-center gap-3 mt-4">
                                <span className="px-5 py-1.5 bg-white/10 rounded-full text-xs font-black text-white/80 uppercase tracking-widest border border-white/10">
                                    Turma {registro.aluno.turma_id}
                                </span>
                                <span className="px-5 py-1.5 bg-black/20 rounded-full text-xs font-mono font-bold text-white/40 tracking-widest border border-white/5">
                                    {registro.aluno.matricula}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 px-12 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] text-rose-300 font-bold text-xl uppercase tracking-tight flex items-center justify-center gap-4">
                        <UserX size={32} />
                        {registro.mensagem}
                    </div>
                )}

                {/* Footer Insight */}
                <div className="flex items-center justify-center gap-6 pt-4">
                    <div className="flex items-center gap-3 text-white/50 text-sm font-mono font-black tracking-widest bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
                        <Clock size={18} className="text-white/30" />
                        {registro.hora}
                    </div>
                    {ehSucesso && (
                        <div className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.2em] border-l border-white/10 pl-6">
                            Fluxo Registrado <br /> Sincronismo Pendente
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
