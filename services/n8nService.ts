import { ChatMessage } from '../types';

// Configurações extraídas do seu comando MCP
const N8N_HOST = 'https://rodrigobarros.app.n8n.cloud';
// Token Bearer fornecido
const N8N_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMjQ3MDA5Mi0yYjVjLTQyNDctOGQxYS02OWUxOWIyNTQ3NDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6ImE3NTk5MjJiLTk3MmItNGY2MS04MDA3LTg1MTkyMDM0NmVjYyIsImlhdCI6MTc2Njg5MjE1NX0.PuwTNSpd85E2TLfCsckG8ZOA-Y3Kfq3EDVlF9S58hPQ';

// Endpoint do Webhook para o Chat.
// NOTA: No N8N, crie um workflow com Trigger 'Webhook' (Method: POST) e path 'chat'.
const API_URL = `${N8N_HOST}/webhook/chat`;

interface N8NResponse {
  output: string; // Campo esperado de resposta do N8N (ajuste conforme seu workflow)
  text?: string;
  message?: string;
}

export const sendMessageToN8N = async (text: string): Promise<string> => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${N8N_TOKEN}`
      },
      body: JSON.stringify({
        chatInput: text,
        // Metadados úteis para o N8N saber quem é o usuário
        user: 'João Silva', 
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na conexão com N8N: ${response.statusText}`);
    }

    const data: N8NResponse = await response.json();

    // Tenta encontrar a resposta em campos comuns
    return data.output || data.text || data.message || "Resposta recebida, mas formato desconhecido.";
    
  } catch (error) {
    console.error('Falha ao enviar mensagem para N8N:', error);
    throw error;
  }
};