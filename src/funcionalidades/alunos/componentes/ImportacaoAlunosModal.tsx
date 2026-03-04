import { useState } from 'react';
import ModalUniversal from '@compartilhado/componentes/ModalUniversal';
import { FileSpreadsheet, Clipboard, Upload, CheckCircle, XCircle, Info, ChevronRight, AlertCircle } from 'lucide-react';
import { read, utils } from 'xlsx';
import toast from 'react-hot-toast';
import { ResultadoImportacao } from '../types/aluno';
import { Botao } from '@compartilhado/componentes/UI';

interface ImportacaoAlunosModalProps {
    aoFechar: () => void;
    onImport: (dados: any[]) => Promise<ResultadoImportacao>;
}

export default function ImportacaoAlunosModal({ aoFechar, onImport }: ImportacaoAlunosModalProps) {
    const [abaAtiva, definirAbaAtiva] = useState<'arquivo' | 'colar'>('arquivo');
    const [importando, definirImportando] = useState(false);
    const [resultado, definirResultado] = useState<ResultadoImportacao | null>(null);
    const [textoColado, definirTextoColado] = useState('');

    const processarArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const arquivo = e.target.files?.[0];
        if (!arquivo) return;

        definirImportando(true);
        try {
            const data = await arquivo.arrayBuffer();
            const workbook = read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = utils.sheet_to_json(worksheet);

            const res = await onImport(jsonData);
            definirResultado(res);
        } catch (erro) {
            console.error(erro);
            toast.error("Falha ao processar arquivo de dados.");
        } finally {
            definirImportando(false);
        }
    };

    const processarColagem = async () => {
        if (!textoColado.trim()) {
            toast.error("É necessário colar dados para processar.");
            return;
        }

        definirImportando(true);
        try {
            const linhas = textoColado.trim().split('\n');
            const data = linhas.map(linha => linha.split('\t'));

            if (data.length > 0) {
                const primeiraLinha = (data[0][0] || '').toLowerCase();
                if (primeiraLinha.includes('nome') || primeiraLinha.includes('matricula')) {
                    data.shift();
                }
            }

            const res = await onImport(data);
            definirResultado(res);
        } catch (erro) {
            console.error(erro);
            toast.error("Falha ao processar dados colados.");
        } finally {
            definirImportando(false);
        }
    };

    return (
        <ModalUniversal
            titulo="Importação Inteligente"
            subtitulo="Adição massiva de registros via Excel ou Buffer"
            aoFechar={aoFechar}
            icone={FileSpreadsheet}
            tamanho="lg"
        >
            {!resultado ? (
                <div className="space-y-8 pb-4">
                    {/* Seletor de Método (Tabs Premium) */}
                    <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner group">
                        <button
                            onClick={() => definirAbaAtiva('arquivo')}
                            className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === 'arquivo' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <FileSpreadsheet size={16} />
                            Planilha (XLSX/CSV)
                        </button>
                        <button
                            onClick={() => definirAbaAtiva('colar')}
                            className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${abaAtiva === 'colar' ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                            <Clipboard size={16} />
                            Input Direto
                        </button>
                    </div>

                    <div className="animate-fade-in min-h-[220px]">
                        {abaAtiva === 'arquivo' ? (
                            <div className="space-y-6">
                                <div className="relative group overflow-hidden border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center hover:border-indigo-400 hover:bg-slate-50 transition-all cursor-pointer bg-white">
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={processarArquivo}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        disabled={importando}
                                    />
                                    <div className="flex flex-col items-center">
                                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-sm">
                                            <Upload size={28} />
                                        </div>
                                        <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">Solte o arquivo ou clique para buscar</h4>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest leading-relaxed">Formatos aceitos: .xlsx, .xls, .csv</p>
                                    </div>
                                </div>

                                <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 flex items-start gap-4 shadow-xl">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                                        <Info size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Estrutura de Colunas</p>
                                        <p className="text-xs text-slate-400 leading-relaxed font-bold">
                                            O arquivo operacional deve conter as colunas <span className="text-white">NOME_COMPLETO</span>, <span className="text-white">MATRICULA</span> e <span className="text-white">TURMA_ID</span>.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="relative group">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1 transition-colors group-focus-within:text-indigo-600">
                                        <Clipboard size={14} /> Buffer de Colagem
                                    </label>
                                    <textarea
                                        className="w-full h-48 p-6 bg-slate-50 border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all placeholder:text-slate-400 resize-none font-mono custom-scrollbar"
                                        placeholder="Selecione os dados no Excel (Ctrl+C), e cole aqui (Ctrl+V)..."
                                        value={textoColado}
                                        onChange={(e) => definirTextoColado(e.target.value)}
                                    />
                                    <div className="absolute right-6 bottom-6 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-500 pointer-events-none uppercase tracking-widest shadow-sm">
                                        {textoColado.length > 0 ? `${textoColado.trim().split('\n').length} Registros` : 'Aguardando Dados'}
                                    </div>
                                </div>

                                <Botao
                                    onClick={processarColagem}
                                    disabled={!textoColado.trim()}
                                    loading={importando}
                                    fullWidth
                                    tamanho="lg"
                                    icone={ChevronRight}
                                    className="flex-row-reverse"
                                >
                                    Fase de Processamento
                                </Botao>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-6 animate-zoom-in">
                    <div className="text-center mb-10">
                        <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mb-6 mx-auto shadow-2xl shadow-indigo-200 animate-bounce-subtle">
                            <CheckCircle size={40} strokeWidth={2.5} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">Batch Concluído</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Processamento de fluxo de dados finalizado</p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 text-center shadow-lg shadow-emerald-900/5">
                            <p className="text-emerald-700 font-black text-4xl mb-2 tracking-tighter">{resultado.sucessos}</p>
                            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em]">Sincronizados</p>
                        </div>

                        <div className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100 text-center shadow-lg shadow-rose-900/5 transition-all hover:scale-105">
                            <p className="text-rose-700 font-black text-4xl mb-2 tracking-tighter">{resultado.erros}</p>
                            <p className="text-[10px] text-rose-600 font-black uppercase tracking-[0.2em]">Inconsistências</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 mb-8 flex items-center gap-4">
                        <AlertCircle className="text-slate-400 shrink-0" size={20} />
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wide">
                            Registros com falha podem ser corrigidos manualmente ou revisados na planilha de origem para nova tentativa.
                        </p>
                    </div>

                    <Botao
                        variante="secundario"
                        fullWidth
                        tamanho="lg"
                        onClick={aoFechar}
                    >
                        Pular para Listagem Atualizada
                    </Botao>
                </div>
            )}
        </ModalUniversal>
    );
}
