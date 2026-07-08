/* ============================================================
   Q-TEL AUDITOR — CHECKLIST CONFIGURATION  (v2.2)
   ============================================================
   Changes in this version, per your section-by-section review:

   SECTION 2: removed 2.14 (site casting with audit engineer
   present — redundant, the Auditor is always the one submitting).

   SECTION 3: cement manufacturing date is now a real date picker
   with an automatic freshness check (Not Ok if pour is more than
   45 days after manufacture — confirmed by you). Coarse
   Aggregate and Sand each get a 3-sample photo protocol
   (top/mid/base, worst sample governs) matching the original
   M1/M2 multi-angle AI-analysis design. Silt test is now two
   photos (start + after settling) with a 30-minute lock
   (confirmed by you — supersedes the earlier 60-minute lock) and
   an auditor-entered % value, auto Not Ok above 8%. Removed 3.17
   (duplicate slump cone question — already in Section 2). Renamed
   "Fine Aggregate" to "Sand" throughout.

   SECTION 7: bar diameter is now 4 comparison slots (first 3
   mandatory, 4th optional) to cover multiple diameters used in
   one element. C/C distance and Number of bars (old 7.6/7.7)
   replaced with 7 detailed reinforcement checks (foundation
   bottom/top steel in both directions, column main steel in two
   types, shear stirrups) — each broken into its own dia/spacing/
   count comparison card to keep one measurement per card.

   Still DRAFT / unconfirmed: nothing new pending in Sections
   1-7. Section 8 and Section 9 are deliberately untouched this
   round per your instruction.
   ============================================================ */

