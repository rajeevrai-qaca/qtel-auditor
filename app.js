/* ============================================================
   Q-TEL AUDITOR PWA v2.1 — APP LOGIC
   Vanilla JS. No build step. No framework.

   FIXES IN THIS VERSION:
   - Root cause of "questions repeat many times" / "can't tap
     Yes/No/NA": event handlers were calling renderSectionRunner()
     directly, which appends a fresh screen WITHOUT clearing the
     old one. Every render now goes through render(), which
     always clears #app first.
   - GPS is now visibly burned onto every captured photo (lat,
     long, timestamp, Site ID) via a canvas overlay, not just
     stored as invisible metadata.
   - Checkpoint engine extended: dualvalue (auto Ok/Not Ok),
     count (minimum threshold), time_photo, conditional photo
     requirements, and showIf conditional display.
   ============================================================ */

/* ---------- CONFIG YOU MUST SET ---------- */
const SYNC_WEBHOOK_URL = "https://YOUR-N8N-INSTANCE/webhook/qtel-audit-sync";

/* ---------- STATE ---------- */
const state = {
  screen: "login",
  user: null,
  currentAudit: null,
  currentSectionIdx: 0,
  scrollY: 0
};

/* ---------- IndexedDB ---------- */
const DB_NAME = "qtel_db";
const DB_VERSION = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains("audits")) database.createObjectStore("audits", { keyPath: "auditId" });
      if (!database.objectStoreNames.contains("syncQueue")) database.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true });
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
function fmtGPS(gps) {
  if (!gps) return "GPS unavailable";
  return `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)} (+/-${Math.round(gps.accuracy || 0)}m)`;
}

/* ---------- Photo capture + visible GPS/time stamp burn-in ---------- */
function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function stampPhoto(dataUrl, gps, siteId) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const barHeight = Math.max(64, Math.round(img.height * 0.09));
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      ctx.fillRect(0, img.height - barHeight, img.width, barHeight);

      const now = new Date();
      const dateStr = now.toLocaleString("en-IN", { hour12: false });
      const gpsStr = gps ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)} (+/-${Math.round(gps.accuracy || 0)}m)` : "GPS unavailable";

      const fontSize = Math.max(14, Math.round(img.width * 0.022));
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textBaseline = "middle";
      const line1Y = img.height - barHeight + barHeight * 0.32;
      const line2Y = img.height - barHeight + barHeight * 0.68;
      const pad = Math.round(img.width * 0.02);
      ctx.fillText(`${siteId || "Site not set"}  |  ${dateStr}`, pad, line1Y);
      ctx.fillText(`GPS: ${gpsStr}`, pad, line2Y);

      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function capturePhotoStamped(file, siteId) {
  const rawDataUrl = await fileToDataUrl(file);
  const gps = await getGPS();
  const stamped = await stampPhoto(rawDataUrl, gps, siteId);
  return { photo: stamped, gps, capturedAt: new Date().toISOString() };
}

/* ---------- ROUTER ---------- */
const root = document.getElementById("app");

function render() {
  root.innerHTML = "";
  switch (state.screen) {
    case "login": renderLogin(); break;
    case "myjobs": renderMyJobs(); break;
    case "jobsetup": renderJobSetup(); break;
    case "sectionlist": renderSectionList(); break;
    case "sectionrunner": renderSectionRunner(); break;
    case "profile": renderProfile(); break;
    default: renderLogin();
  }
  if (state.screen === "sectionrunner") root.scrollTop = state.scrollY || 0;
}

function goTo(screen) { state.screen = screen; render(); }

function refreshSectionRunner() {
  state.scrollY = root.scrollTop;
  render();
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
      <input type="password" id="loginPassword" required placeholder="********" autocomplete="current-password">
      <button type="submit" class="btn-primary">Sign In</button>
      <p class="muted small">Auth wiring TODO — accepts any credentials for testing.</p>
    </form>
  `;
  root.appendChild(el);
  document.getElementById("loginForm").onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    state.user = { email, name: email.split("@")[0] };
    localStorage.setItem("qtel_user", JSON.stringify(state.user));
    goTo("myjobs");
  };
}

