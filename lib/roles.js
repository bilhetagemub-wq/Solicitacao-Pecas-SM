export const FUNCOES = ['comprador', 'encarregado', 'gerente', 'developer'];

export const FUNCAO_LABEL = {
  comprador: 'Comprador',
  encarregado: 'Encarregado',
  gerente: 'Gerente',
  developer: 'Developer',
};

// Todas as abas do sistema, na ordem em que aparecem no menu.
export const ABAS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Situação da frota e lista de todas as peças solicitadas' },
  { id: 'solicitacao', label: 'Solicitar Peça', desc: 'Formulário de pedido e comprovante em PDF' },
  { id: 'comprador', label: 'Aba do Comprador', desc: 'Fila de compras — atualizar o status de cada peça' },
  { id: 'relatorio', label: 'Relatório', desc: 'Exportar o resumo de peças em Excel' },
  { id: 'atualizacoes', label: 'Atualizações', desc: 'Enviar a planilha da frota' },
  { id: 'configuracoes', label: 'Configurações', desc: 'Alertas, usuários e permissões' },
];

// Padrão do sistema: vale enquanto nada tiver sido salvo na aba Configurações
// (e é o que "Restaurar padrão" volta a aplicar).
// (As listas seguem a ordem do menu.)
export const TAB_ACCESS = {
  comprador: ['solicitacao', 'comprador'],
  encarregado: ['dashboard', 'solicitacao'],
  gerente: ['dashboard', 'solicitacao', 'comprador', 'relatorio', 'atualizacoes'],
  developer: ['dashboard', 'solicitacao', 'comprador', 'relatorio', 'atualizacoes', 'configuracoes'],
};

// Aba em que cada função aterrissa ao entrar no sistema (se ainda tiver acesso a ela;
// senão, a primeira aba liberada no menu).
export const ABA_INICIAL = {
  comprador: 'comprador',
  encarregado: 'dashboard',
  gerente: 'dashboard',
  developer: 'dashboard',
};

// Abas que pertencem a uma única função e não podem ser liberadas para outras.
// Configurações é onde se gerenciam usuários e permissões — liberar para outra função
// não funcionaria (o banco só aceita alterações do Developer) e abriria brecha.
export const ABA_EXCLUSIVA = { configuracoes: 'developer' };

// Quem consegue de fato ALTERAR dados em cada aba. Isso é definido pelas regras de
// segurança do banco (firestore.rules), não por esta tela: uma função que enxerga a
// aba mas não está na lista abaixo só consegue visualizar.
// (Abas ausentes daqui não têm ação de edição — ex.: Relatório só exporta.)
export const ABA_EDITAM = {
  dashboard: ['encarregado', 'developer'], // marcar "instalada no veículo"
  solicitacao: [...FUNCOES],
  comprador: ['comprador', 'gerente', 'developer'], // mudar status
  atualizacoes: ['gerente', 'developer'], // editar a frota
  configuracoes: ['developer'],
};

const IDS_ABAS = ABAS.map((a) => a.id);

/** Qual aba abrir para essa função, dado o que ela tem liberado. */
export function abaInicial(funcao, permitidas) {
  const lista = permitidas || [];
  const preferida = ABA_INICIAL[funcao];
  if (preferida && lista.includes(preferida)) return preferida;
  return lista[0] || null;
}

/** A aba está travada (não pode ser marcada/desmarcada nesta tela)? */
export function acessoBloqueado(abaId) {
  return Boolean(ABA_EXCLUSIVA[abaId]);
}

/** Essa função consegue alterar dados na aba (ou ela é somente leitura)? */
export function funcaoPodeEditar(funcao, abaId) {
  const lista = ABA_EDITAM[abaId];
  return !lista || lista.includes(funcao);
}

/**
 * Converte o que veio do banco (possivelmente vazio, incompleto ou inválido) no mapa
 * final { funcao: [abas] }. Sempre devolve algo utilizável:
 *  - ignora abas que não existem;
 *  - Configurações só existe para o Developer (e ele nunca a perde);
 *  - função sem nenhuma aba válida volta ao padrão do sistema;
 *  - mantém a ordem do menu.
 */
export function resolverAcessos(salvo) {
  const resultado = {};
  for (const funcao of FUNCOES) {
    const bruto = salvo && typeof salvo === 'object' ? salvo[funcao] : null;
    let lista = Array.isArray(bruto) ? bruto.filter((id) => IDS_ABAS.includes(id)) : [];
    lista = lista.filter((id) => !ABA_EXCLUSIVA[id] || ABA_EXCLUSIVA[id] === funcao);
    if (lista.length === 0) lista = [...TAB_ACCESS[funcao]];
    for (const [abaId, dono] of Object.entries(ABA_EXCLUSIVA)) {
      if (dono === funcao && !lista.includes(abaId)) lista.push(abaId);
    }
    resultado[funcao] = IDS_ABAS.filter((id) => lista.includes(id));
  }
  return resultado;
}

/** Marca/desmarca uma aba para uma função, devolvendo um novo mapa (não altera o original). */
export function alternarAcesso(mapa, funcao, abaId) {
  if (acessoBloqueado(abaId)) return mapa;
  const atual = mapa[funcao] || [];
  const nova = atual.includes(abaId) ? atual.filter((id) => id !== abaId) : [...atual, abaId];
  return { ...mapa, [funcao]: IDS_ABAS.filter((id) => nova.includes(id)) };
}

/** Lista de problemas que impedem salvar (vazia = pode salvar). */
export function validarAcessos(mapa) {
  const erros = [];
  for (const funcao of FUNCOES) {
    if (!mapa[funcao] || mapa[funcao].length === 0) {
      erros.push(`${FUNCAO_LABEL[funcao]} precisa ter acesso a pelo menos uma aba.`);
    }
  }
  return erros;
}

/** Os dois mapas liberam exatamente as mesmas abas para todas as funções? */
export function acessosIguais(a, b) {
  return FUNCOES.every((f) => {
    const x = [...(a?.[f] || [])].sort().join('|');
    const y = [...(b?.[f] || [])].sort().join('|');
    return x === y;
  });
}
