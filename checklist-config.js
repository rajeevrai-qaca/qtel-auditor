/* ============================================================
   Q-TEL AUDITOR — CHECKLIST CONFIGURATION
   ============================================================
   This file defines the ENTIRE digital check sheet structure.
   Rajeev — you can edit checkpoints here directly (no coding
   needed) to match the exact wording on the physical Indus
   Towers GBT Foundation Acceptance Check Sheet.

   Sections marked "PLACEHOLDER — VERIFY WORDING" contain a
   reasonable first draft built from what we've locked so far.
   Please compare each against the physical sheet and edit the
   `label` text directly — the app will pick up your changes
   automatically, no rebuild needed.

   CHECKPOINT TYPES:
     "yesno"   -> Yes / No / NA buttons
     "value"   -> numeric or text value entry
     "select"  -> dropdown, needs `options: []`
     "photo"   -> photo-only checkpoint (no yes/no)
   Any checkpoint can have photoRequired: true to force a photo
   alongside the response.
   ============================================================ */

const AUDIT_STRUCTURE = {

  towerTypes: [
    { code: "GBT", label: "GBT — Ground Based Tower", active: true },
    { code: "RTT", label: "RTT — Roof Top Tower", active: false } // Phase 2
  ],

  auditTypes: [
    { code: "C1", label: "C1 — Foundation + 1st Lift Column" },
    { code: "C2", label: "C2 — 2nd Lift Column" }
  ],

  stages: [
    { code: "PRE", label: "Pre-Pour" },
    { code: "POUR", label: "Pour" }
  ],

  foundationTypes: [
    { code: "RAFT", label: "Raft" },
    { code: "ISOLATED", label: "Isolated" },
    { code: "ISOLATED_STRIP", label: "Isolated with Strip Beam" }
  ],

  legConfigs: [
    { code: "3LEG", label: "3-Legged Tower", sides: 3, diagonals: 0 },
    { code: "4LEG", label: "4-Legged Tower", sides: 2, diagonals: 2 }
  ],

  concreteTypes: [
    { code: "SITE_M20", label: "Site Mix — M20" },
    { code: "RMC_M25", label: "RMC — M25" },
    { code: "RMC_M35", label: "RMC — M35 (Fast-Track)" }
  ],

  boltTypes: [
    { code: "ANCHOR", label: "Anchor Bolts" },
    { code: "CIP_STUB", label: "CIP Stub" }
  ],

  /* ==========================================================
     SECTIONS — rendered in this order, one at a time
     appliesTo: which audit type(s) this section belongs to
     ========================================================== */
  sections: [

    {
      code: "GEN",
      title: "1. General Check",
      appliesTo: ["C1", "C2"],
      note: "PLACEHOLDER — VERIFY WORDING against physical sheet",
      checkpoints: [
        { id: "GEN-01", label: "Site access and boundary demarcation in order", type: "yesno" },
        { id: "GEN-02", label: "PPE compliance of workforce observed", type: "yesno", photoRequired: true },
        { id: "GEN-03", label: "Site safety signage displayed", type: "yesno" },
        { id: "GEN-04", label: "Work permit / NOC available at site", type: "yesno", photoRequired: true },
        { id: "GEN-05", label: "Weather condition at time of audit", type: "select", options: ["Clear", "Cloudy", "Light Rain", "Heavy Rain"] }
      ]
    },

    {
      code: "PMC",
      title: "2. Project Management Check",
      appliesTo: ["C1", "C2"],
      note: "PLACEHOLDER — VERIFY WORDING against physical sheet",
      checkpoints: [
        { id: "PMC-01", label: "Approved structural drawing available at site", type: "yesno", photoRequired: true },
        { id: "PMC-02", label: "Drawing revision matches current approved version", type: "yesno" },
        { id: "PMC-03", label: "Site engineer / supervisor present and identified", type: "yesno" },
        { id: "PMC-04", label: "Work schedule / pour plan available", type: "yesno" }
      ]
    },

    {
      code: "MAT",
      title: "3. Materials",
      appliesTo: ["C1", "C2"],
      note: "Amalgamated with M1–M6 photo protocols",
      checkpoints: [
        { id: "MAT-01", label: "Coarse aggregate stockpile — sample 1 (top)", type: "photo", photoRequired: true },
        { id: "MAT-02", label: "Coarse aggregate stockpile — sample 2 (mid-depth)", type: "photo", photoRequired: true },
        { id: "MAT-03", label: "Coarse aggregate stockpile — sample 3 (base)", type: "photo", photoRequired: true },
        { id: "MAT-04", label: "Fine aggregate — visual condition", type: "yesno", photoRequired: true },
        {
          id: "MAT-05",
          label: "Silt content test (marked glass, IS 2386 Part 2 — 8% limit)",
          type: "silt_test",
          photoRequired: true,
          siltTimerMinutes: 60
        },
        { id: "MAT-06", label: "Cement bags — brand, grade and condition", type: "yesno", photoRequired: true },
        { id: "MAT-07", label: "Water source — visual clarity, free of contamination", type: "yesno" },
        { id: "MAT-08", label: "Admixture (if used) — brand and dosage as per mix design", type: "yesno" }
      ]
    },

    {
      code: "EXC",
      title: "4. Excavation",
      appliesTo: ["C1"],
      note: "C1 only — PLACEHOLDER — VERIFY WORDING",
      checkpoints: [
        { id: "EXC-01", label: "Excavation depth as per drawing", type: "value", unit: "m" },
        { id: "EXC-02", label: "Excavation width/plan dimensions as per drawing", type: "yesno" },
        { id: "EXC-03", label: "Bed preparation — level and compacted", type: "yesno", photoRequired: true },
        { id: "EXC-04", label: "Dewatering arrangement (if applicable)", type: "yesno" },
        { id: "EXC-05", label: "Soil bearing appears consistent with design assumption", type: "yesno" }
      ]
    },

    {
      code: "COL",
      title: "5. Column Position",
      appliesTo: ["C1", "C2"],
      note: "3-legged = 3 C/C side measurements; 4-legged = 2 sides + 2 diagonals. Rendered dynamically based on leg count selected.",
      dynamic: "legConfig",
      checkpoints: [
        // Rendered programmatically in app.js based on legConfig — see renderColumnPositionSection()
      ]
    },

    {
      code: "SHU",
      title: "6. Shuttering / Formwork",
      appliesTo: ["C1", "C2"],
      note: "Per-leg joint photos — PLACEHOLDER — VERIFY WORDING",
      dynamic: "perLeg",
      checkpoints: [
        { id: "SHU-01", label: "Shuttering material condition (per leg)", type: "yesno", photoRequired: true, perLeg: true },
        { id: "SHU-02", label: "Joints sealed — no gaps for slurry leakage (per leg)", type: "yesno", photoRequired: true, perLeg: true },
        { id: "SHU-03", label: "Shuttering plumb and true to line", type: "yesno" },
        { id: "SHU-04", label: "Shuttering oil applied", type: "yesno" }
      ]
    },

    {
      code: "REI",
      title: "7. Reinforcement",
      appliesTo: ["C1", "C2"],
      note: "M3 checklist",
      checkpoints: [
        { id: "REI-01", label: "Full rebar cage — longitudinal", type: "photo", photoRequired: true },
        { id: "REI-02", label: "Full rebar cage — transverse", type: "photo", photoRequired: true },
        { id: "REI-03", label: "Bar diameter as per drawing (read rolled marking)", type: "value", photoRequired: true },
        { id: "REI-04", label: "Bar grade (Fe415 / Fe500D / Fe550D)", type: "select", options: ["Fe415", "Fe500D", "Fe550D"], photoRequired: true },
        { id: "REI-05", label: "Manufacturer — on approved vendor list", type: "yesno", photoRequired: true },
        { id: "REI-06", label: "Cover blocks — present and adequate size", type: "yesno", photoRequired: true },
        { id: "REI-07", label: "Stirrup spacing consistent, no widening at critical zones", type: "yesno", photoRequired: true },
        { id: "REI-08", label: "Lap positions away from critical zones", type: "yesno" },
        { id: "REI-09", label: "General arrangement consistent with drawing", type: "yesno" }
      ]
    },

    {
      code: "BOLT",
      title: "8. Foundation Bolts / Stubs",
      appliesTo: ["C2"],
      note: "C2 only — Anchor Bolts OR CIP Stub, selected at section start",
      dynamic: "boltType",
      checkpoints: [
        { id: "BOLT-01", label: "Bolt/stub template matches tower manufacturer drawing", type: "yesno", photoRequired: true },
        { id: "BOLT-02", label: "Projection height as per drawing", type: "value", unit: "mm" },
        { id: "BOLT-03", label: "Bolt/stub verticality checked", type: "yesno", photoRequired: true },
        { id: "BOLT-04", label: "Bolt/stub firmly held — no movement during pour", type: "yesno" }
      ]
    },

    {
      code: "RCC",
      title: "9. RCC / Concreting",
      appliesTo: ["C1", "C2"],
      note: "Cube casting optional per client decision",
      checkpoints: [
        { id: "RCC-01", label: "Concrete type confirmed at start of section", type: "select", options: ["Site Mix M20", "RMC M25", "RMC M35"] },
        { id: "RCC-02", label: "Slump test result", type: "value", unit: "mm", photoRequired: true },
        { id: "RCC-03", label: "Cube casting done (optional — per client)", type: "yesno", photoRequired: true },
        { id: "RCC-04", label: "Pour in progress — vibration visible, no segregation", type: "photo", photoRequired: true },
        { id: "RCC-05", label: "Concrete surface finish — post pour", type: "photo", photoRequired: true },
        { id: "RCC-06", label: "Curing arrangement started within stipulated time", type: "yesno", photoRequired: true }
      ]
    }

  ]
};

// Export for use in app.js
if (typeof module !== "undefined") module.exports = AUDIT_STRUCTURE;
