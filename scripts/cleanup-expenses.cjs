const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const updates = [
  // Software subscriptions - vendor/desc identical or vendor contains description
  ["vendor = 'Google One - Email + Storage'", "Google", "Google One - Email + Storage", "software"],
  ["vendor = 'Software - superhuman email' OR vendor = 'Software - Superhuman email' OR vendor = 'Superhuman email'", "Superhuman", "Email client", "software"],
  ["vendor = 'Claude Pro'", "Anthropic", "Claude Pro", "software"],
  ["vendor = 'Slack Pro'", "Slack", "Slack Pro", "software"],
  ["vendor = 'ChatGPT'", "OpenAI", "ChatGPT Plus", "software"],
  ["vendor = 'Figma - Yearly'", "Figma", "Organization plan - Yearly", "software"],
  ["vendor = 'Dropbox Storage'", "Dropbox", "Cloud storage", "software"],
  ["vendor = 'Grammarly subscription'", "Grammarly", "Writing assistant", "software"],
  ["vendor = 'Framer website builder'", "Framer", "Website builder", "software"],
  ["vendor = 'Freepik Stock images'", "Freepik", "Stock images", "software"],
  ["vendor = 'Google Workspace'", "Google", "Workspace", "software"],
  ["vendor = 'Illustrator'", "Adobe", "Illustrator", "software"],
  ["vendor = 'Photoshop'", "Adobe", "Photoshop", "software"],
  ["vendor = 'Lightroom plan with 3TB'", "Adobe", "Lightroom plan with 3TB", "software"],
  ["vendor = 'Mobbin yearly membership'", "Mobbin", "Yearly membership", "software"],
  ["vendor = 'Zapier'", "Zapier", "Automation platform", "software"],
  ["vendor = 'Asana project management software'", "Asana", "Project management", "software"],
  ["vendor = 'Sketch design software license'", "Sketch", "Design software license", "software"],
  ["vendor = 'Stock photography membership'", "Stock Photography", "Membership", "software"],
  ["vendor = 'Web hosting'", "Web Host", "Hosting", "software"],
  ["vendor = 'Apple Monitor'", "Apple", "Monitor", "hardware"],
  ["vendor = 'Canon Camera'", "Canon", "Camera", "hardware"],
  ["vendor = 'iPad, Cover, Apple Pencil'", "Apple", "iPad, Cover, Apple Pencil", "hardware"],
  ["vendor = 'iPhone 11 Pro'", "Apple", "iPhone 11 Pro", "hardware"],
  ["vendor = 'Apple TV for project use'", "Apple", "Apple TV for project use", null],
  ["vendor = 'Apple watch + headphones'", "Apple", "Watch + headphones", null],
  ["vendor = 'Apple watch for design project'", "Apple", "Watch for design project", null],

  // Marketing
  ["vendor = 'Kit.com - Email Marketing'", "Kit", "Email marketing platform", "marketing"],
  ["vendor = 'LinkedIn Premium Business'", "LinkedIn", "Premium Business", "marketing"],
  ["vendor = 'LinkedIn Sales Navigator Core'", "LinkedIn", "Sales Navigator Core", "marketing"],
  ["vendor = 'Twitter Premium'", "X (Twitter)", "Premium subscription", "marketing"],

  // Google misc
  ["vendor LIKE 'Google Apps%'", "Google", "Google Apps - Email, docs, sheets", "software"],
  ["vendor LIKE 'Goolge Fi%'", "Google", "Google Fi Voicemail", "software"],

  // Coaching/Education
  ["vendor LIKE 'Business Coach%Dai%'", "Dai Manuel", "Business coaching", "education"],
  ["vendor LIKE 'Business Coaching%Kate%'", "Kate Bagoy", "Business coaching", "education"],
  ["vendor LIKE 'Dai Manuel%'", "Dai Manuel", "Life & business coaching", "education"],
  ["vendor LIKE 'Coaching Rob%'", "Rob O'Rourke", "Coaching", "education"],
  ["vendor LIKE 'Conference%Creative Works%'", "Creative Works", "Conference - Seattle", "education"],
  ["vendor = 'Epicurrence Conference'", "Epicurrence", "Conference", "education"],
  ["vendor = 'Travel - Epicurrence'", "Epicurrence", "Conference travel", "travel"],

  // Processing fees
  ["vendor = 'Northwest Registered Agent' AND description = 'Northwest Registered Agent'", "Northwest Registered Agent", "Registered agent service", "legal"],
  ["vendor = 'Gotham Font'", "Hoefler & Co", "Gotham Font license", "software"],

  // Anthropic where desc is also just 'Anthropic'
  ["vendor = 'Anthropic' AND description = 'Anthropic'", "Anthropic", "API usage", null],

  // AirBnB
  ["vendor = 'AirBnB - Research studies'", "Airbnb", "Research studies", "travel"],
  ["vendor = 'Seattle AirBnB'", "Airbnb", "Seattle", "travel"],

  // Gas entries
  ["vendor LIKE 'Gas Bend%' OR vendor LIKE 'Gas Sea%' OR vendor LIKE 'Gas Seattle%'", null, null, "travel"],
  ["vendor = 'Gas - Creative works conference travel'", "Gas Station", "Creative Works conference travel", "travel"],
  ["vendor = 'Bend > KIR Research - Gas'", "Gas Station", "Bend > Klamath - Research", "travel"],

  // Cell phone
  ["vendor LIKE 'Cell phone 2019%'", "Cell Provider", "Cell phone service 2019", "office"],
  ["vendor LIKE 'Cell phone 2020%'", "Cell Provider", "Cell phone service 2020", "office"],

  // Internet
  ["vendor LIKE 'Internet (12mos%'", "ISP", "Internet service (12 months)", "office"],
  ["vendor = 'Internet - Home Office 2020'", "ISP", "Internet - Home office 2020", "office"],

  // Office deductions
  ["vendor LIKE 'Home office space deduction%'", "Home Office", null, "office-rent"],

  // Uber rides
  ["vendor LIKE 'Uber%'", "Uber", null, "travel"],
  ["vendor LIKE 'Ewr >%'", "Uber", null, "travel"],

  // Flights/Hotels
  ["vendor = 'NYC > RDM Flight'", "Airline", "NYC > RDM flight", "travel"],
  ["vendor = 'RDM > NYC Flight and Hotel'", "Travel", "RDM > NYC flight and hotel", "travel"],
  ["vendor LIKE 'RDM >%one way'", "Airline", null, "travel"],
  ["vendor = 'Hotel'", "Hotel", "Accommodation", "travel"],
  ["vendor = 'KIR hotel - research studies'", "Hotel", "Klamath - Research studies", "travel"],
  ["vendor LIKE 'RDM / NYC%parking'", "Airport", "Parking - RDM/NYC trip", "travel"],
  ["vendor = 'Airport parking'", "Airport", "Parking", "travel"],
  ["vendor LIKE 'Goog RDM%'", "Google", "RDM > SFO travel", "travel"],
  ["vendor LIKE 'Inflight internet%'", "Airline", null, "travel"],

  // Article desk
  ["vendor LIKE 'Article Desk%'", "Article", "Desk (depreciated value)", null],
  ["vendor = 'Craftsman tool drawers for office'", "Craftsman", "Tool drawers for office", "office"],

  // 2018/2024 tax
  ["vendor = '2018 Taxes'", "Tax Preparer", "2018 taxes", "taxes-licenses"],
  ["vendor = '2024 business tax prep'", "Tax Preparer", "2024 business tax prep", "accounting"],
];

