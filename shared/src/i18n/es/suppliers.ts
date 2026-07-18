import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Proveedores',
  'suppliers.subtitle':
    'Todas las empresas con las que trata el grupo — creadas automáticamente a partir de los recibos escaneados y seguidas en todos los viajes.',
  'suppliers.searchPlaceholder': 'Buscar proveedores…',
  'suppliers.add': 'Añadir proveedor',
  'suppliers.empty': 'Aún no hay proveedores',
  'suppliers.emptyHint':
    'Escanea un recibo en cualquier viaje y el comercio aparecerá aquí automáticamente — o añade uno a mano.',
  'suppliers.noResults': 'Ningún proveedor coincide con "{query}"',
  'suppliers.events': '{count} viajes',
  'suppliers.event': '1 viaje',
  'suppliers.expenses': '{count} gastos',
  'suppliers.expense': '1 gasto',
  'suppliers.venues': '{count} lugares',
  'suppliers.lastInteraction': 'Última: {date}',
  'suppliers.neverUsed': 'Sin interacciones todavía',
  'suppliers.fromReceipt': 'De un recibo escaneado',

  'suppliers.info.title': 'Cómo funcionan los proveedores',
  'suppliers.info.body':
    'Cada recibo escaneado lee el comercio del ticket y lo archiva aquí — una entrada por empresa, compartida entre todos los viajes. Google Places completa la dirección, el teléfono y el sitio web; la IA escribe una breve nota. Todo se puede editar, y los gastos fijados a un proveedor construyen su historial de gasto.',

  'suppliers.detail.contact': 'Contacto',
  'suppliers.detail.phone': 'Teléfono',
  'suppliers.detail.email': 'Correo',
  'suppliers.detail.website': 'Sitio web',
  'suppliers.detail.address': 'Dirección',
  'suppliers.detail.category': 'Categoría',
  'suppliers.detail.categoryPlaceholder': 'p. ej. catering, alquiler AV, ferretería',
  'suppliers.detail.aiSummary': 'Notas de la IA',
  'suppliers.detail.notes': 'Notas',
  'suppliers.detail.notesPlaceholder': 'Contactos, tarifas, números de cuenta, por quién preguntar…',
  'suppliers.detail.spend': 'Gasto por viaje',
  'suppliers.detail.interactions': 'Interacciones',
  'suppliers.detail.venuesTitle': 'Lugares',
  'suppliers.detail.noInteractions': 'Aún no hay nada registrado con este proveedor.',
  'suppliers.detail.enrich': 'Enriquecer',
  'suppliers.detail.enriching': 'Enriqueciendo…',
  'suppliers.detail.enriched': 'Datos actualizados',
  'suppliers.detail.save': 'Guardar',
  'suppliers.detail.saved': 'Proveedor guardado',
  'suppliers.detail.delete': 'Eliminar proveedor',
  'suppliers.detail.deleteTitle': 'Eliminar proveedor',
  'suppliers.detail.deleteBody':
    'Esto elimina {name} del directorio. Los gastos y lugares que apuntaban a él se conservan, pero pierden el vínculo. No se puede deshacer.',
  'suppliers.detail.deleted': 'Proveedor eliminado',
  'suppliers.namePlaceholder': 'Nombre de la empresa',
  'suppliers.createError': 'No se pudo crear el proveedor',
  'suppliers.saveError': 'No se pudo guardar el proveedor',

  'costs.supplier': 'Proveedor',
  'costs.noSupplier': 'Sin proveedor',
  'costs.autoLinked': '{name} reconocido — lugar y proveedor vinculados',
  'costs.autoLinkedSupplier': 'Proveedor {name} reconocido',
};

export default suppliers;
