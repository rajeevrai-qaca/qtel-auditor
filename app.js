const state = {
  user: null,       // { userRecordId, userId, fullName }
  reviews: [],
  currentReview: null,
  selectedDecision: null,
};

const app = document.getElementById("app");
let currentView = "login";

function renderCurrentView() {
  if (currentView === "login") renderLogin();
  else if (currentView === "review-list") renderReviewList();
  else if (currentView === "review-detail") renderReviewDetail();
  else if (currentView === "issue-ncr") renderIssueNcr();
}

// ---------- Login ----------
function renderLogin() {
  app.innerHTML = `
    <header class="app-bar"><h1>Q-Tel CQR-A Desk</h1><span class="app-wordmark">QACA</span></header>
    <main>
      <div class="card">
        <div class="field">
          <label>User ID</label>
          <input type="text" id="f-userid" placeholder="e.g. CQRA-1023" autocapitalize="characters">
        </div>
        <div class="field">
          <label>PIN</label>
          <input type="text" inputmode="numeric" id="f-pin" placeholder="4-digit PIN" maxlength="6">
        </div>
        <button class="primary" id="btn-login">Login</button>
        <p class="note" id="login-error" style="color:var(--danger); display:none; margin-top:10px;"></p>
      </div>
    </main>
    <footer class="company-footer"><span class="name">Quality Austria Central Asia Pvt. Ltd.</span><br>Q-Tel CQR-A Review Desk</footer>
  `;
  document.getElementById("btn-login").onclick = async () => {
    const userId = document.getElementById("f-userid").value.trim();
    const pin = document.getElementById("f-pin").value.trim();
    const errEl = document.getElementById("login-error");
    errEl.style.display = "none";
    if (!userId || !pin) { errEl.textContent = "User ID and PIN are both required."; errEl.style.display = "block"; return; }
    const btn = document.getElementById("btn-login");
    btn.disabled = true; btn.textContent = "Checking…";
    try {
      const res = await fetch(QTEL_CONFIG.ENDPOINTS.LOGIN_STEP1, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pin }),
      });
      const data = await res.json();
      if (data.status === "success" || data.status === "otp_required") {
        state.user = { userRecordId: data.userRecordId, userId, fullName: data.fullName || userId };
        currentView = "review-list";
        renderCurrentView();
      } else {
        errEl.textContent = data.message || "Login failed. Check your User ID and PIN.";
        errEl.style.display = "block";
      }
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      errEl.textContent = "Could not reach the server. Check your connection and try again.";
      errEl.style.display = "block";
    } finally {
      btn.disabled = false; btn.textContent = "Login";
    }
  };
}