/* ---------- SCREEN: MY JOBS ---------- */
function renderMyJobs() {
  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <header class="topbar">
      <div><div class="topbar-title">My Jobs</div><div class="topbar-sub">${state.user ? state.user.name : ""}</div></div>
      <button class="icon-btn" id="profileBtn">&#9881;</button>
    </header>
    <div class="net-indicator" id="netIndicator"></div>
    <div id="jobsList" class="job-list"></div>
    <button class="btn-primary fab" id="newAuditBtn">+ New Audit</button>
  `;
  root.appendChild(el);
  updateNetIndicator();
  renderJobsList();
  document.getElementById("profileBtn").onclick = () => goTo("profile");
  document.getElementById("newAuditBtn").onclick = () => { state.currentAudit = null; goTo("jobsetup"); };
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
        <span class="badge badge-${a.status}">${a.status.replace("_", " ")}</span>
      </div>
      <div class="job-meta">${a.auditType} &middot; ${labelFor(AUDIT_STRUCTURE.foundationTypes, a.foundationType)} &middot; ${labelFor(AUDIT_STRUCTURE.legConfigs, a.legConfig)}</div>
      <div class="job-progress"><div class="job-progress-bar" style="width:${auditProgress(a)}%"></div></div>
    </div>
  `).join("");
  listEl.querySelectorAll(".job-card").forEach(card => {
    card.onclick = async () => {
      state.currentAudit = await idbGet("audits", card.dataset.id);
      state.currentSectionIdx = 0;
      goTo("sectionlist");
    };
  });
}

function labelFor(list, code) {
  const item = list.find(x => x.code === code);
  return item ? item.label : (code || "");
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
  el.textContent = online ? "Online — sync active" : "Offline — data saved on device";
  el.className = "net-indicator " + (online ? "online" : "offline");
}
window.addEventListener("online", updateNetIndicator);
window.addEventListener("offline", updateNetIndicator);

