import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Booking() {
  // SUBSTITUA O TEXTO ABAIXO PELO ID DA SUA EMPRESA LÁ DO BANCO DE DADOS (tabela: empresas)
  const EMPRESA_ID = "51df8103-8ba1-4654-86a9-ad752ec9554b"; 

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
    carregarDados();
  }, []);

  // Recarrega os horários sempre que o cliente muda a data ou o profissional
  useEffect(() => {
    if (profissionalSelecionado && dataSelecionada) {
      buscarHorariosOcupados();
    }
  }, [profissionalSelecionado, dataSelecionada]);

  async function carregarDados() {
    // Puxa Serviços
    const { data: servs } = await supabase.from('servicos')
      .select('*').eq('empresa_id', EMPRESA_ID).eq('ativo', true);
    if (servs) setServicos(servs);

    // Puxa Profissionais
    const { data: profs } = await supabase.from('barbeiros')
      .select('*').eq('empresa_id', EMPRESA_ID);
    if (profs) setProfissionais(profs);

    // Define a data de hoje por padrão
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
    
    // 1. Cadastra ou acha o cliente
    let { data: cliente } = await supabase.from('clientes')
      .select('id').eq('telefone', formCliente.telefone).eq('empresa_id', EMPRESA_ID).maybeSingle();
      
    if (!cliente) {
      const { data: novo } = await supabase.from('clientes')
        .insert([{ nome: formCliente.nome, telefone: formCliente.telefone, empresa_id: EMPRESA_ID }])
        .select().single();
      cliente = novo;
    }

    // 2. Calcula Duração
    const inicioIso = new Date(`${dataSelecionada}T${horaSelecionada}:00-03:00`);
    const fimIso = new Date(inicioIso.getTime() + (servicoSelecionado.duracao_minutos * 60000));

    // 3. Salva Agendamento
    await supabase.from('agendamentos').insert([{ 
      cliente_id: cliente.id, 
      barbeiro_id: profissionalSelecionado.id, 
      servico_id: servicoSelecionado.id, 
      empresa_id: EMPRESA_ID, 
      data_hora_inicio: inicioIso.toISOString(), 
      data_hora_fim: fimIso.toISOString(), 
      status: 'confirmado' 
    }]);

    setSucesso(true);
  }

  // Gera os horários das 09:00 às 19:00 (Pode ajustar para o seu horário de funcionamento)
  const gerarHorarios = () => {
    const horas = [];
    for (let i = 9; i <= 19; i++) {
      horas.push(`${i.toString().padStart(2, '0')}:00`);
      horas.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return horas;
  };

  const brandStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;600&display=swap');
    .bg-barber { background-color: #16130F; color: #EFE6D8; font-family: 'Work Sans', sans-serif; }
    .text-gold { color: #C9A24B; }
    .border-gold { border-color: #C9A24B; }
    .bg-panel { background-color: #241F17; }
    .font-mono { font-family: 'Space Mono', monospace; }
  `;

  if (sucesso) {
    return (
      <div className="bg-barber min-h-screen flex items-center justify-center p-4">
        <style>{brandStyles}</style>
        <div className="bg-panel border border-gold p-10 rounded-xl text-center max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-2">Fechado, chefe!</h2>
          <p className="text-gray-400 mb-6">Seu horário foi reservado com sucesso.</p>
          <div className="font-mono text-gold mb-6 border border-gold/30 p-4 rounded bg-black/30">
            {dataSelecionada.split('-').reverse().join('/')} às {horaSelecionada}<br/>
            Com {profissionalSelecionado.nome}
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-gold text-black font-bold py-3 rounded uppercase tracking-widest bg-[#C9A24B]">Fazer novo agendamento</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-barber min-h-screen flex flex-col items-center py-10 px-4 bg-[url('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop')] bg-cover bg-center bg-blend-overlay bg-black/90">
      <style>{brandStyles}</style>
      
      <div className="text-center mb-10">
        <h1 className="text-4xl font-serif text-white font-bold mb-2">Corte & Cerveja</h1>
        <p className="font-mono text-gold text-xs tracking-[0.2em] uppercase">Reserve seu horário, chefe</p>
      </div>

      <div className="w-full max-w-md border border-[#C9A24B]/30 rounded-xl bg-black/80 backdrop-blur-md p-6">
        
        {/* PASSO 1: SERVIÇO */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="font-mono text-xs text-gold text-center mb-6 uppercase tracking-widest">01 - Serviços</div>
            <div className="space-y-3">
              {servicos.map(s => (
                <div key={s.id} onClick={() => setServicoSelecionado(s)} className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${servicoSelecionado?.id === s.id ? 'border-gold bg-[#C9A24B]/10' : 'border-[#C9A24B]/20 bg-panel hover:border-gold/50'}`}>
                  <div>
                    <div className="font-semibold text-sm text-white">{s.nome}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.duracao_minutos} min</div>
                  </div>
                  <div className="font-mono text-gold text-sm flex items-center gap-3">
                    R$ {s.preco}
                    <div className={`w-4 h-4 rounded-full border border-gold flex items-center justify-center ${servicoSelecionado?.id === s.id ? 'bg-gold' : ''}`}></div>
                  </div>
                </div>
              ))}
            </div>
            <button disabled={!servicoSelecionado} onClick={() => setStep(2)} className="w-full mt-6 bg-[#C9A24B] text-black font-bold py-3.5 rounded uppercase tracking-widest disabled:opacity-50 transition-all">Próximo Passo</button>
          </div>
        )}

        {/* PASSO 2: PROFISSIONAL */}
        {step === 2 && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white font-mono text-xs">← VOLTAR</button>
              <div className="font-mono text-xs text-gold uppercase tracking-widest">02 - Profissional</div>
              <div className="w-16"></div>
            </div>
            
            <div className="space-y-3">
              {profissionais.map(p => (
                <div key={p.id} onClick={() => setProfissionalSelecionado(p)} className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${profissionalSelecionado?.id === p.id ? 'border-gold bg-[#C9A24B]/10' : 'border-[#C9A24B]/20 bg-panel hover:border-gold/50'}`}>
                  <div className="font-semibold text-sm text-white">{p.nome}</div>
                  <div className={`w-4 h-4 rounded-full border border-gold flex items-center justify-center ${profissionalSelecionado?.id === p.id ? 'bg-gold' : ''}`}></div>
                </div>
              ))}
            </div>
            <button disabled={!profissionalSelecionado} onClick={() => setStep(3)} className="w-full mt-6 bg-[#C9A24B] text-black font-bold py-3.5 rounded uppercase tracking-widest disabled:opacity-50 transition-all">Próximo Passo</button>
          </div>
        )}

        {/* PASSO 3: DATA E HORA */}
        {step === 3 && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white font-mono text-xs">← VOLTAR</button>
              <div className="font-mono text-xs text-gold uppercase tracking-widest">03 - Data e Hora</div>
              <div className="w-16"></div>
            </div>

            <input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} className="w-full p-3 mb-6 bg-panel border border-gold/30 rounded text-white font-mono text-sm focus:outline-none focus:border-gold" style={{colorScheme:'dark'}}/>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {gerarHorarios().map(hora => {
                const ocupado = horariosOcupados.includes(hora);
                return (
                  <button key={hora} disabled={ocupado} onClick={() => setHoraSelecionada(hora)} className={`py-3 rounded text-sm font-mono transition-all border ${ocupado ? 'border-gray-800 text-gray-700 bg-black/50 line-through cursor-not-allowed' : horaSelecionada === hora ? 'bg-gold text-black border-gold font-bold' : 'border-gold/20 text-gray-300 hover:border-gold/60 bg-panel'}`}>
                    {hora}
                  </button>
                )
              })}
            </div>

            <button disabled={!horaSelecionada} onClick={() => setStep(4)} className="w-full bg-[#C9A24B] text-black font-bold py-3.5 rounded uppercase tracking-widest disabled:opacity-50 transition-all">Próximo Passo</button>
          </div>
        )}

        {/* PASSO 4: CONFIRMAÇÃO DO CLIENTE */}
        {step === 4 && (
          <div className="animate-fade-in">
             <div className="flex justify-between items-center mb-6">
              <button onClick={() => setStep(3)} className="text-gray-400 hover:text-white font-mono text-xs">← VOLTAR</button>
              <div className="font-mono text-xs text-gold uppercase tracking-widest">04 - Seus Dados</div>
              <div className="w-16"></div>
            </div>

            <div className="bg-panel border border-gold/20 p-4 rounded-lg mb-6">
              <div className="text-sm text-white font-semibold">{servicoSelecionado.nome}</div>
              <div className="text-xs text-gray-400 mt-1">Com {profissionalSelecionado.nome}</div>
              <div className="font-mono text-gold text-xs mt-2 border-t border-gold/20 pt-2">{dataSelecionada.split('-').reverse().join('/')} às {horaSelecionada}</div>
            </div>

            <form onSubmit={confirmarAgendamento} className="space-y-4">
              <input type="text" required placeholder="Seu Nome Completo" value={formCliente.nome} onChange={e => setFormCliente({...formCliente, nome: e.target.value})} className="w-full p-4 bg-panel border border-gold/30 rounded text-white text-sm focus:outline-none focus:border-gold" />
              <input type="tel" required placeholder="Seu WhatsApp (DDD + Número)" value={formCliente.telefone} onChange={e => setFormCliente({...formCliente, telefone: e.target.value})} className="w-full p-4 bg-panel border border-gold/30 rounded text-white text-sm focus:outline-none focus:border-gold" />
              
              <button type="submit" className="w-full mt-2 bg-[#C9A24B] text-black font-bold py-4 rounded uppercase tracking-widest hover:bg-[#E4C066] transition-colors shadow-[0_0_15px_rgba(201,162,75,0.4)]">Confirmar Horário</button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}