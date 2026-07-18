import type { TranslationStrings } from '../types';

const suppliers: TranslationStrings = {
  'suppliers.title': 'Fornecedores',
  'suppliers.subtitle':
    'Todas as empresas com que o grupo lida — criadas automaticamente a partir de recibos escaneados e acompanhadas em todas as viagens.',
  'suppliers.searchPlaceholder': 'Buscar fornecedores…',
  'suppliers.add': 'Adicionar fornecedor',
  'suppliers.empty': 'Nenhum fornecedor ainda',
  'suppliers.emptyHint':
    'Escaneie um recibo em qualquer viagem e o estabelecimento aparece aqui automaticamente — ou adicione um manualmente.',
  'suppliers.noResults': 'Nenhum fornecedor corresponde a "{query}"',
  'suppliers.events': '{count} viagens',
  'suppliers.event': '1 viagem',
  'suppliers.expenses': '{count} despesas',
  'suppliers.expense': '1 despesa',
  'suppliers.venues': '{count} locais',
  'suppliers.lastInteraction': 'Última: {date}',
  'suppliers.neverUsed': 'Nenhuma interação ainda',
  'suppliers.fromReceipt': 'De um recibo escaneado',

  'suppliers.info.title': 'Como funcionam os fornecedores',
  'suppliers.info.body':
    'Cada recibo escaneado lê o estabelecimento no comprovante e o arquiva aqui — uma entrada por empresa, compartilhada entre todas as viagens. O Google Places preenche endereço, telefone e site; a IA escreve uma nota curta. Tudo continua editável, e as despesas fixadas a um fornecedor constroem seu histórico de gastos.',

  'suppliers.detail.contact': 'Contato',
  'suppliers.detail.phone': 'Telefone',
  'suppliers.detail.email': 'E-mail',
  'suppliers.detail.website': 'Site',
  'suppliers.detail.address': 'Endereço',
  'suppliers.detail.category': 'Categoria',
  'suppliers.detail.categoryPlaceholder': 'ex.: buffet, locação de AV, ferragens',
  'suppliers.detail.aiSummary': 'Notas da IA',
  'suppliers.detail.notes': 'Notas',
  'suppliers.detail.notesPlaceholder': 'Contatos, preços, números de conta, por quem perguntar…',
  'suppliers.detail.spend': 'Gasto por viagem',
  'suppliers.detail.interactions': 'Interações',
  'suppliers.detail.venuesTitle': 'Locais',
  'suppliers.detail.noInteractions': 'Nada registrado com este fornecedor ainda.',
  'suppliers.detail.enrich': 'Enriquecer',
  'suppliers.detail.enriching': 'Enriquecendo…',
  'suppliers.detail.enriched': 'Detalhes atualizados',
  'suppliers.detail.save': 'Salvar',
  'suppliers.detail.saved': 'Fornecedor salvo',
  'suppliers.detail.delete': 'Excluir fornecedor',
  'suppliers.detail.deleteTitle': 'Excluir fornecedor',
  'suppliers.detail.deleteBody':
    'Isso remove {name} do catálogo. As despesas e os locais que apontavam para ele permanecem, mas perdem o vínculo. Isso não pode ser desfeito.',
  'suppliers.detail.deleted': 'Fornecedor excluído',
  'suppliers.namePlaceholder': 'Nome da empresa',
  'suppliers.createError': 'Não foi possível criar o fornecedor',
  'suppliers.saveError': 'Não foi possível salvar o fornecedor',

  'costs.supplier': 'Fornecedor',
  'costs.noSupplier': 'Sem fornecedor',
  'costs.autoLinked': '{name} reconhecido — local e fornecedor vinculados',
  'costs.autoLinkedSupplier': 'Fornecedor {name} reconhecido',
};

export default suppliers;
