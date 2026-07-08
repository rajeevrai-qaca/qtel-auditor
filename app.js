/* ============================================================
   Q-TEL AUDITOR PWA v2.0 — APP LOGIC
   Vanilla JS. No build step. No framework.
   ============================================================ */

/* ---------- CONFIG YOU MUST SET ---------- */
// Point this at your n8n webhook that writes into Airtable.
// Keeping the Airtable API key OUT of this public front-end code
// is deliberate — the webhook holds the key server-side in n8n.
const SYNC_WEBHOOK_URL = "https://YOUR-N8N-INSTANCE/webhook/qtel-audit-sync";

/* ---------- SIMPLE STATE ---------- */
const state = {
  screen: "login",
  user: null,
  jobs: [],
  currentAudit: null,   // in-progress audit object
  currentSectionIdx: 0
};

/* ---------- IndexedDB — offline photo + audit storage ---------- */
const DB_NAME = "qtel_db";
const DB_VERSION = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains("audits")) {
        database.createObjectStore("audits", { keyPath: "auditId" });
      }
      if (!database.objectStoreNames.contains("syncQueue")) {
        database.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e);
  });
}

function idbPut(store, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

function idbGet(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

/* ---------- GPS ---------- */
function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

/* ---------- ROUTER ---------- */
const root = document.getElementById("app");

function render() {
  root.innerHTML = "";
  switch (state.screen) {
    case "login": return renderLogin();
    case "myjobs": return renderMyJobs();
    case "jobsetup": return renderJobSetup();
    case "sectionlist": return renderSectionList();
    case "sectionrunner": return renderSectionRunner();
    case "profile": return renderProfile();
    default: return renderLogin();
  }
}

/* ---------- SCREEN: LOGIN ---------- */
function renderLogin() {
  const el = document.createElement("div");
  el.className = "screen screen-center";
  el.innerHTML = `
    <div class="brand">
      <div class="brand-mark">Q</div>
      <h1>Q-Tel Auditor</h1>
      <p class="muted">GBT Foundation Acceptance — Digital Check Sheet</p>
    </div>
    <form id="loginForm" class="card">
      <label>Email</label>
      <input type="email" id="loginEmail" required placeholder="you@qaca.in" autocomplete="username">
      <label>Password</label>
      <input type="password" id="loginPassword" required placeholder="••••••••" autocomplete="current-password">
      <button type="submit" class="btn-primary">Sign In</button>
      <p class="muted small">Auth wiring TODO — currently accepts any credentials for testing. Connect to Airtable Users table via n8n before go-live.</p>
    </form>
  `;
  root.appendChild(el);
  document.getElementById("loginForm").onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    state.user = { email, name: email.split("@")[0] };
    localStorage.setItem("qtel_user", JSON.stringify(state.user));
    state.screen = "myjobs";
    render();
  };
}

/* ---------- SCREEN: MY JOBS ---------- */
function renderMyJobs() {
  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <header class="topbar">
      <div>
        <div class="topbar-title">My Jobs</div>
        <div class="topbar-sub">${state.user ? state.user.name : ""}</div>
      </div>
      <button class="icon-btn" id="profileBtn">⚙</button>
    </header>
    <div class="net-indicator" id="netIndicator"></div>
    <div id="jobsList" class="job-list"></div>
    <button class="btn-primary fab" id="newAuditBtn">+ New Audit</button>
  `;
  root.appendChild(el);
  updateNetIndicator();
  renderJobsList();
  document.getElementById("profileBtn").onclick = () => { state.screen = "profile"; render(); };
  document.getElementById("newAuditBtn").onclick = () => {
    state.currentAudit = null;
    state.screen = "jobsetup";
    render();
  };
}

async function renderJobsList() {
  const listEl = document.getElementById("jobsList");
  const audits = await idbGetAll("audits");
  if (!audits.length) {
    listEl.innerHTML = `<div class="empty-state">No audits yet. Tap "+ New Audit" to start a GBT foundation check.</div>`;
    return;
  }
  listEl.innerHTML = audits.map(a => `
    <div class="job-card" data-id="${a.auditId}">
      <div class="job-card-top">
        <span class="job-site">${a.siteId || "Site — not set"}</span>
        <span class="badge badge-${a.status}">${a.status}</span>
      </div>
      <div class="job-meta">${a.auditType} · ${a.foundationType || ""} · ${a.legConfig || ""}</div>
      <div class="job-progress">
        <div class="job-progress-bar" style="width:${auditProgress(a)}%"></div>
      </div>
    </div>
  `).join("");
  listEl.querySelectorAll(".job-card").forEach(card => {
    card.onclick = async () => {
      state.currentAudit = await idbGet("audits", card.dataset.id);
      state.currentSectionIdx = 0;
      state.screen = "sectionlist";
      render();
    };
  });
}

function auditProgress(audit) {
  const sections = sectionsForAudit(audit);
  if (!sections.length) return 0;
  const done = sections.filter(s => (audit.sections[s.code] || {}).status === "complete").length;
  return Math.round((done / sections.length) * 100);
}

function updateNetIndicator() {
  const el = document.getElementById("netIndicator");
  if (!el) return;
  const online = navigator.onLine;
  el.textContent = online ? "● Online — sync active" : "● Offline — data saved on device";
  el.className = "net-indicator " + (online ? "online" : "offline");
}
window.addEventListener("online", updateNetIndicator);
window.addEventListener("offline", updateNetIndicator);

/* ---------- SCREEN: JOB SETUP (audit type, foundation, concrete, leg count) ---------- */
function renderJobSetup() {
  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <header class="topbar"><button class="icon-btn" id="backBtn">←</button><div class="topbar-title">New Audit — Setup</div></header>
    <div class="card">
      <label>Site ID</label>
      <input type="text" id="siteId" placeholder="e.g. BH-0512-NCR" required>

      <label>Tower Type</label>
      <select id="towerType">
        ${AUDIT_STRUCTURE.towerTypes.filter(t => t.active).map(t => `<option value="${t.code}">${t.label}</option>`).join("")}
      </select>

      <label>Audit Type</label>
      <select id="auditType">
        ${AUDIT_STRUCTURE.auditTypes.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}
      </select>

      <label>Foundation Type (from drawing)</label>
      <select id="foundationType">
        ${AUDIT_STRUCTURE.foundationTypes.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}
      </select>

      <label>Tower Leg Configuration</label>
      <select id="legConfig">
        ${AUDIT_STRUCTURE.legConfigs.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}
      </select>

      <div id="boltTypeWrap" style="display:none">
        <label>Bolt / Stub Type</label>
        <select id="boltType">
          ${AUDIT_STRUCTURE.boltTypes.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}
        </select>
      </div>

      <label>Concrete Type</label>
      <select id="concreteType">
        ${AUDIT_STRUCTURE.concreteTypes.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}
      </select>

      <button class="btn-primary" id="startAuditBtn">Start Audit</button>
    </div>
  `;
  root.appendChild(el);
  document.getElementById("backBtn").onclick = () => { state.screen = "myjobs"; render(); };
  const auditTypeSel = document.getElementById("auditType");
  const boltWrap = document.getElementById("boltTypeWrap");
  function toggleBolt() { boltWrap.style.display = auditTypeSel.value === "C2" ? "block" : "none"; }
  auditTypeSel.onchange = toggleBolt;
  toggleBolt();

  document.getElementById("startAuditBtn").onclick = async () => {
    const siteId = document.getElementById("siteId").value.trim();
    if (!siteId) { alert("Site ID is required."); return; }
    const gps = await getGPS();
    const audit = {
      auditId: "AUD-" + Date.now(),
      siteId,
      towerType: document.getElementById("towerType").value,
      auditType: auditTypeSel.value,
      foundationType: document.getElementById("foundationType").value,
      legConfig: document.getElementById("legConfig").value,
      boltType: auditTypeSel.value === "C2" ? document.getElementById("boltType").value : null,
      concreteType: document.getElementById("concreteType").value,
      auditorEmail: state.user ? state.user.email : "unknown",
      startGPS: gps,
      startedAt: new Date().toISOString(),
      status: "in_progress",
      sections: {}
    };
    await idbPut("audits", audit);
    state.currentAudit = audit;
    state.currentSectionIdx = 0;
    state.screen = "sectionlist";
    render();
  };
}

/* ---------- Helpers: which sections apply to this audit ---------- */
function sectionsForAudit(audit) {
  return AUDIT_STRUCTURE.sections.filter(s => s.appliesTo.includes(audit.auditType));
}

/* ---------- SCREEN: SECTION LIST ---------- */
function renderSectionList() {
  const audit = state.currentAudit;
  const sections = sectionsForAudit(audit);
  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <header class="topbar"><button class="icon-btn" id="backBtn">←</button>
      <div><div class="topbar-title">${audit.siteId}</div><div class="topbar-sub">${audit.auditType} · ${audit.foundationType}</div></div>
    </header>
    <div class="section-list" id="sectionListWrap"></div>
  `;
  root.appendChild(el);
  document.getElementById("backBtn").onclick = () => { state.screen = "myjobs"; render(); };

  const wrap = document.getElementById("sectionListWrap");
  wrap.innerHTML = sections.map((s, idx) => {
    const st = (audit.sections[s.code] || {}).status || "not_started";
    return `<div class="section-row" data-idx="${idx}">
      <span class="section-title">${s.title}</span>
      <span class="badge badge-${st}">${st.replace("_", " ")}</span>
    </div>`;
  }).join("");
  wrap.querySelectorAll(".section-row").forEach(row => {
    row.onclick = () => {
      state.currentSectionIdx = parseInt(row.dataset.idx, 10);
      state.screen = "sectionrunner";
      render();
    };
  });
}

/* ---------- SCREEN: SECTION RUNNER (the checklist form) ---------- */
function renderSectionRunner() {
  const audit = state.currentAudit;
  const sections = sectionsForAudit(audit);
  const section = sections[state.currentSectionIdx];
  if (!section) { state.screen = "sectionlist"; return render(); }

  const checkpoints = expandCheckpoints(section, audit);
  if (!audit.sections[section.code]) audit.sections[section.code] = { status: "in_progress", responses: {} };
  const secData = audit.sections[section.code];

  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <header class="topbar"><button class="icon-btn" id="backBtn">←</button>
      <div><div class="topbar-title">${section.title}</div><div class="topbar-sub">${audit.siteId}</div></div>
    </header>
    ${section.note ? `<div class="note-strip">${section.note}</div>` : ""}
    <div class="checkpoint-list" id="cpList"></div>
    <button class="btn-primary sticky-bottom" id="completeSectionBtn">Mark Section Complete</button>
  `;
  root.appendChild(el);
  document.getElementById("backBtn").onclick = () => { state.screen = "sectionlist"; render(); };

  const listEl = document.getElementById("cpList");
  checkpoints.forEach(cp => listEl.appendChild(renderCheckpoint(cp, secData, audit)));

  document.getElementById("completeSectionBtn").onclick = async () => {
    const missing = checkpoints.filter(cp => cp.photoRequired && !(secData.responses[cp.id] || {}).photo);
    if (missing.length) {
      alert("Missing required photos:\n" + missing.map(m => "• " + m.label).join("\n"));
      return;
    }
    secData.status = "complete";
    await idbPut("audits", audit);
    queueSync(audit);
    state.screen = "sectionlist";
    render();
  };
}

// Expand dynamic sections (Column Position, Shuttering per-leg) into concrete checkpoints
function expandCheckpoints(section, audit) {
  if (section.code === "COL") {
    const legCfg = AUDIT_STRUCTURE.legConfigs.find(l => l.code === audit.legConfig) || AUDIT_STRUCTURE.legConfigs[1];
    const pts = [];
    for (let i = 1; i <= legCfg.sides; i++) {
      pts.push({ id: `COL-SIDE-${i}`, label: `C/C measurement — Side ${i}`, type: "value", unit: "m", photoRequired: true });
    }
    for (let i = 1; i <= legCfg.diagonals; i++) {
      pts.push({ id: `COL-DIAG-${i}`, label: `Diagonal measurement — ${i}`, type: "value", unit: "m", photoRequired: true });
    }
    return pts;
  }
  if (section.code === "SHU") {
    const legCfg = AUDIT_STRUCTURE.legConfigs.find(l => l.code === audit.legConfig) || AUDIT_STRUCTURE.legConfigs[1];
    const legCount = legCfg.code === "3LEG" ? 3 : 4;
    const out = [];
    section.checkpoints.forEach(cp => {
      if (cp.perLeg) {
        for (let i = 1; i <= legCount; i++) {
          out.push({ ...cp, id: `${cp.id}-LEG${i}`, label: `${cp.label.replace(" (per leg)", "")} — Leg ${i}` });
        }
      } else {
        out.push(cp);
      }
    });
    return out;
  }
  return section.checkpoints;
}

function renderCheckpoint(cp, secData, audit) {
  const wrap = document.createElement("div");
  wrap.className = "checkpoint";
  const existing = secData.responses[cp.id] || {};

  let controlHtml = "";
  if (cp.type === "yesno") {
    controlHtml = `
      <div class="yesno-group" data-cp="${cp.id}">
        <button class="yn-btn ${existing.value === 'Yes' ? 'active-yes' : ''}" data-val="Yes">Yes</button>
        <button class="yn-btn ${existing.value === 'No' ? 'active-no' : ''}" data-val="No">No</button>
        <button class="yn-btn ${existing.value === 'NA' ? 'active-na' : ''}" data-val="NA">NA</button>
      </div>`;
  } else if (cp.type === "select") {
    controlHtml = `<select class="cp-select" data-cp="${cp.id}">
      <option value="">Select...</option>
      ${cp.options.map(o => `<option value="${o}" ${existing.value === o ? "selected" : ""}>${o}</option>`).join("")}
    </select>`;
  } else if (cp.type === "value") {
    controlHtml = `<input class="cp-value" data-cp="${cp.id}" type="text" placeholder="${cp.unit ? 'Value in ' + cp.unit : 'Enter value'}" value="${existing.value || ""}">`;
  } else if (cp.type === "silt_test") {
    controlHtml = `<div class="silt-widget" data-cp="${cp.id}"></div>`;
  }
  // photo type / photoRequired always gets a photo button
  const needsPhotoBtn = cp.type === "photo" || cp.photoRequired;

  wrap.innerHTML = `
    <div class="cp-label">${cp.label}${cp.photoRequired ? ' <span class="req">●</span>' : ''}</div>
    ${controlHtml}
    ${needsPhotoBtn ? `
      <div class="photo-row">
        <button class="btn-photo" data-cp="${cp.id}">${existing.photo ? "📷 Retake Photo" : "📷 Take Photo"}</button>
        <span class="photo-status">${existing.photo ? "✓ Captured · GPS " + (existing.gps ? "tagged" : "unavailable") : ""}</span>
      </div>
      <input type="file" accept="image/*" capture="environment" class="hidden-file-input" data-cp="${cp.id}">
      ${existing.photo ? `<img class="photo-preview" src="${existing.photo}">` : ""}
    ` : ""}
  `;

  // yes/no handlers
  wrap.querySelectorAll(".yn-btn").forEach(btn => {
    btn.onclick = async () => {
      secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), value: btn.dataset.val };
      await idbPut("audits", audit);
      renderSectionRunner();
    };
  });
  const selectEl = wrap.querySelector(".cp-select");
  if (selectEl) selectEl.onchange = async () => {
    secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), value: selectEl.value };
    await idbPut("audits", audit);
  };
  const valueEl = wrap.querySelector(".cp-value");
  if (valueEl) valueEl.onblur = async () => {
    secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), value: valueEl.value };
    await idbPut("audits", audit);
  };

  // photo handler — camera-only capture
  const photoBtn = wrap.querySelector(".btn-photo");
  const fileInput = wrap.querySelector(".hidden-file-input");
  if (photoBtn && fileInput) {
    photoBtn.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      const gps = await getGPS();
      secData.responses[cp.id] = {
        ...(secData.responses[cp.id] || {}),
        photo: dataUrl,
        gps,
        capturedAt: new Date().toISOString()
      };
      await idbPut("audits", audit);
      renderSectionRunner();
    };
  }

  // silt test widget
  const siltWrap = wrap.querySelector(".silt-widget");
  if (siltWrap) mountSiltWidget(siltWrap, cp, secData, audit);

  return wrap;
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/* ---------- Silt Test 60-minute lock widget ---------- */
function mountSiltWidget(container, cp, secData, audit) {
  const existing = secData.responses[cp.id] || {};
  function draw() {
    const startedAt = existing.siltStartedAt ? new Date(existing.siltStartedAt).getTime() : null;
    const now = Date.now();
    const elapsedMs = startedAt ? now - startedAt : 0;
    const totalMs = (cp.siltTimerMinutes || 60) * 60 * 1000;
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const unlocked = startedAt && remainingMs <= 0;

    if (!startedAt) {
      container.innerHTML = `
        <div class="silt-box">
          <p>Shake the marked glass, then tap Start Timer. Photo slot unlocks after 60 minutes — cannot be taken early.</p>
          <button class="btn-secondary" id="startSiltBtn">Start Timer</button>
        </div>`;
      container.querySelector("#startSiltBtn").onclick = async () => {
        existing.siltStartedAt = new Date().toISOString();
        secData.responses[cp.id] = existing;
        await idbPut("audits", audit);
        draw();
      };
    } else if (!unlocked) {
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      container.innerHTML = `
        <div class="silt-box locked">
          <p>⏱ Settling in progress — ${mins}m ${secs}s remaining</p>
          <p class="muted small">Photo unlocks automatically at 60 minutes.</p>
        </div>`;
      clearTimeout(container._t);
      container._t = setTimeout(draw, 1000);
    } else {
      container.innerHTML = `
        <div class="silt-box ready">
          <p>✅ 60 minutes elapsed — capture the silt layer photo now.</p>
          <p class="muted small">Ensure reference mark is visible. Both layers must be clearly visible.</p>
          <button class="btn-photo" id="siltPhotoBtn">${existing.photo ? "📷 Retake Photo" : "📷 Take Photo Now"}</button>
          <input type="file" accept="image/*" capture="environment" class="hidden-file-input" id="siltPhotoInput">
          ${existing.photo ? `<img class="photo-preview" src="${existing.photo}">` : ""}
        </div>`;
      container.querySelector("#siltPhotoBtn").onclick = () => container.querySelector("#siltPhotoInput").click();
      container.querySelector("#siltPhotoInput").onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const dataUrl = await fileToDataUrl(file);
        const gps = await getGPS();
        existing.photo = dataUrl;
        existing.gps = gps;
        existing.capturedAt = new Date().toISOString();
        secData.responses[cp.id] = existing;
        await idbPut("audits", audit);
        renderSectionRunner();
      };
    }
  }
  draw();
}

