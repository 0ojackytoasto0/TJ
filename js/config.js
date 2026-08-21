/** Load site + kink + task JSON; merge localStorage overrides. */

const TASK_FILES = [
  'instruct', 'punish', 'train', 'jerk', 'chat', 'order',
  'recite', 'intro', 'aftercare', 'finale', 'insert', 'comments', 'lines'
];

export async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')');
  return res.json();
}

export function loadLocalOverrides(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLocalOverrides(storageKey, overrides) {
  localStorage.setItem(storageKey, JSON.stringify(overrides));
}

export function clearLocalOverrides(storageKey) {
  localStorage.removeItem(storageKey);
}

function kinkNeedsMet(needs, enabledMap, kinksCatalog) {
  if (!needs) return true;
  const list = Array.isArray(needs) ? needs : [needs];
  return list.some((id) => {
    if (enabledMap[id] !== undefined) return !!enabledMap[id];
    const k = (kinksCatalog || []).find((x) => x.id === id);
    return k ? k.enabled !== false : true;
  });
}

export function buildOverridesFromUI(kinksCatalog) {
  const hostName = (document.getElementById('hostNameIn')?.value || '').trim();
  const callRaw = document.getElementById('callNamesIn')?.value || '';
  const callNames = callRaw.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean);
  const enabled = {};
  document.querySelectorAll('#kinkGrid input[type=checkbox], #featuredKinks input[type=checkbox]').forEach((cb) => {
    enabled[cb.dataset.kink] = cb.checked;
  });

  const locEl = document.querySelector('input[name="scenarioLoc"]:checked');
  const location = locEl ? locEl.value : 'random';
  const randomConditions = !!document.getElementById('scenarioRandomAll')?.checked;
  const conditions = {};
  document.querySelectorAll('#scenarioCondGrid input[type=checkbox][data-cond]').forEach((cb) => {
    conditions[cb.dataset.cond] = cb.checked;
  });
  const toys = {};
  document.querySelectorAll('#scenarioToyGrid input[type=checkbox][data-toy]').forEach((cb) => {
    toys[cb.dataset.toy] = cb.checked;
  });

  return {
    hostName: hostName || undefined,
    callNames: callNames.length ? callNames : undefined,
    enabledKinks: enabled,
    scenarioLocation: location,
    scenarioConditions: conditions,
    scenarioRandomConditions: randomConditions,
    scenarioToys: toys
  };
}

export function scenarioPrefsFromOverrides(overrides) {
  return {
    location: (overrides && overrides.scenarioLocation) || 'random',
    conditions: (overrides && overrides.scenarioConditions) || {},
    randomConditions: !!(overrides && overrides.scenarioRandomConditions),
    toys: (overrides && overrides.scenarioToys) || {}
  };
}

function locSupportsCond(loc, condId) {
  if (!loc) return true; // 随机地点：开局再判
  // 各地点均带马桶；其它条件不因地禁用
  return true;
}

export function updateScenarioPreview(scenarios) {
  const el = document.getElementById('scenarioPreview');
  if (!el || !scenarios) return;
  const locEl = document.querySelector('input[name="scenarioLoc"]:checked');
  const locId = locEl ? locEl.value : 'random';
  const loc =
    locId === 'random'
      ? null
      : (scenarios.locations || []).find((l) => l.id === locId);
  const locLabel = loc ? loc.label : '随机地点';
  const randomAll = !!document.getElementById('scenarioRandomAll')?.checked;
  const toyCount = [
    ...document.querySelectorAll('#scenarioToyGrid input[type=checkbox][data-toy]:checked')
  ].length;
  const toyBit = toyCount ? toyCount + '件玩具' : '无玩具';
  if (randomAll) {
    el.textContent =
      (locId === 'random'
        ? '将生成：全部随机（地点 + 条件）'
        : '将生成：' + locLabel + ' · 条件随机') +
      ' · ' +
      toyBit;
    return;
  }
  const bits = [];
  document.querySelectorAll('#scenarioCondGrid input[type=checkbox][data-cond]').forEach((cb) => {
    if (cb.checked && !cb.disabled) bits.push(cb.dataset.label || cb.dataset.cond);
  });
  el.textContent =
    '将生成：' +
    locLabel +
    (bits.length ? ' · 必上场 ' + bits.join(' / ') : ' · 基础指令') +
    ' · ' +
    toyBit;
}

function syncScenarioCondAvailability(scenarios) {
  const locEl = document.querySelector('input[name="scenarioLoc"]:checked');
  const locId = locEl ? locEl.value : 'random';
  const loc =
    locId === 'random'
      ? null
      : (scenarios.locations || []).find((l) => l.id === locId);
  document.querySelectorAll('#scenarioCondGrid input[type=checkbox][data-cond]').forEach((cb) => {
    const lab = cb.closest('.scenario-chip');
    const baseDisabled = cb.dataset.kinkBlocked === '1';
    const placeOk = locSupportsCond(loc, cb.dataset.cond);
    const blocked = baseDisabled || !placeOk;
    cb.disabled = blocked;
    if (blocked) {
      cb.checked = false;
      if (lab) lab.classList.remove('on');
    }
    if (lab) {
      lab.classList.toggle('dim', blocked);
      const span = lab.querySelector('span');
      if (span) {
        const label = cb.dataset.label || cb.dataset.cond;
        if (baseDisabled) span.textContent = label + '（需开癖好）';
        else if (!placeOk) span.textContent = label + '（此地不可）';
        else span.textContent = label + '（勾选必上场）';
      }
    }
  });
}

