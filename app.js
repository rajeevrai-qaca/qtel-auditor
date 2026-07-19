// Q-Tel Auditor PWA v3.0 — App Logic
// Vanilla JS, no build step, no framework. Matches the "no external developer"
// build principle — every function here is deliberately simple to read/edit.

const DB_NAME = "qtel_auditor_v3";
const DB_VERSION = 1;
let db;

const state = {
  job: null,          // { jobId, siteName, elementType, concreteGrade, createdAt }
  currentModule: null,
  currentSlotId: null,
  gpsWatchId: null,
  lastPosition: null,
  stream: null,
};

// ---------- IndexedDB ----------
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains("jobs")) {
        database.createObjectStore("jobs", { keyPath: "jobId" });
      }
      if (!database.objectStoreNames.contains("photos")) {
        const store = database.createObjectStore("photos", { keyPath: "photoId" });
        store.createIndex("jobId", "jobId");
        store.createIndex("status", "status");
      }
      if (!database.objectStoreNames.contains("modules")) {
        const store = database.createObjectStore("modules", { keyPath: "moduleRecordId" });
        store.createIndex("jobId", "jobId");
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e);
  });
}

function tx(storeName, mode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function dbPut(storeName, value) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName, "readwrite").put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = (e) => reject(e);
  });
}

