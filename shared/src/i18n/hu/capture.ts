import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Hozzájáruláson alapuló érzékelőrögzítés — válaszd ki pontosan, mit rögzítsen, indíts egy munkamenetet, és minden minta a csapat saját analitikájában landol.',

  'capture.info.title': 'Mit rögzít a Capture',
  'capture.info.body':
    'Semmi sem kerül rögzítésre, amíg be nem kapcsolsz egy érzékelőt és el nem indítasz egy munkamenetet. A helymeghatározás GPS-nyomvonalat vezet (néhány másodpercenként egy pozíció). A mozgás másodpercenként egy csúcsgyorsulás-értéket tárol — soha nem a nyers adatfolyamot. Az akkumulátor és a hálózat a töltöttséget, a töltést és a kapcsolat változásait naplózza. A képernyő-láthatóság feljegyzi, amikor az alkalmazás a háttérbe kerül. Minden a csapat saját üzemeltetésű PostHog-példányába kerül — harmadik fél soha nem látja.',

  'capture.sensors.location': 'Helynyomvonal',
  'capture.sensors.locationHint': 'Nagy pontosságú GPS-pozíciók, legfeljebb 5 másodpercenként egy',
  'capture.sensors.motion': 'Mozgás',
  'capture.sensors.motionHint': 'Csúcsgyorsulás másodpercenként — összesített érték, nem a nyers adatfolyam',
  'capture.sensors.battery': 'Akkumulátor',
  'capture.sensors.batteryHint': 'Töltöttségi szint és töltési állapot, változáskor és percenként',
  'capture.sensors.network': 'Hálózat',
  'capture.sensors.networkHint': 'Kapcsolattípus és becsült sebesség, változáskor és percenként',
  'capture.sensors.visibility': 'Képernyő-láthatóság',
  'capture.sensors.visibilityHint': 'Amikor az alkalmazás a háttérbe kerül vagy visszatér',

  'capture.start': 'Rögzítés indítása',
  'capture.stop': 'Rögzítés leállítása',
  'capture.selectSensor': 'Kapcsolj be legalább egy érzékelőt az indításhoz',
  'capture.recording': 'Rögzítés folyamatban',
  'capture.session': 'Munkamenet',

  'capture.elapsed': 'Eltelt idő',
  'capture.samples': 'Minták',
  'capture.lastFix': 'Utolsó pozíció',
  'capture.noFix': 'Még nincs pozíció',

  'capture.foregroundWarning':
    'A Capture csak addig fut, amíg az alkalmazás nyitva van és a képernyőn látható — másik alkalmazásra váltáskor vagy a képernyő kikapcsolásakor a rögzítés szünetel (a láthatóság-érzékelő megmutatja a kimaradásokat).',

  'capture.summaryTitle': 'Munkamenet összegzése',
  'capture.summaryDuration': 'Időtartam',
  'capture.summaryTotal': 'Összes minta',

  'capture.permissionDenied': 'Engedély megtagadva',
  'capture.notSupported': 'Ezen az eszközön nem támogatott',
};

export default capture;