export function renderScenarioUI(scenarios, overrides, kinksCatalog) {
  const locRoot = document.getElementById('scenarioLocGrid');
  const condRoot = document.getElementById('scenarioCondGrid');
  const toyRoot = document.getElementById('scenarioToyGrid');
  if (!locRoot || !condRoot || !scenarios) return;

  const o = overrides || {};
  const enabledMap = o.enabledKinks || {};
  const savedLoc = o.scenarioLocation || 'random';
  const savedCond = o.scenarioConditions || {};
  const savedToys = o.scenarioToys || {};
  const randomAll = !!o.scenarioRandomConditions;

  locRoot.innerHTML = '';
  const mkLoc = (id, label) => {
    const lab = document.createElement('label');
    lab.className = 'scenario-chip' + (savedLoc === id ? ' on' : '');
    lab.innerHTML = `<input type="radio" name="scenarioLoc" value="${id}" ${savedLoc === id ? 'checked' : ''}/><span>${label}</span>`;
    const inp = lab.querySelector('input');
    inp.addEventListener('change', () => {
      locRoot.querySelectorAll('.scenario-chip').forEach((c) => c.classList.remove('on'));
      lab.classList.add('on');
      syncScenarioCondAvailability(scenarios);
      updateScenarioPreview(scenarios);
    });
    locRoot.appendChild(lab);
  };
  mkLoc('random', '随机');
  (scenarios.locations || []).forEach((l) => mkLoc(l.id, l.label));

  condRoot.innerHTML = '';
  (scenarios.conditions || []).forEach((c) => {
    const kinkOk = kinkNeedsMet(c.needsKink, enabledMap, kinksCatalog);
    const on = savedCond[c.id] !== undefined ? !!savedCond[c.id] : !!c.default;
    const lab = document.createElement('label');
    lab.className = 'scenario-chip' + (on && kinkOk ? ' on' : '') + (!kinkOk ? ' dim' : '');
    lab.innerHTML = `<input type="checkbox" data-cond="${c.id}" data-label="${c.label}" data-kink-blocked="${kinkOk ? '0' : '1'}" ${on && kinkOk ? 'checked' : ''} ${!kinkOk ? 'disabled' : ''}/><span>${c.label}${!kinkOk ? '（需开癖好）' : '（勾选必上场）'}</span>`;
    const cb = lab.querySelector('input');
    cb.addEventListener('change', () => {
      lab.classList.toggle('on', cb.checked);
      updateScenarioPreview(scenarios);
    });
    condRoot.appendChild(lab);
  });

  if (toyRoot) {
    toyRoot.innerHTML = '';
    (scenarios.toys || []).forEach((toy) => {
      // default: none selected until user picks (first visit); if key exists use saved
      const on = savedToys[toy.id] !== undefined ? !!savedToys[toy.id] : false;
      const lab = document.createElement('label');
      lab.className = 'scenario-chip' + (on ? ' on' : '');
      lab.innerHTML = `<input type="checkbox" data-toy="${toy.id}" data-label="${toy.label}" ${on ? 'checked' : ''}/><span>${toy.label}</span>`;
      const cb = lab.querySelector('input');
      cb.addEventListener('change', () => {
        lab.classList.toggle('on', cb.checked);
        updateScenarioPreview(scenarios);
      });
      toyRoot.appendChild(lab);
    });
    const allBtn = document.getElementById('toySelectAll');
    const noneBtn = document.getElementById('toySelectNone');
    if (allBtn) {
      allBtn.onclick = () => {
        toyRoot.querySelectorAll('input[data-toy]').forEach((cb) => {
          cb.checked = true;
          cb.closest('.scenario-chip')?.classList.add('on');
        });
        updateScenarioPreview(scenarios);
      };
    }
    if (noneBtn) {
      noneBtn.onclick = () => {
        toyRoot.querySelectorAll('input[data-toy]').forEach((cb) => {
          cb.checked = false;
          cb.closest('.scenario-chip')?.classList.remove('on');
        });
        updateScenarioPreview(scenarios);
      };
    }
  }

  const randEl = document.getElementById('scenarioRandomAll');
  if (randEl) {
    randEl.checked = randomAll;
    const syncDim = () => {
      condRoot.classList.toggle('is-random', randEl.checked);
      updateScenarioPreview(scenarios);
    };
    randEl.onchange = syncDim;
    syncDim();
  }
  syncScenarioCondAvailability(scenarios);
  updateScenarioPreview(scenarios);
}

