import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import { useLanguage } from '../context/LanguageContext';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_CONFIG = {
  all:      { label: 'All', color: '#6b7280', emoji: '📍' },
  shelter:  { label: 'Shelter', color: '#ef4444', emoji: '🏠' },
  food:     { label: 'Food', color: '#f97316', emoji: '🍽️' },
  health:   { label: 'Health', color: '#10b981', emoji: '🏥' },
  legal:    { label: 'Legal', color: '#6366f1', emoji: '⚖️' },
  services: { label: 'Services', color: '#3b82f6', emoji: '🤝' },
  cooling:  { label: 'Cooling', color: '#06b6d4', emoji: '❄️' },
  veterans: { label: 'Veterans', color: '#8b5cf6', emoji: '🎖️' },
};

function createIcon(category) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.all;
  return L.divIcon({
    html: `<div style="background:${config.color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${config.emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

export default function ResourceMap() {
  const [resources, setResources] = useState([]);
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(null);
  const { t } = useLanguage();

  useEffect(() => {
    api.get('/resources', { params: { category } }).then(r => setResources(r.data));
  }, [category]);

  const LAS_VEGAS_CENTER = [36.1699, -115.1398];

  return (
    <div className="map-page">
      <div className="map-sidebar">
        <h2>{t('map_title')}</h2>
        <p className="map-subtitle">{t('map_subtitle')}</p>

        <div className="category-filters">
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              className={`filter-btn ${category === key ? 'active' : ''}`}
              style={category === key ? { borderColor: cfg.color, color: cfg.color } : {}}
              onClick={() => setCategory(key)}
            >
              {cfg.emoji} {t(`cat_${key}`) || cfg.label}
            </button>
          ))}
        </div>

        <div className="resource-list">
          {resources.map(r => (
            <div
              key={r.id}
              className={`resource-item ${selected?.id === r.id ? 'active' : ''}`}
              onClick={() => setSelected(r)}
            >
              <div className="resource-item-header">
                <span className="resource-emoji">{CATEGORY_CONFIG[r.category]?.emoji || '📍'}</span>
                <strong>{r.name}</strong>
              </div>
              <p className="resource-item-desc">{r.description}</p>
              {r.hours && <span className="resource-hours">🕐 {r.hours}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="map-container">
        <MapContainer center={LAS_VEGAS_CENTER} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {resources.map(r => (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={createIcon(r.category)}
              eventHandlers={{ click: () => setSelected(r) }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{r.name}</strong>
                  <p>{r.description}</p>
                  {r.address && <p>📍 {r.address}</p>}
                  {r.hours && <p>🕐 {r.hours}</p>}
                  {r.phone && <p>📞 <a href={`tel:${r.phone}`}>{r.phone}</a></p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