/* ---------- SCREEN: JOB SETUP ---------- */
function renderJobSetup() {
  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <header class="topbar"><button class="icon-btn" id="backBtn">&larr;</button><div class="topbar-title">New Audit — Setup</div></header>
    <div class="card">
      <label>Site ID</label>
      <input type="text" id="siteId" placeholder="e.g. BH-0512-NCR" required>

      <label>Tower Type</label>
      <select id="towerType">${AUDIT_STRUCTURE.towerTypes.filter(t => t.active).map(t => `<option value="${t.code}">${t.label}</option>`).join("")}</select>

      <label>Audit Type</label>
      <select id="auditType">${AUDIT_STRUCTURE.auditTypes.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}</select>

      <label>Foundation Type (from drawing)</label>
      <select id="foundationType">${AUDIT_STRUCTURE.foundationTypes.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}</select>

      <label>Tower Leg Configuration</label>
      <select id="legConfig">${AUDIT_STRUCTURE.legConfigs.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}</select>

      <label>Concrete Type</label>
      <select id="concreteType">${AUDIT_STRUCTURE.concreteTypes.map(t => `<option value="${t.code}">${t.label}</option>`).join("")}</select>

      <p class="muted small">Bolt/stub type (Anchor Bolts vs CIP Stub) is chosen at the start of Section 9, not here.</p>
      <button class="btn-primary" id="startAuditBtn">Start Audit</button>
    </div>
  `;
  root.appendChild(el);
  document.getElementById("backBtn").onclick = () => goTo("myjobs");

  document.getElementById("startAuditBtn").onclick = async () => {
    const siteId = document.getElementById("siteId").value.trim();
    if (!siteId) { alert("Site ID is required."); return; }
    const auditType = document.getElementById("auditType").value;
    const gps = await getGPS();
    const audit = {
      auditId: "AUD-" + Date.now(),
      siteId,
      towerType: document.getElementById("towerType").value,
      auditType,
      foundationType: document.getElementById("foundationType").value,
      legConfig: document.getElementById("legConfig").value,
      boltType: null,
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
    goTo("sectionlist");
  };
}

function sectionsForAudit(audit) {
  if (audit.auditType !== "C1") return [];
  return AUDIT_STRUCTURE.sections.filter(s => s.appliesTo.includes(audit.auditType));
}

/* ---------- SCREEN: SECTION LIST ---------- */
function renderSectionList() {
  const audit = state.currentAudit;
  const el = document.createElement("div");
  el.className = "screen";

  if (audit.auditType !== "C1") {
    el.innerHTML = `
      <header class="topbar"><button class="icon-btn" id="backBtn">&larr;</button><div class="topbar-title">${audit.siteId}</div></header>
      <div class="empty-state">C2 checklist has not been configured yet — that session is still pending. This audit is saved and will pick up automatically once C2 is built.</div>
    `;
    root.appendChild(el);
    document.getElementById("backBtn").onclick = () => goTo("myjobs");
    return;
  }

  const sections = sectionsForAudit(audit);
  el.innerHTML = `
    <header class="topbar"><button class="icon-btn" id="backBtn">&larr;</button>
      <div><div class="topbar-title">${audit.siteId}</div><div class="topbar-sub">${audit.auditType} &middot; ${labelFor(AUDIT_STRUCTURE.foundationTypes, audit.foundationType)}</div></div>
    </header>
    <div class="section-list" id="sectionListWrap"></div>
  `;
  root.appendChild(el);
  document.getElementById("backBtn").onclick = () => goTo("myjobs");

  const wrap = document.getElementById("sectionListWrap");
  wrap.innerHTML = sections.map((s, idx) => {
    const st = (audit.sections[s.code] || {}).status || "not_started";
    const draftTag = s.status && s.status.startsWith("DRAFT") ? '<span class="draft-tag">DRAFT</span>' : "";
    return `<div class="section-row" data-idx="${idx}">
      <span class="section-title">${s.title} ${draftTag}</span>
      <span class="badge badge-${st}">${st.replace("_", " ")}</span>
    </div>`;
  }).join("");
  wrap.querySelectorAll(".section-row").forEach(row => {
    row.onclick = () => {
      state.currentSectionIdx = parseInt(row.dataset.idx, 10);
      state.scrollY = 0;
      goTo("sectionrunner");
    };
  });
}

/* ---------- SCREEN: SECTION RUNNER ---------- */
function renderSectionRunner() {
  const audit = state.currentAudit;
  const sections = sectionsForAudit(audit);
  const section = sections[state.currentSectionIdx];
  if (!section) { goTo("sectionlist"); return; }

  if (!audit.sections[section.code]) audit.sections[section.code] = { status: "in_progress", responses: {} };
  const secData = audit.sections[section.code];

  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <header class="topbar"><button class="icon-btn" id="backBtn">&larr;</button>
      <div><div class="topbar-title">${section.title}</div><div class="topbar-sub">${audit.siteId}</div></div>
    </header>
    ${section.status ? `<div class="note-strip ${section.status.startsWith('DRAFT') ? 'note-draft' : ''}">${section.status}</div>` : ""}
    <div class="checkpoint-list" id="cpList"></div>
    <button class="btn-primary sticky-bottom" id="completeSectionBtn">Mark Section Complete</button>
  `;
  root.appendChild(el);
  document.getElementById("backBtn").onclick = () => goTo("sectionlist");

  const checkpoints = expandCheckpoints(section, audit);
  const listEl = document.getElementById("cpList");

  if (section.code === "BOLT" && !audit.boltType) {
    listEl.innerHTML = `
      <div class="checkpoint">
        <div class="cp-label">Select bolt / stub type to begin this section</div>
        <div class="yesno-group">
          ${AUDIT_STRUCTURE.boltTypes.map(bt => `<button class="yn-btn" data-bolt="${bt.code}">${bt.label}</button>`).join("")}
        </div>
      </div>`;
    listEl.querySelectorAll("[data-bolt]").forEach(btn => {
      btn.onclick = async () => {
        audit.boltType = btn.dataset.bolt;
        await idbPut("audits", audit);
        refreshSectionRunner();
      };
    });
    document.getElementById("completeSectionBtn").style.display = "none";
    return;
  }

  checkpoints.forEach(cp => listEl.appendChild(renderCheckpoint(cp, secData, audit)));

  document.getElementById("completeSectionBtn").onclick = async () => {
    const missing = checkpoints.filter(cp => isPhotoRequired(cp, secData.responses[cp.id]) && !(secData.responses[cp.id] || {}).photo);
    if (missing.length) {
      alert("Missing required photos:\n" + missing.map(m => "- " + m.label).join("\n"));
      return;
    }
    secData.status = "complete";
    await idbPut("audits", audit);
    queueSync(audit);
    goTo("sectionlist");
  };
}

