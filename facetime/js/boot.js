import { bindPasswordGate } from '../../js/auth.js';
import {
  loadAllData,
  loadLocalOverrides,
  saveLocalOverrides,
  buildOverridesFromUI,
  applyOverridesToUI,
  enabledKinkSet,
  exportConfigBlob,
  scenarioPrefsFromOverrides,
  renderScenarioUI
} from '../../js/config.js';

const STORAGE_KEY = 'tj_facetime_cfg_v1';
const SESSION_KEY = 'tjFacetimeUnlocked';

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
  TJ.mode = 'facetime';
  TJ.hostName = host;
  TJ.enabledKinks = enabledKinkSet(bundle.kinks, overrides);
  TJ.preferKinks = new Set();
  TJ.scenarioPrefs = scenarioPrefsFromOverrides(overrides);
  if (window.CONFIG) {
    CONFIG.hostName = host;
    CONFIG.brandName = bundle.site.callBrandName || bundle.site.brandName;
    CONFIG.HOST_COMMENT_CHANCE = Math.max(CONFIG.HOST_COMMENT_CHANCE || 0.15, 0.55);
  }
  if (window.DATA && callNames) DATA.callNames = callNames.slice();
  if (window.TJGame) {
    TJGame.applyBrand({
      ...bundle.site,
      hostName: host,
      brandName: bundle.site.callBrandName || bundle.site.brandName || '私人通话',
      frameCaption: bundle.site.callFrameCaption || bundle.site.frameCaption || '私人视频通话'
    });
    TJGame.setCallNames(callNames);
  }
  const face = document.getElementById('hostPipFace');
  if (face) face.textContent = (host && host[0]) || '主';
}

function wireConfigUI(bundle) {
  const key = bundle.storageKey;
  let overrides = loadLocalOverrides(key) || {};
  const scenarios = bundle.DATA.scenarios;

  bundle.site.callNames = bundle.DATA.callNames;
  applyOverridesToUI(bundle.site, bundle.kinks, overrides, scenarios);
  syncRuntime(bundle, overrides);

  const persist = () => {
    overrides = buildOverridesFromUI(bundle.kinks);
    saveLocalOverrides(key, overrides);
    syncRuntime(bundle, overrides);
    if (scenarios) renderScenarioUI(scenarios, overrides, bundle.kinks);
  };

  document.getElementById('hostNameIn')?.addEventListener('change', persist);
  document.getElementById('callNamesIn')?.addEventListener('change', persist);
  document.getElementById('kinkGrid')?.addEventListener('change', persist);
  document.getElementById('featuredKinks')?.addEventListener('change', persist);
  document.getElementById('scenarioLocGrid')?.addEventListener('change', persist);
  document.getElementById('scenarioCondGrid')?.addEventListener('change', persist);
  document.getElementById('scenarioToyGrid')?.addEventListener('change', persist);
  document.getElementById('scenarioRandomAll')?.addEventListener('change', persist);

  document.getElementById('cfgExport')?.addEventListener('click', () => {
    persist();
    const blob = exportConfigBlob(overrides);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tj-facetime-config.json';
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
      applyOverridesToUI(bundle.site, bundle.kinks, overrides, scenarios);
      syncRuntime(bundle, overrides);
      alert('配置已导入');
    } catch (err) {
      alert('导入失败：' + err.message);
    }
    e.target.value = '';
  });

  const startBtn = document.getElementById('startBtn');
  if (startBtn) startBtn.addEventListener('click', persist, true);
}

async function main() {
  const status = document.createElement('div');
  status.id = 'bootStatus';
  status.style.cssText =
    'position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:#05080c;color:#b8ffc8;font-family:system-ui,sans-serif';
  status.textContent = '接通私人通话…';
  document.body.appendChild(status);

  // MP3 语音包相对 facetime/ 在上一级
  window.TTS_CDN = '../';

  let bundle;
  try {
    bundle = await loadAllData('../data');
  } catch (e) {
    status.innerHTML =
      '<div style="max-width:360px;padding:24px;text-align:center"><h2>加载失败</h2><p style="opacity:.8;line-height:1.5">请用本地服务器打开（GitHub Pages 或 <code>npx serve</code>），不要直接双击 HTML。<br><br>' +
      e.message +
      '</p></div>';
    return;
  }

  bundle.storageKey = STORAGE_KEY;
  bundle.sessionUnlockKey = SESSION_KEY;

  window.CONFIG = bundle.CONFIG;
  window.DATA = bundle.DATA;
  window.TJ = {
    mode: 'facetime',
    hostName: bundle.site.hostName || '主人',
    enabledKinks: new Set(),
    preferKinks: new Set(),
    scenarioPrefs: { location: 'random', conditions: {}, randomConditions: false }
  };

  await loadScript('../js/game.js');
  status.remove();

  document.querySelectorAll('.packbtn').forEach((b) => {
    b.classList.toggle('sel', b.dataset.pack === 'yunyang');
  });

  bindPasswordGate({
    sessionKey: bundle.sessionUnlockKey,
    passwordHash: bundle.site.passwordHash,
    onUnlock: () => {
      ['setup', 'ending', 'settingsModal', 'voicePick', 'pauseOverlay', 'safeConfirm', 'safeEnd', 'console', 'hostPip'].forEach(
        (id) => {
          const el = document.getElementById(id);
          if (el) el.hidden = true;
        }
      );
      const age = document.getElementById('agegate');
      if (age) age.hidden = false;
      wireConfigUI(bundle);
      if (window.TJGame) {
        TJGame.applyBrand({
          ...bundle.site,
          brandName: bundle.site.callBrandName || '私人通话',
          frameCaption: bundle.site.callFrameCaption || '私人视频通话'
        });
        TJGame.init();
      }
    }
  });
}

main().catch((e) => {
  console.error(e);
  alert('启动失败：' + e.message);
});
