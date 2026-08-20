import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Lê a credencial de serviço do Firebase. Prioriza a versão em base64
// (FIREBASE_SERVICE_ACCOUNT_BASE64), que é a forma recomendada por ser imune
// a problemas de formatação (aspas curvas, quebra de linha cortada, etc).
// Mantém suporte à versão em JSON puro (FIREBASE_SERVICE_ACCOUNT_JSON) para
// quem configurou dessa forma.
function getServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    let json;
    try {
      json = Buffer.from(b64.trim(), 'base64').toString('utf-8');
    } catch {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 não pôde ser decodificado. Gere o valor novamente ' +
        'a partir do arquivo .json original (veja o README, Parte 1.3).'
      );
    }
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_BASE64 foi decodificado, mas o conteúdo não é um JSON válido (' +
        e.message + '). Gere o base64 novamente a partir do arquivo .json original, sem editar o texto.'
      );
    }
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error(
      'Nenhuma credencial do Firebase Admin configurada. Defina FIREBASE_SERVICE_ACCOUNT_BASE64 ' +
      '(recomendado) ou FIREBASE_SERVICE_ACCOUNT_JSON. Veja o README, Parte 1.3.'
    );
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON não é um JSON válido (' + e.message + '). Isso costuma acontecer ' +
      'quando aspas retas (") são trocadas por aspas curvas (" ") ao colar em apps como Word/Notas, ' +
      'ou quando o valor foi cortado ao colar. Recomendado: troque para a variável ' +
      'FIREBASE_SERVICE_ACCOUNT_BASE64 — veja o README, Parte 1.3.'
    );
  }
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccount = getServiceAccount();
  return initializeApp({
    credential: cert(serviceAccount),
  });
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