function isPhotoRequired(cp, response) {
  if (cp.photoRequired) return true;
  if (cp.photoRequiredIf && response && cp.photoRequiredIf.includes(response.value)) return true;
  if (cp.photoRequiredIfBelowMin && response && typeof response.count === "number" && response.count < cp.min) return true;
  return false;
}

function checkpointApplies(cp, audit) {
  if (!cp.showIf) return true;
  return audit[cp.showIf.field] === cp.showIf.equals;
}

function expandCheckpoints(section, audit) {
  const legCfg = AUDIT_STRUCTURE.legConfigs.find(l => l.code === audit.legConfig) || AUDIT_STRUCTURE.legConfigs[1];
  const legCount = legCfg.code === "3LEG" ? 3 : 4;

  let base = section.checkpoints;
  if (section.code === "BOLT") {
    base = audit.boltType === "ANCHOR" ? section.checkpointsAnchor
         : audit.boltType === "CIP_STUB" ? section.checkpointsCIP
         : [];
  }

  const out = [];
  base.forEach(cp => {
    if (!checkpointApplies(cp, audit)) return;
    if (cp.perLeg) {
      for (let i = 1; i <= legCount; i++) {
        out.push({ ...cp, id: `${cp.id}-LEG${i}`, label: `${cp.label} — Leg ${i}` });
      }
    } else {
      out.push(cp);
    }
  });
  return out;
}

function evaluateDualValue(cp, a, b) {
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb)) return null;
  const rule = cp.compare.rule;
  if (rule === "b_gte_a") return nb >= na;
  if (rule === "b_lte_a") return nb <= na;
  if (rule === "a_gte_b") return na >= nb;
  if (rule === "match") return Math.abs(na - nb) < 0.001;
  if (rule === "tolerance") return Math.abs(na - nb) <= (cp.compare.tolerance || 0);
  return null;
}

