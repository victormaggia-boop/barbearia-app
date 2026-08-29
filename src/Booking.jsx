import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';

function App() {
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
  
  // Estado da Recorrência turbinado
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
          const semana = dataAtual.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
          const diaMes = dataAtual.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          dias.push({ iso, semana, diaMes });
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

    // Traduz a escolha do cliente em QTD de Cortes e Intervalo de Dias
    let qtdCortes = 1;
    let saltoDias = 0;

    switch (recorrencia) {
      case 'semanal_3m': qtdCortes = 12; saltoDias = 7; break;
      case 'semanal_6m': qtdCortes = 24; saltoDias = 7; break;
      case 'quinzenal_3m': qtdCortes = 6; saltoDias = 14; break;
      case 'quinzenal_6m': qtdCortes = 12; saltoDias = 14; break;
      case 'mensal_3m': qtdCortes = 3; saltoDias = 28; break; // 4 semanas (mantém o dia da semana)
      case 'mensal_6m': qtdCortes = 6; saltoDias = 28; break;
      default: qtdCortes = 1; saltoDias = 0; break;
    }

    const agendamentosParaInserir = [];
    const baseDate = new Date(`${dataSelecionada}T${horarioSelecionado}:00-03:00`);
    const duracao = servicoSelecionado?.duracao_minutos || 30;

    // Gera as datas calculando os saltos (7, 14 ou 28 dias)
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

    // Busca conflitos no banco
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

    // Dispara pro Banco
    const { error: errAgendamento } = await supabase.from('agendamentos').insert(agendamentosFinais);

    if (errAgendamento) {
      setStatus('Erro ao processar pacote de agendamentos.');
    } else {
      if (conflitos.length > 0) {
        setStatus(`Agendamento realizado! Reservamos ${agendamentosFinais.length} datas com sucesso. Observação: ${conflitos.length} datas no futuro já estavam ocupadas e foram puladas.`);
      } else {
        setStatus(`Pacote ativado com sucesso! Garantiu ${agendamentosFinais.length} atendimento(s) na agenda.`);
      }
      setHorariosOcupados(prev => [...prev, horarioSelecionado]);
      setHorarioSelecionado('');
      setRecorrencia('nenhuma');
    }
  }

  const estiloScroll = `
    .hide-scroll::-webkit-scrollbar { display: none; }
    .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
  `;

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed text-barber-light font-sans selection:bg-barber-accent selection:text-barber-light pb-20" style={{ backgroundImage: `url('${backgroundImage}')` }}>
      <style>{estiloScroll}</style>
      <div className="min-h-screen w-full bg-black/80 p-4 sm:p-8 flex flex-col items-center">
        
        <div className="text-center mt-6 sm:mt-10 mb-8 sm:mb-12 w-full">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif tracking-widest text-barber-light uppercase drop-shadow-2xl mb-2">Raphael<br/>Halley</h1>
          <p className="text-barber-light/80 tracking-[0.4em] text-xs sm:text-sm uppercase mt-4">Barber Shop</p>
        </div>

        <div className="max-w-xl w-full">
          <form onSubmit={handleFinalizarAgendamento} className="space-y-10 backdrop-blur-md bg-barber-dark/90 border border-barber-accent/40 p-5 sm:p-10 rounded-xl shadow-2xl">
            
            {/* 1. SERVIÇOS */}
            <div>
              <label className="block text-xs sm:text-sm font-serif tracking-widest uppercase text-barber-light/70 mb-4">1. Escolha o Serviço</label>
              <div className="space-y-3">
                {servicos.map((s) => (
                  <button key={s.id} type="button" onClick={() => handleSelecionarServico(s)} className={`w-full p-4 text-left flex justify-between items-center transition-all duration-300 rounded-md border ${servicoSelecionado?.id === s.id ? 'border-barber-light bg-barber-light text-barber-dark shadow-lg scale-[1.02]' : 'border-barber-accent/30 bg-black/40 text-barber-light hover:border-barber-accent/80'}`}>
                    <div>
                      <p className="font-serif text-base sm:text-lg">{s.nome}</p>
                      <p className={`text-xs mt-1 ${servicoSelecionado?.id === s.id ? 'text-barber-dark/70' : 'text-barber-light/60'}`}>{s.duracao_minutos} min</p>
                    </div>
                    <span className="font-bold text-base sm:text-lg">R$ {parseFloat(s.preco).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. DATA E HORÁRIO */}
            {servicoSelecionado && (
              <div ref={dataRef} className="pt-6 border-t border-barber-accent/30 animate-fade-in w-full overflow-hidden">
                <label className="block text-xs sm:text-sm font-serif tracking-widest uppercase text-barber-light/70 mb-4">2. Dia do Atendimento</label>
                
                <div ref={carrosselRef} onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} className="flex overflow-x-auto gap-3 pb-4 hide-scroll cursor-grab active:cursor-grabbing select-none">
                  {diasRapidos.map(dia => {
                    const ativo = dataSelecionada === dia.iso && !mostrarDataFutura;
                    return (
                      <button key={dia.iso} type="button" onClick={() => { setDataSelecionada(dia.iso); setMostrarDataFutura(false); setHorarioSelecionado(''); }} className={`flex-shrink-0 flex flex-col items-center justify-center p-3 min-w-[80px] rounded-full border transition-all duration-300 ${ativo ? 'bg-barber-light border-barber-light text-barber-dark scale-105' : 'bg-black/40 border-barber-accent/40 text-barber-light hover:bg-barber-accent/20'}`}>
                        <span className="text-xs uppercase tracking-widest mb-1">{dia.semana}</span>
                        <span className="text-xl font-bold">{dia.diaMes.split('/')[0]}</span>
                      </button>
                    )
                  })}
                  
                  <button type="button" onClick={() => { setMostrarDataFutura(true); setDataSelecionada(''); setHorarioSelecionado(''); }} className={`flex-shrink-0 flex flex-col items-center justify-center p-3 min-w-[90px] rounded-xl border transition-all duration-300 ${mostrarDataFutura ? 'bg-barber-accent border-barber-accent text-barber-light scale-105' : 'bg-black/40 border-barber-accent/40 text-barber-light hover:bg-barber-accent/20'}`}>
                    <span className="text-xl mb-1">📅</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-center leading-tight">Data<br/>Futura</span>
                  </button>
                </div>

                {mostrarDataFutura && (
                  <div className="mt-2 mb-6 animate-fade-in">
                    <label className="block text-xs text-barber-light/60 mb-2">Selecione a data do seu evento:</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} value={dataSelecionada} onChange={(e) => { setDataSelecionada(e.target.value); setHorarioSelecionado(''); }} className="w-full p-4 bg-black/60 rounded-md border border-barber-accent/60 text-barber-light focus:outline-none focus:border-barber-light transition-colors" style={{ colorScheme: 'dark' }} />
                  </div>
                )}

                {dataSelecionada && (
                  <div className="mt-6 animate-fade-in">
                    <label className="block text-xs sm:text-sm font-serif tracking-widest uppercase text-barber-light/70 mb-4">Horários Disponíveis</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                      {todosHorarios.map((hora) => {
                        const isOcupado = horariosOcupados.includes(hora);
                        return (
                          <button key={hora} type="button" disabled={isOcupado} onClick={() => handleSelecionarHorario(hora)} className={`p-3 rounded-md text-sm font-serif transition-all border ${isOcupado ? 'bg-red-950/40 border-red-900/30 text-red-500/40 cursor-not-allowed line-through' : horarioSelecionado === hora ? 'bg-barber-light border-barber-light text-barber-dark font-bold scale-105 shadow-md' : 'bg-black/40 border-barber-accent/40 text-barber-light hover:bg-barber-accent/30'}`}>
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
              <div ref={dadosRef} className="pt-6 border-t border-barber-accent/30 animate-fade-in">
                <label className="block text-xs sm:text-sm font-serif tracking-widest uppercase text-barber-light/70 mb-4">3. Seus Dados & Pacotes</label>
                
                <div className="space-y-4">
                  <input type="text" placeholder="Nome Completo" required value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="w-full p-4 bg-black/40 rounded-md border border-barber-accent/40 text-barber-light focus:outline-none focus:border-barber-light transition-colors" />
                  <input type="tel" placeholder="WhatsApp (ex: 13999999999)" required value={telefoneCliente} onChange={(e) => setTelefoneCliente(e.target.value)} className="w-full p-4 bg-black/40 rounded-md border border-barber-accent/40 text-barber-light focus:outline-none focus:border-barber-light transition-colors" />
                  
                  {/* Super Dropdown de Frequência */}
                  <div className="pt-2">
                    <label className="block text-xs font-serif tracking-widest uppercase text-barber-accent mb-2">Frequência (Plano de Assinatura)</label>
                    <select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value)} className="w-full p-4 bg-black/40 rounded-md border border-barber-accent/40 text-barber-light focus:outline-none focus:border-barber-light transition-colors" style={{ colorScheme: 'dark' }}>
                      <option value="nenhuma">Agendar apenas 1 vez (Neste dia)</option>
                      
                      <optgroup label="Toda Semana">
                        <option value="semanal_3m">Toda semana - Pacote 3 Meses (12 cortes)</option>
                        <option value="semanal_6m">Toda semana - Pacote 6 Meses (24 cortes)</option>
                      </optgroup>
                      
                      <optgroup label="A Cada 15 Dias">
                        <option value="quinzenal_3m">De 15 em 15 dias - Pacote 3 Meses (6 cortes)</option>
                        <option value="quinzenal_6m">De 15 em 15 dias - Pacote 6 Meses (12 cortes)</option>
                      </optgroup>
                      
                      <optgroup label="1 Vez por Mês (A cada 4 Semanas)">
                        <option value="mensal_3m">1 vez por mês - Pacote 3 Meses (3 cortes)</option>
                        <option value="mensal_6m">1 vez por mês - Pacote 6 Meses (6 cortes)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 mt-8 rounded-md bg-barber-accent hover:bg-barber-light hover:text-barber-dark text-barber-light font-serif tracking-widest uppercase transition-all duration-300 shadow-lg">Confirmar Agendamento</button>
              </div>
            )}
          </form>

          {status && (
            <div className="mt-6 p-4 rounded-md backdrop-blur-md bg-green-900/40 border border-green-500/50 text-green-100 text-center font-serif text-sm">{status}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;