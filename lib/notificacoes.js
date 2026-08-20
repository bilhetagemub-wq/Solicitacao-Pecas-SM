'use client';

/** Toca um bipe curto usando a Web Audio API, sem precisar de nenhum arquivo de áudio. */
export function tocarBipAlerta() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const tocarNota = (freq, inicio, duracao) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + inicio + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao + 0.05);
    };
    tocarNota(880, 0, 0.14);
    tocarNota(1108, 0.16, 0.18);
  } catch { /* navegador sem suporte a áudio — ignora silenciosamente */ }
}

/** Verifica se o navegador já concedeu permissão para notificações nativas. */
export function permissaoNotificacaoConcedida() {
  return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
}

/** Solicita permissão de notificação ao usuário (precisa ser chamado a partir de um clique). */
export async function solicitarPermissaoNotificacao() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const resultado = await Notification.requestPermission();
  return resultado === 'granted';
}

/** Dispara uma notificação nativa do navegador, se houver permissão concedida. */
export function notificarNavegador(titulo, corpo) {
  if (!permissaoNotificacaoConcedida()) return;
  try {
    new Notification(titulo, { body: corpo, icon: '/logo.png' });
  } catch { /* alguns navegadores móveis não suportam — ignora silenciosamente */ }
}
