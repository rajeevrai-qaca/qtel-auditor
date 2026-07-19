// Q-Tel Auditor PWA v3.0 — Module Configuration
// This matches the M1–M11 structure LIVE in Airtable "AI Prompt Library" table
// (confirmed Active as of this build). Edit PHOTO SLOT counts/labels here if
// they need correction — nothing else in the app needs to change.
//
// CONFIRM WITH RAJEEV: slot counts for M4–M10 are best-guess defaults (2 photos:
// an overall + a close-up) since the live AI prompts describe assessment criteria
// but don't state an explicit photo count the way M1/M2/M3/M11 do. Adjust below.

const QTEL_CONFIG = {
  // Fill this in once the n8n webhook (WF-006 entry point) is live
  N8N_WEBHOOK_URL: "REPLACE_WITH_YOUR_N8N_WEBHOOK_URL",

  // Google Drive upload endpoint is handled inside the n8n workflow, not here.
  // The PWA only ever talks to ONE endpoint: the n8n webhook below.

  MODULES: [
    {
      code: "M1",
      name: "Sand and Fine Aggregate",
      stage: "Pre-Pour",
      slots: [
        { id: "S1", label: "Sample A — top of stockpile" },
        { id: "S2", label: "Sample B — middle depth" },
        { id: "S3", label: "Sample C — base/edge" },
        { id: "S4", label: "Clump test (fist squeeze)" },
        { id: "S5", label: "Silt test — START (settlement begins)" },
        { id: "S6", label: "Silt test — READING (after 60 min)", timerSeconds: 3600, timerStartsFromSlot: "S5" },
        { id: "S7", label: "Overall stockpile view" },
      ],
    },
    {
      code: "M2",
      name: "Coarse Aggregate",
      stage: "Pre-Pour",
      slots: [
        { id: "S1", label: "Overall stockpile view" },
        { id: "S2", label: "Sample A — top of stockpile" },
        { id: "S3", label: "Sample B — middle depth" },
        { id: "S4", label: "Sample C — base/edge" },
        { id: "S5", label: "Shape close-up — worst sample" },
      ],
    },
    {
      code: "M3",
      name: "Reinforcement",
      stage: "Pre-Pour",
      requiresSeniorReview: true,
      slots: [
        { id: "S1", label: "Full rebar cage — longitudinal" },
        { id: "S2", label: "Full rebar cage — transverse" },
        { id: "S3", label: "Bar end marking close-up" },
        { id: "S4", label: "Cover blocks" },
        { id: "S5", label: "Stirrups at critical zone" },
        { id: "S6", label: "Manufacturer marking / bundle tag" },
      ],
    },
    {
      code: "M4",
      name: "Formwork",
      stage: "Pre-Pour",
      slots: [
        { id: "S1", label: "Overall formwork — alignment & bracing" },
        { id: "S2", label: "Joints close-up" },
      ],
    },
    {
      code: "M5",
      name: "Cover Blocks",
      stage: "Pre-Pour",
      slots: [
        { id: "S1", label: "Cover block placement — overview" },
        { id: "S2", label: "Cover block close-up" },
      ],
    },
    {
      code: "M6",
      name: "Mixing",
      stage: "Pour",
      slots: [
        { id: "S1", label: "Mix consistency / batching" },
        { id: "S2", label: "Mixer / equipment in use" },
      ],
    },
    {
      code: "M7",
      name: "Workability",
      stage: "Pour",
      slots: [
        { id: "S1", label: "Slump test / fresh concrete appearance" },
      ],
    },
    {
      code: "M8",
      name: "Placement",
      stage: "Pour",
      slots: [
        { id: "S1", label: "Concrete placement in progress" },
        { id: "S2", label: "Vibrator use during placement" },
      ],
    },
    {
      code: "M9",
      name: "Compaction",
      stage: "Pour",
      slots: [
        { id: "S1", label: "Vibrator insertion / compaction" },
      ],
    },
    {
      code: "M10",
      name: "Finishing",
      stage: "Pour",
      slots: [
        { id: "S1", label: "Finished surface — overview" },
        { id: "S2", label: "Surface close-up (cracks/honeycombing check)" },
      ],
    },
    {
      code: "M11",
      name: "Curing",
      stage: "Post-Pour",
      operational: false, // LOCKED per Rajeev's decision — build but keep non-operational until in SoW
      repeating: true, // 14 sessions over 7 days
      slots: [
        { id: "S1", label: "Curing surface condition" },
        { id: "S2", label: "Random code display" },
      ],
    },
  ],
};
