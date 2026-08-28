import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  
  const [servicoSelecionado, setServicoSelecionado] = useState(null);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [status, setStatus] = useState('');

  const [horariosOcupados, setHorariosOcupados] = useState([]);
  
  // Grade completa e dinâmica das 09h às 19h
  const todosHorarios = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  // Referências para a rolagem automática (Auto-Scroll)
  const dataRef = useRef(null);
  const dadosRef = useRef(null);

  const backgroundImage = "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=2074&auto=format&fit=crop";

  useEffect(() => {
    async function carregarDados() {
      const { data: dataServicos } = await supabase.from('servicos').select('*');
      const { data: dataBarbeiros } = await supabase.from('barbeiros').select('*');
      
      if (dataServicos) setServicos(dataServicos);
      if (dataBarbeiros) {
        setBarbeiros(dataBarbeiros);
        if (dataBarbeiros.length > 0) setBarbeiroSelecionado(dataBarbeiros[0].id);
      }
    }
    carregarDados();
  }, []);

  useEffect(() => {
    async function carregarHorariosOcupados() {
      if (!dataSelecionada) {
        setHorariosOcupados([]);
        return;
      }

      const inicioDoDia = `${dataSelecionada}T00:00:00-03:00`;
      const fimDoDia = `${dataSelecionada}T23:59:59-03:00`;

      const { data: agendamentos } = await supabase
        .from('agendamentos')
        .select('data_hora_inicio')
        .eq('status', 'confirmado')
        .gte('data_hora_inicio', inicioDoDia)
        .lte('data_hora_inicio', fimDoDia);

      if (agendamentos) {
        const ocupados = agendamentos.map(ag => {
          const dataObj = new Date(ag.data_hora_inicio);
          return dataObj.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            timeZone: 'America/Sao_Paulo' 
          });
        });
        setHorariosOcupados(ocupados);
      }
    }
    carregarHorariosOcupados();
  }, [dataSelecionada]);

  // Funções para selecionar e rolar a tela suavemente
  const handleSelecionarServico = (s) => {
    setServicoSelecionado(s);
    setTimeout(() => {
      dataRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  const handleSelecionarHorario = (hora) => {
    setHorarioSelecionado(hora);
    setTimeout(() => {
      dadosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  };

  async function handleFinalizarAgendamento(e) {
    e.preventDefault();
    setStatus('Processando...');

    let { data: cliente } = await supabase.from('clientes').select('id').eq('telefone', telefoneCliente).maybeSingle();

    if (!cliente) {
      const { data: novoCliente, error: errCliente } = await supabase
        .from('clientes')
        .insert([{ nome: nomeCliente, telefone: telefoneCliente }])
        .select()
        .single();
      if (errCliente) { setStatus('Erro ao cadastrar cliente.'); return; }
      cliente = novoCliente;
    }

    const dataHoraInicio = new Date(`${dataSelecionada}T${horarioSelecionado}:00-03:00`).toISOString();
    const dataHoraFim = new Date(new Date(dataHoraInicio).getTime() + (servicoSelecionado?.duracao_minutos || 30) * 60000).toISOString();

    const { data: jaExiste } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('data_hora_inicio', dataHoraInicio)
      .eq('status', 'confirmado')
      .maybeSingle();

    if (jaExiste) {
      setStatus('Ops! Esse horário acabou de ser preenchido. Escolha outro por favor.');
      setHorariosOcupados(prev => [...prev, horarioSelecionado]);
      setHorarioSelecionado('');
      return;
    }

    const { error: errAgendamento } = await supabase
      .from('agendamentos')
      .insert([{
        cliente_id: cliente.id,
        barbeiro_id: barbeiroSelecionado,
        servico_id: servicoSelecionado.id,
        data_hora_inicio: dataHoraInicio,
        data_hora_fim: dataHoraFim,
        status: 'confirmado'
      }]);

    if (errAgendamento) {
      setStatus('Erro ao agendar.');
    } else {
      setStatus('Agendamento realizado com sucesso!');
      setHorariosOcupados(prev => [...prev, horarioSelecionado]);
      setHorarioSelecionado('');
    }
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed text-barber-light font-sans selection:bg-barber-accent selection:text-barber-light pb-20"
      style={{ backgroundImage: `url('${backgroundImage}')` }}
    >
      <div className="min-h-screen w-full bg-black/70 p-4 sm:p-8 flex flex-col items-center">
        
        {/* Cabeçalho */}
        <div className="text-center mt-6 sm:mt-10 mb-8 sm:mb-12 w-full">
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif tracking-widest text-barber-light uppercase drop-shadow-2xl mb-2">
            Raphael<br/>Halley
          </h1>
          <p className="text-barber-light/80 tracking-[0.4em] text-xs sm:text-sm md:text-base uppercase mt-4">Barber Shop</p>
        </div>

        {/* Container Principal */}
        <div className="max-w-xl w-full">
          <form onSubmit={handleFinalizarAgendamento} className="space-y-10 backdrop-blur-md bg-barber-dark/90 border border-barber-accent/40 p-5 sm:p-10 rounded-xl shadow-2xl">
            
            {/* PASSO 1: Serviços */}
            <div>
              <label className="block text-xs sm:text-sm font-serif tracking-widest uppercase text-barber-light/70 mb-4">
                1. Escolha o Serviço
              </label>
              <div className="space-y-3">
                {servicos.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelecionarServico(s)}
                    className={`w-full p-4 text-left flex justify-between items-center transition-all duration-300 rounded-md border ${
                      servicoSelecionado?.id === s.id
                        ? 'border-barber-light bg-barber-light text-barber-dark shadow-lg scale-[1.02]'
                        : 'border-barber-accent/30 bg-black/40 text-barber-light hover:border-barber-accent/80'
                    }`}
                  >
                    <div>
                      <p className="font-serif text-base sm:text-lg">{s.nome}</p>
                      <p className={`text-xs mt-1 ${servicoSelecionado?.id === s.id ? 'text-barber-dark/70' : 'text-barber-light/60'}`}>
                        {s.duracao_minutos} min
                      </p>
                    </div>
                    <span className="font-bold text-base sm:text-lg">R$ {parseFloat(s.preco).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PASSO 2: Data e Horário */}
            {servicoSelecionado && (
              <div ref={dataRef} className="pt-6 border-t border-barber-accent/30 animate-fade-in">
                <label className="block text-xs sm:text-sm font-serif tracking-widest uppercase text-barber-light/70 mb-4">
                  2. Data e Horário
                </label>
                
                <input
                  type="date"
                  required
                  value={dataSelecionada}
                  onChange={(e) => {
                    setDataSelecionada(e.target.value);
                    setHorarioSelecionado('');
                  }}
                  className="w-full p-3 sm:p-4 bg-black/40 rounded-md border border-barber-accent/40 text-barber-light focus:outline-none focus:border-barber-light mb-6 transition-colors"
                  style={{ colorScheme: 'dark' }}
                />

                {dataSelecionada && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
                    {todosHorarios.map((hora) => {
                      const isOcupado = horariosOcupados.includes(hora);
                      return (
                        <button
                          key={hora}
                          type="button"
                          disabled={isOcupado}
                          onClick={() => handleSelecionarHorario(hora)}
                          className={`p-3 rounded-md text-sm font-serif transition-all border ${
                            isOcupado
                              ? 'bg-red-950/40 border-red-900/30 text-red-500/40 cursor-not-allowed line-through'
                              : horarioSelecionado === hora
                                ? 'bg-barber-light border-barber-light text-barber-dark font-bold scale-105 shadow-md'
                                : 'bg-black/40 border-barber-accent/40 text-barber-light hover:bg-barber-accent/30'
                          }`}
                        >
                          {hora}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PASSO 3: Dados do Cliente */}
            {horarioSelecionado && (
              <div ref={dadosRef} className="pt-6 border-t border-barber-accent/30 animate-fade-in">
                <label className="block text-xs sm:text-sm font-serif tracking-widest uppercase text-barber-light/70 mb-4">
                  3. Seus Dados
                </label>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nome Completo"
                    required
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="w-full p-4 bg-black/40 rounded-md border border-barber-accent/40 text-barber-light placeholder-barber-light/40 focus:outline-none focus:border-barber-light transition-colors"
                  />
                  <input
                    type="tel"
                    placeholder="WhatsApp (ex: 13999999999)"
                    required
                    value={telefoneCliente}
                    onChange={(e) => setTelefoneCliente(e.target.value)}
                    className="w-full p-4 bg-black/40 rounded-md border border-barber-accent/40 text-barber-light placeholder-barber-light/40 focus:outline-none focus:border-barber-light transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 mt-8 rounded-md bg-barber-accent hover:bg-barber-light hover:text-barber-dark text-barber-light font-serif tracking-widest uppercase transition-all duration-300 shadow-lg"
                >
                  Confirmar Agendamento
                </button>
              </div>
            )}
          </form>

          {status && (
            <div className="mt-6 p-4 rounded-md backdrop-blur-md bg-green-900/40 border border-green-500/50 text-green-100 text-center font-serif text-sm">
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;