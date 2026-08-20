import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebaseAdmin';
import { verificarDeveloper } from '../../../../lib/adminAuth';

const FUNCOES_VALIDAS = ['comprador', 'encarregado', 'gerente', 'developer'];

export async function POST(request) {
  try {
    await verificarDeveloper(request);

    const { uid, role } = await request.json();
    if (!uid || !role) {
      return NextResponse.json({ error: 'Usuário ou função ausente.' }, { status: 400 });
    }
    if (!FUNCOES_VALIDAS.includes(role)) {
      return NextResponse.json({ error: 'Função inválida.' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('usuarios').doc(uid).update({ role });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