async function run() {
  let totalUpdated = 0;

  for (const [where, vendor, description, category] of updates) {
    const setClauses = [];
    const args = [];
    if (vendor !== null && vendor !== undefined) {
      setClauses.push("vendor = ?");
      args.push(vendor);
    }
    if (description !== null && description !== undefined) {
      setClauses.push("description = ?");
      args.push(description);
    }
    if (category !== null && category !== undefined) {
      setClauses.push("category = ?");
      args.push(category);
    }
    if (setClauses.length === 0) continue;

    const sql = `UPDATE expenses SET ${setClauses.join(", ")} WHERE ${where}`;
    try {
      const result = await db.execute({ sql, args });
      if (result.rowsAffected > 0) {
        console.log(`  ✓ ${result.rowsAffected} rows: ${where.substring(0, 70)}`);
        totalUpdated += result.rowsAffected;
      }
    } catch (err) {
      console.error(`  ✗ FAILED: ${where.substring(0, 50)} - ${err.message}`);
    }
  }

  // Fix Bonsai subscription descriptions - extract plan type from brackets
  const bonsaiSubs = await db.execute("SELECT id, description FROM expenses WHERE vendor = 'Bonsai' AND description LIKE 'Bonsai Subscription%'");
  for (const row of bonsaiSubs.rows) {
    const match = String(row.description).match(/\[(.+?)\]/);
    if (match) {
      const plan = match[1].charAt(0) + match[1].slice(1).toLowerCase();
      await db.execute({ sql: "UPDATE expenses SET description = ? WHERE id = ?", args: [`${plan} plan`, row.id] });
      totalUpdated++;
    }
  }
  if (bonsaiSubs.rows.length > 0) console.log(`  ✓ ${bonsaiSubs.rows.length} rows: Bonsai subscription plan names`);

  // Fix Bonsai payment fee descriptions
  const bonsaiPay = await db.execute("SELECT id, description FROM expenses WHERE vendor = 'Bonsai' AND description LIKE 'Bonsai Payments%'");
  for (const row of bonsaiPay.rows) {
    const match = String(row.description).match(/Invoice #(\d+)/);
    const desc = match ? `Processing fee - Invoice #${match[1]}` : "Processing fee";
    await db.execute({ sql: "UPDATE expenses SET description = ? WHERE id = ?", args: [desc, row.id] });
    totalUpdated++;
  }
  if (bonsaiPay.rows.length > 0) console.log(`  ✓ ${bonsaiPay.rows.length} rows: Bonsai payment fee descriptions`);

  // Fix PayPal payment fee descriptions
  const ppPay = await db.execute("SELECT id, description FROM expenses WHERE vendor = 'PayPal' AND description LIKE 'PayPal Processing%'");
  for (const row of ppPay.rows) {
    const match = String(row.description).match(/Invoice #(\d+)/);
    const desc = match ? `Processing fee - Invoice #${match[1]}` : "Processing fee";
    await db.execute({ sql: "UPDATE expenses SET description = ? WHERE id = ?", args: [desc, row.id] });
    totalUpdated++;
  }
  if (ppPay.rows.length > 0) console.log(`  ✓ ${ppPay.rows.length} rows: PayPal payment fee descriptions`);

  // Fix Font vendor/descriptions
  const fonts = await db.execute("SELECT id, vendor FROM expenses WHERE vendor LIKE 'Fonts -%'");
  for (const row of fonts.rows) {
    const fontName = String(row.vendor).replace("Fonts - ", "");
    await db.execute({ sql: "UPDATE expenses SET vendor = 'Font Purchase', description = ? WHERE id = ?", args: [fontName, row.id] });
    totalUpdated++;
  }
  if (fonts.rows.length > 0) console.log(`  ✓ ${fonts.rows.length} rows: Font purchase names`);

  // Fix Domain registrations
  const domains = await db.execute("SELECT id, vendor FROM expenses WHERE vendor LIKE 'Domain -%'");
  for (const row of domains.rows) {
    const domain = String(row.vendor).replace("Domain - ", "");
    await db.execute({ sql: "UPDATE expenses SET vendor = 'Domain Registrar', description = ? WHERE id = ?", args: [domain, row.id] });
    totalUpdated++;
  }
  if (domains.rows.length > 0) console.log(`  ✓ ${domains.rows.length} rows: Domain registration names`);

  // Fix legacy domain registration entries
  const legacyDomains = await db.execute("SELECT id, vendor FROM expenses WHERE vendor LIKE '%domain registration%' OR vendor LIKE '%domains'");
  for (const row of legacyDomains.rows) {
    let desc = String(row.vendor);
    // Extract domain name from description
    const domainMatch = desc.match(/([\w.-]+\.\w+)/);
    const domainName = domainMatch ? domainMatch[1] : desc;
    await db.execute({ sql: "UPDATE expenses SET vendor = 'Domain Registrar', description = ? WHERE id = ?", args: [domainName, row.id] });
    totalUpdated++;
  }
  if (legacyDomains.rows.length > 0) console.log(`  ✓ ${legacyDomains.rows.length} rows: Legacy domain registrations`);

  // Fix Home office - keep description
  const homeOffice = await db.execute("SELECT id, vendor, description FROM expenses WHERE vendor = 'Home Office'");
  for (const row of homeOffice.rows) {
    const desc = String(row.description);
    const cleanDesc = desc.includes("144sq") ? "Home office space deduction (144 sq ft)" : desc;
    await db.execute({ sql: "UPDATE expenses SET description = ? WHERE id = ?", args: [cleanDesc, row.id] });
  }

  // Fix Uber - keep existing description if meaningful
  const ubers = await db.execute("SELECT id, vendor, description FROM expenses WHERE vendor = 'Uber' AND description LIKE 'Uber%'");
  for (const row of ubers.rows) {
    let desc = String(row.description);
    desc = desc.replace(/^Uber\s*/, "").replace(/^uber\s*/i, "");
    if (desc) {
      await db.execute({ sql: "UPDATE expenses SET description = ? WHERE id = ?", args: [desc, row.id] });
    }
  }

  console.log(`\nDone! Total rows updated: ${totalUpdated}+`);

  // Final verification - show distinct vendor/description
  console.log("\n--- Verify: Current distinct vendor/description combos ---");
  const verify = await db.execute("SELECT DISTINCT vendor, description, category FROM expenses ORDER BY vendor LIMIT 50");
  for (const row of verify.rows) {
    console.log(`  ${row.vendor} | ${row.description} | ${row.category}`);
  }
}

run().catch(console.error);
