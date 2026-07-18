import type { TranslationStrings } from '../types';

const capture: TranslationStrings = {
  'capture.title': 'Capture',
  'capture.subtitle':
    'Καταγραφή αισθητήρων βασισμένη στη συγκατάθεση — επιλέξτε ακριβώς τι θα καταγράφεται, ξεκινήστε μια συνεδρία, και κάθε δείγμα καταλήγει στα αναλυτικά στοιχεία της ίδιας της ομάδας.',

  'capture.info.title': 'Τι καταγράφει το Capture',
  'capture.info.body':
    'Τίποτα δεν καταγράφεται μέχρι να ενεργοποιήσετε έναν αισθητήρα και να ξεκινήσετε μια συνεδρία. Η τοποθεσία διατηρεί ένα ίχνος GPS (ένα στίγμα κάθε λίγα δευτερόλεπτα). Η κίνηση αποθηκεύει μία μέγιστη τιμή επιτάχυνσης ανά δευτερόλεπτο — ποτέ την ακατέργαστη ροή. Η μπαταρία και το δίκτυο καταγράφουν το επίπεδο, τη φόρτιση και τις αλλαγές σύνδεσης. Η ορατότητα οθόνης σημειώνει πότε η εφαρμογή περνά στο παρασκήνιο. Όλα αποστέλλονται στη self-hosted εγκατάσταση PostHog της ίδιας της ομάδας — κανένας τρίτος δεν τα βλέπει ποτέ.',

  'capture.sensors.location': 'Ίχνος τοποθεσίας',
  'capture.sensors.locationHint': 'Στίγματα GPS υψηλής ακρίβειας, το πολύ ένα κάθε 5 δευτερόλεπτα',
  'capture.sensors.motion': 'Κίνηση',
  'capture.sensors.motionHint': 'Μέγιστη επιτάχυνση ανά δευτερόλεπτο — συγκεντρωτική τιμή, όχι η ακατέργαστη ροή',
  'capture.sensors.battery': 'Μπαταρία',
  'capture.sensors.batteryHint': 'Επίπεδο και κατάσταση φόρτισης, σε κάθε αλλαγή και κάθε λεπτό',
  'capture.sensors.network': 'Δίκτυο',
  'capture.sensors.networkHint': 'Τύπος σύνδεσης και εκτίμηση ταχύτητας, σε κάθε αλλαγή και κάθε λεπτό',
  'capture.sensors.visibility': 'Ορατότητα οθόνης',
  'capture.sensors.visibilityHint': 'Πότε η εφαρμογή περνά στο παρασκήνιο ή επιστρέφει',

  'capture.start': 'Έναρξη καταγραφής',
  'capture.stop': 'Διακοπή καταγραφής',
  'capture.selectSensor': 'Ενεργοποιήστε τουλάχιστον έναν αισθητήρα για να ξεκινήσετε',
  'capture.recording': 'Καταγραφή σε εξέλιξη',
  'capture.session': 'Συνεδρία',

  'capture.elapsed': 'Χρόνος',
  'capture.samples': 'Δείγματα',
  'capture.lastFix': 'Τελευταίο στίγμα',
  'capture.noFix': 'Κανένα στίγμα ακόμη',

  'capture.foregroundWarning':
    'Το Capture λειτουργεί μόνο όσο η εφαρμογή είναι ανοιχτή και στην οθόνη — η εναλλαγή εφαρμογών ή το σβήσιμο της οθόνης διακόπτει προσωρινά την καταγραφή (ο αισθητήρας ορατότητας θα δείξει τα κενά).',

  'capture.summaryTitle': 'Σύνοψη συνεδρίας',
  'capture.summaryDuration': 'Διάρκεια',
  'capture.summaryTotal': 'Συνολικά δείγματα',

  'capture.permissionDenied': 'Η άδεια απορρίφθηκε',
  'capture.notSupported': 'Δεν υποστηρίζεται σε αυτήν τη συσκευή',
};

export default capture;