/* ---------- SCREEN: PROFILE ---------- */
function renderProfile() {
  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <header class="topbar"><button class="icon-btn" id="backBtn">←</button><div class="topbar-title">Profile</div></header>
    <div class="card">
      <p><strong>${state.user ? state.user.name : ""}</strong></p>
      <p class="muted">${state.user ? state.user.email : ""}</p>
      <div id="syncStatus" class="note-strip"></div>
      <button class="btn-secondary" id="syncNowBtn">Sync Now</button>
      <button class="btn-danger" id="logoutBtn">Sign Out</button>
    </div>
  `;
  root.appendChild(el);
  document.getElementById("backBtn").onclick = () => { state.screen = "myjobs"; render(); };
  document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("qtel_user");
    state.user = null;
    state.screen = "login";
    render();
  };
  refreshSyncStatus();
  document.getElementById("syncNowBtn").onclick = async () => { await trySync(); refreshSyncStatus(); };
}

async function refreshSyncStatus() {
  const el = document.getElementById("syncStatus");
  if (!el) return;
  const queue = await idbGetAll("syncQueue");
  el.textContent = queue.length ? `${queue.length} item(s) waiting to sync` : "All data synced";
}

/* ---------- SYNC (offline queue → n8n webhook → Airtable) ---------- */
async function queueSync(audit) {
  await idbPut("syncQueue", { id: audit.auditId + "-" + Date.now(), auditId: audit.auditId, queuedAt: new Date().toISOString() });
  if (navigator.onLine) trySync();
}

async function trySync() {
  if (!navigator.onLine) return;
  const queue = await idbGetAll("syncQueue");
  for (const item of queue) {
    const audit = await idbGet("audits", item.auditId);
    if (!audit) continue;
    try {
      await fetch(SYNC_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(audit)
      });
      const tx = db.transaction("syncQueue", "readwrite");
      tx.objectStore("syncQueue").delete(item.id);
    } catch (err) {
      console.warn("Sync failed, will retry later:", err);
      break;
    }
  }
}
window.addEventListener("online", trySync);

/* ---------- INIT ---------- */
async function init() {
  await openDB();
  const savedUser = localStorage.getItem("qtel_user");
  if (savedUser) {
    state.user = JSON.parse(savedUser);
    state.screen = "myjobs";
  }
  render();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  setInterval(trySync, 60000); // background retry every minute
}

init();
