import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';

const CATEGORY_COLORS = {
  shelter: '#ef4444', benefits: '#f59e0b', health: '#10b981',
  legal: '#6366f1', housing: '#3b82f6', veterans: '#8b5cf6', food: '#f97316',
};

const CATEGORY_ICONS = {
  shelter: '🏠', benefits: '💰', health: '🏥', legal: '⚖️',
  housing: '🔑', veterans: '🎖️', food: '🍽️', services: '🤝'
};

export default function Assessment() {
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prevAssessment, setPrevAssessment] = useState(undefined);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    api.get('/assessment/questions').then(r => setQuestions(r.data));
    api.get('/assessment/my-assessment').then(r => setPrevAssessment(r.data)).catch(() => setPrevAssessment(null));
  }, []);

  const selectAnswer = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const next = () => { if (current < questions.length - 1) setCurrent(c => c + 1); };
  const back = () => { if (current > 0) setCurrent(c => c - 1); };

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/assessment/submit', { answers });
      setResults(data.recommendations);
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (prevAssessment === undefined) return <div className="page-loading">{t('loading')}</div>;

  if (results) {
    return (
      <div className="assessment-page">
        <div className="results-header">
          <div className="results-icon">✅</div>
          <h2>{t('assess_results_title')}</h2>
          <p>{t('assess_results_sub')}</p>
        </div>
        <div className="recommendations">
          {results.map((rec, i) => (
            <div key={i} className={`rec-card priority-${rec.priority}`}>
              <div className="rec-badge" style={{ background: CATEGORY_COLORS[rec.category] || '#6b7280' }}>
                {CATEGORY_ICONS[rec.category] || '📌'} {rec.category}
              </div>
              <p>{rec.text}</p>
              {rec.priority === 'high' && <span className="urgent-tag">{t('assess_urgent')}</span>}
            </div>
          ))}
        </div>
        <div className="results-actions">
          <button onClick={() => navigate('/agencies')} className="btn-primary">{t('assess_browse_agencies')}</button>
          <button onClick={() => navigate('/map')} className="btn-outline">{t('assess_view_map')}</button>
        </div>
      </div>
    );
  }

  if (prevAssessment && !results) {
    return (
      <div className="assessment-page">
        <div className="prev-assessment">
          <h2>{t('assess_prev_title')}</h2>
          <p>{t('assess_prev_sub')}</p>
          <div className="prev-actions">
            <button onClick={() => setResults(prevAssessment.recommendations)} className="btn-primary">{t('assess_view_prev')}</button>
            <button onClick={() => setPrevAssessment(null)} className="btn-outline">{t('assess_new')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length) return <div className="page-loading">{t('loading')}</div>;

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="assessment-page">
      <div className="assessment-card">
        <div className="assessment-header">
          <span className="step-label">{t('assess_step')} {current + 1} {t('assess_of')} {questions.length}</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <h2 className="question-text">{q.text}</h2>

        <div className="options-grid">
          {q.options.map(option => (
            <button
              key={option}
              className={`option-btn ${answers[q.id] === option ? 'selected' : ''}`}
              onClick={() => selectAnswer(q.id, option)}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="assessment-nav">
          <button onClick={back} disabled={current === 0} className="btn-outline">{t('assess_back')}</button>
          {current < questions.length - 1 ? (
            <button onClick={next} disabled={!answers[q.id]} className="btn-primary">{t('assess_next')}</button>
          ) : (
            <button onClick={submit} disabled={!answers[q.id] || loading} className="btn-primary">
              {loading ? t('assess_loading') : t('assess_submit')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
