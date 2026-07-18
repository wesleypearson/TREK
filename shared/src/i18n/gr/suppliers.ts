import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Προμηθευτές',
  'suppliers.subtitle':
    'Όλες οι επιχειρήσεις με τις οποίες συνεργάζεται η ομάδα — δημιουργούνται αυτόματα από σαρώσεις αποδείξεων και παρακολουθούνται σε όλα τα ταξίδια.',
  'suppliers.searchPlaceholder': 'Αναζήτηση προμηθευτών…',
  'suppliers.add': 'Προσθήκη προμηθευτή',
  'suppliers.empty': 'Δεν υπάρχουν προμηθευτές ακόμη',
  'suppliers.emptyHint':
    'Σαρώστε μια απόδειξη σε οποιοδήποτε ταξίδι και ο έμπορος καταχωρίζεται εδώ αυτόματα — ή προσθέστε έναν χειροκίνητα.',
  'suppliers.noResults': 'Κανένας προμηθευτής δεν ταιριάζει με «{query}»',
  'suppliers.events': '{count} ταξίδια',
  'suppliers.event': '1 ταξίδι',
  'suppliers.expenses': '{count} έξοδα',
  'suppliers.expense': '1 έξοδο',
  'suppliers.venues': '{count} χώροι',
  'suppliers.lastInteraction': 'Τελευταία: {date}',
  'suppliers.neverUsed': 'Καμία αλληλεπίδραση ακόμη',
  'suppliers.fromReceipt': 'Από σάρωση απόδειξης',

  'suppliers.info.title': 'Πώς λειτουργούν οι προμηθευτές',
  'suppliers.info.body':
    'Κάθε σάρωση απόδειξης διαβάζει τον έμπορο από το παραστατικό και τον αρχειοθετεί εδώ — μία εγγραφή ανά επιχείρηση, κοινή σε όλα τα ταξίδια. Το Google Places συμπληρώνει διεύθυνση, τηλέφωνο και ιστότοπο· το AI γράφει μια σύντομη σημείωση. Όλα παραμένουν επεξεργάσιμα, και τα έξοδα που καρφιτσώνονται σε έναν προμηθευτή χτίζουν το ιστορικό δαπανών του.',

  'suppliers.detail.contact': 'Επικοινωνία',
  'suppliers.detail.phone': 'Τηλέφωνο',
  'suppliers.detail.email': 'Email',
  'suppliers.detail.website': 'Ιστότοπος',
  'suppliers.detail.address': 'Διεύθυνση',
  'suppliers.detail.category': 'Κατηγορία',
  'suppliers.detail.categoryPlaceholder': 'π.χ. catering, ενοικίαση οπτικοακουστικών, σιδηροπωλείο',
  'suppliers.detail.aiSummary': 'Σημειώσεις AI',
  'suppliers.detail.notes': 'Σημειώσεις',
  'suppliers.detail.notesPlaceholder': 'Επαφές, τιμές, αριθμοί λογαριασμών, ποιον να ζητήσετε…',
  'suppliers.detail.spend': 'Δαπάνες ανά ταξίδι',
  'suppliers.detail.interactions': 'Αλληλεπιδράσεις',
  'suppliers.detail.venuesTitle': 'Χώροι',
  'suppliers.detail.noInteractions': 'Δεν έχει καταγραφεί τίποτα με αυτόν τον προμηθευτή ακόμη.',
  'suppliers.detail.enrich': 'Εμπλουτισμός',
  'suppliers.detail.enriching': 'Εμπλουτισμός…',
  'suppliers.detail.enriched': 'Τα στοιχεία ανανεώθηκαν',
  'suppliers.detail.save': 'Αποθήκευση',
  'suppliers.detail.saved': 'Ο προμηθευτής αποθηκεύτηκε',
  'suppliers.detail.delete': 'Διαγραφή προμηθευτή',
  'suppliers.detail.deleteTitle': 'Διαγραφή προμηθευτή',
  'suppliers.detail.deleteBody':
    'Αυτό αφαιρεί τον {name} από τον κατάλογο. Τα έξοδα και οι χώροι που έδειχναν σε αυτόν παραμένουν, αλλά χάνουν τη σύνδεση. Δεν μπορεί να αναιρεθεί.',
  'suppliers.detail.deleted': 'Ο προμηθευτής διαγράφηκε',
  'suppliers.namePlaceholder': 'Όνομα επιχείρησης',
  'suppliers.createError': 'Δεν ήταν δυνατή η δημιουργία του προμηθευτή',
  'suppliers.saveError': 'Δεν ήταν δυνατή η αποθήκευση του προμηθευτή',

  'costs.supplier': 'Προμηθευτής',
  'costs.noSupplier': 'Χωρίς προμηθευτή',
  'costs.autoLinked': 'Βρέθηκε αντιστοιχία με {name} — χώρος και προμηθευτής συνδέθηκαν',
  'costs.autoLinkedSupplier': 'Βρέθηκε ο προμηθευτής {name}',
};

export default suppliers;