const AUDIT_STRUCTURE = {

  towerTypes: [
    { code: "GBT", label: "GBT — Ground Based Tower", active: true },
    { code: "RTT", label: "RTT — Roof Top Tower", active: false }
  ],

  auditTypes: [
    { code: "C1", label: "C1 — Foundation + 1st Lift Column" },
    { code: "C2", label: "C2 — 2nd Lift Column (checklist not yet configured)" }
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
    { code: "SITE_M20", label: "Site Mix — M20", grade: "M20", isRMC: false },
    { code: "RMC_M25", label: "RMC — M25", grade: "M25", isRMC: true },
    { code: "RMC_M35", label: "RMC — M35 (Fast-Track)", grade: "M35", isRMC: true }
  ],

  boltTypes: [
    { code: "ANCHOR", label: "Anchor Bolts" },
    { code: "CIP_STUB", label: "CIP Stub" }
  ],

  sections: [

    {
      code: "GEN",
      title: "1. General Check",
      appliesTo: ["C1"],
      status: "FINAL — confirmed July 7",
      checkpoints: [
        { id: "1.1", label: "Planning approved drawing and site layout available", type: "yesno", photoRequired: true },
        { id: "1.2", label: "Position of foundation as per layout", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "1.3", label: "SBC value — as per SBC report vs as per drawing", type: "dualvalue",
          labelA: "SBC as per report", labelB: "SBC as per drawing", unit: "kN/m2",
          compare: { rule: "b_lte_a", note: "Ok if drawing value <= report value" }, photoRequired: false },
        { id: "1.4", label: "Wind speed — foundation design vs wind zone requirement", type: "dualvalue",
          labelA: "Wind speed for foundation design", labelB: "Wind speed as per wind zone", unit: "km/h",
          compare: { rule: "a_gte_b", note: "Ok if design value >= wind zone value" }, photoRequired: false },
        { id: "1.5", label: "Site level above NGL — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing value", labelB: "Actual measured value", unit: "m",
          compare: { rule: "b_gte_a", note: "Ok if actual >= drawing" }, photoRequired: true },
        { id: "1.6", label: "Pumps arranged for dewatering (if required)", type: "yesno", options: ["Yes", "No", "NA"], photoRequiredIf: ["Yes", "No"] },
        { id: "1.7", label: "Type of pre-PCC / base treatment as per drawing", type: "value", unit: "text", photoRequired: false },
        { id: "1.8", label: "Depth of rubble soling / sand bed (if applicable)", type: "value", unit: "mm", photoRequired: false },
        { id: "1.9", label: "PCC thickness as per drawing", type: "value", unit: "mm", photoRequired: true },
        { id: "1.10", label: "High tension line near tower area", type: "yesno", photoRequired: false },
        { id: "1.11", label: "Auditor in-time selfie with site background", type: "time_photo", photoRequired: true }
      ]
    },

    {
      code: "PMC",
      title: "2. Project Management Check",
      appliesTo: ["C1"],
      status: "FINAL — confirmed July 7",
      checkpoints: [
        { id: "2.1", label: "Mixture machine available", type: "yesno", photoRequiredIf: ["No"] },
        { id: "2.2", label: "Vibrators available — minimum 2 nos. required", type: "count", min: 2, unit: "nos", photoRequiredIfBelowMin: true },
        { id: "2.3", label: "Slump cone available", type: "yesno", photoRequiredIf: ["No"] },
        { id: "2.4", label: "Chute available", type: "yesno", options: ["Yes", "No", "NA"], photoRequiredIf: ["No"] },
        { id: "2.5", label: "RMC pump available (if RMC)", type: "yesno", options: ["Yes", "No", "NA"], photoRequiredIf: ["No"] },
        { id: "2.6", label: "Dewatering pump available (if required)", type: "yesno", options: ["Yes", "No", "NA"], photoRequiredIf: ["No"] },
        { id: "2.7", label: "Shuttering material — Steel plate or waterproof ply with batten", type: "yesno", options: ["Ok", "Not Ok"], photoRequiredIf: ["Not Ok"] },
        { id: "2.8", label: "Steel available and completed", type: "yesno", photoRequiredIf: ["No"] },
        { id: "2.9", label: "Cement available", type: "yesno", photoRequiredIf: ["No"] },
        { id: "2.10", label: "Aggregates (coarse and fine) available", type: "yesno", photoRequiredIf: ["No"] },
        { id: "2.11", label: "Supervisor available", type: "yesno" },
        { id: "2.12", label: "Team available", type: "yesno" },
        { id: "2.13", label: "Light arrangement available (if night work)", type: "yesno", options: ["Yes", "No", "NA"] }
      ]
    },

    {
      code: "MAT",
      title: "3. Materials",
      appliesTo: ["C1"],
      status: "DRAFT — please confirm against physical sheet",
      checkpoints: [
        { id: "3.1", label: "Cement grade — only OPC 53 to be used", type: "select", options: ["OPC 53", "OPC 43", "PPC"], photoRequired: true },
        { id: "3.2", label: "Cement brand name", type: "value", unit: "text", photoRequired: true },
        { id: "3.3", label: "Cement grade as marked on bag", type: "value", unit: "text", photoRequired: true },
        { id: "3.4", label: "Cement manufacturing date", type: "date_check", maxDaysFromToday: 45,
          note: "Not Ok if more than 45 days before today (pour must not be more than 45 days after manufacture)", photoRequired: true },
        { id: "3.5", label: "Total cement bags available on site", type: "value", unit: "count", photoRequired: true },
        { id: "3.6", label: "Steel make — approved brand only", type: "value", unit: "text", photoRequired: true },
        { id: "3.7", label: "Steel grade", type: "select", options: ["Fe415", "Fe500", "Fe550"], photoRequired: true },
        { id: "3.8", label: "Condition of reinforcement", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },

        { id: "3.9", label: "Coarse aggregate quality — visual check", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: false },
        { id: "3.9a", label: "Coarse aggregate — Sample 1 (top of stockpile)", type: "photo", photoRequired: true },
        { id: "3.9b", label: "Coarse aggregate — Sample 2 (mid-depth)", type: "photo", photoRequired: true },
        { id: "3.9c", label: "Coarse aggregate — Sample 3 (base) — worst sample governs", type: "photo", photoRequired: true },
        { id: "3.10", label: "Coarse aggregate — sufficient quantity", type: "yesno", photoRequired: true },
        { id: "3.11", label: "Coarse aggregate — impurities visible", type: "yesno", photoRequiredIf: ["Yes"] },
        { id: "3.12", label: "Coarse aggregate — size and shape acceptable", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },

        { id: "3.13", label: "Sand quality — visual check", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: false },
        { id: "3.13a", label: "Sand — Sample 1 (top of stockpile)", type: "photo", photoRequired: true },
        { id: "3.13b", label: "Sand — Sample 2 (mid-depth)", type: "photo", photoRequired: true },
        { id: "3.13c", label: "Sand — Sample 3 (base) — worst sample governs", type: "photo", photoRequired: true },
        { id: "3.14", label: "Sand — sufficient quantity", type: "yesno", photoRequired: true },
        { id: "3.15", label: "Sand — impurities visible", type: "yesno", photoRequiredIf: ["Yes"] },

        { id: "3.16", label: "Silt content test (marked glass, IS 2386 Part 2 — 8% limit)",
          type: "silt_test_v2", siltTimerMinutes: 30, maxPercent: 8 },

        { id: "3.18", label: "Precast cover blocks available", type: "yesno", photoRequired: true },
        { id: "3.19", label: "Casting should not start during rain", type: "select", options: ["Confirmed", "Rain present"], photoRequired: false }
      ]
    },

    {
      code: "EXC",
      title: "4. Excavation",
      appliesTo: ["C1"],
      status: "FINAL — confirmed July 7",
      checkpoints: [
        { id: "4.1", label: "Foundation depth — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing value", labelB: "Actual measured", unit: "m",
          compare: { rule: "b_gte_a", note: "Ok if actual >= drawing" }, photoRequired: true },
        { id: "4.2", label: "Working area dimensions — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing value", labelB: "Actual measured", unit: "m",
          compare: { rule: "b_gte_a", note: "Ok if actual >= drawing" }, photoRequired: true },
        { id: "4.3", label: "Foundation type (confirm from drawing)", type: "select",
          options: ["Raft", "Isolated", "Isolated with Strip Beam"], photoRequired: true },
        { id: "4.4", label: "Raft foundation size — Length + Breadth", type: "value", unit: "m x m",
          showIf: { field: "foundationType", equals: "RAFT" }, photoRequired: true },
        { id: "4.5", label: "Isolated footing size per leg — Length x Breadth", type: "value", unit: "m x m", perLeg: true,
          showIf: { field: "foundationType", equals: "ISOLATED" }, photoRequired: true },
        { id: "4.6", label: "Strip beam dimensions — Length + Width per beam", type: "value", unit: "m x m",
          showIf: { field: "foundationType", equals: "ISOLATED_STRIP" }, photoRequired: true },
        { id: "4.7", label: "All excavated area post-PCC is levelled", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "4.8", label: "Total excavation quantity", type: "value", unit: "cum", photoRequired: false },
        { id: "4.9", label: "Centre to centre distance of column position — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing value", labelB: "Actual measured", unit: "mm",
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true }
      ]
    },

    {
      code: "COL",
      title: "5. Column Position",
      appliesTo: ["C1"],
      status: "FINAL — confirmed July 7",
      checkpoints: [
        { id: "5.hdr3a", label: "3-legged — C/C Side A — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", showIf: { field: "legConfig", equals: "3LEG" },
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "5.hdr3b", label: "3-legged — C/C Side B — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", showIf: { field: "legConfig", equals: "3LEG" },
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "5.hdr3c", label: "3-legged — C/C Side C — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", showIf: { field: "legConfig", equals: "3LEG" },
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "5.hdr4a", label: "4-legged — C/C Side A — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", showIf: { field: "legConfig", equals: "4LEG" },
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "5.hdr4b", label: "4-legged — C/C Side B — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", showIf: { field: "legConfig", equals: "4LEG" },
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "5.diag1", label: "4-legged — Diagonal 1 (Leg1-Leg3) — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", showIf: { field: "legConfig", equals: "4LEG" },
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "5.diag2", label: "4-legged — Diagonal 2 (Leg2-Leg4) — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", showIf: { field: "legConfig", equals: "4LEG" },
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "5.9", label: "All columns in line and level", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true }
      ]
    },

    {
      code: "SHU",
      title: "6. Shuttering / Formwork",
      appliesTo: ["C1"],
      status: "FINAL — confirmed July 7",
      checkpoints: [
        { id: "6.overall", label: "Overall formwork view — all legs visible", type: "photo", photoRequired: true },
        { id: "6.joint", label: "Shuttering condition & joints sealed — no gaps for slurry leakage", type: "yesno",
          perLeg: true, photoRequired: true },
        { id: "6.brace", label: "Bracing and supports adequate", type: "yesno", photoRequired: true },
        { id: "6.oil", label: "Shuttering oil applied", type: "yesno", photoRequired: true },
        { id: "6.plumb", label: "Shuttering plumb and true to line", type: "yesno", photoRequired: true },
        { id: "6.cover", label: "Cover blocks visible in formwork", type: "yesno", photoRequired: true }
      ]
    },

    {
      code: "REI",
      title: "7. Reinforcement",
      appliesTo: ["C1"],
      status: "FINAL — confirmed July 7, restructured per July 8 feedback",
      checkpoints: [
        { id: "7.1", label: "Steel placement as per drawing", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "7.2", label: "Steel make — approved brand (checked vs Approved Vendors)", type: "value", unit: "text", photoRequired: true },
        { id: "7.3", label: "Steel grade", type: "select", options: ["Fe415", "Fe500D", "Fe550D"], photoRequired: true },
        { id: "7.4", label: "Condition of reinforcement — clean, no damage", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },

        { id: "7.5a", label: "Bar diameter used #1 (mandatory) — Design vs Actual", type: "dualvalue",
          labelA: "Design", labelB: "Actual (read from marking)", unit: "mm",
          compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.5b", label: "Bar diameter used #2 (mandatory) — Design vs Actual", type: "dualvalue",
          labelA: "Design", labelB: "Actual (read from marking)", unit: "mm",
          compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.5c", label: "Bar diameter used #3 (mandatory) — Design vs Actual", type: "dualvalue",
          labelA: "Design", labelB: "Actual (read from marking)", unit: "mm",
          compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.5d", label: "Bar diameter used #4 (optional) — Design vs Actual", type: "dualvalue",
          labelA: "Design", labelB: "Actual (read from marking)", unit: "mm",
          compare: { rule: "match", note: "Ok if match" }, photoRequired: false, photoOptionalAllowed: true },

        { id: "7.6.fbx.dia", label: "Foundation bottom reinforcement — X direction — Bar diameter", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.6.fbx.sp", label: "Foundation bottom reinforcement — X direction — Spacing", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "7.6.fby.dia", label: "Foundation bottom reinforcement — Y direction — Bar diameter", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.6.fby.sp", label: "Foundation bottom reinforcement — Y direction — Spacing", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "7.6.ftx.dia", label: "Foundation top reinforcement — X direction — Bar diameter", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.6.ftx.sp", label: "Foundation top reinforcement — X direction — Spacing", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "7.6.fty.dia", label: "Foundation top reinforcement — Y direction — Bar diameter", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.6.fty.sp", label: "Foundation top reinforcement — Y direction — Spacing", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },

        { id: "7.7.col1.nos", label: "Column main reinforcement — Type 1 — Number of bars", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "nos", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.7.col1.dia", label: "Column main reinforcement — Type 1 — Bar diameter", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.7.col2.nos", label: "Column main reinforcement — Type 2 — Number of bars", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "nos", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.7.col2.dia", label: "Column main reinforcement — Type 2 — Bar diameter", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },

        { id: "7.7.stirrup.nos", label: "Shear stirrups — Number per set", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "nos", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.7.stirrup.dia", label: "Shear stirrups — Bar diameter", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "7.7.stirrup.sp", label: "Shear stirrups — Spacing", type: "dualvalue",
          labelA: "Design", labelB: "Actual", unit: "mm", compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },

        { id: "7.8", label: "Lap length as per drawing", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "7.9", label: "Anchorage / hooks as per drawing", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "7.10", label: "Cover blocks on all faces", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "7.11", label: "Stirrups — general C/C distance check — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm",
          compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "7.12", label: "Stirrup hooks — 135 degree as per IS code", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "7.13", label: "No twisting or eccentricity in column cage", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "7.14", label: "Total steel quantity on site — footing + column", type: "value", unit: "kg", photoRequired: false },
        { id: "7.15", label: "Any less quantity found vs drawing", type: "yesno", photoRequiredIf: ["Yes"] }
      ]
    },

    {
      code: "RCC",
      title: "8. RCC / Concreting",
      appliesTo: ["C1"],
      status: "FINAL from July 7 — on hold per your instruction, revisit after Sections 1-7 are solid",
      checkpoints: [
        { id: "8.1", label: "Casting start time + Auditor selfie with site background", type: "time_photo", photoRequired: true },
        { id: "8.2", label: "Casting type", type: "value", unit: "auto", readOnlyFrom: "concreteTypeCategory", photoRequired: false },
        { id: "8.3", label: "Concrete grade", type: "select", options: ["M20", "M25", "M35"], photoRequired: false },
        { id: "8.4", label: "Slump value — Target vs Actual", type: "dualvalue",
          labelA: "Target", labelB: "Actual", unit: "mm",
          compare: { rule: "tolerance", tolerance: 25, note: "Not Ok if outside +/-25mm" }, photoRequired: true },
        { id: "8.5", label: "Cube casting done (optional — client removed from mandatory; no auto-NCR)", type: "yesno", photoRequiredIf: ["Yes"] },
        { id: "8.6", label: "Vibrator in use during pour", type: "yesno", photoRequired: true },
        { id: "8.7", label: "Concrete placement — no excessive drop height", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "8.8", label: "Concrete layer thickness — controlled pour", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "8.9", label: "No casting during rain", type: "select", options: ["Confirmed", "Rain"], photoRequired: false },
        { id: "8.10", label: "Misalignment between 1st lift and foundation bolts", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "8.11", label: "Depth of connected tie beam / slab (if applicable)", type: "value", unit: "mm", photoRequired: true },
        { id: "8.12", label: "Length of first lift", type: "value", unit: "m", photoRequired: true },
        { id: "8.13", label: "Top surface finish", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "8.14", label: "Initial curing arrangement in place", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "8.15", label: "Casting end time + Auditor selfie with site background", type: "time_photo", photoRequired: true }
      ]
    },

    {
      code: "BOLT",
      title: "9. Foundation Bolts / Stubs",
      appliesTo: ["C1"],
      status: "Belongs to C2 per your July 8 note — deferred, not shown for C1 audits",
      deferred: true,
      dynamic: "boltType",
      checkpointsAnchor: [
        { id: "9A.1", label: "PDI stamp visible on bolts", type: "yesno", photoRequired: true },
        { id: "9A.2", label: "Bolt diameter — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "9A.3", label: "Thread dimension correct", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9A.4", label: "Thread not damaged", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9A.5", label: "Length of bolts — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "9A.6", label: "No. of lock, main and base nuts as per drawing", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9A.7", label: "Threaded portion galvanised", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9A.8", label: "Template size and fitment as per drawing", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9A.9", label: "Template + bolts centred in column — all-side cover equal", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9A.10", label: "Template level — must be 0°", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9A.11", label: "Thread visible above finished foundation level", type: "yesno", photoRequired: true },
        { id: "9A.12", label: "C/C distances A, B, C — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "9A.13", label: "Bolt thread covered with plastic before concreting", type: "yesno", photoRequired: true },
        { id: "9A.14", label: "Drain pipe provision (if applicable)", type: "yesno", options: ["Yes", "No", "NA"], photoRequiredIf: ["applicable"] }
      ],
      checkpointsCIP: [
        { id: "9B.1", label: "CIP stub PDI approved", type: "yesno", photoRequired: true },
        { id: "9B.2", label: "Stub dimension — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "9B.3", label: "Stub level — must be 0°", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9B.4", label: "C/C distances A, B, C — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", compare: { rule: "tolerance", tolerance: 10, note: "Ok if within +/-10mm" }, photoRequired: true },
        { id: "9B.5", label: "All stubs properly connected / tied", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9B.6", label: "Stub galvanisation", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9B.7", label: "Stub depth — Drawing vs Actual", type: "dualvalue",
          labelA: "Drawing", labelB: "Actual", unit: "mm", compare: { rule: "match", note: "Ok if match" }, photoRequired: true },
        { id: "9B.8", label: "Working area below stub maintained after casting", type: "yesno", options: ["Ok", "Not Ok"], photoRequired: true },
        { id: "9B.9", label: "Drain pipe provision (if applicable)", type: "yesno", options: ["Yes", "No", "NA"], photoRequiredIf: ["applicable"] }
      ]
    }

  ]
};

if (typeof module !== "undefined") module.exports = AUDIT_STRUCTURE;
