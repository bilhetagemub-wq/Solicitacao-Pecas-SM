import { auth } from './firebaseClient';

async function callAdmin(path, body) {
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na operação.');
  return data;
}

export const criarUsuario = (email, password, role) =>
  callAdmin('/api/admin/create-user', { email, password, role });

export const atualizarFuncaoUsuario = (uid, role) =>
  callAdmin('/api/admin/update-role', { uid, role });

export const excluirUsuario = (uid) =>
  callAdmin('/api/admin/delete-user', { uid });

export const testarEmailAlerta = () =>
  callAdmin('/api/admin/test-email', {});
