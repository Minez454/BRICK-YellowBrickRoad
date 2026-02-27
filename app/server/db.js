const Database = require('better-sqlite3');
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

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    agency_id INTEGER NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agency_id) REFERENCES agencies(id)
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

// Seed agencies if empty
const agencyCount = db.prepare('SELECT COUNT(*) as count FROM agencies').get();
if (agencyCount.count === 0) {
  const insert = db.prepare(`
    INSERT INTO agencies (name, category, description, address, phone, email, services)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const agencies = [
    ['Catholic Charities of Southern Nevada', 'shelter', 'Emergency shelter, food, and case management services.', '1501 Las Vegas Blvd N, Las Vegas, NV 89101', '(702) 385-2662', 'info@catholiccharities.com', JSON.stringify(['Emergency Shelter', 'Food Pantry', 'Case Management', 'Utility Assistance'])],
    ['Salvation Army Las Vegas', 'shelter', 'Shelter, meals, and rehabilitation programs.', '35 W Owens Ave, Las Vegas, NV 89106', '(702) 649-8240', 'lasvegas@salvationarmy.org', JSON.stringify(['Emergency Shelter', 'Hot Meals', 'Clothing', 'Rehabilitation'])],
    ['Nevada Homeless Alliance', 'services', 'Coordinating services for people experiencing homelessness.', '633 S 4th St, Las Vegas, NV 89101', '(702) 366-0033', 'info@nevadahomeless.org', JSON.stringify(['Case Management', 'Housing Navigation', 'Benefits Enrollment'])],
    ['Las Vegas Rescue Mission', 'food', 'Meals, shelter, and recovery programs.', '480 W Bonanza Rd, Las Vegas, NV 89106', '(702) 382-1766', 'info@lvrm.org', JSON.stringify(['Hot Meals', 'Emergency Shelter', 'Recovery Programs', 'Job Training'])],
    ['Three Square Food Bank', 'food', 'Food assistance for Southern Nevada residents.', '4190 N Pecos Rd, Las Vegas, NV 89115', '(702) 644-3663', 'info@threesquare.org', JSON.stringify(['Food Pantry', 'Mobile Pantry', 'Senior Programs', 'Kids Cafe'])],
    ['Veterans Village', 'veterans', 'Housing and services specifically for homeless veterans.', '1150 S Commerce St, Las Vegas, NV 89102', '(702) 366-0033', 'info@veteransvillagelv.org', JSON.stringify(['Veteran Housing', 'Mental Health', 'Substance Abuse', 'Employment'])],
    ['Legal Aid Center of Southern Nevada', 'legal', 'Free legal services for low-income residents.', '725 E Charleston Blvd, Las Vegas, NV 89104', '(702) 386-1070', 'info@lacsn.org', JSON.stringify(['Legal Advice', 'Court Representation', 'Document Assistance', 'Benefits Appeals'])],
    ['Sunrise Hospital Community Clinic', 'health', 'Low-cost healthcare and mental health services.', '3186 S Maryland Pkwy, Las Vegas, NV 89109', '(702) 731-8000', 'info@sunrise.com', JSON.stringify(['Medical Care', 'Mental Health', 'Substance Abuse', 'Prescriptions'])]
  ];
  for (const a of agencies) insert.run(...a);
}

// Seed resources (map pins) if empty
const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get();
if (resourceCount.count === 0) {
  const insert = db.prepare(`
    INSERT INTO resources (name, category, lat, lng, address, description, hours, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const resources = [
    ['Catholic Charities Shelter', 'shelter', 36.1887, -115.1404, '1501 Las Vegas Blvd N', 'Emergency shelter beds available nightly', 'Check-in 6pm', '(702) 385-2662'],
    ['Salvation Army', 'shelter', 36.1954, -115.1423, '35 W Owens Ave', 'Men\'s and women\'s shelter', 'Open 24/7', '(702) 649-8240'],
    ['Three Square Food Bank', 'food', 36.2201, -115.0832, '4190 N Pecos Rd', 'Food pantry distribution', 'Mon-Fri 8am-5pm', '(702) 644-3663'],
    ['Las Vegas Rescue Mission', 'food', 36.1832, -115.1501, '480 W Bonanza Rd', 'Hot meals served daily', 'Breakfast 7am, Dinner 5pm', '(702) 382-1766'],
    ['Veterans Village', 'health', 36.1612, -115.1578, '1150 S Commerce St', 'Veterans housing and services', 'Mon-Fri 9am-5pm', '(702) 366-0033'],
    ['Legal Aid Center', 'legal', 36.1521, -115.1268, '725 E Charleston Blvd', 'Free legal consultations', 'Mon-Fri 9am-4pm', '(702) 386-1070'],
    ['Nevada Homeless Alliance', 'services', 36.1673, -115.1421, '633 S 4th St', 'Case management and housing navigation', 'Mon-Fri 8am-5pm', '(702) 366-0033'],
    ['Hartke Pool Cooling Center', 'cooling', 36.1746, -115.2012, '4701 N Torrey Pines Dr', 'Cooling center open during heat emergencies', 'Daily 9am-6pm (summer)', '(702) 229-6563'],
    ['Westside Clinic', 'health', 36.1812, -115.1634, '1209 N Main St', 'Free medical and dental care', 'Tue & Thu 9am-3pm', '(702) 383-1920'],
    ['Downtown Library', 'services', 36.1721, -115.1389, '833 Las Vegas Blvd N', 'Social services, internet, cooling', 'Mon-Sat 9am-8pm', '(702) 507-3500']
  ];
  for (const r of resources) insert.run(...r);
}

module.exports = db;
