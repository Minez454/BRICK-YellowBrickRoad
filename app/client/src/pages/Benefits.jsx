import { useLanguage } from '../context/LanguageContext';

const BENEFITS = [
  {
    id: 'snap',
    icon: '🛒',
    color: '#10b981',
    titleEn: 'SNAP / Food Stamps (EBT)',
    titleEs: 'SNAP / Cupones de Alimentos (EBT)',
    descEn: 'Get a monthly benefit to buy groceries. Apply online, by phone, or in person at a Clark County office. You can qualify even without a home address.',
    descEs: 'Reciba un beneficio mensual para comprar alimentos. Solicite en línea, por teléfono o en persona. Puede calificar incluso sin dirección fija.',
    eligibilityEn: 'Low-income individuals and families. No fixed address required.',
    eligibilityEs: 'Personas y familias de bajos ingresos. No se requiere dirección fija.',
    howToEn: 'Apply at dwss.nv.gov or call (702) 486-1400. A Clark County worker can help you apply in person at 1600 Pinto Ln.',
    howToEs: 'Solicite en dwss.nv.gov o llame al (702) 486-1400. Un trabajador del Condado Clark puede ayudarlo en 1600 Pinto Ln.',
    phone: '(702) 486-1400',
    url: 'https://dwss.nv.gov',
    tags: ['food', 'monthly benefit', 'EBT card'],
  },
  {
    id: 'medicaid',
    icon: '🏥',
    color: '#3b82f6',
    titleEn: 'Nevada Medicaid',
    titleEs: 'Medicaid de Nevada',
    descEn: 'Free or low-cost health coverage for doctor visits, prescriptions, mental health, and more. Homeless individuals are eligible.',
    descEs: 'Cobertura de salud gratuita o de bajo costo para visitas médicas, medicamentos, salud mental y más. Los individuos sin hogar son elegibles.',
    eligibilityEn: 'Low-income adults, children, pregnant women, elderly, and people with disabilities.',
    eligibilityEs: 'Adultos de bajos ingresos, niños, mujeres embarazadas, ancianos y personas con discapacidades.',
    howToEn: 'Apply at access.nv.gov, call (800) 992-0900, or visit Clark County DWSS at 1600 Pinto Ln.',
    howToEs: 'Solicite en access.nv.gov, llame al (800) 992-0900, o visite DWSS del Condado Clark en 1600 Pinto Ln.',
    phone: '(800) 992-0900',
    url: 'https://dwss.nv.gov',
    tags: ['healthcare', 'prescriptions', 'mental health'],
  },
  {
    id: 'ssi',
    icon: '💰',
    color: '#f59e0b',
    titleEn: 'SSI / Social Security Disability (SSDI)',
    titleEs: 'SSI / Seguro de Discapacidad (SSDI)',
    descEn: 'Monthly income if you have a disability or are 65+. Legal Aid can help you apply or appeal a denial.',
    descEs: 'Ingresos mensuales si tiene una discapacidad o tiene 65 años o más. La Ayuda Legal puede ayudarle a solicitar o apelar una negación.',
    eligibilityEn: 'People with disabilities who have limited income and resources, or adults 65 and older.',
    eligibilityEs: 'Personas con discapacidades con ingresos y recursos limitados, o adultos de 65 años o más.',
    howToEn: 'Call Social Security at (800) 772-1213 or visit ssa.gov. Legal Aid Center can help: (702) 386-1070.',
    howToEs: 'Llame al Seguro Social al (800) 772-1213 o visite ssa.gov. El Centro de Ayuda Legal puede ayudar: (702) 386-1070.',
    phone: '(800) 772-1213',
    url: 'https://www.ssa.gov',
    tags: ['monthly income', 'disability', 'seniors'],
  },
  {
    id: 'dmvid',
    icon: '🪪',
    color: '#6366f1',
    titleEn: 'Free Nevada ID Card',
    titleEs: 'Tarjeta de Identificación Gratuita de Nevada',
    descEn: 'Nevada offers a free ID card for people experiencing homelessness. An ID is required for most benefits, shelter, and employment. The Legal Aid Center can help you get documents needed.',
    descEs: 'Nevada ofrece una tarjeta de identificación gratuita para personas sin hogar. Se requiere una identificación para la mayoría de los beneficios, refugios y empleo.',
    eligibilityEn: 'Any Nevada resident experiencing homelessness. Ask a caseworker to certify your address.',
    eligibilityEs: 'Cualquier residente de Nevada que esté experimentando falta de vivienda. Pida a un trabajador social que certifique su dirección.',
    howToEn: 'Visit any Nevada DMV office. Bring any 2 documents proving identity (birth cert, SS card, etc.). Call DMV at (702) 486-4368.',
    howToEs: 'Visite cualquier oficina del DMV de Nevada. Traiga 2 documentos que prueben identidad. Llame al DMV: (702) 486-4368.',
    phone: '(702) 486-4368',
    url: 'https://www.dmvnv.com',
    tags: ['ID', 'documents', 'free'],
  },
  {
    id: 'generalassistance',
    icon: '🤝',
    color: '#ec4899',
    titleEn: 'General Assistance (Clark County)',
    titleEs: 'Asistencia General (Condado Clark)',
    descEn: 'Short-term cash assistance for Clark County residents who are disabled or caring for a disabled person. Can help with rent, utilities, or food.',
    descEs: 'Asistencia monetaria a corto plazo para residentes del Condado Clark que estén discapacitados o que cuiden a alguien discapacitado.',
    eligibilityEn: 'Clark County residents who are disabled or have a household member who is disabled.',
    eligibilityEs: 'Residentes del Condado Clark que estén discapacitados o tengan un miembro del hogar con discapacidad.',
    howToEn: 'Apply at Clark County Social Service, 1600 Pinto Ln, Las Vegas. Call (702) 455-4270.',
    howToEs: 'Solicite en Clark County Social Service, 1600 Pinto Ln, Las Vegas. Llame al (702) 455-4270.',
    phone: '(702) 455-4270',
    url: 'https://www.clarkcountynv.gov',
    tags: ['cash', 'rent', 'utilities'],
  },
  {
    id: 'unemployment',
    icon: '📋',
    color: '#0ea5e9',
    titleEn: 'Nevada Unemployment Insurance',
    titleEs: 'Seguro de Desempleo de Nevada',
    descEn: 'Weekly benefit if you recently lost your job through no fault of your own. Apply online within 3 weeks of losing work.',
    descEs: 'Beneficio semanal si recientemente perdió su trabajo por razones ajenas a usted. Solicite en línea dentro de 3 semanas de perder el trabajo.',
    eligibilityEn: 'Workers who lost jobs involuntarily and meet wage requirements. Must have worked in Nevada.',
    eligibilityEs: 'Trabajadores que perdieron empleo involuntariamente y cumplen los requisitos salariales.',
    howToEn: 'File online at ui.nv.gov or call (702) 486-0350. Apply as soon as you lose work.',
    howToEs: 'Presente la solicitud en línea en ui.nv.gov o llame al (702) 486-0350.',
    phone: '(702) 486-0350',
    url: 'https://ui.nv.gov',
    tags: ['employment', 'weekly benefit', 'job loss'],
  },
  {
    id: 'wic',
    icon: '👶',
    color: '#f97316',
    titleEn: 'WIC (Women, Infants & Children)',
    titleEs: 'WIC (Mujeres, Bebés y Niños)',
    descEn: 'Free food, nutrition counseling, and healthcare referrals for pregnant women, new mothers, and children under 5.',
    descEs: 'Alimentos gratuitos, asesoramiento nutricional y referencias de salud para mujeres embarazadas, nuevas madres y niños menores de 5 años.',
    eligibilityEn: 'Pregnant women, postpartum women, breastfeeding women, infants, and children under 5 with low income.',
    eligibilityEs: 'Mujeres embarazadas, madres recientes, mujeres lactantes, bebés y niños menores de 5 años con bajos ingresos.',
    howToEn: 'Call Southern Nevada Health District WIC at (702) 759-0850 or visit snhd.info/wic.',
    howToEs: 'Llame al WIC del Distrito de Salud del Sur de Nevada al (702) 759-0850 o visite snhd.info/wic.',
    phone: '(702) 759-0850',
    url: 'https://www.snhd.info/wic',
    tags: ['pregnant', 'infants', 'nutrition', 'free food'],
  },
  {
    id: 'nevada211',
    icon: '📞',
    color: '#8b5cf6',
    titleEn: 'Nevada 211 — Get Help Now',
    titleEs: 'Nevada 211 — Obtenga Ayuda Ahora',
    descEn: 'Call or text 211 any time, 24/7. A specialist will connect you with shelter, food, utilities, mental health, and any other local resource.',
    descEs: 'Llame o envíe un mensaje de texto al 211 en cualquier momento, 24/7. Un especialista lo conectará con refugio, alimentos, servicios públicos, salud mental y otros recursos.',
    eligibilityEn: 'Anyone in Nevada. No eligibility required.',
    eligibilityEs: 'Cualquier persona en Nevada. No se requiere elegibilidad.',
    howToEn: 'Just call or text 211. Free, confidential, available in Spanish.',
    howToEs: 'Solo llame o envíe un mensaje de texto al 211. Gratis, confidencial, disponible en español.',
    phone: '211',
    url: 'https://www.nevada211.org',
    tags: ['24/7', 'referrals', 'crisis', 'español'],
  },
];

