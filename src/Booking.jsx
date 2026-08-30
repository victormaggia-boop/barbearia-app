import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';

export default function Booking() {
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState(null);
  
  const [diasRapidos, setDiasRapidos] = useState([]);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [mostrarDataFutura, setMostrarDataFutura] = useState(false);
  
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  
  const [recorrencia, setRecorrencia] = useState('nenhuma');
  const [status, setStatus] = useState('');
  const [horariosOcupados, setHorariosOcupados] = useState([]);
  
  const todosHorarios = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  const dataRef = useRef(null);
  const dadosRef = useRef(null);
  const carrosselRef = useRef(null);
  
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Sua imagem de fundo original
  const backgroundImage = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop";

  useEffect(() => {
    async function carregarDados() {
      const { data: dataServicos } = await supabase.from('servicos').select('*');
      const { data: dataBarbeiros } = await supabase.from('barbeiros').select('*');
      if (dataServicos) setServicos(dataServicos);
      if (dataBarbeiros && dataBarbeiros.length > 0) {
        setBarbeiros(dataBarbeiros);
        setBarbeiroSelecionado(dataBarbeiros[0].id);
      }
    }
    carregarDados();

    const gerarDias = () => {
      const dias = [];
      let dataAtual = new Date();
      let diasAdicionados = 0;

      while (diasAdicionados < 20) {
        if (dataAtual.getDay() !== 0) {
          const iso = dataAtual.toISOString().split('T')[0];
          const semana = dataAtual.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0,3);
          const diaMes = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit' });
          const mes = dataAtual.toLocaleDateString('pt-BR', { month: 'short' }).substring(0,3);
          dias.push({ iso, semana, diaMes, mes });
          diasAdicionados++;
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      setDiasRapidos(dias);
    };
    gerarDias();
  }, []);

  useEffect(() => {
    async function carregarHorariosOcupados() {
      if (!dataSelecionada) {
        setHorariosOcupados([]);
        return;
      }
      const inicio = `${dataSelecionada}T00:00:00-03:00`;
      const fim = `${dataSelecionada}T23:59:59-03:00`;
      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_hora_inicio')
        .eq('status', 'confirmado')
        .gte('data_hora_inicio', inicio)
        .lte('data_hora_inicio', fim);

      if (agendamentos) {
        const ocupados = agendamentos.map(ag => new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
        setHorariosOcupados(ocupados);
      }
    }
    carregarHorariosOcupados();
  }, [dataSelecionada]);

  // Lógica de arrastar o carrossel no PC
  const handleMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - carrosselRef.current.offsetLeft;
    scrollLeft.current = carrosselRef.current.scrollLeft;
  };
  const handleMouseLeave = () => { isDragging.current = false; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - carrosselRef.current.offsetLeft;
    const walk = (x - startX.current) * 2;
    carrosselRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const handleSelecionarServico = (s) => {
    setServicoSelecionado(s);
    setTimeout(() => dataRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  };

  const handleSelecionarHorario = (hora) => {
    setHorarioSelecionado(hora);
    setTimeout(() => dadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
  };

  async function handleFinalizarAgendamento(e) {
    e.preventDefault();
    setStatus('Gerando agendamentos, aguarde...');

    let { data: cliente } = await supabase.from('clientes').select('id').eq('telefone', telefoneCliente).maybeSingle();
    if (!cliente) {
      const { data: novoCliente, error: errCliente } = await supabase.from('clientes').insert([{ nome: nomeCliente, telefone: telefoneCliente }]).select().single();
      if (errCliente) return setStatus('Erro ao cadastrar cliente.');
      cliente = novoCliente;
    }

    let qtdCortes = 1;
    let saltoDias = 0;

    switch (recorrencia) {
      case 'semanal_3m': qtdCortes = 12; saltoDias = 7; break;
      case 'semanal_6m': qtdCortes = 24; saltoDias = 7; break;
      case 'quinzenal_3m': qtdCortes = 6; saltoDias = 14; break;
      case 'quinzenal_6m': qtdCortes = 12; saltoDias = 14; break;
      case 'mensal_3m': qtdCortes = 3; saltoDias = 28; break;
      case 'mensal_6m': qtdCortes = 6; saltoDias = 28; break;
      default: qtdCortes = 1; saltoDias = 0; break;
    }

    const agendamentosParaInserir = [];
    const baseDate = new Date(`${dataSelecionada}T${horarioSelecionado}:00-03:00`);
    const duracao = servicoSelecionado?.duracao_minutos || 30;

    for (let i = 0; i < qtdCortes; i++) {
      const currentDate = new Date(baseDate.getTime());
      currentDate.setDate(currentDate.getDate() + (i * saltoDias));
      
      const inicioIso = currentDate.toISOString();
      const fimIso = new Date(currentDate.getTime() + duracao * 60000).toISOString();

      agendamentosParaInserir.push({
        cliente_id: cliente.id,
        barbeiro_id: barbeiroSelecionado,
        servico_id: servicoSelecionado.id,
        data_hora_inicio: inicioIso,
        data_hora_fim: fimIso,
        status: 'confirmado'
      });
    }

    const minDate = agendamentosParaInserir[0].data_hora_inicio;
    const maxDate = agendamentosParaInserir[agendamentosParaInserir.length - 1].data_hora_fim;
    
    const { data: jaAgendados } = await supabase
      .from('agendamentos')
      .select('data_hora_inicio')
      .eq('status', 'confirmado')
      .gte('data_hora_inicio', minDate)
      .lte('data_hora_inicio', maxDate)
      .eq('barbeiro_id', barbeiroSelecionado);

    const occupiedTimes = jaAgendados ? jaAgendados.map(a => a.data_hora_inicio) : [];
    const conflitos = [];
    
    const agendamentosFinais = agendamentosParaInserir.filter(ag => {
      if (occupiedTimes.includes(ag.data_hora_inicio)) {
        conflitos.push(ag.data_hora_inicio);
        return false;
      }
      return true;
    });

    if (agendamentosFinais.length === 0) {
      setStatus('Ops! Todos esses horários já estão ocupados no sistema.');
      return;
    }

    const { error: errAgendamento } = await supabase.from('agendamentos').insert(agendamentosFinais);

    if (errAgendamento) {
      setStatus('Erro ao processar pacote de agendamentos.');
    } else {
      if (conflitos.length > 0) {
        setStatus(`Agendamento realizado! Reservamos ${agendamentosFinais.length} datas. ${conflitos.length} datas no futuro já estavam ocupadas.`);
      } else {
        setStatus(`Agendamento confirmado com sucesso, chefe!`);
      }
      setHorariosOcupados(prev => [...prev, horarioSelecionado]);
      
      // Reseta os campos para mostrar sucesso
      setTimeout(() => {
        setHorarioSelecionado('');
        setRecorrencia('nenhuma');
        setServicoSelecionado(null);
        setDataSelecionada('');
        setStatus('');
      }, 5000);
    }
  }

  const estiloScroll = `
    .hide-scroll::-webkit-scrollbar { display: none; }
    .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed text-paper font-sans selection:bg-brass selection:text-leather pb-20" style={{ backgroundImage: `url('${backgroundImage}')` }}>
      <style>{estiloScroll}</style>
      
      {/* Camada escura estilo Couro por cima da foto */}
      <div className="min-h-screen w-full bg-leather/90 backdrop-blur-[2px] p-4 sm:p-8 flex flex-col items-center">
        
        {/* Header Barber Halley */}
        <div className="text-center mt-6 sm:mt-10 mb-8 sm:mb-12 w-full flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border-[3px] border-brass flex items-center justify-center font-mono text-xs text-brass text-center leading-none mb-4 tracking-widest shadow-lg">
            BARBER<br/>HALLEY
          </div>
          <h1 className="text-4xl sm:text-5xl font-serif font-black tracking-tight text-paper mb-1">Corte & Cerveja</h1>
          <p className="text-brass font-mono text-[10px] sm:text-xs tracking-[0.2em] uppercase">Reserve seu horário, chefe</p>
        </div>

        <div className="max-w-xl w-full">
          <form onSubmit={handleFinalizarAgendamento} className="space-y-8 bg-leather-200/80 border border-brass-line p-5 sm:p-8 rounded-2xl shadow-2xl backdrop-blur-md">
            
            {/* 1. SERVIÇOS */}
            <div>
              <label className="block text-[11px] font-mono tracking-widest uppercase text-copper-bright mb-4 text-center">01 · Serviços</label>
              <div className="space-y-2">
                {servicos.map((s) => (
                  <button key={s.id} type="button" onClick={() => handleSelecionarServico(s)} 
                    className={`w-full p-4 text-left flex justify-between items-center transition-all duration-300 rounded-lg border ${
                        servicoSelecionado?.id === s.id 
                        ? 'border-brass bg-brass/10' 
                        : 'bg-leather-300 border-brass-line hover:border-brass/50'
                    }`}>
                    <div>
                      <p className={`font-semibold text-sm sm:text-base ${servicoSelecionado?.id === s.id ? 'text-brass-bright' : 'text-paper'}`}>{s.nome}</p>
                      <p className="text-[11px] text-paper-dim mt-0.5">{s.duracao_minutos} min</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-copper-bright">R$ {parseFloat(s.preco).toFixed(0)}</span>
                        <div className={`w-4 h-4 rounded-full border-[1.5px] flex-shrink-0 ${servicoSelecionado?.id === s.id ? 'border-brass bg-brass' : 'border-paper-dim'}`}></div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. DATA E HORÁRIO */}
            {servicoSelecionado && (
              <div ref={dataRef} className="pt-8 border-t border-brass-line animate-fade-in w-full overflow-hidden">
                <label className="block text-[11px] font-mono tracking-widest uppercase text-copper-bright mb-4 text-center">02 · Data e Hora</label>
                
                <div ref={carrosselRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} 
                     className="flex overflow-x-auto gap-2 pb-4 hide-scroll cursor-grab active:cursor-grabbing select-none">
                  {diasRapidos.map(dia => {
                    const ativo = dataSelecionada === dia.iso && !mostrarDataFutura;
                    return (
                      <button key={dia.iso} type="button" onClick={() => { setDataSelecionada(dia.iso); setMostrarDataFutura(false); setHorarioSelecionado(''); }} 
                        className={`flex-shrink-0 flex flex-col items-center justify-center p-3 min-w-[72px] rounded-lg border transition-all duration-300 ${
                            ativo ? 'bg-brass border-brass text-leather scale-105 shadow-md' : 'bg-leather-300 border-brass-line text-paper hover:bg-leather-200'
                        }`}>
                        <span className={`text-[9px] uppercase tracking-wider mb-1 font-semibold ${ativo ? 'text-leather/70' : 'text-paper-dim'}`}>{dia.semana}</span>
                        <span className="text-xl font-bold font-mono">{dia.diaMes}</span>
                        <span className={`text-[9px] uppercase mt-0.5 ${ativo ? 'text-leather/80' : 'text-paper-dim'}`}>{dia.mes}</span>
                      </button>
                    )
                  })}
                  
                  <button type="button" onClick={() => { setMostrarDataFutura(true); setDataSelecionada(''); setHorarioSelecionado(''); }} 
                    className={`flex-shrink-0 flex flex-col items-center justify-center p-3 min-w-[72px] rounded-lg border transition-all duration-300 ${
                        mostrarDataFutura ? 'bg-copper border-copper text-paper scale-105' : 'bg-leather-300 border-brass-line text-paper hover:bg-leather-200'
                    }`}>
                    <span className="text-xl mb-1">📅</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-center leading-tight">Outra<br/>Data</span>
                  </button>
                </div>

                {mostrarDataFutura && (
                  <div className="mt-2 mb-6 animate-fade-in">
                    <input type="date" min={new Date().toISOString().split('T')[0]} value={dataSelecionada} onChange={(e) => { setDataSelecionada(e.target.value); setHorarioSelecionado(''); }} 
                      className="w-full p-4 bg-leather-300 rounded-lg border border-brass-line text-paper focus:outline-none focus:border-brass transition-colors" style={{ colorScheme: 'dark' }} />
                  </div>
                )}

                {dataSelecionada && (
                  <div className="mt-4 animate-fade-in">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {todosHorarios.map((hora) => {
                        const isOcupado = horariosOcupados.includes(hora);
                        return (
                          <button key={hora} type="button" disabled={isOcupado} onClick={() => handleSelecionarHorario(hora)} 
                            className={`p-3 rounded-md text-sm font-mono transition-all border ${
                                isOcupado ? 'opacity-35 bg-leather-300 border-brass-line text-paper-dim cursor-not-allowed line-through' : 
                                horarioSelecionado === hora ? 'bg-brass border-brass text-leather font-bold scale-105 shadow-md' : 
                                'bg-leather-300 border-brass-line text-paper hover:border-brass/50'
                            }`}>
                            {hora}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. DADOS FINAIS & MÚLTIPLAS RECORRÊNCIAS */}
            {horarioSelecionado && (
              <div ref={dadosRef} className="pt-8 border-t border-brass-line animate-fade-in flex flex-col">
                <label className="block text-[11px] font-mono tracking-widest uppercase text-copper-bright mb-4 text-center">03 · Confirmação</label>
                
                {/* Ticket de Papel como Resumo */}
                <div className="bg-paper text-ink rounded-lg p-5 flex-1 relative flex flex-col shadow-lg border-b-4 border-dashed border-leather mb-6">
                    <div className="font-serif font-black text-sm tracking-wide">BARBER HALLEY</div>
                    <div className="font-mono text-[11px] text-copper mt-1">
                        {new Date(dataSelecionada).toLocaleDateString('pt-BR')} · {horarioSelecionado}
                    </div>
                    <div className="h-px bg-ink/15 my-3"></div>
                    <div className="flex justify-between text-xs py-1 border-b border-dashed border-ink/15 font-semibold">
                        <span>{servicoSelecionado.nome}</span>
                        <span className="font-mono text-copper">R$ {parseFloat(servicoSelecionado.preco).toFixed(0)}</span>
                    </div>
                </div>

                <div className="space-y-4">
                  <input type="text" placeholder="Nome Completo" required value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} 
                    className="w-full p-4 bg-leather-300 rounded-lg border border-brass-line text-paper placeholder-paper-dim focus:outline-none focus:border-brass transition-colors" />
                  <input type="tel" placeholder="WhatsApp (DDD+Numero)" required value={telefoneCliente} onChange={(e) => setTelefoneCliente(e.target.value)} 
                    className="w-full p-4 bg-leather-300 rounded-lg border border-brass-line text-paper placeholder-paper-dim focus:outline-none focus:border-brass transition-colors" />
                  
                  {/* Dropdown de Frequência Restabelecido */}
                  <div className="pt-2">
                    <label className="block text-[11px] font-mono tracking-widest uppercase text-paper-dim mb-2">Plano / Frequência (Opcional)</label>
                    <select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)} 
                        className="w-full p-4 bg-leather-300 rounded-lg border border-brass-line text-paper focus:outline-none focus:border-brass transition-colors text-sm" style={{ colorScheme: 'dark' }}>
                      <option value="nenhuma">Agendar apenas 1 vez</option>
                      <optgroup label="Toda Semana">
                        <option value="semanal_3m">Toda semana - 3 Meses (12 cortes)</option>
                        <option value="semanal_6m">Toda semana - 6 Meses (24 cortes)</option>
                      </optgroup>
                      <optgroup label="A Cada 15 Dias">
                        <option value="quinzenal_3m">De 15 em 15 dias - 3 Meses (6 cortes)</option>
                        <option value="quinzenal_6m">De 15 em 15 dias - 6 Meses (12 cortes)</option>
                      </optgroup>
                      <optgroup label="1 Vez por Mês">
                        <option value="mensal_3m">Mensal - 3 Meses (3 cortes)</option>
                        <option value="mensal_6m">Mensal - 6 Meses (6 cortes)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={!nomeCliente || !telefoneCliente || status.includes('aguarde')} 
                    className="w-full py-4 mt-8 rounded-lg bg-brass text-leather font-bold text-sm uppercase tracking-wider transition-all duration-300 shadow-lg disabled:opacity-50 hover:bg-brass-bright">
                    Confirmar Agendamento
                </button>
              </div>
            )}
          </form>

          {/* Banner de Sucesso/Erro */}
          {status && (
            <div className="mt-6 p-4 rounded-lg backdrop-blur-md bg-brass/20 border border-brass text-paper text-center font-serif text-sm animate-fade-in shadow-xl">
                {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}