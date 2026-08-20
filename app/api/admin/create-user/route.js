import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '../../../../lib/firebaseAdmin';
import { verificarDeveloper } from '../../../../lib/adminAuth';

const FUNCOES_VALIDAS = ['comprador', 'encarregado', 'gerente', 'developer'];

export async function POST(request) {
  try {
    await verificarDeveloper(request);

    const { email, password, role } = await request.json();

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Preencha e-mail, senha e função.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 });
    }
    if (!FUNCOES_VALIDAS.includes(role)) {
      return NextResponse.json({ error: 'Função inválida.' }, { status: 400 });
    }

    const adminAuth = getAdminAuth();
    const userRecord = await adminAuth.createUser({ email, password });

    const db = getAdminDb();
    await db.collection('usuarios').doc(userRecord.uid).set({
      email,
      role,
      criadoEm: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, uid: userRecord.uid });
  } catch (err) {
    const msg = err.code === 'auth/email-already-exists'
      ? 'Já existe um usuário com esse e-mail.'
      : err.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
