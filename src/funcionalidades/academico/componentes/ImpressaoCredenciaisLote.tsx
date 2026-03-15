import { QRCodeCanvas } from 'qrcode.react';
import { Aluno } from '../tipos/academico';
import { usarEscola } from '@escola/ProvedorEscola';

interface ImpressaoCredenciaisLoteProps {
    alunos: Aluno[];
}

export default function ImpressaoCredenciaisLote({ alunos }: ImpressaoCredenciaisLoteProps) {
    const escola = usarEscola();

    if (alunos.length === 0) return null;

    return (
        <div id="area-impressao-lote" className="hidden print:block bg-white p-4">
            <div className="flex flex-wrap gap-8 justify-center">
                {alunos.map((aluno) => {
                    const qrPayload = JSON.stringify({
                        m: aluno.matricula,
                        e: escola.id,
                        v: 1
                    });

                    return (
                        <div key={aluno.matricula} className="break-inside-avoid w-[8.5cm] h-[12cm] border border-slate-300 rounded-3xl p-6 flex flex-col items-center bg-white relative mb-8">
                             {/* Cabeçalho da Escola no Cartão */}
                            <div className="w-full flex justify-between items-center mb-6 px-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-[8px] font-black text-white">
                                        {escola.nomeEscola.substring(0, 1)}
                                    </div>
                                    <span className="text-[9px] font-black text-slate-800 uppercase tracking-tight truncate max-w-[120px]">
                                        {escola.nomeEscola}
                                    </span>
                                </div>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">SCAE ID</span>
                            </div>

                            <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 p-2">
                                <QRCodeCanvas 
                                    value={qrPayload} 
                                    size={160}
                                    level="H"
                                />
                            </div>

                            <div className="mt-8 text-center w-full">
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 truncate">
                                    {aluno.nome_completo}
                                </h3>
                                <div className="flex flex-col items-center gap-1.5">
                                    <span className="text-[11px] font-mono font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                                        {aluno.matricula}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {aluno.turma_id || 'NÃO ENTURMADO'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-auto pt-6 border-t border-slate-100 w-full flex justify-center">
                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">IDENTIFICAÇÃO ESCOLAR OFICIAL</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>
                {`
                @media print {
                    body > *:not(#area-impressao-lote) {
                        display: none !important;
                    }
                    #area-impressao-lote {
                        display: block !important;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                    }
                    .break-inside-avoid {
                        page-break-inside: avoid;
                    }
                }
                `}
            </style>
        </div>
    );
}