function renderCheckpoint(cp, secData, audit) {
  const wrap = document.createElement("div");
  wrap.className = "checkpoint";
  const existing = secData.responses[cp.id] || {};

  let controlHtml = "";

  if (cp.type === "yesno") {
    const opts = cp.options || ["Yes", "No", "NA"];
    controlHtml = `<div class="yesno-group" data-cp="${cp.id}">
      ${opts.map(o => `<button class="yn-btn ${existing.value === o ? activeClassFor(o) : ''}" data-val="${o}">${o}</button>`).join("")}
    </div>`;
  } else if (cp.type === "select") {
    controlHtml = `<select class="cp-select" data-cp="${cp.id}">
      <option value="">Select...</option>
      ${cp.options.map(o => `<option value="${o}" ${existing.value === o ? "selected" : ""}>${o}</option>`).join("")}
    </select>`;
  } else if (cp.type === "value") {
    let val = existing.value || "";
    if (cp.readOnlyFrom === "concreteTypeCategory") {
      const ct = AUDIT_STRUCTURE.concreteTypes.find(c => c.code === audit.concreteType);
      val = ct ? (ct.isRMC ? "RMC" : "Site Mix") : "";
      controlHtml = `<input class="cp-value" data-cp="${cp.id}" type="text" value="${val}" readonly>`;
    } else {
      controlHtml = `<input class="cp-value" data-cp="${cp.id}" type="text" placeholder="${cp.unit ? 'Value in ' + cp.unit : 'Enter value'}" value="${val}">`;
    }
  } else if (cp.type === "count") {
    const count = typeof existing.count === "number" ? existing.count : 0;
    const ok = count >= cp.min;
    controlHtml = `
      <div class="count-widget" data-cp="${cp.id}">
        <button class="count-btn" data-delta="-1">-</button>
        <span class="count-value">${count}</span>
        <button class="count-btn" data-delta="1">+</button>
        <span class="badge ${ok ? 'badge-complete' : 'badge-not_started'}">${ok ? 'Ok (min ' + cp.min + ')' : 'Below min ' + cp.min}</span>
      </div>`;
  } else if (cp.type === "dualvalue") {
    const a = existing.a || "", b = existing.b || "";
    const result = evaluateDualValue(cp, a, b);
    controlHtml = `
      <div class="dualvalue-widget" data-cp="${cp.id}">
        <div class="dv-row"><label class="dv-label">${cp.labelA}</label><input class="dv-input" data-part="a" type="number" step="any" value="${a}" placeholder="${cp.unit || ''}"></div>
        <div class="dv-row"><label class="dv-label">${cp.labelB}</label><input class="dv-input" data-part="b" type="number" step="any" value="${b}" placeholder="${cp.unit || ''}"></div>
        <div class="dv-result">${result === null ? '' : (result ? '<span class="badge badge-complete">Ok</span>' : '<span class="badge badge-notok">Not Ok</span>')} <span class="muted small">${cp.compare.note}</span></div>
      </div>`;
  } else if (cp.type === "time_photo") {
    controlHtml = `<input class="cp-value" data-cp="${cp.id}" type="time" value="${existing.time || ""}">`;
  } else if (cp.type === "silt_test") {
    controlHtml = `<div class="silt-widget" data-cp="${cp.id}"></div>`;
  }

  const needsPhotoBtn = cp.type === "photo" || cp.type === "time_photo" || isPhotoRequired(cp, existing) || cp.photoRequiredIf || cp.photoRequiredIfBelowMin;
  const reqNow = isPhotoRequired(cp, existing);

  wrap.innerHTML = `
    <div class="cp-label">${cp.label}${reqNow ? ' <span class="req">&#9679;</span>' : ''}</div>
    ${controlHtml}
    ${needsPhotoBtn ? `
      <div class="photo-row">
        <button class="btn-photo" data-cp="${cp.id}">${existing.photo ? "Retake Photo" : "Take Photo"}</button>
        <span class="photo-status">${existing.photo ? "Captured " + (existing.capturedAt ? new Date(existing.capturedAt).toLocaleTimeString() : "") : ""}</span>
      </div>
      <input type="file" accept="image/*" capture="environment" class="hidden-file-input" data-cp="${cp.id}">
      ${existing.photo ? `<img class="photo-preview" src="${existing.photo}">` : ""}
      ${existing.gps ? `<div class="gps-line muted small">GPS: ${fmtGPS(existing.gps)}</div>` : ""}
    ` : ""}
  `;

  wrap.querySelectorAll(".yn-btn").forEach(btn => {
    btn.onclick = async () => {
      secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), value: btn.dataset.val };
      await idbPut("audits", audit);
      refreshSectionRunner();
    };
  });
  const selectEl = wrap.querySelector(".cp-select");
  if (selectEl) selectEl.onchange = async () => {
    secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), value: selectEl.value };
    await idbPut("audits", audit);
    refreshSectionRunner();
  };
  const valueEl = wrap.querySelector(".cp-value:not([readonly])");
  if (valueEl) valueEl.onblur = async () => {
    const key = cp.type === "time_photo" ? "time" : "value";
    secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), [key]: valueEl.value };
    await idbPut("audits", audit);
  };
  const countWidget = wrap.querySelector(".count-widget");
  if (countWidget) {
    countWidget.querySelectorAll(".count-btn").forEach(btn => {
      btn.onclick = async () => {
        const current = (secData.responses[cp.id] || {}).count || 0;
        const next = Math.max(0, current + parseInt(btn.dataset.delta, 10));
        secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), count: next };
        await idbPut("audits", audit);
        refreshSectionRunner();
      };
    });
  }
  const dvWidget = wrap.querySelector(".dualvalue-widget");
  if (dvWidget) {
    dvWidget.querySelectorAll(".dv-input").forEach(input => {
      input.onblur = async () => {
        const a = dvWidget.querySelector('[data-part="a"]').value;
        const b = dvWidget.querySelector('[data-part="b"]').value;
        secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), a, b };
        await idbPut("audits", audit);
        refreshSectionRunner();
      };
    });
  }
  const photoBtn = wrap.querySelector(".btn-photo");
  const fileInput = wrap.querySelector(".hidden-file-input");
  if (photoBtn && fileInput) {
    photoBtn.onclick = () => fileInput.click();
    fileInput.onchange = async () => {
      const file = fileInput.files[0];
      if (!file) return;
      photoBtn.textContent = "Processing...";
      const captured = await capturePhotoStamped(file, audit.siteId);
      secData.responses[cp.id] = { ...(secData.responses[cp.id] || {}), ...captured };
      await idbPut("audits", audit);
      refreshSectionRunner();
    };
  }
  const siltWrap = wrap.querySelector(".silt-widget");
  if (siltWrap) mountSiltWidget(siltWrap, cp, secData, audit);

  return wrap;
}

