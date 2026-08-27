import { useEffect, useState } from 'react';
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

  const horariaosDisponiveis = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

  // Link da imagem de fundo (você pode trocar depois)
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

  async function handleFinalizarAgendamento(e) {
    e.preventDefault();
    setStatus('Processando...');

    let { data: cliente } = await supabase.from('clientes').select('id').eq('telefone', telefoneCliente).single();

    if (!cliente) {
      const { data: novoCliente, error: errCliente } = await supabase
        .from('clientes')
        .insert([{ nome: nomeCliente, telefone: telefoneCliente }])
        .select()
        .single();
      if (errCliente) { setStatus('Erro ao cadastrar cliente.'); return; }
      cliente = novoCliente;
    }

    const dataHoraInicio = new Date(`${dataSelecionada}T${horarioSelecionado}:00`).toISOString();
    const dataHoraFim = new Date(new Date(dataHoraInicio).getTime() + 30 * 60000).toISOString();

    const { error: errAgendamento } = await supabase
      .from('agendamentos')
      .insert([{
        cliente_id: cliente.id,
        barbeiro_id: barbeiroSelecionado,
        servico_id: servicoSelecionado.id,
        data_hora_inicio: dataHoraInicio,
        data_hora_fim: dataHoraFim,
      }]);

    if (errAgendamento) setStatus('Erro ao agendar.');
    else setStatus('Agendamento realizado com sucesso! Aguardando pagamento.');
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-fixed text-barber-light font-sans selection:bg-barber-accent selection:text-barber-light"
      style={{ backgroundImage: `url('${backgroundImage}')` }}
    >
      {/* Camada escura por cima da imagem para dar leitura ao texto */}
      <div className="min-h-screen w-full bg-black/60 p-4 sm:p-8 flex flex-col items-center">
        
        {/* Cabeçalho Premium com Fonte Gigante */}
        <div className="text-center mt-10 mb-12 w-full">
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-serif tracking-widest text-barber-light uppercase drop-shadow-2xl mb-2">
            Raphael<br/>Halley
          </h1>
          <p className="text-barber-light/80 tracking-[0.4em] text-sm md:text-base uppercase mt-4">Barber Shop</p>
        </div>

        {/* Formulário com efeito Vidro (Glassmorphism) */}
        <div className="max-w-xl w-full">
          <form onSubmit={handleFinalizarAgendamento} className="space-y-8 backdrop-blur-md bg-barber-dark/80 border border-barber-accent/50 p-6 sm:p-10 rounded-sm shadow-2xl">
            
            {/* Serviços */}
            <div>
              <label className="block text-xs font-serif tracking-widest uppercase text-barber-light/70 mb-4">1. Escolha o Serviço</label>
              <div className="space-y-3">
                {servicos.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServicoSelecionado(s)}
                    className={`w-full p-4 text-left flex justify-between items-center transition-all duration-300 border ${
                      servicoSelecionado?.id === s.id
                        ? 'border-barber-light bg-barber-light/90 text-barber-dark shadow-lg'
                        : 'border-barber-accent/60 bg-transparent text-barber-light hover:bg-barber-accent/40'
                    }`}
                  >
                    <div>
                      <p className="font-serif text-lg">{s.nome}</p>
                      <p className={`text-xs mt-1 ${servicoSelecionado?.id === s.id ? 'text-barber-dark/70' : 'text-barber-light/60'}`}>
                        {s.duracao_minutos} min
                      </p>
                    </div>
                    <span className="font-bold text-lg">R$ {parseFloat(s.preco).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Data e Hora */}
            {servicoSelecionado && (
              <div className="animate-fade-in">
                <label className="block text-xs font-serif tracking-widest uppercase text-barber-light/70 mb-4">2. Data e Horário</label>
                <input
                  type="date"
                  required
                  value={dataSelecionada}
                  onChange={(e) => setDataSelecionada(e.target.value)}
                  className="w-full p-3 bg-transparent border-b border-barber-accent/60 text-barber-light focus:outline-none focus:border-barber-light mb-6 transition-colors"
                  style={{ colorScheme: 'dark' }}
                />

                {dataSelecionada && (
                  <div className="grid grid-cols-4 gap-3">
                    {horariaosDisponiveis.map((hora) => (
                      <button
                        key={hora}
                        type="button"
                        onClick={() => setHorarioSelecionado(hora)}
                        className={`p-2 text-sm font-serif transition-all border ${
                          horarioSelecionado === hora
                            ? 'bg-barber-light border-barber-light text-barber-dark'
                            : 'bg-transparent border-barber-accent/60 text-barber-light hover:bg-barber-accent/50'
                        }`}
                      >
                        {hora}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dados do Cliente */}
            {horarioSelecionado && (
              <div className="space-y-6 animate-fade-in">
                <label className="block text-xs font-serif tracking-widest uppercase text-barber-light/70 mb-2">3. Seus Dados</label>
                <input
                  type="text"
                  placeholder="Nome Completo"
                  required
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="w-full p-3 bg-transparent border-b border-barber-accent/60 text-barber-light placeholder-barber-light/40 focus:outline-none focus:border-barber-light transition-colors"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp (ex: 11999999999)"
                  required
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(e.target.value)}
                  className="w-full p-3 bg-transparent border-b border-barber-accent/60 text-barber-light placeholder-barber-light/40 focus:outline-none focus:border-barber-light transition-colors"
                />

                <button
                  type="submit"
                  className="w-full py-4 mt-6 bg-barber-accent hover:bg-barber-light hover:text-barber-dark text-barber-light font-serif tracking-widest uppercase transition-all duration-300 border border-barber-accent"
                >
                  Confirmar Agendamento
                </button>
              </div>
            )}
          </form>

          {status && (
            <div className="mt-6 p-4 backdrop-blur-md bg-barber-dark/80 border border-barber-light text-barber-light text-center font-serif text-sm">
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