export function applyOverridesToUI(site, kinks, overrides, scenarios) {
  const hostEl = document.getElementById('hostNameIn');
  if (hostEl) hostEl.value = (overrides && overrides.hostName) || site.hostName || '主人';
  const callEl = document.getElementById('callNamesIn');
  if (callEl) {
    const names = (overrides && overrides.callNames) || site.callNames || [];
    callEl.value = names.join('，');
  }
  const enabledMap = (overrides && overrides.enabledKinks) || {};
  const featuredRoot = document.getElementById('featuredKinks');
  if (featuredRoot) {
    featuredRoot.innerHTML = '';
    for (const k of kinks.filter((x) => x.featured)) {
      const on = enabledMap[k.id] !== undefined ? !!enabledMap[k.id] : k.enabled !== false;
      const lab = document.createElement('label');
      lab.className = 'kink-feature' + (on ? ' on' : '');
      lab.innerHTML = `<div class="kink-feature-top"><input type="checkbox" data-kink="${k.id}" ${on ? 'checked' : ''}/><span class="kink-feature-title">${k.icon || ''} ${k.label || k.id}<small>专场环节 · 开启后加入流程</small></span><span class="kink-feature-badge">可选加强</span></div><div class="kink-feature-blurb">${k.blurb || ''}</div>`;
      const cb = lab.querySelector('input');
      cb.addEventListener('change', () => lab.classList.toggle('on', cb.checked));
      featuredRoot.appendChild(lab);
    }
  }
  const grid = document.getElementById('kinkGrid');
  if (grid) {
    grid.innerHTML = '';
    for (const k of kinks.filter((x) => !x.featured)) {
      const on = enabledMap[k.id] !== undefined ? !!enabledMap[k.id] : k.enabled !== false;
      const lab = document.createElement('label');
      lab.className = 'kink-item' + (on ? ' on' : '');
      lab.innerHTML = `<input type="checkbox" data-kink="${k.id}" ${on ? 'checked' : ''}/><span>${k.icon || ''} ${k.label || k.id}</span>`;
      const cb = lab.querySelector('input');
      cb.addEventListener('change', () => {
        lab.classList.toggle('on', cb.checked);
      });
      grid.appendChild(lab);
    }
  }
  if (scenarios) renderScenarioUI(scenarios, overrides, kinks);
}

export function enabledKinkSet(kinks, overrides) {
  const map = (overrides && overrides.enabledKinks) || {};
  const set = new Set();
  for (const k of kinks) {
    const on = map[k.id] !== undefined ? !!map[k.id] : k.enabled !== false;
    if (on) set.add(k.id);
  }
  return set;
}

export async function loadAllData(base = 'data') {
  const [site, kinksFile, defaults, scenarios] = await Promise.all([
    fetchJson(`${base}/site.json`),
    fetchJson(`${base}/kinks.json`),
    fetchJson(`${base}/site-config-defaults.json`).catch(() => ({})),
    fetchJson(`${base}/scenarios.json`).catch(() => null)
  ]);

  const tasks = {};
  await Promise.all(TASK_FILES.map(async (name) => {
    tasks[name] = await fetchJson(`${base}/tasks/${name}.json`);
  }));

  const lines = tasks.lines || {};
  const CONFIG = {
    ...defaults,
    ...site,
    RING_R: site.RING_R || defaults.RING_R || 54,
    RING_C: 2 * Math.PI * (site.RING_R || defaults.RING_R || 54)
  };
  const nicknames = defaults.nicknames || [];
  const callNames = defaults.callNames || [];

  const DATA = {
    nicknames,
    callNames,
    instruct: tasks.instruct || [],
    punish: tasks.punish || [],
    train: tasks.train || [],
    jerk: tasks.jerk || [],
    chat: tasks.chat || [],
    order: tasks.order || [],
    recite: tasks.recite || [],
    intro: tasks.intro || [],
    aftercare: tasks.aftercare || [],
    finale: tasks.finale || [],
    insert: tasks.insert || [],
    comments: tasks.comments || {},
    papaOpen: lines.papaOpen || [],
    papaTrans: lines.papaTrans || [],
    papaPraise: lines.papaPraise || [],
    papaClose: lines.papaClose || [],
    stageOpen: lines.stageOpen || {},
    fail1: lines.fail1 || [],
    fail2: lines.fail2 || [],
    shutdown: lines.shutdown || [],
    events: lines.events || [],
    actOpen: lines.actOpen || {},
    scenarios: scenarios || null
  };

  return {
    site: CONFIG,
    kinks: kinksFile.kinks || [],
    CONFIG,
    DATA,
    storageKey: site.storageKey || 'tj_cfg_v1',
    sessionUnlockKey: site.sessionUnlockKey || 'tjUnlocked'
  };
}

export function exportConfigBlob(overrides) {
  return new Blob([JSON.stringify(overrides, null, 2)], { type: 'application/json' });
}