function activeClassFor(val) {
  if (val === "Yes" || val === "Ok" || val === "Confirmed") return "active-yes";
  if (val === "No" || val === "Not Ok" || val === "Rain" || val === "Rain present") return "active-no";
  return "active-na";
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
      container.innerHTML = `<div class="silt-box"><p>Shake the marked glass, then tap Start Timer. Photo slot unlocks after 60 minutes.</p><button class="btn-secondary" id="startSiltBtn">Start Timer</button></div>`;
      container.querySelector("#startSiltBtn").onclick = async () => {
        existing.siltStartedAt = new Date().toISOString();
        secData.responses[cp.id] = existing;
        await idbPut("audits", audit);
        draw();
      };
    } else if (!unlocked) {
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      container.innerHTML = `<div class="silt-box locked"><p>Settling in progress — ${mins}m ${secs}s remaining</p><p class="muted small">Photo unlocks automatically at 60 minutes.</p></div>`;
      clearTimeout(container._t);
      container._t = setTimeout(draw, 1000);
    } else {
      container.innerHTML = `
        <div class="silt-box ready">
          <p>60 minutes elapsed — capture the silt layer photo now.</p>
          <p class="muted small">Ensure reference mark is visible. Both layers must be clearly visible.</p>
          <button class="btn-photo" id="siltPhotoBtn">${existing.photo ? "Retake Photo" : "Take Photo Now"}</button>
          <input type="file" accept="image/*" capture="environment" class="hidden-file-input" id="siltPhotoInput">
          ${existing.photo ? `<img class="photo-preview" src="${existing.photo}">` : ""}
          ${existing.gps ? `<div class="gps-line muted small">GPS: ${fmtGPS(existing.gps)}</div>` : ""}
        </div>`;
      container.querySelector("#siltPhotoBtn").onclick = () => container.querySelector("#siltPhotoInput").click();
      container.querySelector("#siltPhotoInput").onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const captured = await capturePhotoStamped(file, audit.siteId);
        Object.assign(existing, captured);
        secData.responses[cp.id] = existing;
        await idbPut("audits", audit);
        refreshSectionRunner();
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
    <header class="topbar"><button class="icon-btn" id="backBtn">&larr;</button><div class="topbar-title">Profile</div></header>
    <div class="card">
      <p><strong>${state.user ? state.user.name : ""}</strong></p>
      <p class="muted">${state.user ? state.user.email : ""}</p>
      <div id="syncStatus" class="note-strip"></div>
      <button class="btn-secondary" id="syncNowBtn">Sync Now</button>
      <button class="btn-danger" id="logoutBtn">Sign Out</button>
    </div>
  `;
  root.appendChild(el);
  document.getElementById("backBtn").onclick = () => goTo("myjobs");
  document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("qtel_user");
    state.user = null;
    goTo("login");
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

/* ---------- SYNC ---------- */
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
      await fetch(SYNC_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(audit) });
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
  if (savedUser) { state.user = JSON.parse(savedUser); state.screen = "myjobs"; }
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  setInterval(trySync, 60000);
}
init();
