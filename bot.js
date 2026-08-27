import 'dotenv/config';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';

global.WebSocket = WebSocket;

// 1. CONEXÃO COM CHATGPT E SUPABASE (Puxando do Cofre .env)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. CONFIGURAÇÃO DO PUPPETEER (NAVEGADOR INTERNO + ARGS DE PROTEÇÃO)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

const historicoConversas = new Map();
const cronometros = new Map();

client.on('qr', (qr) => { 
    console.log('🔗 Link para ver o QR Code nítido:');
    console.log('https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr));
});
client.on('ready', () => { console.log('✅ Robô RECEPCIONISTA (NUVEM & BLOQUEIO) ATIVO!'); });

client.on('message', async (msg) => {
    if (msg.from.includes('@g.us') || msg.from === 'status@broadcast') return;

    console.log(`📩 Cliente disse: ${msg.body}`);
    const numeroCliente = msg.from;

    if (cronometros.has(numeroCliente)) {
        clearTimeout(cronometros.get(numeroCliente));
    }

    try {
        const { data: servicos } = await supabase.from('servicos').select('*').eq('ativo', true);
        let textoServicos = (servicos || []).map(s => `- ${s.nome} (R$ ${s.preco_promocional || s.preco})`).join('\n');

        const { data: barbeiros } = await supabase.from('barbeiros').select('id').limit(1);
        const barbeiroId = barbeiros?.[0]?.id;

        const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const horaHoje = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        if (!historicoConversas.has(numeroCliente)) {
            historicoConversas.set(numeroCliente, [
                {
                    role: "system",
                    content: `Você é o recepcionista da 'Raphael Haley Barber'. Seja gente boa e prestativo.
                    Hoje é dia ${dataHoje} e agora são ${horaHoje}.
                    Serviços disponíveis e preços:
                    ${textoServicos}
                    
                    Seu objetivo é agendar o cliente. Você OBRIGATORIAMENTE precisa de 4 coisas: 
                    1. Nome do cliente
                    2. Serviço desejado
                    3. Data (YYYY-MM-DD)
                    4. Hora (HH:MM)
                    REGRA MÁXIMA: Na hora de chamar a função de agendar, o 'nome_servico' deve ser ESCRITO EXATAMENTE como está na nossa lista.
                    Pergunte o que faltar. Quando tiver TUDO, chame a função 'agendar_horario'. Responda curto.`
                }
            ]);
        }

        const conversaAtual = historicoConversas.get(numeroCliente);
        conversaAtual.push({ role: "user", content: msg.body });

        const ferramentas = [{
            type: "function",
            function: {
                name: "agendar_horario",
                description: "Marca um horário no sistema quando tiver TUDO: nome, serviço, data e hora.",
                parameters: {
                    type: "object",
                    properties: {
                        nome_cliente: { type: "string" },
                        nome_servico: { type: "string" },
                        data: { type: "string", description: "YYYY-MM-DD" },
                        hora: { type: "string", description: "HH:MM" }
                    },
                    required: ["nome_cliente", "nome_servico", "data", "hora"]
                }
            }
        }];

        const respostaIA = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: conversaAtual, 
            tools: ferramentas,
            tool_choice: "auto"
        });

        const mensagemIA = respostaIA.choices[0].message;
        conversaAtual.push(mensagemIA);

        if (mensagemIA.tool_calls && mensagemIA.tool_calls[0].function.name === 'agendar_horario') {
            const toolCallId = mensagemIA.tool_calls[0].id; 
            const args = JSON.parse(mensagemIA.tool_calls[0].function.arguments);
            console.log('⚙️ A IA está gravando no banco:', args);
            
            await msg.reply(`Tudo anotado, ${args.nome_cliente}! Só um segundo, estou conferindo a agenda...`);

            // BUSCA INTELIGENTE DE SERVIÇO
            let servico = servicos.find(s => 
                s.nome.toLowerCase().includes(args.nome_servico.toLowerCase()) || 
                args.nome_servico.toLowerCase().includes(s.nome.toLowerCase())
            );

            if (!servico) {
                const primeiraPalavraIA = args.nome_servico.split(' ')[0].toLowerCase();
                servico = servicos.find(s => s.nome.toLowerCase().includes(primeiraPalavraIA));
            }

            if (!servico) {
                conversaAtual.push({ role: "tool", tool_call_id: toolCallId, content: "Erro: Serviço não encontrado." });
                return msg.reply("Putz irmão, não achei esse serviço. É o Cabelo, Barba ou o Combo?");
            }

            const dataHoraInicio = new Date(`${args.data}T${args.hora}:00-03:00`);
            const dataHoraFim = new Date(dataHoraInicio.getTime() + (servico.duracao_minutos || 30) * 60000);

            // VERIFICAÇÃO DE HORÁRIO OCUPADO (BLOQUEIO)
            const { data: horarioOcupado } = await supabase
                .from('agendamentos')
                .select('id')
                .eq('data_hora_inicio', dataHoraInicio.toISOString())
                .eq('status', 'confirmado')
                .limit(1);

            if (horarioOcupado && horarioOcupado.length > 0) {
                conversaAtual.push({ role: "tool", tool_call_id: toolCallId, content: "Erro: Horário já ocupado por outro cliente." });
                return msg.reply(`Ixi, chefe! O horário das *${args.hora}* já está ocupado. 😅\nTem alguma outra hora ou dia que fica bom pra você?`);
            }

            // ATUALIZAÇÃO / CRIAÇÃO DE CLIENTE
            const telefoneCliente = numeroCliente.split('@')[0];
            let { data: clienteBanco } = await supabase.from('clientes').select('*').eq('telefone', telefoneCliente).single();
            
            if (!clienteBanco) {
                const { data: novoCliente } = await supabase.from('clientes').insert([{ nome: args.nome_cliente, telefone: telefoneCliente }]).select().single();
                clienteBanco = novoCliente;
            } else if (clienteBanco.nome !== args.nome_cliente) {
                await supabase.from('clientes').update({ nome: args.nome_cliente }).eq('id', clienteBanco.id);
            }

            // GRAVAÇÃO DO AGENDAMENTO
            const { error: erroAgendamento } = await supabase.from('agendamentos').insert([{
                cliente_id: clienteBanco.id,
                barbeiro_id: barbeiroId,
                servico_id: servico.id,
                data_hora_inicio: dataHoraInicio.toISOString(),
                data_hora_fim: dataHoraFim.toISOString(),
                status: 'confirmado'
            }]);

            if (erroAgendamento) {
                console.error(erroAgendamento);
                conversaAtual.push({ role: "tool", tool_call_id: toolCallId, content: "Erro ao gravar." });
                await msg.reply("Putz, deu um erro no servidor aqui.");
            } else {
                await msg.reply(`Tudo certo, chefe! ✅\nSeu horário para *${servico.nome}* no dia *${dataHoraInicio.toLocaleDateString('pt-BR')}* às *${args.hora}* está garantido!`);
                
                conversaAtual.push({ 
                    role: "tool", 
                    tool_call_id: toolCallId, 
                    content: "Sucesso." 
                });
            }

        } else {
            await msg.reply(mensagemIA.content);
            console.log(`🤖 Robô: ${mensagemIA.content}`);
        }

        // MEMÓRIA COM TIMER DE 15 MINUTOS
        const timer = setTimeout(() => {
            historicoConversas.delete(numeroCliente);
            cronometros.delete(numeroCliente);
            console.log(`🧹 Memória de ${numeroCliente} apagada (15 min).`);
        }, 15 * 60 * 1000);
        
        cronometros.set(numeroCliente, timer);

    } catch (erro) {
        console.error('❌ Erro no robô:', erro);
    }
});

client.initialize();
