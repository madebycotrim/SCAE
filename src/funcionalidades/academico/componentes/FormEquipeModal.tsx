import { useState } from 'react';
import { Save, Hexagon, Info } from 'lucide-react';
import { Botao } from '@/compartilhado/componentes/UI';
import ModalUniversal from '@/compartilhado/componentes/ModalUniversal';
import { DadosEquipe } from '../tipos/equipe';

interface FormEquipeModalProps {
    equipe?: DadosEquipe | null;
    aoFechar: () => void;
    aoSalvar: (dados: Partial<DadosEquipe>) => Promise<void>;
}

const CORES_SUGERIDAS = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'
];

export default function FormEquipeModal({ equipe, aoFechar, aoSalvar }: FormEquipeModalProps) {
    const [carregando, definirCarregando] = useState(false);
    
    const [form, definirForm] = useState<Partial<DadosEquipe>>(equipe || {
        id: '',
        nome_equipe: '',
        cor: '#4F46E5',
        tts_alias: ''
    });

    const atualizarForm = (campo: keyof DadosEquipe, valor: any) => {
        definirForm(prev => ({ ...prev, [campo]: valor }));
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        definirCarregando(true);
        try {
            await aoSalvar(form);
        } finally {
            definirCarregando(false);
        }
    };

    return (
        <ModalUniversal
            titulo={equipe ? 'Editar Equipe' : 'Nova Equipe'}
            subtitulo="Configure a identidade visual e o nome da equipe"
            aoFechar={aoFechar}
            tamanho="md"
            icone={Hexagon}
        >
            <form onSubmit={onSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                    {/* ID Slug */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={12} /> ID / Identificador (Slug)
                        </label>
                        <input
                            placeholder="ex: ensino-medio"
                            value={form.id}
                            onChange={(e) => atualizarForm('id', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                            disabled={!!equipe}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-black tracking-widest uppercase focus:bg-white focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                            required
                        />
                    </div>

                    {/* Nome Equipe */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Nome da Equipe
                        </label>
                        <input
                            placeholder="Nome visível na listagem"
                            value={form.nome_equipe}
                            onChange={(e) => atualizarForm('nome_equipe', e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* TTS Alias */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Alias para TTS (Voz)
                        </label>
                        <input
                            placeholder="Como o tablet deve pronunciar?"
                            value={form.tts_alias || ''}
                            onChange={(e) => atualizarForm('tts_alias', e.target.value)}
                            className="w-full h-11 px-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:bg-white focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    {/* Seletor de Cores */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Cor da Equipe</label>
                        <div className="flex flex-wrap gap-2.5">
                            {CORES_SUGERIDAS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => atualizarForm('cor', c)}
                                    className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${form.cor === c ? 'border-indigo-600 ring-4 ring-indigo-50' : 'border-white shadow-sm'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <input 
                                type="color" 
                                value={form.cor} 
                                onChange={(e) => atualizarForm('cor', e.target.value)}
                                className="w-9 h-9 rounded-full border-2 border-white cursor-pointer bg-transparent overflow-hidden shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-8 flex justify-end gap-3 border-t border-slate-50">
                    <Botao variante="ghost" onClick={aoFechar} type="button">
                        Cancelar
                    </Botao>
                    <Botao variante="primario" type="submit" carregando={carregando} icone={Save}>
                        {equipe ? 'Salvar Alterações' : 'Criar Equipe'}
                    </Botao>
                </div>
            </form>
        </ModalUniversal>
    );
}
