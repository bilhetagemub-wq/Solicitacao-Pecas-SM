import { getAdminAuth, getAdminDb } from './firebaseAdmin';

/**
 * Verifica o token de autenticação enviado pelo front-end e confirma que o
 * usuário logado tem uma das funções permitidas. Lança erro caso contrário.
 * Retorna { uid, role } do usuário verificado.
 */
export async function verificarPapel(request, papeisPermitidos) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    throw new Error('Token de autenticação ausente.');
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const db = getAdminDb();
  const snap = await db.collection('usuarios').doc(decoded.uid).get();
  const role = snap.exists ? snap.data().role : null;

  if (!role || !papeisPermitidos.includes(role)) {
    throw new Error('Você não tem permissão para executar esta ação.');
  }

  return { uid: decoded.uid, role };
}

/** Atalho para rotas restritas exclusivamente ao Developer. Retorna o uid. */
export async function verificarDeveloper(request) {
  const { uid } = await verificarPapel(request, ['developer']);
  return uid;
}