export default function Benefits() {
  const { t, lang } = useLanguage();

  const heading = lang === 'es'
    ? 'Beneficios y Servicios del Gobierno'
    : 'Benefits & Government Services';
  const subheading = lang === 'es'
    ? 'Recursos disponibles para residentes de Las Vegas de bajos ingresos y personas sin hogar'
    : 'Available resources for low-income Las Vegas residents and people experiencing homelessness';
  const eligLabel = lang === 'es' ? 'Quién califica:' : 'Who qualifies:';
  const howLabel = lang === 'es' ? 'Cómo solicitar:' : 'How to apply:';
  const callLabel = lang === 'es' ? 'Llamar' : 'Call';
  const learnLabel = lang === 'es' ? 'Más información' : 'Learn More';

  return (
    <div className="benefits-page">
      <div className="benefits-header">
        <h2>{heading}</h2>
        <p>{subheading}</p>
      </div>

      <div className="benefits-grid">
        {BENEFITS.map(b => (
          <div key={b.id} className="benefit-card" style={{ '--accent-color': b.color }}>
            <div className="benefit-card-top">
              <div className="benefit-icon" style={{ background: b.color + '20', color: b.color }}>
                {b.icon}
              </div>
              <div className="benefit-tags">
                {b.tags.map(tag => (
                  <span key={tag} className="benefit-tag">{tag}</span>
                ))}
              </div>
            </div>

            <h3 style={{ color: b.color }}>{lang === 'es' ? b.titleEs : b.titleEn}</h3>
            <p className="benefit-desc">{lang === 'es' ? b.descEs : b.descEn}</p>

            <div className="benefit-detail">
              <strong>{eligLabel}</strong>
              <p>{lang === 'es' ? b.eligibilityEs : b.eligibilityEn}</p>
            </div>

            <div className="benefit-detail">
              <strong>{howLabel}</strong>
              <p>{lang === 'es' ? b.howToEs : b.howToEn}</p>
            </div>

            <div className="benefit-actions">
              <a href={`tel:${b.phone}`} className="btn-outline-sm">
                📞 {callLabel} {b.phone}
              </a>
              <a href={b.url} target="_blank" rel="noreferrer" className="btn-primary-sm">
                {learnLabel} →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
