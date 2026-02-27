const router = require('express').Router();
const auth = require('../middleware/auth');
const db = require('../db');

// Questions for the intake assessment
const QUESTIONS = [
  { id: 'housing', text: 'What is your current housing situation?', options: ['Staying outside/unsheltered', 'Emergency shelter', 'Staying with friends/family', 'Transitional housing', 'Stable housing'] },
  { id: 'duration', text: 'How long have you been in your current situation?', options: ['Less than a week', '1–4 weeks', '1–6 months', '6–12 months', 'More than a year'] },
  { id: 'income', text: 'Do you have any current income?', options: ['No income', 'Less than $500/month', '$500–$1,000/month', '$1,000–$2,000/month', 'More than $2,000/month'] },
  { id: 'benefits', text: 'Are you currently receiving any benefits?', options: ['None', 'SNAP (food stamps)', 'SSI/SSDI', 'Veterans benefits', 'Multiple benefits'] },
  { id: 'health', text: 'Do you have any health or medical needs?', options: ['No needs', 'Need medications', 'Mental health support needed', 'Substance use support needed', 'Multiple health needs'] },
  { id: 'legal', text: 'Do you have any legal issues?', options: ['No issues', 'Pending court dates', 'Active warrants', 'Immigration issues', 'Other legal issues'] },
  { id: 'goal', text: 'What is your most urgent need right now?', options: ['A safe place to sleep tonight', 'Food and water', 'Medical care', 'Help finding housing', 'Employment assistance'] }
];

function generateRecommendations(answers) {
  const recs = [];

  if (answers.housing === 'Staying outside/unsheltered') {
    recs.push({ priority: 'high', category: 'shelter', text: 'You need emergency shelter tonight. Contact Catholic Charities or the Salvation Army for immediate shelter placement.' });
  }
  if (answers.income === 'No income') {
    recs.push({ priority: 'high', category: 'benefits', text: 'Apply for General Assistance or SNAP benefits. The Nevada Homeless Alliance can help you enroll.' });
  }
  if (answers.health !== 'No needs') {
    recs.push({ priority: 'medium', category: 'health', text: 'Connect with Westside Clinic or Sunrise Hospital Community Clinic for free or low-cost medical care.' });
  }
  if (answers.legal !== 'No issues') {
    recs.push({ priority: 'medium', category: 'legal', text: 'The Legal Aid Center of Southern Nevada offers free consultations. Call (702) 386-1070 to schedule.' });
  }
  if (answers.goal === 'Help finding housing') {
    recs.push({ priority: 'high', category: 'housing', text: 'Request a housing navigation appointment with the Nevada Homeless Alliance for help with permanent housing.' });
  }
  if (answers.benefits === 'Veterans benefits' || answers.benefits === 'Multiple benefits') {
    recs.push({ priority: 'medium', category: 'veterans', text: 'Veterans Village provides housing and wraparound services specifically for veterans.' });
  }
  recs.push({ priority: 'low', category: 'food', text: 'Three Square Food Bank and the Las Vegas Rescue Mission offer daily meals. No ID required.' });

  return recs;
}

router.get('/questions', (req, res) => {
  res.json(QUESTIONS);
});

router.post('/submit', auth, (req, res) => {
  const { answers } = req.body;
  if (!answers) return res.status(400).json({ error: 'Answers required' });

  const recommendations = generateRecommendations(answers);
  db.prepare(
    'INSERT INTO assessments (user_id, answers, recommendations) VALUES (?, ?, ?)'
  ).run(req.user.id, JSON.stringify(answers), JSON.stringify(recommendations));

  res.json({ recommendations });
});

router.get('/my-assessment', auth, (req, res) => {
  const assessment = db.prepare(
    'SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(req.user.id);

  if (!assessment) return res.json(null);
  res.json({
    ...assessment,
    answers: JSON.parse(assessment.answers),
    recommendations: JSON.parse(assessment.recommendations)
  });
});

module.exports = router;
