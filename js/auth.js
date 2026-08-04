/** SHA-256 password unlock for static GitHub Pages hosting. */
export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isUnlocked(sessionKey) {
  try {
    return sessionStorage.getItem(sessionKey) === '1';
  } catch {
    return false;
  }
}

export function setUnlocked(sessionKey) {
  try {
    sessionStorage.setItem(sessionKey, '1');
  } catch { /* ignore */ }
}

export async function verifyPassword(password, expectedHash) {
  if (!expectedHash) return false;
  const hex = await sha256Hex(password);
  return hex === expectedHash.toLowerCase();
}

export function bindPasswordGate({ sessionKey, passwordHash, onUnlock }) {
  const gate = document.getElementById('pwgate');
  const input = document.getElementById('pwInput');
  const btn = document.getElementById('pwUnlock');
  const err = document.getElementById('pwErr');

  const unlock = () => {
    setUnlocked(sessionKey);
    if (gate) gate.hidden = true;
    onUnlock();
  };

  // Empty / missing hash = no password
  if (!passwordHash || !String(passwordHash).trim()) {
    if (gate) gate.hidden = true;
    unlock();
    return;
  }

  if (isUnlocked(sessionKey)) {
    if (gate) gate.hidden = true;
    onUnlock();
    return;
  }

  if (gate) gate.hidden = false;
  const age = document.getElementById('agegate');
  if (age) age.hidden = true;
  const setup = document.getElementById('setup');
  if (setup) setup.hidden = true;

  const tryUnlock = async () => {
    err.textContent = '';
    const ok = await verifyPassword(input.value || '', passwordHash);
    if (!ok) {
      err.textContent = '密码错误';
      input.focus();
      return;
    }
    unlock();
  };

  btn?.addEventListener('click', tryUnlock);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tryUnlock();
    }
  });
}
