'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'sm_passcode_ok';

export default function PasscodeGate({ children }) {
  const [ok, setOk] = useState(false);
  const [checked, setChecked] = useState(false);
  const [input, setInput] = useState('');
  const [erro, setErro] = useState(false);
  const senhaCorreta = process.env.NEXT_PUBLIC_APP_PASSCODE || '';

  useEffect(() => {
    if (!senhaCorreta) { setOk(true); setChecked(true); return; }
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved === senhaCorreta) setOk(true);
    setChecked(true);
  }, [senhaCorreta]);

  function entrar(e) {
    e.preventDefault();
    if (input === senhaCorreta) {
      sessionStorage.setItem(SESSION_KEY, input);
      setOk(true);
      setErro(false);
    } else {
      setErro(true);
    }
  }

  if (!checked) return null;
  if (ok) return children;

  return (
    <div className="passcode-screen">
      <div className="passcode-card">
        <img src="/logo.png" alt="São Miguel" />
        <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Controle de Peças</h2>
        <p className="muted" style={{ marginBottom: 18 }}>Digite a senha de acesso ao sistema</p>
        <form onSubmit={entrar}>
          <div className="field" style={{ textAlign: 'left' }}>
            <input
              type="password"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Senha"
            />
          </div>
          {erro && <p style={{ color: 'var(--vermelho)', fontSize: 12.5, margin: '0 0 10px' }}>Senha incorreta.</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Entrar</button>
        </form>
      </div>
    </div>
  );
}
