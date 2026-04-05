const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    answers TEXT NOT NULL,
    recommendations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS agencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    services TEXT
  );

  CREATE TABLE IF NOT EXISTS agency_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'caseworker',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    agency_id INTEGER NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agency_id INTEGER NOT NULL,
    application_id INTEGER,
    user_id INTEGER NOT NULL,
    from_type TEXT NOT NULL,
    from_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    read_by_client INTEGER DEFAULT 0,
    read_by_agency INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agency_id) REFERENCES agencies(id),
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    address TEXT,
    description TEXT,
    hours TEXT,
    phone TEXT
  );
`);

// ── AGENCIES ─────────────────────────────────────────────────────────────────
const agencyCount = db.prepare('SELECT COUNT(*) as count FROM agencies').get();
if (agencyCount.count === 0) {
  const insertAgency = db.prepare(`
    INSERT INTO agencies (name, category, description, address, phone, email, website, services)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const agencyRows = [
    ['Catholic Charities of Southern Nevada', 'shelter',
      'Emergency shelter, transitional housing, food pantry, and case management for individuals and families.',
      '1501 Las Vegas Blvd N, Las Vegas, NV 89101', '(702) 385-2662', 'info@catholiccharities.com',
      'https://www.catholiccharities.com',
      JSON.stringify(['Emergency Shelter', 'Transitional Housing', 'Food Pantry', 'Case Management', 'Utility Assistance', 'Immigration Services'])],
    ['Salvation Army Las Vegas', 'shelter',
      'Emergency shelter for men and women, hot meals, clothing, and rehabilitation programs.',
      '35 W Owens Ave, Las Vegas, NV 89106', '(702) 649-8240', 'lasvegas@salvationarmy.org',
      'https://www.salvationarmyusa.org',
      JSON.stringify(['Emergency Shelter', 'Hot Meals', 'Clothing Closet', 'Rehabilitation', 'Family Services'])],
    ['Shade Tree', 'shelter',
      "Las Vegas's largest emergency shelter for women and children, including domestic violence survivors.",
      '1 W Owens Ave, Las Vegas, NV 89106', '(702) 385-0072', 'info@shadetreeshelter.org',
      'https://www.shadetreeshelter.org',
      JSON.stringify(['Women & Children Shelter', 'DV Services', 'Case Management', 'Mental Health', "Children's Programs"])],
    ['SafeNest', 'shelter',
      "Nevada's largest domestic violence organization — shelter, crisis counseling, and legal advocacy.",
      '2915 W Charleston Blvd, Las Vegas, NV 89102', '(702) 646-4981', 'info@safenest.org',
      'https://www.safenest.org',
      JSON.stringify(['DV Shelter', 'Crisis Hotline', 'Legal Advocacy', 'Counseling', "Children's Services"])],
    ['HELP of Southern Nevada', 'shelter',
      'Comprehensive social services including housing, employment, and basic needs assistance.',
      '1640 E Flamingo Rd, Las Vegas, NV 89119', '(702) 369-4357', 'info@helpsonv.org',
      'https://www.helpsonv.org',
      JSON.stringify(['Emergency Assistance', 'Housing Navigation', 'Employment Services', 'Senior Services', 'Food Pantry'])],
    ['Nevada Partnership for Homeless Youth', 'shelter',
      'Serving homeless youth ages 13–24 with shelter, outreach, housing, and support services.',
      '1 W Owens Ave #200, Las Vegas, NV 89106', '(702) 383-1332', 'info@nphy.org',
      'https://www.nphy.org',
      JSON.stringify(['Youth Drop-In Center', 'Youth Shelter', 'Street Outreach', 'Independent Living', 'Mental Health'])],
    ['Las Vegas Rescue Mission', 'food',
      'Hot meals, emergency shelter, and recovery programs for individuals experiencing homelessness.',
      '480 W Bonanza Rd, Las Vegas, NV 89106', '(702) 382-1766', 'info@lvrm.org',
      'https://www.lvrm.org',
      JSON.stringify(['Hot Meals (3x daily)', 'Emergency Shelter', 'Recovery Programs', 'Job Training', 'Clothing'])],
    ['Three Square Food Bank', 'food',
      "Southern Nevada's primary food bank — pantry distributions, mobile pantry, and senior programs.",
      '4190 N Pecos Rd, Las Vegas, NV 89115', '(702) 644-3663', 'info@threesquare.org',
      'https://www.threesquare.org',
      JSON.stringify(['Food Pantry', 'Mobile Food Pantry', 'Senior Box Program', 'Kids Cafe', 'BackPack Program'])],
    ['Culinary Academy of Las Vegas', 'food',
      'Free meals and culinary job training programs for low-income and homeless individuals.',
      '710 W Lake Mead Blvd, Las Vegas, NV 89030', '(702) 651-5000', 'info@theculinaryacademy.org',
      'https://www.theculinaryacademy.org',
      JSON.stringify(['Free Meals', 'Culinary Training', 'Job Placement', 'Life Skills'])],
    ['Nevada Health Centers', 'health',
      'Federally Qualified Health Center providing primary care, dental, behavioral health, and pharmacy.',
      '617 S 9th St, Las Vegas, NV 89101', '(702) 671-0000', 'info@nevadahealthcenters.org',
      'https://www.nevadahealthcenters.org',
      JSON.stringify(['Primary Care', 'Dental Care', 'Behavioral Health', 'Pharmacy', 'HIV/STI Testing'])],
    ['Bridge Counseling Associates', 'health',
      'Mental health and substance abuse treatment, crisis intervention, and psychiatric services.',
      '1640 Alta Dr, Las Vegas, NV 89106', '(702) 385-3330', 'info@bridgecounseling.org',
      'https://www.bridgecounseling.org',
      JSON.stringify(['Mental Health Counseling', 'Substance Abuse Treatment', 'Crisis Intervention', 'Psychiatric Services', 'Detox Referrals'])],
    ['WestCare Nevada', 'health',
      'Behavioral health, substance abuse treatment, and social services for vulnerable populations.',
      '711 S Martin Luther King Blvd, Las Vegas, NV 89106', '(702) 385-3330', 'info@westcare.com',
      'https://www.westcare.com',
      JSON.stringify(['Substance Abuse Treatment', 'Mental Health', 'Residential Programs', 'Case Management', 'Re-entry Services'])],
    ['Veterans Village', 'veterans',
      'Permanent housing, transitional housing, and wraparound services exclusively for homeless veterans.',
      '1150 S Commerce St, Las Vegas, NV 89102', '(702) 366-0033', 'info@veteransvillagelv.org',
      'https://www.veteransvillagelv.org',
      JSON.stringify(['Veteran Housing', 'Mental Health', 'Substance Abuse', 'Employment', 'Benefits Navigation'])],
    ['Southern Nevada Veterans Affairs', 'veterans',
      'VA Healthcare and social services for eligible veterans in the Las Vegas area.',
      '6900 N Pecos Rd, North Las Vegas, NV 89086', '(702) 791-9000', 'info@va.gov',
      'https://www.va.gov',
      JSON.stringify(['VA Healthcare', 'Mental Health', 'Substance Abuse', 'Housing Assistance', 'Benefits'])],
    ['Legal Aid Center of Southern Nevada', 'legal',
      'Free civil legal services for low-income residents — housing, family law, benefits, and more.',
      '725 E Charleston Blvd, Las Vegas, NV 89104', '(702) 386-1070', 'info@lacsn.org',
      'https://www.lacsn.org',
      JSON.stringify(['Housing Law', 'Family Law', 'Benefits Appeals', 'Immigration', 'Document Recovery'])],
    ['Clark County Public Defender', 'legal',
      'Free legal representation for criminal matters for those who cannot afford an attorney.',
      '309 S 3rd St, Las Vegas, NV 89101', '(702) 455-4270', 'info@clarkcountynv.gov',
      'https://www.clarkcountynv.gov',
      JSON.stringify(['Criminal Defense', 'Court Representation', 'Expungements', 'Warrants'])],
    ['Nevada Homeless Alliance', 'services',
      'Coordinating the Continuum of Care for homelessness in Southern Nevada.',
      '633 S 4th St, Las Vegas, NV 89101', '(702) 366-0033', 'info@nevadahomeless.org',
      'https://www.nevadahomeless.org',
      JSON.stringify(['Case Management', 'Housing Navigation', 'HMIS Enrollment', 'Benefits Enrollment', 'Rapid Rehousing'])],
    ['Clark County Social Service', 'services',
      'General Assistance, food stamps, Medicaid, and other benefits for Clark County residents.',
      '1600 Pinto Ln, Las Vegas, NV 89106', '(702) 455-4270', 'info@clarkcountynv.gov',
      'https://www.clarkcountynv.gov',
      JSON.stringify(['General Assistance', 'SNAP/EBT', 'Medicaid Enrollment', 'Childcare Assistance', 'Burial Assistance'])],
    ['Spread the Word Nevada', 'services',
      'Literacy, education, and workforce development for vulnerable community members.',
      '6280 S Valley View Blvd, Las Vegas, NV 89118', '(702) 456-7323', 'info@spreadthewordnevada.org',
      'https://www.spreadthewordnevada.org',
      JSON.stringify(['Adult Literacy', 'GED Preparation', 'Workforce Development', 'Computer Training'])],
    ['Nevada 211', 'services',
      'Call or text 211 to connect with health and human services across Nevada 24/7.',
      'Statewide — Call or text 211', '211', 'info@nevada211.org',
      'https://www.nevada211.org',
      JSON.stringify(['Crisis Referrals', 'Shelter Availability', 'Food Resources', 'Utility Assistance', 'Mental Health Referrals'])],
  ];
  for (const a of agencyRows) insertAgency.run(...a);

  // Seed one admin caseworker per agency (password: portal123)
  const insertUser = db.prepare(`
    INSERT INTO agency_users (agency_id, name, email, password, role)
    VALUES (?, ?, ?, ?, 'admin')
  `);
  const hash = bcrypt.hashSync('portal123', 10);
  const slugs = [
    'catholiccharities', 'salvationarmy', 'shadetree', 'safenest', 'helpsonv',
    'nphy', 'lvrm', 'threesquare', 'culinaryacademy', 'nevadahealth',
    'bridgecounseling', 'westcare', 'veteransvillage', 'snva', 'legalaid',
    'publicdefender', 'nhalliance', 'ccsocialservice', 'spreadtheword', 'nevada211'
  ];
  db.prepare('SELECT id, name FROM agencies').all().forEach((agency, i) => {
    const slug = slugs[i] || `agency${agency.id}`;
    insertUser.run(agency.id, `${agency.name} Admin`, `admin@${slug}.portal`, hash);
  });
}

