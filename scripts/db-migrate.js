/**
 * Project Lazarus — Data Improvement Migration
 * Executes all approved changes from the 12 June 2026 Data Improvement Plan.
 * Run once: node scripts/db-migrate.js
 */

import Database from 'better-sqlite3';
const db = new Database('data/lazarus.db');

const migrate = db.transaction(() => {

  // ─────────────────────────────────────────────────────
  // 1. CLIENT — Descriptions, Icons, Colors
  // ─────────────────────────────────────────────────────

  db.prepare("UPDATE clients SET icon='GraduationCap', description=? WHERE id=1").run(
    "Founded in 1998 by Dr. Kalyani Vallath, Vallath Education is a Kerala-based institution specialising in English literature coaching and competitive exam preparation (UGC NET, GATE, CUET, Kerala PSC). Operates physical centres in Thiruvananthapuram and Aluva, as well as online classes, and runs a publishing arm — Vallath Books — producing study materials for English literature students and teachers."
  );
  console.log('✅ Vallath Education — updated');

  db.prepare("UPDATE clients SET icon='Briefcase', description=? WHERE id=2").run(
    "Bequip Advisory LLP is a multi-disciplinary professional business consultancy firm based in Kochi, Kerala, founded in 2009. Provides integrated corporate, legal, financial, tax, compliance, HR, and investor relations advisory services for businesses at every stage — from setting up, stepping up, to scaling up. Q4 engaged to support investor pitch deck preparation and SME growth strategy."
  );
  console.log('✅ Bequip — updated');

  // Q4 Consulting (3) — leave description blank, just keep as-is
  // Beaconhands (4) — leave description blank
  db.prepare("UPDATE clients SET icon='Handshake', color='--purple' WHERE id=4").run();
  console.log('✅ Beaconhands — icon/color updated');

  // Gulf Workforce Partners (5) — leave description blank
  db.prepare("UPDATE clients SET icon='Globe', color='--amber' WHERE id=5").run();
  console.log('✅ Gulf Workforce Partners — icon/color updated');

  db.prepare("UPDATE clients SET icon='Calculator', description=? WHERE id=6").run(
    "Q4's accounting arm. Handles proposals (eTalon) and internal bookkeeping support."
  );
  console.log('✅ Q4 Accounting — updated');

  db.prepare("UPDATE clients SET icon='Zap', description=? WHERE id=7").run(
    "Ostrich Mobility Instruments Pvt. Ltd. is a Bengaluru-based manufacturer of advanced mobility solutions for elderly and differently-abled individuals, founded in 2007 by former IT professionals. Products include electric wheelchairs (with proprietary Split Frame Technology and Automatic Wheelbase Adjuster), mobility scooters, and the Intimate Series of electric hospital/home care beds. Recognised among India's Top Innovative MSMEs. Q4 engaged for full operations consulting across sales, service, production, and procurement verticals."
  );
  console.log('✅ Ostrich Mobility — updated');

  db.prepare("UPDATE clients SET color='--green', description=? WHERE id=8").run(
    "Qual Group is an Australian monday.com consulting firm that helps small-to-medium businesses build scalable systems and processes on the monday.com platform. They operate across multiple service verticals and manage a large cleaning operations workforce across 57 sites. Q4 engaged to implement Connecteam for workforce management, scheduling, and payroll, and to assist with HubSpot CRM setup."
  );
  console.log('✅ Qual Group — updated');

  db.prepare("UPDATE clients SET icon='TrendingUp', color='--amber', description=? WHERE id=9").run(
    "PE Group is a multi-company finance group comprising 12+ entities. Q4 engaged to support daily cash flow management, ClickUp compliance dashboard setup, and financial process structuring."
  );
  console.log('✅ PE Group — updated');

  db.prepare("UPDATE clients SET icon='Cpu', color='--purple', description=? WHERE id=10").run(
    "Intellex is a client engaged for project tracking dashboard setup and data management tooling. Q4 supporting with a project tracker sheet and operational dashboard."
  );
  console.log('✅ Intellex — updated');

  db.prepare("UPDATE clients SET icon='Tv', description=? WHERE id=11").run(
    "Channeliam (Channel I'M) is India's first exclusive digital media platform dedicated to startups and SMEs, based in Kerala. Founded by Nisha Krishan, it operates as an AI-powered digital newsroom with a focus on constructive journalism, startup storytelling, and innovation coverage. Q4 engaged for investor pitch deck preparation and lead qualification strategy."
  );
  console.log('✅ Channeliam — updated');


  // ─────────────────────────────────────────────────────
  // 2. PROJECTS — Rename existing, add descriptions
  // ─────────────────────────────────────────────────────

  db.prepare("UPDATE projects SET name='Consulting', description='Ongoing operations consulting engagement for Vallath Education covering team capability, role clarity, finance process, and operational alignment.' WHERE id=2").run();
  console.log('✅ Project [2] renamed → Consulting');

  db.prepare("UPDATE projects SET description='Faculty Development Program (FDP) at NICHE College (Nish College of Higher Education). 15-day program, Batch 1 started June 1st 2026. Covers attendance, assessments, evidence documentation, and scoring.' WHERE id=4").run();
  console.log('✅ Project [4] NICHE — description added');


  // ─────────────────────────────────────────────────────
  // 3. PROJECTS — Create new
  // ─────────────────────────────────────────────────────

  const cp = db.prepare("INSERT INTO projects (client_id, name, description, status) VALUES (?,?,?,?)");

  const connecteamId = cp.run(8, 'Connecteam Rollout',
    'Full Connecteam implementation for Qual Group across 57 cleaning sites. Includes site data entry, staff onboarding, scheduling, clock-in/out, task assignment, and payroll integration.',
    'in-progress').lastInsertRowid;
  console.log(`✅ Created project "Connecteam Rollout" [${connecteamId}]`);

  const hubspotId = cp.run(8, 'HubSpot Implementation',
    'HubSpot CRM setup and optimisation for Qual Group. Includes gap analysis, lead nurture flows, call scripts, SLA setup, and Connecteam integration evaluation.',
    'on-hold').lastInsertRowid;
  console.log(`✅ Created project "HubSpot Implementation" [${hubspotId}]`);

  const peFinanceId = cp.run(9, 'Financial Process Structuring',
    'Daily cash flow management, account analysis, and financial process standardisation for PE Group. Covers transaction checks, payroll, PF set-off, credit control, and reporting.',
    'in-progress').lastInsertRowid;
  console.log(`✅ Created project "Financial Process Structuring" [${peFinanceId}]`);

  const peClickupId = cp.run(9, 'ClickUp Compliance Dashboard',
    'Setup of ClickUp dashboard for PE Group compliance tracking. Includes Compliance, Bookkeeping, Reporting, and Payments lists with daily/weekly/monthly recurring tasks for 12-company and 2-company groups.',
    'in-progress').lastInsertRowid;
  console.log(`✅ Created project "ClickUp Compliance Dashboard" [${peClickupId}]`);

  const ostrichId = cp.run(7, 'Operations Consulting Engagement',
    'Full-scope operations consulting for Ostrich Mobility across four verticals: Sales, Service, Production, and Procurement. Includes process mapping, CRM evaluation, service tracker, and team capability development.',
    'in-progress').lastInsertRowid;
  console.log(`✅ Created project "Operations Consulting Engagement" [${ostrichId}]`);

  const intellexId = cp.run(10, 'Dashboard & Project Tracker',
    'Project tracking dashboard and operational data management setup for Intellex.',
    'not-started').lastInsertRowid;
  console.log(`✅ Created project "Dashboard & Project Tracker" [${intellexId}]`);

  const channeliamId = cp.run(11, 'Lead Qualification & Pitch Deck',
    'Investor pitch deck preparation and lead qualification planning for Channeliam.',
    'in-progress').lastInsertRowid;
  console.log(`✅ Created project "Lead Qualification & Pitch Deck" [${channeliamId}]`);

  cp.run(4, 'ClickUp / Zoho Transition',
    'Transition from Zoho to ClickUp for Beaconhands. Currently on-hold pending review.',
    'on-hold');
  console.log('✅ Created project "ClickUp / Zoho Transition" for Beaconhands');

  cp.run(3, 'Internal Standups & Cross-Client Coordination',
    'Ongoing internal Q4 daily standups and coordination across all active client engagements.',
    'in-progress');
  console.log('✅ Created project "Internal Standups" for Q4 Consulting');


  // ─────────────────────────────────────────────────────
  // 4. TASKS — Assign to projects
  // ─────────────────────────────────────────────────────

  // Qual Group — Connecteam Rollout
  for (const id of [70, 71, 72, 77, 78, 79, 82, 83]) {
    db.prepare("UPDATE tasks SET project_id=? WHERE id=?").run(connecteamId, id);
  }
  console.log('✅ Connecteam Rollout tasks assigned');

  // Qual Group — HubSpot Implementation
  for (const id of [51, 52, 53, 54, 55, 56, 57]) {
    db.prepare("UPDATE tasks SET project_id=? WHERE id=?").run(hubspotId, id);
  }
  console.log('✅ HubSpot Implementation tasks assigned');

  // PE Group — Financial Process Structuring
  for (const id of [117, 118, 119, 120]) {
    db.prepare("UPDATE tasks SET project_id=? WHERE id=?").run(peFinanceId, id);
  }
  console.log('✅ Financial Process Structuring tasks assigned');

  // PE Group — ClickUp Compliance Dashboard
  for (const id of [29, 81]) {
    db.prepare("UPDATE tasks SET project_id=? WHERE id=?").run(peClickupId, id);
  }
  console.log('✅ ClickUp Compliance Dashboard tasks assigned');

  // Ostrich Mobility — ALL ostrich tasks to Operations Consulting
  db.prepare("UPDATE tasks SET project_id=? WHERE client_id=7 AND parent_task_id IS NULL").run(ostrichId);
  console.log('✅ All Ostrich tasks assigned to Operations Consulting Engagement');

  // Intellex tasks
  for (const id of [59, 60]) {
    db.prepare("UPDATE tasks SET project_id=? WHERE id=?").run(intellexId, id);
  }
  console.log('✅ Intellex tasks assigned');

  // Channeliam tasks
  db.prepare("UPDATE tasks SET project_id=? WHERE id=8").run(channeliamId);
  console.log('✅ Channeliam task assigned');

  // Vallath NICHE tasks (project 4)
  for (const id of [95, 96, 97, 98, 99]) {
    db.prepare("UPDATE tasks SET project_id=4 WHERE id=?").run(id);
  }
  console.log('✅ NICHE FDP tasks assigned');

  // Qual Group misc tasks (56, 57, 58) to HubSpot (already done above for 56, 57)
  db.prepare("UPDATE tasks SET project_id=? WHERE id=58").run(connecteamId);


  // ─────────────────────────────────────────────────────
  // 5. TASKS — Mark clearly-completed as completed
  // ─────────────────────────────────────────────────────

  for (const id of [57, 78, 59, 81, 56]) {
    db.prepare("UPDATE tasks SET status='completed' WHERE id=?").run(id);
  }
  console.log('✅ Tasks [57, 78, 59, 81, 56] marked completed');


  // ─────────────────────────────────────────────────────
  // 6. TASKS — Delete duplicate
  // ─────────────────────────────────────────────────────

  db.prepare("DELETE FROM tasks WHERE id=80").run();
  console.log('✅ Duplicate task [80] deleted');


  // ─────────────────────────────────────────────────────
  // 7. CONTACTS — Fix designations & duplicates
  // ─────────────────────────────────────────────────────

  // Remove duplicate Neeraj (30), update Neeraj Sonian (34) with full designation
  db.prepare("DELETE FROM contacts WHERE id=30").run();
  db.prepare("UPDATE contacts SET name='Neeraj Sonian', designation='HubSpot Implementer / Senior Contact' WHERE id=34").run();
  console.log('✅ Neeraj duplicate removed; Neeraj Sonian [34] updated');

  // Kalyani — Director
  db.prepare("UPDATE contacts SET designation='Director / Head of Institution' WHERE id=37").run();
  console.log('✅ Kalyani [37] — designation added');

  // Anand — Finance Team Member
  db.prepare("UPDATE contacts SET designation='Finance Team Member' WHERE id=35").run();
  console.log('✅ Anand [35] — designation added');

  // Nivi — Connecteam CS
  db.prepare("UPDATE contacts SET designation='Connecteam Customer Success / Onboarding Manager' WHERE id=58").run();
  console.log('✅ Nivi [58] — designation updated');


  // ─────────────────────────────────────────────────────
  // 8. STORY ENTRIES — Fix Bequip entries misattributed to Ostrich
  // ─────────────────────────────────────────────────────

  db.prepare("UPDATE story_entries SET client_id=2 WHERE id IN (40, 41)").run();
  console.log('✅ Story entries [40, 41] (Bequip) moved from Ostrich → Bequip');

});

try {
  migrate();
  console.log('\n🚀 Migration complete — all changes applied successfully.');
} catch (err) {
  console.error('\n❌ Migration failed:', err.message);
}
