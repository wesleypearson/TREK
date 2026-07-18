import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Captura',
  'capture.subtitle':
    'Gravação de sensores com consentimento em primeiro lugar — escolha exatamente o que gravar, inicie uma sessão e cada amostra vai para a análise da própria equipe.',

  'capture.info.title': 'O que a Captura grava',
  'capture.info.body':
    'Nada é gravado até você ativar um sensor e iniciar uma sessão. Localização mantém um rastro GPS (uma posição a cada poucos segundos). Movimento armazena um valor de pico de aceleração por segundo — nunca o fluxo bruto. Bateria e rede registram nível, carregamento e mudanças de conexão. Visibilidade da tela anota quando o app vai para segundo plano. Tudo é enviado para a instância PostHog auto-hospedada da própria equipe — nenhum terceiro jamais vê os dados.',

  'capture.sensors.location': 'Rastro de localização',
  'capture.sensors.locationHint': 'Posições GPS de alta precisão, no máximo uma a cada 5 segundos',
  'capture.sensors.motion': 'Movimento',
  'capture.sensors.motionHint': 'Pico de aceleração por segundo — um agregado, não o fluxo bruto',
  'capture.sensors.battery': 'Bateria',
  'capture.sensors.batteryHint': 'Nível de carga e estado de carregamento, ao mudar e a cada minuto',
  'capture.sensors.network': 'Rede',
  'capture.sensors.networkHint': 'Tipo de conexão e estimativa de velocidade, ao mudar e a cada minuto',
  'capture.sensors.visibility': 'Visibilidade da tela',
  'capture.sensors.visibilityHint': 'Quando o app vai para segundo plano ou volta',

  'capture.start': 'Iniciar captura',
  'capture.stop': 'Parar captura',
  'capture.selectSensor': 'Ative pelo menos um sensor para começar',
  'capture.recording': 'Gravando',
  'capture.session': 'Sessão',

  'capture.elapsed': 'Decorrido',
  'capture.samples': 'Amostras',
  'capture.lastFix': 'Última posição',
  'capture.noFix': 'Nenhuma posição ainda',

  'capture.foregroundWarning':
    'A Captura só funciona enquanto o app está aberto e na tela — trocar de app ou desligar a tela pausa a gravação (o sensor de visibilidade mostrará as lacunas).',

  'capture.summaryTitle': 'Resumo da sessão',
  'capture.summaryDuration': 'Duração',
  'capture.summaryTotal': 'Total de amostras',

  'capture.permissionDenied': 'Permissão negada',
  'capture.notSupported': 'Não suportado neste dispositivo',
};

export default capture;