// ── RESOURCES (MAP PINS) ──────────────────────────────────────────────────────
const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get();
if (resourceCount.count === 0) {
  const insert = db.prepare(`
    INSERT INTO resources (name, category, lat, lng, address, description, hours, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const resources = [
    ['Catholic Charities Shelter', 'shelter', 36.1887, -115.1404, '1501 Las Vegas Blvd N', 'Emergency shelter for men, women & families', 'Check-in 6pm daily', '(702) 385-2662'],
    ['Salvation Army', 'shelter', 36.1954, -115.1423, '35 W Owens Ave', "Men's and women's emergency shelter", 'Open 24/7', '(702) 649-8240'],
    ["Shade Tree Women's Shelter", 'shelter', 36.1963, -115.1425, '1 W Owens Ave', 'Shelter for women and children only', 'Open 24/7', '(702) 385-0072'],
    ['Nevada Partnership for Homeless Youth', 'shelter', 36.1961, -115.1424, '1 W Owens Ave #200', 'Drop-in and shelter for youth 13–24', 'Mon-Fri 9am-5pm (drop-in)', '(702) 383-1332'],
    ['HELP of Southern Nevada', 'shelter', 36.1056, -115.1418, '1640 E Flamingo Rd', 'Emergency housing and rental assistance', 'Mon-Fri 8am-5pm', '(702) 369-4357'],
    ['Las Vegas Rescue Mission', 'food', 36.1832, -115.1501, '480 W Bonanza Rd', 'Hot meals 3x daily, no ID required', 'Breakfast 7am, Lunch 12pm, Dinner 5pm', '(702) 382-1766'],
    ['Three Square Food Bank', 'food', 36.2201, -115.0832, '4190 N Pecos Rd', 'Food pantry — bring ID if possible', 'Mon-Fri 8am-5pm', '(702) 644-3663'],
    ['Catholic Charities Food Pantry', 'food', 36.1887, -115.1404, '1501 Las Vegas Blvd N', 'Food pantry open to all', 'Mon-Fri 7:30am-4pm', '(702) 385-2662'],
    ['Culinary Academy Free Meals', 'food', 36.2085, -115.1157, '710 W Lake Mead Blvd', 'Free meals from culinary students', 'Mon-Fri 11am-1pm', '(702) 651-5000'],
    ['Nevada Health Centers', 'health', 36.1601, -115.1437, '617 S 9th St', 'Primary care, dental, mental health — sliding scale', 'Mon-Fri 8am-5pm', '(702) 671-0000'],
    ['Westside Clinic', 'health', 36.1812, -115.1634, '1209 N Main St', 'Free medical and dental care', 'Tue & Thu 9am-3pm', '(702) 383-1920'],
    ['Bridge Counseling', 'health', 36.1854, -115.1791, '1640 Alta Dr', 'Mental health and substance abuse treatment', 'Mon-Fri 8am-5pm', '(702) 385-3330'],
    ['WestCare Nevada', 'health', 36.1742, -115.1543, '711 S MLK Blvd', 'Substance abuse and behavioral health', 'Mon-Fri 8am-5pm', '(702) 385-3330'],
    ['Southern NV VA Healthcare', 'health', 36.2487, -115.1092, '6900 N Pecos Rd', 'VA health services for veterans', 'Mon-Fri 7:30am-4pm', '(702) 791-9000'],
    ['Legal Aid Center', 'legal', 36.1521, -115.1268, '725 E Charleston Blvd', 'Free civil legal help for low-income residents', 'Mon-Fri 9am-4pm', '(702) 386-1070'],
    ['Clark County Public Defender', 'legal', 36.1696, -115.1436, '309 S 3rd St', 'Free criminal defense representation', 'Mon-Fri 8am-5pm', '(702) 455-4270'],
    ['Nevada Homeless Alliance', 'services', 36.1673, -115.1421, '633 S 4th St', 'Case management and housing navigation', 'Mon-Fri 8am-5pm', '(702) 366-0033'],
    ['Clark County Social Service', 'services', 36.1901, -115.1612, '1600 Pinto Ln', 'SNAP, Medicaid, General Assistance enrollment', 'Mon-Fri 7:30am-4:30pm', '(702) 455-4270'],
    ['Downtown Las Vegas Library', 'services', 36.1721, -115.1389, '833 Las Vegas Blvd N', 'Internet, social services, cooling, restrooms', 'Mon-Sat 9am-8pm', '(702) 507-3500'],
    ['Veterans Village', 'veterans', 36.1612, -115.1578, '1150 S Commerce St', 'Housing and services for homeless veterans', 'Mon-Fri 9am-5pm', '(702) 366-0033'],
    ['Hartke Pool Cooling Center', 'cooling', 36.1746, -115.2012, '4701 N Torrey Pines Dr', 'Cooling center during heat emergencies', 'Daily 9am-6pm (summer)', '(702) 229-6563'],
    ['Winchester Community Center', 'cooling', 36.1392, -115.1019, '3130 S McLeod Dr', 'City cooling center with water and shade', 'Mon-Sat 8am-8pm (heat events)', '(702) 455-7169'],
    ['Stupak Community Center', 'cooling', 36.1832, -115.1623, '251 W Boston Ave', 'Cooling, restrooms, and water', 'Mon-Fri 8am-5pm', '(702) 229-2488'],
    ['East Las Vegas Community Center', 'cooling', 36.1447, -115.0824, '250 N Eastern Ave', 'Air conditioned community center', 'Mon-Fri 8am-9pm, Sat 8am-5pm', '(702) 229-1515'],
    ['Vegas PBS Community Resource Center', 'services', 36.1788, -115.1312, '3050 E Flamingo Rd', 'Job help, benefits info, digital literacy', 'Mon-Fri 9am-5pm', '(702) 799-1010'],
  ];
  for (const r of resources) insert.run(...r);
}

module.exports = db;
