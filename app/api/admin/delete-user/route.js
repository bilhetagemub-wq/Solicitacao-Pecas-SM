import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '../../../../lib/firebaseAdmin';
import { verificarDeveloper } from '../../../../lib/adminAuth';

export async function POST(request) {
  try {
    const callerUid = await verificarDeveloper(request);

    const { uid } = await request.json();
    if (!uid) {
      return NextResponse.json({ error: 'Usuário ausente.' }, { status: 400 });
    }
    if (uid === callerUid) {
      return NextResponse.json({ error: 'Você não pode excluir sua própria conta por aqui.' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    await adminAuth.deleteUser(uid);

    const db = getAdminDb();
    await db.collection('usuarios').doc(uid).delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
