// Demo data for screenshot / case study mode (?demo=true)
// This file is completely standalone. No imports from the app.
// It returns the same shapes as getAllData() + getSettings().

const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const year = today.getFullYear();

function daysAgo(n: number) {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function daysFromNow(n: number) {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// --- Clients ---
const demoClients = [
  { id: "c1", name: "Meridian Ventures", contact: "Sarah Chen", email: "sarah@meridianventures.com", phone: "(415) 555-0142", address: "580 Market St, San Francisco, CA 94104", notes: "Series B startup. Referred by Jake at Founder's Fund.", rate: 15000, status: "active", additionalContacts: [{ name: "Tom Rivera", email: "tom@meridianventures.com", role: "CTO" }], createdAt: daysAgo(400), updatedAt: daysAgo(5) },
  { id: "c2", name: "Pinebrook Brewing Co.", contact: "Marcus Webb", email: "marcus@pinebrookbrewing.com", phone: "(541) 555-0198", address: "1420 NW Galveston Ave, Bend, OR 97703", notes: "Local craft brewery. Full rebrand + website.", rate: 18000, status: "active", additionalContacts: [], createdAt: daysAgo(350), updatedAt: daysAgo(12) },
  { id: "c3", name: "Atlas Digital Group", contact: "Priya Patel", email: "priya@atlasdigital.io", phone: "(212) 555-0267", address: "88 Pine St, Floor 12, New York, NY 10005", notes: "Agency partner. Sends overflow design work.", rate: 20000, status: "active", additionalContacts: [{ name: "Leo Marks", email: "leo@atlasdigital.io", role: "Creative Director" }], createdAt: daysAgo(500), updatedAt: daysAgo(2) },
  { id: "c4", name: "Solstice Health", contact: "Jordan Reeves", email: "jordan@solsticehealth.co", phone: "(503) 555-0311", address: "2200 NW Thurman St, Portland, OR 97210", notes: "Telehealth platform. HIPAA considerations.", rate: 22000, status: "active", additionalContacts: [], createdAt: daysAgo(300), updatedAt: daysAgo(30) },
  { id: "c5", name: "Redwood & Co.", contact: "Elena Torres", email: "elena@redwoodco.com", phone: "(831) 555-0455", address: "412 Lighthouse Ave, Monterey, CA 93940", notes: "Boutique hotel group. Seasonal campaign work.", rate: 15000, status: "inactive", additionalContacts: [], createdAt: daysAgo(450), updatedAt: daysAgo(90) },
  { id: "c6", name: "Nomad Supply", contact: "Derek Owens", email: "derek@nomadsupply.com", phone: "(720) 555-0523", address: "1899 Blake St, Denver, CO 80202", notes: "Outdoor gear DTC brand. Wrapped up v1 launch.", rate: 20000, status: "inactive", additionalContacts: [], createdAt: daysAgo(550), updatedAt: daysAgo(120) },
  { id: "c7", name: "Bright Path Education", contact: "Nina Kowalski", email: "nina@brightpathedu.org", phone: "(971) 555-0671", address: "830 SW 10th Ave, Portland, OR 97205", notes: "Non-profit. Discounted rate.", rate: 15000, status: "active", additionalContacts: [], createdAt: daysAgo(280), updatedAt: daysAgo(8) },
  { id: "c8", name: "Vanguard Robotics", contact: "Liam Park", email: "liam@vanguardrobotics.com", phone: "(408) 555-0734", address: "2100 N First St, San Jose, CA 95131", notes: "Consumer robotics. Product + packaging design.", rate: 25000, status: "inactive", additionalContacts: [], createdAt: daysAgo(480), updatedAt: daysAgo(150) },
  { id: "c9", name: "Tidewater Capital", contact: "Rachel Morrison", email: "rachel@tidewatercap.com", phone: "(305) 555-0812", address: "1221 Brickell Ave, Miami, FL 33131", notes: "Investment firm. Annual report + pitch deck design.", rate: 18000, status: "inactive", additionalContacts: [], createdAt: daysAgo(420), updatedAt: daysAgo(180) },
];

// --- Projects (4 active, 12 completed) ---
const demoProjects = [
  // Active (4)
  { id: "p1", clientId: "c1", name: "Product Platform Redesign", description: "End-to-end redesign of SaaS platform. Design system, 60+ screens, developer handoff.", status: "active", startDate: daysAgo(75), endDate: null, rate: 150000, rateType: "project", createdAt: daysAgo(75), updatedAt: daysAgo(3) },
  { id: "p2", clientId: "c3", name: "Mobile App Redesign", description: "Full redesign of Atlas client's fitness tracking iOS app. UX audit, wireframes, UI, prototype.", status: "active", startDate: daysAgo(45), endDate: null, rate: 95000, rateType: "project", createdAt: daysAgo(45), updatedAt: daysAgo(2) },
  { id: "p3", clientId: "c4", name: "Patient Portal v2", description: "Second phase of telehealth dashboard. Appointment scheduling, messaging, billing views.", status: "active", startDate: daysAgo(60), endDate: null, rate: 72000, rateType: "project", createdAt: daysAgo(60), updatedAt: daysAgo(5) },
  { id: "p4", clientId: "c7", name: "Annual Report & Campaign", description: "2025 annual report design, infographics, and spring fundraising campaign assets.", status: "active", startDate: daysAgo(30), endDate: null, rate: 38000, rateType: "project", createdAt: daysAgo(30), updatedAt: daysAgo(4) },

  // Completed (12)
  { id: "p5", clientId: "c1", name: "Brand Identity System", description: "Full brand identity. Logo, type system, color palette, brand guidelines, and collateral templates.", status: "completed", startDate: daysAgo(380), endDate: daysAgo(280), rate: 80000, rateType: "project", createdAt: daysAgo(380), updatedAt: daysAgo(280) },
  { id: "p6", clientId: "c1", name: "Marketing Website", description: "Design and development of marketing site. Next.js, Framer Motion, CMS integration.", status: "completed", startDate: daysAgo(260), endDate: daysAgo(180), rate: 112000, rateType: "project", createdAt: daysAgo(260), updatedAt: daysAgo(180) },
  { id: "p7", clientId: "c2", name: "Full Rebrand", description: "Logo, packaging system for 12 SKUs, taproom signage, merch templates, brand guidelines.", status: "completed", startDate: daysAgo(340), endDate: daysAgo(240), rate: 68000, rateType: "project", createdAt: daysAgo(340), updatedAt: daysAgo(240) },
  { id: "p8", clientId: "c2", name: "E-Commerce Platform", description: "Shopify storefront. Custom theme, product photography direction, email templates.", status: "completed", startDate: daysAgo(220), endDate: daysAgo(150), rate: 50000, rateType: "project", createdAt: daysAgo(220), updatedAt: daysAgo(150) },
  { id: "p9", clientId: "c3", name: "Design Systems Consulting", description: "6-month design systems engagement. Component library, documentation, team training.", status: "completed", startDate: daysAgo(420), endDate: daysAgo(240), rate: 140000, rateType: "project", createdAt: daysAgo(420), updatedAt: daysAgo(240) },
  { id: "p10", clientId: "c3", name: "Client Dashboard UI", description: "Analytics dashboard for Atlas enterprise client. Data viz, filtering, export.", status: "completed", startDate: daysAgo(200), endDate: daysAgo(130), rate: 80000, rateType: "project", createdAt: daysAgo(200), updatedAt: daysAgo(130) },
  { id: "p11", clientId: "c4", name: "Patient Portal v1", description: "Initial telehealth patient dashboard. Onboarding flow, provider profiles, video integration.", status: "completed", startDate: daysAgo(280), endDate: daysAgo(190), rate: 72000, rateType: "project", createdAt: daysAgo(280), updatedAt: daysAgo(190) },
  { id: "p12", clientId: "c5", name: "Summer Campaign", description: "Seasonal marketing. Ad creative, landing pages, email templates, social assets.", status: "completed", startDate: daysAgo(360), endDate: daysAgo(280), rate: 42000, rateType: "project", createdAt: daysAgo(360), updatedAt: daysAgo(280) },
  { id: "p13", clientId: "c5", name: "Website Refresh", description: "Refresh of hotel group website. New photography, booking flow improvements, mobile optimization.", status: "completed", startDate: daysAgo(250), endDate: daysAgo(190), rate: 56000, rateType: "project", createdAt: daysAgo(250), updatedAt: daysAgo(190) },
  { id: "p14", clientId: "c6", name: "DTC Launch Site", description: "Product launch site for Nomad Supply's new gear line. Shopify Plus, custom sections.", status: "completed", startDate: daysAgo(500), endDate: daysAgo(400), rate: 65000, rateType: "project", createdAt: daysAgo(500), updatedAt: daysAgo(400) },
  { id: "p15", clientId: "c8", name: "Product & Packaging Design", description: "Industrial design collaboration. Product renders, packaging, unboxing experience, retail display.", status: "completed", startDate: daysAgo(460), endDate: daysAgo(350), rate: 88000, rateType: "project", createdAt: daysAgo(460), updatedAt: daysAgo(350) },
  { id: "p16", clientId: "c9", name: "Investor Materials", description: "Pitch deck, annual report, fund factsheets. Print + digital versions.", status: "completed", startDate: daysAgo(400), endDate: daysAgo(340), rate: 48000, rateType: "project", createdAt: daysAgo(400), updatedAt: daysAgo(340) },
];

// --- Invoices ---
const demoInvoices = [
  // Paid (historical revenue)
  { id: "i1", number: "HFS-001", clientId: "c1", projectId: "p5", status: "paid", issueDate: daysAgo(360), dueDate: daysAgo(345), paidDate: daysAgo(342), notes: "", clientNotes: "", subtotal: 40000, tax: 0, total: 40000, viewToken: "demo001token", viewedDate: daysAgo(358), sentDate: daysAgo(360), recipients: ["sarah@meridianventures.com"], createdAt: daysAgo(360), updatedAt: daysAgo(342) },
  { id: "i2", number: "HFS-002", clientId: "c3", projectId: "p9", status: "paid", issueDate: daysAgo(340), dueDate: daysAgo(325), paidDate: daysAgo(320), notes: "", clientNotes: "", subtotal: 70000, tax: 0, total: 70000, viewToken: "demo002token", viewedDate: daysAgo(338), sentDate: daysAgo(340), recipients: ["priya@atlasdigital.io"], createdAt: daysAgo(340), updatedAt: daysAgo(320) },
  { id: "i3", number: "HFS-003", clientId: "c2", projectId: "p7", status: "paid", issueDate: daysAgo(300), dueDate: daysAgo(285), paidDate: daysAgo(280), notes: "", clientNotes: "", subtotal: 68000, tax: 0, total: 68000, viewToken: "demo003token", viewedDate: daysAgo(298), sentDate: daysAgo(300), recipients: ["marcus@pinebrookbrewing.com"], createdAt: daysAgo(300), updatedAt: daysAgo(280) },
  { id: "i4", number: "HFS-004", clientId: "c5", projectId: "p12", status: "paid", issueDate: daysAgo(280), dueDate: daysAgo(265), paidDate: daysAgo(262), notes: "", clientNotes: "", subtotal: 42000, tax: 0, total: 42000, viewToken: "demo004token", viewedDate: daysAgo(278), sentDate: daysAgo(280), recipients: ["elena@redwoodco.com"], createdAt: daysAgo(280), updatedAt: daysAgo(262) },
  { id: "i5", number: "HFS-005", clientId: "c1", projectId: "p5", status: "paid", issueDate: daysAgo(270), dueDate: daysAgo(255), paidDate: daysAgo(250), notes: "", clientNotes: "", subtotal: 40000, tax: 0, total: 40000, viewToken: "demo005token", viewedDate: daysAgo(268), sentDate: daysAgo(270), recipients: ["sarah@meridianventures.com"], createdAt: daysAgo(270), updatedAt: daysAgo(250) },
  { id: "i6", number: "HFS-006", clientId: "c3", projectId: "p9", status: "paid", issueDate: daysAgo(250), dueDate: daysAgo(235), paidDate: daysAgo(230), notes: "", clientNotes: "", subtotal: 70000, tax: 0, total: 70000, viewToken: "demo006token", viewedDate: daysAgo(248), sentDate: daysAgo(250), recipients: ["priya@atlasdigital.io"], createdAt: daysAgo(250), updatedAt: daysAgo(230) },
  { id: "i7", number: "HFS-007", clientId: "c6", projectId: "p14", status: "paid", issueDate: daysAgo(240), dueDate: daysAgo(225), paidDate: daysAgo(220), notes: "", clientNotes: "", subtotal: 65000, tax: 0, total: 65000, viewToken: "demo007token", viewedDate: daysAgo(238), sentDate: daysAgo(240), recipients: ["derek@nomadsupply.com"], createdAt: daysAgo(240), updatedAt: daysAgo(220) },
  { id: "i8", number: "HFS-008", clientId: "c4", projectId: "p11", status: "paid", issueDate: daysAgo(220), dueDate: daysAgo(205), paidDate: daysAgo(200), notes: "", clientNotes: "", subtotal: 36000, tax: 0, total: 36000, viewToken: "demo008token", viewedDate: daysAgo(218), sentDate: daysAgo(220), recipients: ["jordan@solsticehealth.co"], createdAt: daysAgo(220), updatedAt: daysAgo(200) },
  { id: "i9", number: "HFS-009", clientId: "c1", projectId: "p6", status: "paid", issueDate: daysAgo(200), dueDate: daysAgo(185), paidDate: daysAgo(182), notes: "", clientNotes: "", subtotal: 56000, tax: 0, total: 56000, viewToken: "demo009token", viewedDate: daysAgo(198), sentDate: daysAgo(200), recipients: ["sarah@meridianventures.com"], createdAt: daysAgo(200), updatedAt: daysAgo(182) },
  { id: "i10", number: "HFS-010", clientId: "c8", projectId: "p15", status: "paid", issueDate: daysAgo(180), dueDate: daysAgo(165), paidDate: daysAgo(160), notes: "", clientNotes: "", subtotal: 88000, tax: 0, total: 88000, viewToken: "demo010token", viewedDate: daysAgo(178), sentDate: daysAgo(180), recipients: ["liam@vanguardrobotics.com"], createdAt: daysAgo(180), updatedAt: daysAgo(160) },
  { id: "i11", number: "HFS-011", clientId: "c4", projectId: "p11", status: "paid", issueDate: daysAgo(170), dueDate: daysAgo(155), paidDate: daysAgo(150), notes: "", clientNotes: "", subtotal: 36000, tax: 0, total: 36000, viewToken: "demo011token", viewedDate: daysAgo(168), sentDate: daysAgo(170), recipients: ["jordan@solsticehealth.co"], createdAt: daysAgo(170), updatedAt: daysAgo(150) },
  { id: "i12", number: "HFS-012", clientId: "c5", projectId: "p13", status: "paid", issueDate: daysAgo(160), dueDate: daysAgo(145), paidDate: daysAgo(140), notes: "", clientNotes: "", subtotal: 56000, tax: 0, total: 56000, viewToken: "demo012token", viewedDate: daysAgo(158), sentDate: daysAgo(160), recipients: ["elena@redwoodco.com"], createdAt: daysAgo(160), updatedAt: daysAgo(140) },
  { id: "i13", number: "HFS-013", clientId: "c9", projectId: "p16", status: "paid", issueDate: daysAgo(150), dueDate: daysAgo(135), paidDate: daysAgo(132), notes: "", clientNotes: "", subtotal: 48000, tax: 0, total: 48000, viewToken: "demo013token", viewedDate: daysAgo(148), sentDate: daysAgo(150), recipients: ["rachel@tidewatercap.com"], createdAt: daysAgo(150), updatedAt: daysAgo(132) },
  { id: "i14", number: "HFS-014", clientId: "c3", projectId: "p10", status: "paid", issueDate: daysAgo(130), dueDate: daysAgo(115), paidDate: daysAgo(112), notes: "", clientNotes: "", subtotal: 80000, tax: 0, total: 80000, viewToken: "demo014token", viewedDate: daysAgo(128), sentDate: daysAgo(130), recipients: ["priya@atlasdigital.io"], createdAt: daysAgo(130), updatedAt: daysAgo(112) },
  { id: "i15", number: "HFS-015", clientId: "c2", projectId: "p8", status: "paid", issueDate: daysAgo(110), dueDate: daysAgo(95), paidDate: daysAgo(90), notes: "", clientNotes: "", subtotal: 50000, tax: 0, total: 50000, viewToken: "demo015token", viewedDate: daysAgo(108), sentDate: daysAgo(110), recipients: ["marcus@pinebrookbrewing.com"], createdAt: daysAgo(110), updatedAt: daysAgo(90) },
  { id: "i16", number: "HFS-016", clientId: "c1", projectId: "p6", status: "paid", issueDate: daysAgo(90), dueDate: daysAgo(75), paidDate: daysAgo(72), notes: "", clientNotes: "", subtotal: 56000, tax: 0, total: 56000, viewToken: "demo016token", viewedDate: daysAgo(88), sentDate: daysAgo(90), recipients: ["sarah@meridianventures.com"], createdAt: daysAgo(90), updatedAt: daysAgo(72) },
  { id: "i17", number: "HFS-017", clientId: "c7", projectId: "p4", status: "paid", issueDate: daysAgo(25), dueDate: daysAgo(10), paidDate: daysAgo(8), notes: "", clientNotes: "", subtotal: 22000, tax: 0, total: 22000, viewToken: "demo017token", viewedDate: daysAgo(23), sentDate: daysAgo(25), recipients: ["nina@brightpathedu.org"], createdAt: daysAgo(25), updatedAt: daysAgo(8) },
  { id: "i23", number: "HFS-023", clientId: "c4", projectId: "p3", status: "paid", issueDate: daysAgo(20), dueDate: daysAgo(5), paidDate: daysAgo(15), notes: "", clientNotes: "", subtotal: 14000, tax: 0, total: 14000, viewToken: "demo023token", viewedDate: daysAgo(18), sentDate: daysAgo(20), recipients: ["jordan@solsticehealth.co"], createdAt: daysAgo(20), updatedAt: daysAgo(15) },
  { id: "i24", number: "HFS-024", clientId: "c3", projectId: "p2", status: "paid", issueDate: daysAgo(8), dueDate: daysFromNow(7), paidDate: daysAgo(3), notes: "", clientNotes: "", subtotal: 12000, tax: 0, total: 12000, viewToken: "demo024token", viewedDate: daysAgo(6), sentDate: daysAgo(8), recipients: ["priya@atlasdigital.io"], createdAt: daysAgo(8), updatedAt: daysAgo(3) },

  // Outstanding (2)
  { id: "i18", number: "HFS-018", clientId: "c1", projectId: "p1", status: "outstanding", issueDate: daysAgo(10), dueDate: daysFromNow(5), paidDate: null, notes: "Platform redesign, phase 1 milestone.", clientNotes: "", subtotal: 38000, tax: 0, total: 38000, viewToken: "demo018token", viewedDate: daysAgo(8), sentDate: daysAgo(10), recipients: ["sarah@meridianventures.com"], createdAt: daysAgo(10), updatedAt: daysAgo(10) },
  { id: "i19", number: "HFS-019", clientId: "c3", projectId: "p2", status: "outstanding", issueDate: daysAgo(5), dueDate: daysFromNow(10), paidDate: null, notes: "Mobile app redesign, discovery phase.", clientNotes: "", subtotal: 36000, tax: 0, total: 36000, viewToken: "demo019token", viewedDate: daysAgo(3), sentDate: daysAgo(5), recipients: ["priya@atlasdigital.io"], createdAt: daysAgo(5), updatedAt: daysAgo(5) },

  // Overdue (1)
  { id: "i20", number: "HFS-020", clientId: "c4", projectId: "p3", status: "overdue", issueDate: daysAgo(40), dueDate: daysAgo(25), paidDate: null, notes: "Patient portal v2, design phase.", clientNotes: "", subtotal: 28000, tax: 0, total: 28000, viewToken: "demo020token", viewedDate: daysAgo(38), sentDate: daysAgo(40), recipients: ["jordan@solsticehealth.co"], createdAt: daysAgo(40), updatedAt: daysAgo(40) },

  // Draft (2)
  { id: "i21", number: "HFS-021", clientId: "c1", projectId: "p1", status: "draft", issueDate: todayStr, dueDate: daysFromNow(15), paidDate: null, notes: "", clientNotes: "", subtotal: 38000, tax: 0, total: 38000, viewToken: "demo021token", viewedDate: null, sentDate: null, recipients: [], createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "i22", number: "HFS-022", clientId: "c7", projectId: "p4", status: "draft", issueDate: todayStr, dueDate: daysFromNow(15), paidDate: null, notes: "", clientNotes: "", subtotal: 16000, tax: 0, total: 16000, viewToken: "demo022token", viewedDate: null, sentDate: null, recipients: [], createdAt: todayStr, updatedAt: todayStr },
];

// --- Line Items ---
const demoLineItems = [
  // i1 - Brand Identity phase 1 ($40k)
  { id: "li1a", invoiceId: "i1", description: "Brand Strategy & Discovery", quantity: 1, rate: 12000, amount: 12000, sortOrder: 0 },
  { id: "li1b", invoiceId: "i1", description: "Logo Design & Brand Mark", quantity: 1, rate: 15000, amount: 15000, sortOrder: 1 },
  { id: "li1c", invoiceId: "i1", description: "Typography & Color System", quantity: 1, rate: 13000, amount: 13000, sortOrder: 2 },
  // i2 - Design Systems phase 1 ($70k)
  { id: "li2a", invoiceId: "i2", description: "Design Systems Audit & Architecture", quantity: 1, rate: 28000, amount: 28000, sortOrder: 0 },
  { id: "li2b", invoiceId: "i2", description: "Component Library, Foundation", quantity: 1, rate: 42000, amount: 42000, sortOrder: 1 },
  // i3 - Pinebrook Rebrand ($68k)
  { id: "li3a", invoiceId: "i3", description: "Logo & Brand Identity", quantity: 1, rate: 20000, amount: 20000, sortOrder: 0 },
  { id: "li3b", invoiceId: "i3", description: "Packaging Design, 12 SKUs", quantity: 12, rate: 2500, amount: 30000, sortOrder: 1 },
  { id: "li3c", invoiceId: "i3", description: "Taproom Signage & Merch Templates", quantity: 1, rate: 18000, amount: 18000, sortOrder: 2 },
  // i4 - Summer Campaign ($42k)
  { id: "li4", invoiceId: "i4", description: "Summer Campaign, Creative & Execution", quantity: 1, rate: 42000, amount: 42000, sortOrder: 0 },
  // i5 - Brand Identity phase 2 ($40k)
  { id: "li5a", invoiceId: "i5", description: "Brand Guidelines Document", quantity: 1, rate: 22000, amount: 22000, sortOrder: 0 },
  { id: "li5b", invoiceId: "i5", description: "Collateral Templates (12 pieces)", quantity: 12, rate: 1500, amount: 18000, sortOrder: 1 },
  // i6 - Design Systems phase 2 ($70k)
  { id: "li6", invoiceId: "i6", description: "Component Library, Advanced Components + Documentation", quantity: 1, rate: 70000, amount: 70000, sortOrder: 0 },
  // i7 - Nomad Supply Launch ($65k)
  { id: "li7a", invoiceId: "i7", description: "E-Commerce Site, Custom Shopify Theme", quantity: 1, rate: 32000, amount: 32000, sortOrder: 0 },
  { id: "li7b", invoiceId: "i7", description: "Product Photography Direction", quantity: 1, rate: 15000, amount: 15000, sortOrder: 1 },
  { id: "li7c", invoiceId: "i7", description: "Launch Campaign Assets", quantity: 1, rate: 18000, amount: 18000, sortOrder: 2 },
  // i8 - Patient Portal v1 phase 1 ($36k)
  { id: "li8a", invoiceId: "i8", description: "UX Research & Wireframes", quantity: 1, rate: 18000, amount: 18000, sortOrder: 0 },
  { id: "li8b", invoiceId: "i8", description: "Onboarding Flow Design", quantity: 1, rate: 18000, amount: 18000, sortOrder: 1 },
  // i9 - Marketing Website phase 1 ($56k)
  { id: "li9a", invoiceId: "i9", description: "Information Architecture & Wireframes", quantity: 1, rate: 16000, amount: 16000, sortOrder: 0 },
  { id: "li9b", invoiceId: "i9", description: "Homepage & Key Pages Design", quantity: 5, rate: 8000, amount: 40000, sortOrder: 1 },
  // i10 - Vanguard Robotics ($88k)
  { id: "li10a", invoiceId: "i10", description: "Product Renders, 3D Visualization", quantity: 8, rate: 4500, amount: 36000, sortOrder: 0 },
  { id: "li10b", invoiceId: "i10", description: "Packaging Design & Unboxing Experience", quantity: 1, rate: 28000, amount: 28000, sortOrder: 1 },
  { id: "li10c", invoiceId: "i10", description: "Retail Display Design", quantity: 1, rate: 24000, amount: 24000, sortOrder: 2 },
  // i11 - Patient Portal v1 phase 2 ($36k)
  { id: "li11a", invoiceId: "i11", description: "UI Design, Provider Profiles & Video Integration", quantity: 1, rate: 22000, amount: 22000, sortOrder: 0 },
  { id: "li11b", invoiceId: "i11", description: "Developer Handoff & QA Support", quantity: 1, rate: 14000, amount: 14000, sortOrder: 1 },
  // i12 - Website Refresh ($56k)
  { id: "li12a", invoiceId: "i12", description: "Website Redesign, Photography Integration", quantity: 1, rate: 24000, amount: 24000, sortOrder: 0 },
  { id: "li12b", invoiceId: "i12", description: "Booking Flow Improvements", quantity: 1, rate: 18000, amount: 18000, sortOrder: 1 },
  { id: "li12c", invoiceId: "i12", description: "Mobile Optimization", quantity: 1, rate: 14000, amount: 14000, sortOrder: 2 },
  // i13 - Tidewater Capital ($48k)
  { id: "li13a", invoiceId: "i13", description: "Pitch Deck Design (40 slides)", quantity: 1, rate: 28000, amount: 28000, sortOrder: 0 },
  { id: "li13b", invoiceId: "i13", description: "Annual Report Design & Layout", quantity: 1, rate: 20000, amount: 20000, sortOrder: 1 },
  // i14 - Client Dashboard ($80k)
  { id: "li14a", invoiceId: "i14", description: "Dashboard UX & Data Visualization", quantity: 1, rate: 36000, amount: 36000, sortOrder: 0 },
  { id: "li14b", invoiceId: "i14", description: "Filtering, Export & Admin Views", quantity: 1, rate: 28000, amount: 28000, sortOrder: 1 },
  { id: "li14c", invoiceId: "i14", description: "Developer Handoff Documentation", quantity: 1, rate: 16000, amount: 16000, sortOrder: 2 },
  // i15 - E-Commerce Platform ($50k)
  { id: "li15a", invoiceId: "i15", description: "Shopify Theme Development", quantity: 1, rate: 32000, amount: 32000, sortOrder: 0 },
  { id: "li15b", invoiceId: "i15", description: "Email Template Suite (6 templates)", quantity: 6, rate: 3000, amount: 18000, sortOrder: 1 },
  // i16 - Marketing Website phase 2 ($56k)
  { id: "li16a", invoiceId: "i16", description: "Responsive Development & Animation", quantity: 1, rate: 30000, amount: 30000, sortOrder: 0 },
  { id: "li16b", invoiceId: "i16", description: "CMS Integration & Content Migration", quantity: 1, rate: 26000, amount: 26000, sortOrder: 1 },
  // i17 - Annual Report deposit ($22k)
  { id: "li17", invoiceId: "i17", description: "Annual Report Design, 50% Deposit", quantity: 1, rate: 22000, amount: 22000, sortOrder: 0 },
  // i23 - Patient Portal v2 initial ($14k)
  { id: "li23", invoiceId: "i23", description: "Design Exploration & Wireframes", quantity: 1, rate: 14000, amount: 14000, sortOrder: 0 },
  // i24 - Mobile App UX phase ($12k)
  { id: "li24", invoiceId: "i24", description: "UX Research & User Testing", quantity: 1, rate: 12000, amount: 12000, sortOrder: 0 },
  // i18 - Platform Redesign phase 1 ($38k)
  { id: "li18a", invoiceId: "i18", description: "Design System Foundation, Tokens & Primitives", quantity: 1, rate: 14000, amount: 14000, sortOrder: 0 },
  { id: "li18b", invoiceId: "i18", description: "Core Screens: Dashboard, Settings, Onboarding", quantity: 15, rate: 1600, amount: 24000, sortOrder: 1 },
  // i19 - Mobile App Discovery ($36k)
  { id: "li19a", invoiceId: "i19", description: "UX Audit & Competitive Analysis", quantity: 1, rate: 12000, amount: 12000, sortOrder: 0 },
  { id: "li19b", invoiceId: "i19", description: "Wireframe Kit (28 screens)", quantity: 28, rate: 500, amount: 14000, sortOrder: 1 },
  { id: "li19c", invoiceId: "i19", description: "Interactive Prototype (Figma)", quantity: 1, rate: 10000, amount: 10000, sortOrder: 2 },
  // i20 - Patient Portal v2 overdue ($28k)
  { id: "li20a", invoiceId: "i20", description: "Appointment Scheduling UI", quantity: 1, rate: 15000, amount: 15000, sortOrder: 0 },
  { id: "li20b", invoiceId: "i20", description: "Messaging Interface Design", quantity: 1, rate: 13000, amount: 13000, sortOrder: 1 },
  // i21 - Platform Redesign phase 2 draft ($38k)
  { id: "li21a", invoiceId: "i21", description: "Advanced Screens: Analytics, Billing, Team", quantity: 20, rate: 1200, amount: 24000, sortOrder: 0 },
  { id: "li21b", invoiceId: "i21", description: "Design QA & Developer Handoff", quantity: 1, rate: 14000, amount: 14000, sortOrder: 1 },
  // i22 - Annual Report final draft ($16k)
  { id: "li22a", invoiceId: "i22", description: "Annual Report, Final Delivery & Print Prep", quantity: 1, rate: 10000, amount: 10000, sortOrder: 0 },
  { id: "li22b", invoiceId: "i22", description: "Campaign Assets, Digital & Print", quantity: 1, rate: 6000, amount: 6000, sortOrder: 1 },
];

// --- Expenses ---
const demoExpenses = [
  { id: "e1", date: daysAgo(350), vendor: "Adobe", description: "Creative Cloud, All Apps Annual", category: "software", amount: 659.88, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 0, recurringDay: null, recurringSourceId: null, createdAt: daysAgo(350), updatedAt: daysAgo(350) },
  { id: "e2", date: daysAgo(300), vendor: "Figma", description: "Organization Plan, Annual", category: "software", amount: 600, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 0, recurringDay: null, recurringSourceId: null, createdAt: daysAgo(300), updatedAt: daysAgo(300) },
  { id: "e3", date: daysAgo(250), vendor: "Vercel", description: "Pro Plan, Monthly", category: "software", amount: 20, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 1, recurringDay: 1, recurringSourceId: null, createdAt: daysAgo(250), updatedAt: daysAgo(250) },
  { id: "e4", date: daysAgo(200), vendor: "Apple", description: "Studio Display", category: "equipment", amount: 1599, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 0, recurringDay: null, recurringSourceId: null, createdAt: daysAgo(200), updatedAt: daysAgo(200) },
  { id: "e5", date: daysAgo(180), vendor: "Anthropic", description: "Claude Pro, Monthly", category: "software", amount: 20, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 1, recurringDay: 15, recurringSourceId: null, createdAt: daysAgo(180), updatedAt: daysAgo(180) },
  { id: "e6", date: daysAgo(150), vendor: "Superhuman", description: "Email, Monthly", category: "software", amount: 30, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 1, recurringDay: 1, recurringSourceId: null, createdAt: daysAgo(150), updatedAt: daysAgo(150) },
  { id: "e7", date: daysAgo(120), vendor: "Framer", description: "Pro Plan, Annual", category: "software", amount: 240, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 0, recurringDay: null, recurringSourceId: null, createdAt: daysAgo(120), updatedAt: daysAgo(120) },
  { id: "e8", date: daysAgo(90), vendor: "Delta Airlines", description: "Round-trip to NYC for Atlas meeting", category: "travel", amount: 487, clientId: "c3", projectId: "p2", notes: "", taxDeductible: 1, receiptUrl: null, recurring: 0, recurringDay: null, recurringSourceId: null, createdAt: daysAgo(90), updatedAt: daysAgo(90) },
  { id: "e9", date: daysAgo(88), vendor: "The Standard Hotel", description: "2 nights in NYC for client meeting", category: "travel", amount: 640, clientId: "c3", projectId: "p2", notes: "", taxDeductible: 1, receiptUrl: null, recurring: 0, recurringDay: null, recurringSourceId: null, createdAt: daysAgo(88), updatedAt: daysAgo(88) },
  { id: "e10", date: daysAgo(60), vendor: "Linear", description: "Standard Plan, Monthly", category: "software", amount: 8, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 1, recurringDay: 1, recurringSourceId: null, createdAt: daysAgo(60), updatedAt: daysAgo(60) },
  { id: "e11", date: daysAgo(45), vendor: "Notion", description: "Plus Plan, Monthly", category: "software", amount: 10, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 1, recurringDay: 15, recurringSourceId: null, createdAt: daysAgo(45), updatedAt: daysAgo(45) },
  { id: "e12", date: daysAgo(30), vendor: "Google Workspace", description: "Business Starter, Monthly", category: "software", amount: 7.20, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 1, recurringDay: 1, recurringSourceId: null, createdAt: daysAgo(30), updatedAt: daysAgo(30) },
  { id: "e13", date: daysAgo(20), vendor: "Anthropic", description: "Claude Max, Monthly", category: "software", amount: 100, clientId: null, projectId: null, notes: "Upgraded for extended thinking", taxDeductible: 1, receiptUrl: null, recurring: 1, recurringDay: 15, recurringSourceId: null, createdAt: daysAgo(20), updatedAt: daysAgo(20) },
  { id: "e14", date: daysAgo(15), vendor: "Raycast", description: "Pro Plan, Annual", category: "software", amount: 96, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 0, recurringDay: null, recurringSourceId: null, createdAt: daysAgo(15), updatedAt: daysAgo(15) },
  { id: "e15", date: daysAgo(5), vendor: "Arc", description: "Max Plan, Annual", category: "software", amount: 144, clientId: null, projectId: null, notes: "", taxDeductible: 1, receiptUrl: null, recurring: 0, recurringDay: null, recurringSourceId: null, createdAt: daysAgo(5), updatedAt: daysAgo(5) },
];

// --- Prospects ---
const demoProspects = [
  { id: "pr1", company: "Cascade Labs", contact: "Ryan Cho", email: "ryan@cascadelabs.io", opportunity: "SaaS product design, full UI/UX", status: "lead", dealSize: "$45,000", source: "Referral", temperature: "hot", lastContact: daysAgo(3), nextAction: daysFromNow(2), notes: "Met at PDX Tech Meetup. Very interested. Send proposal by end of week.", convertedClientId: null, createdAt: daysAgo(7), updatedAt: daysAgo(3) },
  { id: "pr2", company: "Timber & Stone", contact: "Megan Cole", email: "megan@timberstone.co", opportunity: "Restaurant website + branding", status: "lead", dealSize: "$24,000", source: "Instagram DM", temperature: "warm", lastContact: daysAgo(10), nextAction: daysFromNow(5), notes: "New restaurant opening in the Pearl District. Follow up on scope.", convertedClientId: null, createdAt: daysAgo(14), updatedAt: daysAgo(10) },
  { id: "pr3", company: "Vellum Press", contact: "Alex Kim", email: "alex@vellumpress.com", opportunity: "Publisher website redesign", status: "proposal", dealSize: "$32,000", source: "Cold outreach", temperature: "warm", lastContact: daysAgo(5), nextAction: daysFromNow(7), notes: "Sent proposal. Decision expected next week. Waiting on budget approval.", convertedClientId: null, createdAt: daysAgo(30), updatedAt: daysAgo(5) },
  { id: "pr4", company: "GreenLoop Logistics", contact: "Dana West", email: "dana@greenloop.com", opportunity: "Fleet management dashboard", status: "lead", dealSize: "$55,000", source: "Website inquiry", temperature: "cold", lastContact: daysAgo(20), nextAction: daysAgo(5), notes: "Filled out contact form. Large company. Need to schedule discovery call.", convertedClientId: null, createdAt: daysAgo(22), updatedAt: daysAgo(20) },
  { id: "pr5", company: "Aether Devices", contact: "James Nakamura", email: "james@aetherdevices.com", opportunity: "IoT consumer device, product & packaging design", status: "proposal", dealSize: "$65,000", source: "Referral", temperature: "hot", lastContact: daysAgo(2), nextAction: daysFromNow(4), notes: "Smart home hardware startup. Series A funded. Needs product renders, packaging, retail display. Referred by Liam at Vanguard.", convertedClientId: null, createdAt: daysAgo(12), updatedAt: daysAgo(2) },
  { id: "pr6", company: "Wavelength AI", contact: "Sasha Patel", email: "sasha@wavelength.dev", opportunity: "AI design-to-code platform, brand & product", status: "intro", dealSize: "$40,000", source: "Twitter DM", temperature: "hot", lastContact: daysAgo(1), nextAction: daysFromNow(3), notes: "Building AI-powered design-to-code tool. Y Combinator W26. Need full brand identity + product UI for launch. Vibe coding angle, their pitch is 'design by describing.'", convertedClientId: null, createdAt: daysAgo(5), updatedAt: daysAgo(1) },
  { id: "pr7", company: "Ridgeline Outdoors", contact: "Ben Torres", email: "ben@ridgelineoutdoors.com", opportunity: "DTC brand refresh + Shopify rebuild", status: "negotiation", dealSize: "$35,000", source: "Referral", temperature: "warm", lastContact: daysAgo(4), nextAction: daysFromNow(1), notes: "Premium outdoor gear. Outgrew their Squarespace site. Negotiating scope, may add content strategy.", convertedClientId: null, createdAt: daysAgo(18), updatedAt: daysAgo(4) },
];

// --- Demo Settings ---
const demoSettings = {
  id: "default",
  ownerName: "Alex Morgan",
  companyName: "Basecamp Studio",
  location: "Portland, Oregon",
  businessEmail: "alex@basecampstudio.co",
  logoUrl: "",
  ein: "82-1234567",
  paymentMethodLabel: "Wire Transfer / ACH",
  bankName: "First Republic",
  accountNumber: "••••••4821",
  routingNumber: "••••••0760",
  lateFeeRate: 1.5,
  paymentTermsDays: 15,
  invoicePrefix: "HFS",
  defaultTaxRate: 0,
  currency: "USD",
  invoiceEmailSubject: "Invoice {number} from {company}",
  reminderEmailSubject: "Reminder: Invoice {number} is overdue",
  emailSignature: "Thanks,\nAlex",
  defaultTaxDeductible: 1,
  updatedAt: todayStr,
};

export function getDemoData() {
  return {
    clients: demoClients,
    projects: demoProjects,
    invoices: demoInvoices,
    lineItems: demoLineItems,
    expenses: demoExpenses,
    prospects: demoProspects,
  };
}

export function getDemoSettings() {
  return demoSettings;
}