// ---------- Review List ----------
async function renderReviewList() {
  app.innerHTML = `
    <header class="app-bar"><h1>${state.user.fullName}</h1><span class="app-wordmark">QACA</span></header>
    <main>
      <p class="note" id="reviews-status">Loading pending reviews…</p>
      <div class="module-list" id="review-list"></div>
    </main>
    <footer class="company-footer"><span class="name">Quality Austria Central Asia Pvt. Ltd.</span></footer>
  `;
  try {
    const res = await fetch(QTEL_CONFIG.ENDPOINTS.GET_PENDING_REVIEWS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    state.reviews = data.reviews || [];
    document.getElementById("reviews-status").textContent = state.reviews.length
      ? `${state.reviews.length} module(s) awaiting review. Tap one to open.`
      : "No modules currently awaiting review.";
    const listEl = document.getElementById("review-list");
    state.reviews.forEach((review) => {
      const flagClass = review.aiFlag === "Clear" ? "pass" : review.aiFlag === "Reject" ? "concern" : "in-progress";
      const row = document.createElement("div");
      row.className = "module-row";
      row.innerHTML = `
        <div class="info">
          <div class="name">${review.moduleCode || "Module"}</div>
          <div class="meta">${(review.photos || []).length} photo(s)</div>
        </div>
        <div class="pill ${flagClass}">${review.aiFlag || "Pending"}</div>
      `;
      row.onclick = () => {
        state.currentReview = review;
        state.selectedDecision = null;
        currentView = "review-detail";
        renderCurrentView();
      };
      listEl.appendChild(row);
    });
  } catch (err) {
    console.error("REVIEW LIST ERROR:", err);
    document.getElementById("reviews-status").textContent = "Could not load reviews. Check your connection and try again.";
  }
}

// ---------- Review Detail ----------
function renderReviewDetail() {
  const review = state.currentReview;
  const photos = review.photos || [];

  app.innerHTML = `
    <header class="app-bar">
      <span class="back" id="btn-back">‹</span>
      <h1>${review.moduleCode || "Module"}</h1>
      <span class="app-wordmark">QACA</span>
    </header>
    <main>
      <div class="card">
        <div class="field" style="margin-bottom:8px;"><label>Photos (${photos.length})</label></div>
        <div class="review-photo-grid" id="photo-grid"></div>
      </div>
      <div class="card">
        <div class="field" style="margin-bottom:8px;"><label>Auditor Observation</label></div>
        <div class="ai-observation-box">${(review.auditorObservation || "No observation entered by Auditor.").replace(/</g, "&lt;")}</div>
      </div>
      <div class="card">
        <div class="field" style="margin-bottom:8px;"><label>AI Observation</label></div>
        <div class="ai-observation-box">${(review.aiObservation || "No observation available.").replace(/</g, "&lt;")}</div>
      </div>
      <div class="card">
        <div class="field" style="margin-bottom:8px;"><label>Your Decision</label></div>
        <div class="decision-row">
          <button class="decision-btn" data-decision="Clear">Clear</button>
          <button class="decision-btn" data-decision="Attention">Attention</button>
          <button class="decision-btn" data-decision="Reject">Reject</button>
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea id="f-notes" rows="3" placeholder="Your review notes..."></textarea>
        </div>
        <button class="primary" id="btn-submit-decision">Submit Decision</button>
        <div class="secondary-action" id="btn-issue-ncr">Issue NCR for this module instead →</div>
      </div>
    </main>
  `;

  document.getElementById("btn-back").onclick = () => { currentView = "review-list"; renderCurrentView(); };

  const photoGrid = document.getElementById("photo-grid");
  if (photos.length === 0) {
    photoGrid.innerHTML = `<p class="note">No photos found for this module.</p>`;
  } else {
    photos.forEach((p) => {
      const wrap = document.createElement("div");
      const directLink = toDirectDriveLink(p.driveLink);
      wrap.innerHTML = `<img src="${directLink}" loading="lazy"><div class="slot-label">${p.slot || ""}</div>`;
      photoGrid.appendChild(wrap);
    });
  }

  document.querySelectorAll(".decision-btn").forEach((btn) => {
    btn.onclick = () => {
      state.selectedDecision = btn.dataset.decision;
      document.querySelectorAll(".decision-btn").forEach((b) => b.className = "decision-btn");
      btn.className = `decision-btn selected ${state.selectedDecision.toLowerCase()}`;
    };
  });

  document.getElementById("btn-submit-decision").onclick = async () => {
    if (!state.selectedDecision) { alert("Please select a decision: Clear, Attention, or Reject."); return; }
    const btn = document.getElementById("btn-submit-decision");
    btn.disabled = true; btn.textContent = "Submitting…";
    try {
      const res = await fetch(QTEL_CONFIG.ENDPOINTS.SUBMIT_DECISION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleRecordId: review.moduleRecordId,
          cqrARecordId: state.user.userRecordId,
          decision: state.selectedDecision,
          notes: document.getElementById("f-notes").value,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Decision recorded.");
        currentView = "review-list";
        renderCurrentView();
      } else {
        alert(data.message || "Something went wrong submitting the decision.");
      }
    } catch (err) {
      alert("Could not reach the server. Check your connection and try again.");
    } finally {
      btn.disabled = false; btn.textContent = "Submit Decision";
    }
  };

  document.getElementById("btn-issue-ncr").onclick = () => {
    currentView = "issue-ncr";
    renderCurrentView();
  };
}

// Converts a Drive share/view link into a directly-loadable image URL, matching
// the same uc?export=download pattern used throughout Q-Tel's photo pipeline.
function toDirectDriveLink(link) {
  if (!link) return "";
  if (link.includes("uc?export=download")) return link;
  const match = link.match(/[-\w]{25,}/);
  return match ? `https://drive.google.com/uc?export=download&id=${match[0]}` : link;
}

// ---------- Issue NCR ----------
function renderIssueNcr() {
  const review = state.currentReview;
  app.innerHTML = `
    <header class="app-bar">
      <span class="back" id="btn-back">‹</span>
      <h1>Issue NCR — ${review.moduleCode || "Module"}</h1>
      <span class="app-wordmark">QACA</span>
    </header>
    <main>
      <div class="card">
        <div class="field">
          <label>NCR Type</label>
          <select id="f-ncr-type">
            <option>Observation</option>
            <option selected>Minor NCR</option>
            <option>Major NCR</option>
            <option>Stop Notice</option>
          </select>
        </div>
        <div class="field">
          <label>Finding</label>
          <textarea id="f-finding" rows="3" placeholder="What was found..."></textarea>
        </div>
        <div class="field">
          <label>Action Required</label>
          <textarea id="f-action-required" rows="2" placeholder="What must be done..."></textarea>
        </div>
        <div class="field">
          <label>Action Deadline</label>
          <input type="date" id="f-deadline">
        </div>
        <button class="primary" id="btn-issue">Issue NCR</button>
      </div>
    </main>
  `;
  document.getElementById("btn-back").onclick = () => { currentView = "review-detail"; renderCurrentView(); };
  document.getElementById("btn-issue").onclick = async () => {
    const finding = document.getElementById("f-finding").value.trim();
    const actionRequired = document.getElementById("f-action-required").value.trim();
    const actionDeadline = document.getElementById("f-deadline").value;
    if (!finding || !actionRequired || !actionDeadline) { alert("Finding, Action Required, and Deadline are all required."); return; }
    const btn = document.getElementById("btn-issue");
    btn.disabled = true; btn.textContent = "Issuing…";
    try {
      const res = await fetch(QTEL_CONFIG.ENDPOINTS.ISSUE_NCR, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleRecordId: review.moduleRecordId,
          cqrARecordId: state.user.userRecordId,
          ncrType: document.getElementById("f-ncr-type").value,
          finding, actionRequired, actionDeadline,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        alert(`NCR issued: ${data.ncrId}`);
        currentView = "review-list";
        renderCurrentView();
      } else {
        alert(data.message || "Something went wrong issuing the NCR.");
      }
    } catch (err) {
      alert("Could not reach the server. Check your connection and try again.");
    } finally {
      btn.disabled = false; btn.textContent = "Issue NCR";
    }
  };
}

// ---------- Boot ----------
renderCurrentView();
