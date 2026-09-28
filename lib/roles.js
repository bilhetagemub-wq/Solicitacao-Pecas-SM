export const FUNCOES = ['comprador', 'encarregado', 'gerente', 'developer'];

export const FUNCAO_LABEL = {
  comprador: 'Comprador',
  encarregado: 'Encarregado',
  gerente: 'Gerente',
  developer: 'Developer',
};

// Lista de abas (na ordem em que aparecem no menu) que cada função pode acessar.
export const TAB_ACCESS = {
  comprador: ['comprador'],
  encarregado: ['dashboard', 'solicitacao'],
  gerente: ['dashboard', 'solicitacao', 'comprador', 'atualizacoes', 'relatorio'],
  developer: ['dashboard', 'solicitacao', 'comprador', 'atualizacoes', 'relatorio', 'configuracoes'],
};
