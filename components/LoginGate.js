'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseClient';

const AuthContext = createContext(null);
export function useAuthInfo() {
  return useContext(AuthContext);
}

export default function LoginGate({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingRole, setLoadingRole] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
      if (!u) setRole(null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoadingRole(true);
    const unsub = onSnapshot(
      doc(db, 'usuarios', user.uid),
      (snap) => {
        setRole(snap.exists() ? snap.data().role : 'sem-permissao');
        setLoadingRole(false);
      },
      () => { setRole('sem-permissao'); setLoadingRole(false); }
    );
    return unsub;
  }, [user]);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha);
    } catch (err) {
      if (err.code === 'auth/invalid-api-key' || err.code === 'auth/api-key-not-valid') {
        setErro('Erro de configuração do Firebase (chave de API inválida). Confira as variáveis NEXT_PUBLIC_FIREBASE_* no Vercel.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErro('E-mail ou senha inválidos.');
      } else if (err.code === 'auth/too-many-requests') {
        setErro('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
      } else {
        setErro('Erro ao entrar: ' + (err.code || err.message));
      }
    } finally {
      setEnviando(false);
    }
  }

  if (loadingAuth) return null;

  if (!user) {
    return (
      <div className="passcode-screen">
        <div className="passcode-card">
          <img src="/logo.png" alt="São Miguel" />
          <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Controle de Peças</h2>
          <p className="muted" style={{ marginBottom: 18 }}>Entre com seu e-mail e senha</p>
          <form onSubmit={entrar}>
            <div className="field" style={{ textAlign: 'left' }}>
              <label>E-mail</label>
              <input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field" style={{ textAlign: 'left' }}>
              <label>Senha</label>
              <input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            {erro && <p style={{ color: 'var(--vermelho)', fontSize: 12.5, margin: '0 0 10px' }}>{erro}</p>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loadingRole) return null;

  if (role === 'sem-permissao' || !role) {
    return (
      <div className="passcode-screen">
        <div className="passcode-card">
          <img src="/logo.png" alt="São Miguel" />
          <h3 style={{ margin: '0 0 6px' }}>Acesso não configurado</h3>
          <p className="muted" style={{ marginBottom: 18 }}>
            Sua conta (<strong>{user.email}</strong>) ainda não tem uma função definida no sistema.
            Contate o desenvolvedor responsável para liberar seu acesso.
          </p>
          <button className="btn btn-ghost" onClick={() => signOut(auth)}>Sair</button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, role }}>
      {children}
    </AuthContext.Provider>
  );
}
