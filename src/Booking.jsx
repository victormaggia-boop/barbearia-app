import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useParams } from 'react-router-dom';

const PALETAS = {
  dourado: { primary: '#C9A24B', bright: '#E4C066', accent: '#A85C2E', bgImg: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop" },
  esmeralda: { primary: '#10B981', bright: '#34D399', accent: '#059669', bgImg: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?q=80&w=2070&auto=format&fit=crop" },
  rubi: { primary: '#EF4444', bright: '#F87171', accent: '#B91C1C', bgImg: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070&auto=format&fit=crop" },
  safira: { primary: '#3B82F6', bright: '#60A5FA', accent: '#1D4ED8', bgImg: "https://images.unsplash.com/photo-1621605815971-c0fc19d45a90?q=80&w=2070&auto=format&fit=crop" }
};

export default function Booking() {
  const { slug } = useParams();
  const [empresa, setEmpresa] = useState(null);
  const [erroEmpresa, setErroEmpresa] = useState(false);

  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  
  const [step, setStep] = useState(1);
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [profissionalSelecionado, setProfissionalSelecionado] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horaSelecionada, setHoraSelecionada] = useState('');
  
  const [horariosOcupados, setHorariosOcupados] = useState([]);
  const [formCliente, setFormCliente] = useState({ nome: '', telefone: '' });
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    async function carregarEmpresa() {
      const { data } = await supabase.from('empresas').select('*').eq('slug', slug).maybeSingle();
      if (data) {
        setEmpresa(data);
        carregarDados(data.id);
      } else {
        setErroEmpresa(true);
      }
    }
    carregarEmpresa();
  }, [slug]);

  useEffect(() => {
    if (profissionalSelecionado && dataSelecionada && empresa) {
      buscarHorariosOcupados();
    }
  }, [profissionalSelecionado, dataSelecionada, empresa]);

  async function carregarDados(empresaId) {
    const { data: servs } = await supabase.from('servicos').select('*').eq('empresa_id', empresaId).eq('ativo', true);
    if (servs) setServicos(servs);

    const { data: profs } = await supabase.from('barbeiros').select('*').eq('empresa_id', empresaId);
    if (profs) setProfissionais(profs);

    const hoje = new Date().toISOString().split('T')[0];
    setDataSelecionada(hoje);
  }

  async function buscarHorariosOcupados() {
    const inicioDia = new Date(`${dataSelecionada}T00:00:00-03:00`).toISOString();
    const fimDia = new Date(`${dataSelecionada}T23:59:59-03:00`).toISOString();

    const { data } = await supabase.from('agendamentos')
      .select('data_hora_inicio')
      .eq('barbeiro_id', profissionalSelecionado.id)
      .neq('status', 'cancelado')
      .gte('data_hora_inicio', inicioDia)
      .lte('data_hora_inicio', fimDia);

    if (data) {
      const horas = data.map(ag => {
        const d = new Date(ag.data_hora_inicio);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
      });
      setHorariosOcupados(horas);
    }
  }

  async function confirmarAgendamento(e) {
    e.preventDefault();
    
    let { data: cliente } = await supabase.from('clientes')
      .select('id').eq('telefone', formCliente.telefone).eq('empresa_id', empresa.id).maybeSingle();
      
    if (!cliente) {
      const { data: novo } = await supabase.from('clientes')
        .insert([{ nome: formCliente.nome, telefone: formCliente.telefone, empresa_id: empresa.id }])
        .select().single();
      cliente = novo;
    }

    const duracao = servicoSelecionado.duracao_minutos || 30;
    const inicioIso = new Date(`${dataSelecionada}T${horaSelecionada}:00-03:00`);
    const fimIso = new Date(inicioIso.getTime() + (duracao * 60000));

    await supabase.from('agendamentos').insert([{ 
      cliente_id: cliente.id, 
      barbeiro_id: profissionalSelecionado.id, 
      servico_id: servicoSelecionado.id, 
      empresa_id: empresa.id, 
      data_hora_inicio: inicioIso.toISOString(), 
      data_hora_fim: fimIso.toISOString(), 
      status: 'confirmado' 
    }]);

    setSucesso(true);
  }

  const gerarHorarios = () => {
    const horas = [];
    for (let i = 9; i <= 19; i++) {
      horas.push(`${i.toString().padStart(2, '0')}:00`);
      horas.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return horas;
  };

  const temaAtivo = PALETAS[empresa?.tema || 'dourado'];

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;600&family=Fraunces:opsz,wght@9..144,700&display=swap');
    
    :root {
      --primary: ${temaAtivo.primary};
      --bright: ${temaAtivo.bright};
    }
    
    body {
      background-color: #0A0F16;
      color: #EFE6D8;
      font-family: 'Work Sans', sans-serif;
    }

    .text-primary { color: var(--primary); }
    .bg-primary { background-color: var(--primary); }
    .border-primary { border-color: var(--primary); }
    .hover-bg-bright:hover { background-color: var(--bright); }
    
    .font-mono { font-family: 'Space Mono', monospace; }
    .font-serif { font-family: 'Fraunces', serif; }
    
    .bg-glass {
      background-color: rgba(22, 19, 15, 0.95);
      backdrop-filter: blur(12px);
    }
    
    .bg-panel { background-color: rgba(36, 31, 23, 0.8); }
    
    .custom-input {
      background-color: rgba(36, 31, 23, 0.8);
      border: 1px solid rgba(255,255,255,0.1);
      color: white;
    }
    .custom-input:focus {
      border-color: var(--primary);
      outline: none;
    }
    
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 4px; }
  `;

  if (erroEmpresa) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-center font-mono">
        <div>
          <h2 className="text-xl text-red-500 mb-2 font-bold uppercase">404 - Barbearia não encontrada</h2>
          <p className="text-gray-400 text-xs">O link acessado é inválido ou a empresa não existe.</p>
        </div>
      </div>
    );
  }

  if (!empresa) {
    return <div className="min-h-screen flex items-center justify-center p-4 text-gray-400 font-mono text-xs uppercase tracking-widest">Carregando Agenda...</div>;
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-blend-overlay bg-black/90" style={{ backgroundImage: `url('${temaAtivo.bgImg}')` }}>
        <style>{brandStyles}</style>
        <div className="bg-glass border border-primary/30 p-10 rounded-xl text-center max-w-md w-full shadow-2xl">
          <img src={empresa.logo_url || "/logomaggia.JPG"} alt="Logo" className="w-16 h-16 mx-auto rounded-full border-2 border-primary object-cover shadow-lg mb-4 bg-white" />
          <h2 className="text-2xl font-serif text-white mb-2">Fechado, chefe!</h2>
          <p className="text-gray-400 mb-6 text-sm">Seu horário foi reservado com sucesso.</p>
          <div className="font-mono text-primary mb-6 border border-primary/30 p-4 rounded bg-black/40 text-sm">
            {dataSelecionada.split('-').reverse().join('/')} às {horaSelecionada}<br/>
            Com {profissionalSelecionado.nome}
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-primary hover-bg-bright text-black font-bold py-3.5 rounded uppercase tracking-widest transition-colors shadow-lg">Novo agendamento</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4 bg-cover bg-center bg-blend-overlay" style={{ backgroundImage: `url('${temaAtivo.bgImg}')`, backgroundColor: 'rgba(0,0,0,0.85)' }}>
      <style>{brandStyles}</style>
      
      {/* CABEÇALHO COM LOGO DINÂMICA */}
      <div className="text-center mb-10 mt-2">
        <img 
          src={empresa.logo_url || "/logomaggia.JPG"} 
          alt="Logo da Barbearia" 
          className="w-20 h-20 mx-auto rounded-full border-2 border-primary object-cover shadow-[0_0_20px_rgba(255,255,255,0.15)] mb-4 bg-white" 
        />
        <h1 className="text-4xl font-serif text-white font-bold mb-2 tracking-wide drop-shadow-md">{empresa.nome || 'Barbearia'}</h1>
        <p className="font-mono text-primary text-xs tracking-[0.2em] uppercase drop-shadow">Reserve seu horário, chefe</p>
      </div>

      <div className="w-full max-w-md border border-primary/30 rounded-xl bg-glass p-6 shadow-2xl">
        
        {/* PASSO 1: SERVIÇO */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="font-mono text-xs text-primary text-center mb-6 uppercase tracking-widest">01 - Serviços</div>
            <div className="space-y-3">
              {servicos.map(s => {
                const precoEfetivo = s.preco_promocional || s.preco;
                const temPromo = s.preco_promocional && Number(s.preco_promocional) > 0;
                
                return (
                  <div key={s.id} onClick={() => setServicoSelecionado(s)} className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${servicoSelecionado?.id === s.id ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'border-white/10 bg-panel hover:border-primary/50'}`}>
                    <div>
                      <div className="font-semibold text-sm text-white flex items-center gap-2">
                        {s.nome}
                        {temPromo && <span className="text-[8px] bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Promo</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{s.duracao_minutos || 30} min</div>
                    </div>
                    <div className="font-mono text-primary text-sm flex items-center gap-3 font-bold">
                      R$ {Number(precoEfetivo).toFixed(2)}
                      <div className={`w-4 h-4 rounded-full border border-primary flex items-center justify-center transition-all ${servicoSelecionado?.id === s.id ? 'bg-primary shadow-md' : ''}`}></div>
                    </div>
                  </div>
                )
              })}
              {servicos.length === 0 && <div className="text-center text-xs text-gray-500 font-mono py-4">Nenhum serviço disponível.</div>}
            </div>
            <button disabled={!servicoSelecionado} onClick={() => setStep(2)} className="w-full mt-6 bg-primary text-black font-bold py-3.5 rounded uppercase tracking-widest disabled:opacity-50 hover-bg-bright transition-all shadow-lg">Próximo Passo</button>
          </div>
        )}

        {/* PASSO 2: PROFISSIONAL */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white font-mono text-[10px] tracking-wider uppercase">← Voltar</button>
              <div className="font-mono text-xs text-primary uppercase tracking-widest">02 - Profissional</div>
              <div className="w-12"></div>
            </div>
            
            <div className="space-y-3">
              {profissionais.map(p => (
                <div key={p.id} onClick={() => setProfissionalSelecionado(p)} className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${profissionalSelecionado?.id === p.id ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'border-white/10 bg-panel hover:border-primary/50'}`}>
                  <div className="font-semibold text-sm text-white">{p.nome}</div>
                  <div className={`w-4 h-4 rounded-full border border-primary flex items-center justify-center transition-all ${profissionalSelecionado?.id === p.id ? 'bg-primary shadow-md' : ''}`}></div>
                </div>
              ))}
            </div>
            <button disabled={!profissionalSelecionado} onClick={() => setStep(3)} className="w-full mt-6 bg-primary text-black font-bold py-3.5 rounded uppercase tracking-widest disabled:opacity-50 hover-bg-bright transition-all shadow-lg">Próximo Passo</button>
          </div>
        )}

        {/* PASSO 3: DATA E HORA */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white font-mono text-[10px] tracking-wider uppercase">← Voltar</button>
              <div className="font-mono text-xs text-primary uppercase tracking-widest">03 - Data e Hora</div>
              <div className="w-12"></div>
            </div>

            <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="w-full p-3.5 mb-6 custom-input rounded-lg font-mono text-sm" style={{colorScheme:'dark'}}/>

            <div className="grid grid-cols-3 gap-3 mb-6 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {gerarHorarios().map(hora => {
                const ocupado = horariosOcupados.includes(hora);
                return (
                  <button key={hora} disabled={ocupado} onClick={() => setHoraSelecionada(hora)} className={`py-3 rounded text-sm font-mono transition-all border ${ocupado ? 'border-gray-800 text-gray-700 bg-black/50 line-through cursor-not-allowed' : horaSelecionada === hora ? 'bg-primary text-black border-primary font-bold shadow-md' : 'border-white/10 text-gray-300 hover:border-primary/60 bg-panel'}`}>
                    {hora}
                  </button>
                )
              })}
            </div>

            <button disabled={!horaSelecionada} onClick={() => setStep(4)} className="w-full bg-primary text-black font-bold py-3.5 rounded uppercase tracking-widest disabled:opacity-50 hover-bg-bright transition-all shadow-lg">Próximo Passo</button>
          </div>
        )}

        {/* PASSO 4: CONFIRMAÇÃO DO CLIENTE */}
        {step === 4 && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
              <button onClick={() => setStep(3)} className="text-gray-400 hover:text-white font-mono text-[10px] tracking-wider uppercase">← Voltar</button>
              <div className="font-mono text-xs text-primary uppercase tracking-widest">04 - Seus Dados</div>
              <div className="w-12"></div>
            </div>

            <div className="bg-panel border border-primary/20 p-5 rounded-lg mb-6 shadow-inner">
              <div className="text-sm text-white font-semibold">{servicoSelecionado.nome}</div>
              <div className="text-xs text-gray-400 mt-1">Com {profissionalSelecionado.nome}</div>
              <div className="font-mono text-primary text-xs mt-3 border-t border-white/10 pt-3">{dataSelecionada.split('-').reverse().join('/')} às {horaSelecionada}</div>
            </div>

            <form onSubmit={confirmarAgendamento} className="space-y-4">
              <input type="text" required placeholder="Seu Nome Completo" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} className="w-full p-3.5 custom-input rounded-lg text-sm" />
              <input type="tel" required placeholder="Seu WhatsApp (DDD + Número)" value={formCliente.telefone} onChange={e => setFormCliente({...formCliente, telefone: e.target.value})} className="w-full p-3.5 custom-input rounded-lg text-sm" />
              
              <button type="submit" className="w-full mt-4 bg-primary text-black font-bold py-4 rounded uppercase tracking-widest hover-bg-bright transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">Confirmar Horário</button>
            </form>
          </div>
        )}

      </div>
      
      <a href="/" className="mt-12 font-mono text-[9px] text-gray-500 tracking-[0.3em] uppercase hover:text-primary transition-colors text-center cursor-pointer drop-shadow-md">
        Powered by Maggia
      </a>
    </div>
  );
}