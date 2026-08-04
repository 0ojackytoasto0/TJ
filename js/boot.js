import { bindPasswordGate } from './auth.js';
import {
  loadAllData,
  loadLocalOverrides,
  saveLocalOverrides,
  buildOverridesFromUI,
  applyOverridesToUI,
  enabledKinkSet,
  exportConfigBlob
} from './config.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

function syncRuntime(bundle, overrides) {
  const host = (overrides && overrides.hostName) || bundle.site.hostName || '主人';
  const callNames = (overrides && overrides.callNames) || bundle.DATA.callNames;
  window.TJ = window.TJ || {};
  TJ.hostName = host;
  TJ.enabledKinks = enabledKinkSet(bundle.kinks, overrides);
  TJ.preferKinks = new Set(); // reserved for future UI
  if (window.CONFIG) {
    CONFIG.hostName = host;
    CONFIG.brandName = bundle.site.brandName;
  }
  if (window.DATA && callNames) DATA.callNames = callNames.slice();
  if (window.TJGame) {
    TJGame.applyBrand({ ...bundle.site, hostName: host });
    TJGame.setCallNames(callNames);
  }
}

function wireConfigUI(bundle) {
  const key = bundle.storageKey;
  let overrides = loadLocalOverrides(key) || {};

  // seed callNames on site for UI
  bundle.site.callNames = bundle.DATA.callNames;
  applyOverridesToUI(bundle.site, bundle.kinks, overrides);
  syncRuntime(bundle, overrides);

  const persist = () => {
    overrides = buildOverridesFromUI(bundle.kinks);
    saveLocalOverrides(key, overrides);
    syncRuntime(bundle, overrides);
  };

  document.getElementById('hostNameIn')?.addEventListener('change', persist);
  document.getElementById('callNamesIn')?.addEventListener('change', persist);
  document.getElementById('kinkGrid')?.addEventListener('change', persist);
  document.getElementById('featuredKinks')?.addEventListener('change', persist);

  document.getElementById('cfgExport')?.addEventListener('click', () => {
    persist();
    const blob = exportConfigBlob(overrides);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tj-config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  document.getElementById('cfgImport')?.addEventListener('click', () => {
    document.getElementById('cfgFile')?.click();
  });

  document.getElementById('cfgFile')?.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      overrides = JSON.parse(text);
      saveLocalOverrides(key, overrides);
      applyOverridesToUI(bundle.site, bundle.kinks, overrides);
      syncRuntime(bundle, overrides);
      alert('配置已导入');
    } catch (err) {
      alert('导入失败：' + err.message);
    }
    e.target.value = '';
  });

  // Persist kink/host right before start
  const startBtn = document.getElementById('startBtn');
  if (startBtn) {
    startBtn.addEventListener('click', persist, true);
  }
}

async function main() {
  const status = document.createElement('div');
  status.id = 'bootStatus';
  status.style.cssText = 'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:#050508;color:#ffd7e5;font-family:system-ui,sans-serif';
  status.textContent = '加载调教室…';
  document.body.appendChild(status);

  let bundle;
  try {
    bundle = await loadAllData('data');
  } catch (e) {
    status.innerHTML = '<div style="max-width:360px;padding:24px;text-align:center"><h2>加载失败</h2><p style="opacity:.8;line-height:1.5">请用本地服务器打开（GitHub Pages 或 <code>npx serve</code>），不要直接双击 HTML。<br><br>' + e.message + '</p></div>';
    return;
  }

  window.CONFIG = bundle.CONFIG;
  window.DATA = bundle.DATA;
  window.TJ = { hostName: bundle.site.hostName || '主人', enabledKinks: new Set(), preferKinks: new Set() };

  await loadScript('js/game.js');
  status.remove();

  // Default pack UI to local
  document.querySelectorAll('.packbtn').forEach((b) => {
    b.classList.toggle('sel', b.dataset.pack === 'local');
  });

  bindPasswordGate({
    sessionKey: bundle.sessionUnlockKey,
    passwordHash: bundle.site.passwordHash,
    onUnlock: () => {
      ['setup', 'ending', 'settingsModal', 'voicePick', 'pauseOverlay', 'safeConfirm', 'safeEnd', 'console'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.hidden = true;
      });
      const age = document.getElementById('agegate');
      if (age) age.hidden = false;
      wireConfigUI(bundle);
      if (window.TJGame) {
        TJGame.applyBrand(bundle.site);
        TJGame.init();
      }
    }
  });
}

main().catch((e) => {
  console.error(e);
  alert('启动失败：' + e.message);
});
