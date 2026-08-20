import { getAdminAuth, getAdminDb } from './firebaseAdmin';

/**
 * Verifica o token de autenticação enviado pelo front-end e confirma que
 * o usuário logado tem a função "developer". Lança erro caso contrário.
 * Retorna o uid do usuário verificado.
 */
export async function verificarDeveloper(request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    throw new Error('Token de autenticação ausente.');
  }

  const decoded = await getAdminAuth().verifyIdToken(token);
  const db = getAdminDb();
  const snap = await db.collection('usuarios').doc(decoded.uid).get();

  if (!snap.exists || snap.data().role !== 'developer') {
    throw new Error('Acesso restrito à função Developer.');
  }

  return decoded.uid;
}