function dbGetAll(storeName, indexName, query) {
  return new Promise((resolve, reject) => {
    const store = tx(storeName);
    const source = indexName ? store.index(indexName) : store;
    const req = query ? source.getAll(query) : source.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

function dbGet(storeName, key) {
  return new Promise((resolve, reject) => {
    const req = tx(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

// ---------- GPS ----------
function startGPSWatch() {
  if (!navigator.geolocation) return;
  state.gpsWatchId = navigator.geolocation.watchPosition(
    (pos) => { state.lastPosition = pos; updateGPSChip(); },
    (err) => console.warn("GPS error", err),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

function updateGPSChip() {
  const chip = document.getElementById("gps-chip");
  if (!chip) return;
  if (!state.lastPosition) { chip.textContent = "Acquiring GPS…"; return; }
  const { latitude, longitude, accuracy } = state.lastPosition.coords;
  chip.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}  ±${Math.round(accuracy)}m  ${new Date().toLocaleString()}`;
}

// ---------- Camera + watermark burn ----------
async function openCamera() {
  const video = document.getElementById("camera-stream");
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    video.srcObject = state.stream;
    await video.play();
  } catch (err) {
    alert("Camera access failed: " + err.message + "\nCheck browser camera permission.");
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((t) => t.stop());
    state.stream = null;
  }
}

// Burns GPS + timestamp text directly into the photo pixels (not EXIF —
// EXIF can be stripped in transit; a burned-in overlay cannot).
function capturePhotoWithWatermark() {
  const video = document.getElementById("camera-stream");
  const canvas = document.getElementById("capture-canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const now = new Date();
  const gpsText = state.lastPosition
    ? `${state.lastPosition.coords.latitude.toFixed(6)}, ${state.lastPosition.coords.longitude.toFixed(6)} ±${Math.round(state.lastPosition.coords.accuracy)}m`
    : "GPS unavailable";
  const line1 = `${state.job.siteName}  |  ${state.currentModule.code}-${state.currentSlotId}`;
  const line2 = `${gpsText}  |  ${now.toLocaleString()}`;

  const barHeight = Math.round(canvas.height * 0.09);
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
  ctx.fillStyle = "#ffffff";
  const fontSize = Math.max(14, Math.round(canvas.width * 0.024));
  ctx.font = `600 ${fontSize}px monospace`;
  ctx.textBaseline = "middle";
  ctx.fillText(line1, 10, canvas.height - barHeight * 0.62);
  ctx.fillText(line2, 10, canvas.height - barHeight * 0.24);

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    gps: state.lastPosition ? {
      lat: state.lastPosition.coords.latitude,
      lng: state.lastPosition.coords.longitude,
      accuracy: state.lastPosition.coords.accuracy,
    } : null,
    capturedAt: now.toISOString(),
  };
}

// ---------- Sync queue ----------
async function queuePhotoForSync(photoRecord) {
  photoRecord.status = "queued";
  await dbPut("photos", photoRecord);
  attemptSync();
}

async function attemptSync() {
  updateSyncBar();
  if (!navigator.onLine) return;
  if (!QTEL_CONFIG.N8N_WEBHOOK_URL || QTEL_CONFIG.N8N_WEBHOOK_URL.startsWith("REPLACE")) {
    console.warn("n8n webhook URL not configured yet — photos stay queued locally.");
    return;
  }
  const queued = await dbGetAll("photos", "status", "queued");
  for (const photo of queued) {
    try {
      const res = await fetch(QTEL_CONFIG.N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photo),
      });
      if (res.ok) {
        photo.status = "submitted";
        photo.submittedAt = new Date().toISOString();
        await dbPut("photos", photo);
      }
    } catch (err) {
      console.warn("Sync failed, will retry:", err.message);
      break; // stop trying further items until back online
    }
  }
  updateSyncBar();
  renderCurrentView();
}

async function updateSyncBar() {
  const bar = document.getElementById("sync-bar");
  const dot = document.getElementById("sync-dot");
  const msg = document.getElementById("sync-msg");
  const queued = state.job ? await dbGetAll("photos", "jobId", state.job.jobId) : [];
  const pendingCount = queued.filter((p) => p.status === "queued").length;
  dot.className = "dot " + (navigator.onLine ? "online" : "offline");
  if (!navigator.onLine) {
    msg.textContent = pendingCount > 0
      ? `Offline — ${pendingCount} photo(s) saved locally, will sync when back online`
      : "Offline — data saves locally";
  } else if (pendingCount > 0) {
    msg.textContent = `Syncing ${pendingCount} photo(s)…`;
  } else {
    msg.textContent = "All data synced";
  }
}

window.addEventListener("online", attemptSync);
window.addEventListener("offline", updateSyncBar);

// ---------- Rendering ----------
const app = document.getElementById("app");
let currentView = "job-setup";

function renderCurrentView() {
  if (currentView === "job-setup") renderJobSetup();
  else if (currentView === "module-list") renderModuleList();
  else if (currentView === "module-detail") renderModuleDetail();
}

function renderJobSetup() {
  app.innerHTML = `
    <header class="app-bar"><h1>Q-Tel Auditor — New Job</h1></header>
    <main>
      <div class="card">
        <div class="field">
          <label>Site Name</label>
          <input type="text" id="f-site" placeholder="e.g. Khavda RE Park Phase 1">
        </div>
        <div class="field">
          <label>Element Type</label>
          <select id="f-element">
            <option>Footing</option><option>Pile Cap</option><option>Grade Beam</option>
            <option>Column</option><option>Beam</option><option>Slab</option>
            <option>Raft Foundation</option><option>Other</option>
          </select>
        </div>
        <div class="field">
          <label>Concrete Grade</label>
          <select id="f-grade">
            <option>M15</option><option>M20</option><option>M25</option><option>M30</option>
            <option>M35</option><option>M40</option><option>M45</option><option>M50</option>
          </select>
        </div>
        <button class="primary" id="btn-start-job">Start Audit Job</button>
      </div>
      <p class="note">Job is saved locally the moment you tap Start — works fully offline. GPS begins tracking as soon as the job opens.</p>
    </main>
  `;
  document.getElementById("btn-start-job").onclick = async () => {
    const siteName = document.getElementById("f-site").value.trim();
    if (!siteName) { alert("Site Name is required."); return; }
    const jobId = "JOB-" + Date.now();
    state.job = {
      jobId,
      siteName,
      elementType: document.getElementById("f-element").value,
      concreteGrade: document.getElementById("f-grade").value,
      createdAt: new Date().toISOString(),
    };
    await dbPut("jobs", state.job);
    startGPSWatch();
    currentView = "module-list";
    renderCurrentView();
  };
}

async function renderModuleList() {
  const photos = await dbGetAll("photos", "jobId", state.job.jobId);
  app.innerHTML = `
    <header class="app-bar">
      <span class="back" id="btn-back">‹</span>
      <h1>${state.job.siteName}</h1>
      <span class="badge">${state.job.elementType}</span>
    </header>
    <main>
      <div class="module-list" id="module-list"></div>
    </main>
    <div class="sync-bar" id="sync-bar"><span class="dot" id="sync-dot"></span><span class="msg" id="sync-msg"></span></div>
  `;
  document.getElementById("btn-back").onclick = () => { currentView = "job-setup"; renderCurrentView(); };

  const listEl = document.getElementById("module-list");
  QTEL_CONFIG.MODULES.forEach((mod) => {
    const modPhotos = photos.filter((p) => p.moduleCode === mod.code);
    const filledCount = new Set(modPhotos.map((p) => p.slotId)).size;
    const total = mod.slots.length;
    let pillClass = "not-started", pillText = "Not started";
    if (mod.operational === false) { pillClass = "locked"; pillText = "Locked (not in SoW)"; }
    else if (filledCount > 0 && filledCount < total) { pillClass = "in-progress"; pillText = `${filledCount}/${total}`; }
    else if (filledCount === total && total > 0) {
      const allSubmitted = modPhotos.every((p) => p.status === "submitted");
      pillClass = allSubmitted ? "submitted" : "queued";
      pillText = allSubmitted ? "Submitted" : "Queued";
    }
    const row = document.createElement("div");
    row.className = "module-row";
    row.innerHTML = `
      <div class="code">${mod.code}</div>
      <div class="info">
        <div class="name">${mod.name}${mod.requiresSeniorReview ? " *" : ""}</div>
        <div class="meta">${mod.stage} · ${total} photo${total !== 1 ? "s" : ""}</div>
      </div>
      <div class="pill ${pillClass}">${pillText}</div>
    `;
    if (mod.operational !== false) {
      row.onclick = () => { state.currentModule = mod; currentView = "module-detail"; renderCurrentView(); };
    }
    listEl.appendChild(row);
  });

  updateSyncBar();
}

async function renderModuleDetail() {
  const mod = state.currentModule;
  const photos = await dbGetAll("photos", "jobId", state.job.jobId);
  const modPhotos = photos.filter((p) => p.moduleCode === mod.code);

  app.innerHTML = `
    <header class="app-bar">
      <span class="back" id="btn-back">‹</span>
      <h1>${mod.code} — ${mod.name}</h1>
    </header>
    <main>
      <div class="card">
        <div class="slot-grid" id="slot-grid"></div>
      </div>
      <p class="note">Tap a tile to capture that photo. GPS and timestamp are burned into the image automatically. ${mod.requiresSeniorReview ? "This module always requires senior CQR-A review — no automated clearance." : ""}</p>
      <button class="primary" id="btn-submit-module" style="margin-top:12px;">Submit Module</button>
    </main>
    <div class="camera-wrap hidden" id="camera-wrap">
      <div class="camera-frame">
        <video id="camera-stream" autoplay playsinline muted></video>
        <div class="gps-chip" id="gps-chip">Acquiring GPS…</div>
      </div>
      <canvas id="capture-canvas" class="hidden"></canvas>
      <div class="camera-actions">
        <button class="secondary" id="btn-cancel-capture">Cancel</button>
        <button class="primary" id="btn-take-photo">Capture</button>
      </div>
    </div>
    <div class="sync-bar" id="sync-bar"><span class="dot" id="sync-dot"></span><span class="msg" id="sync-msg"></span></div>
  `;
  document.getElementById("btn-back").onclick = () => { currentView = "module-list"; renderCurrentView(); };

  const grid = document.getElementById("slot-grid");
  mod.slots.forEach((slot) => {
    const existing = modPhotos.find((p) => p.slotId === slot.id);
    const tile = document.createElement("div");
    tile.className = "slot-tile" + (existing ? " filled" : "");
    if (existing) {
      tile.innerHTML = `<img src="${existing.dataUrl}"><div class="check">✓</div>`;
    } else {
      tile.innerHTML = `<div class="plus">+</div><div class="label">${slot.label}</div>`;
    }
    tile.onclick = () => startCaptureForSlot(slot);
    grid.appendChild(tile);
  });

  document.getElementById("btn-submit-module").onclick = () => submitModule(mod, modPhotos);
  updateSyncBar();
}

function startCaptureForSlot(slot) {
  state.currentSlotId = slot.id;
  const wrap = document.getElementById("camera-wrap");
  wrap.classList.remove("hidden");
  wrap.scrollIntoView({ behavior: "smooth" });
  openCamera();

  if (slot.timerSeconds) {
    // e.g. silt test — enforce the wait before allowing capture
    const key = `${state.job.jobId}_${state.currentModule.code}_${slot.id}_timerStart`;
    let startedAt = localStorage.getItem(key);
    if (!startedAt) { startedAt = Date.now(); localStorage.setItem(key, startedAt); }
    const remaining = slot.timerSeconds * 1000 - (Date.now() - Number(startedAt));
    if (remaining > 0) {
      showTimerLock(remaining, () => {});
    }
  }

  document.getElementById("btn-cancel-capture").onclick = () => {
    stopCamera();
    wrap.classList.add("hidden");
  };
  document.getElementById("btn-take-photo").onclick = async () => {
    const captured = capturePhotoWithWatermark();
    const photoRecord = {
      photoId: `${state.job.jobId}_${state.currentModule.code}_${slot.id}_${Date.now()}`,
      jobId: state.job.jobId,
      moduleCode: state.currentModule.code,
      slotId: slot.id,
      slotLabel: slot.label,
      dataUrl: captured.dataUrl,
      gps: captured.gps,
      capturedAt: captured.capturedAt,
      status: "captured",
    };
    await queuePhotoForSync(photoRecord);
    stopCamera();
    wrap.classList.add("hidden");
    renderCurrentView();
  };
}

function showTimerLock(remainingMs, onDone) {
  const frame = document.querySelector("#camera-wrap .camera-frame");
  const lock = document.createElement("div");
  lock.className = "timer-lock";
  frame.appendChild(lock);
  document.getElementById("btn-take-photo").disabled = true;
  const tick = () => {
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    lock.innerHTML = `<div>Silt settling — wait required</div><div style="font-size:20px;">${mins}:${String(secs).padStart(2, "0")}</div>`;
    remainingMs -= 1000;
    if (remainingMs <= 0) {
      lock.remove();
      document.getElementById("btn-take-photo").disabled = false;
      onDone();
    } else {
      setTimeout(tick, 1000);
    }
  };
  tick();
}

async function submitModule(mod, modPhotos) {
  if (modPhotos.length < mod.slots.length) {
    alert(`${mod.slots.length - modPhotos.length} photo(s) still needed before this module can be submitted.`);
    return;
  }
  for (const p of modPhotos) {
    if (p.status === "captured") {
      await queuePhotoForSync(p);
    }
  }
  alert("Module queued for submission. It will sync to Airtable automatically — the AI analysis starts as soon as it arrives, and CQR-A is notified on WhatsApp.");
  attemptSync();
  currentView = "module-list";
  renderCurrentView();
}

// ---------- Boot ----------
(async function init() {
  await openDB();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW register failed", e));
  }
  renderCurrentView();
})();
