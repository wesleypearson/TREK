import type { TranslationStrings } from '../types';

const shifts: TranslationStrings = {
  'shifts.tab': 'Turnos',
  'shifts.title': 'Turnos',
  'shifts.signOn': 'Registrar entrada',
  'shifts.signOff': 'Registrar saída',
  'shifts.onShiftNow': 'Em turno agora',
  'shifts.nobodyOn': 'Ninguém está em turno',
  'shifts.history': 'Histórico',
  'shifts.totals': 'Horas por membro',
  'shifts.hours': '{h}h {m}m',
  'shifts.locationNote':
    'Sua localização é registrada uma vez na entrada e uma vez na saída — nunca rastreada no meio. Se você negar, apenas entra em turno sem posição.',
  'shifts.locationDenied': 'Localização indisponível — registrado sem posição',
  'shifts.alreadyOn': 'Você já está em turno',
  'shifts.info.title': 'Como os turnos funcionam',
  'shifts.info.body':
    'O relógio de ponto da equipe. Registre a entrada quando começar a trabalhar e a saída quando parar — o relógio corre ao vivo para todos, a escala mostra quem está em turno agora e o cartão de totais soma as horas de cada membro. Uma posição opcional é registrada em cada ponta (nada no meio), e cada entrada e saída é anunciada no chat do evento.',
  'shifts.elapsed': 'Em turno',
  'shifts.signedOnAt': 'Entrada registrada às {time}',
  'shifts.signedOffSummary': '{start} – {end} · {duration}',
  'shifts.empty': 'Nenhum turno ainda — registre a entrada para iniciar o relógio.',
};

export default shifts;
