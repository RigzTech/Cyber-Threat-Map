// CyberThreatMap.jsx
import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  Marker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'flag-icons/css/flag-icons.min.css';
import usStatesGeoJSON from './us-states.json';
import './CyberThreatMap.css';

// Constants for cyber threats
const cyberThreats = [
  { type: 'DDoS Attack', severity: 'High' },
  { type: 'Ransomware', severity: 'Critical' },
  { type: 'Phishing Campaign', severity: 'Medium' },
  { type: 'SQL Injection', severity: 'High' },
  { type: 'Zero-Day Exploit', severity: 'Critical' },
  { type: 'MS.NET Framework CVE-2024-29059', severity: 'High', count: 5981 },
];

// Hacker origins by continent
const hackerOriginsByContinent = {
    Asia: [
      { name: 'China', coords: [35.8617, 104.1954], group: 'APT41' },
      { name: 'North Korea', coords: [40.3399, 127.5101], group: 'Lazarus' },
      { name: 'Iran', coords: [32.4279, 53.6880], group: 'APT33' },
      { name: 'Iraq', coords: [33.3152, 44.3661], group: 'DarkRiver' }, // fictional or placeholder
      { name: 'Pakistan', coords: [30.3753, 69.3451], group: 'TransparentTribe' },
      { name: 'Japan', coords: [36.2048, 138.2529], group: 'APT10 Clone' },
    ],
    Europe: [
      { name: 'Russia', coords: [55.7558, 37.6173], group: 'APT28' },
      { name: 'Ukraine', coords: [48.3794, 31.1656], group: 'Sandworm' },
    ],
    Americas: [
      { name: 'Brazil', coords: [-14.2350, -51.9253], group: 'PRIMORDIAL' },
    ],
    Africa: [
      { name: 'Nigeria', coords: [9.0820, 8.6753], group: 'SilverTerrier' },
    ],
    Oceania: [
      { name: 'Australia', coords: [-25.2744, 133.7751], group: 'CopyKittens' },
    ],
  };
// Target locations data
const targets = [
  { name: 'Mandaluyong', coords: [14.5794, 121.0359], country: 'Philippines' },
];

// Top targeted countries data
const topTargetedCountries = [
  { name: 'Germany', attacks: 2283, code: 'de' },
  { name: 'United States', attacks: 1206, code: 'us' },
  { name: 'Netherlands', attacks: 812, code: 'nl' },
  { name: 'United Kingdom', attacks: 230, code: 'gb' },
  { name: 'Brazil', attacks: 222, code: 'br' },
];

// Function to generate a random threat level
const getThreatLevel = () => Math.floor(Math.random() * 100);

// Function to get random coordinates from a GeoJSON feature
const getRandomCoords = (feature) => {
  const coords = feature.geometry.coordinates;
  if (feature.geometry.type === 'Polygon') {
    const [lng, lat] = coords[0][0];
    return [lat, lng];
  } else if (feature.geometry.type === 'MultiPolygon') {
    const [lng, lat] = coords[0][0][0];
    return [lat, lng];
  }
  return [0, 0];
};

// Custom marker icons
const attackIcon = L.divIcon({
  html: `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 22h20L12 2z" fill="#ff0000" stroke="#E0F7FA" stroke-width="1"/>
      <circle cx="12" cy="16" r="2" fill="#E0F7FA"/>
      <path d="M12 8v4" stroke="#E0F7FA" stroke-width="2"/>
    </svg>
  `,
  className: 'attack-icon',
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

const targetIcon = L.divIcon({
  html: '<div style="background-color: #ff5555; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #E0F7FA;"></div>',
  className: 'target-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const sourceIcon = L.divIcon({
  html: '<div style="background-color: #4B6CB7; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #E0F7FA;"></div>',
  className: 'source-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const malwareIcon = L.divIcon({
  html: '<div style="background-color: #FFD700; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #E0F7FA;"></div>',
  className: 'malware-icon',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

// Component to animate a threat line between attacker and target
const AnimatedThreatLine = ({ from, to, onComplete, onImpact }) => {
  const [position, setPosition] = useState(from);
  const [impact, setImpact] = useState(null);
  const map = useMap();

  useEffect(() => {
    let step = 0;
    const steps = 60;
    const latDiff = (to[0] - from[0]) / steps;
    const lngDiff = (to[1] - from[1]) / steps;

    const interval = setInterval(() => {
      step++;
      const newLat = from[0] + latDiff * step;
      const newLng = from[1] + lngDiff * step;
      setPosition([newLat, newLng]);

      if (step >= steps) {
        setImpact(to);
        map.panTo(to, { animate: true });
        onImpact(to);
        onComplete();
        clearInterval(interval);
      }
    }, 50);

    return () => {
      clearInterval(interval);
    };
  }, [from, to, onComplete, onImpact, map]);

  return (
    <>
      <Polyline positions={[from, position]} color="#ff5555" weight={3} dashArray="6, 6" />
      {impact && <Marker position={impact} icon={attackIcon} />}
    </>
  );
};

// Main Cyber Threat Map component
const CyberThreatMap = () => {
  const [threats, setThreats] = useState({});
  const [threatLines, setThreatLines] = useState([]);
  const [impactLog, setImpactLog] = useState({});

  // Update threats for each US state
  useEffect(() => {
    const updateThreats = () => {
      const newThreats = {};
      usStatesGeoJSON.features.forEach((feature) => {
        newThreats[feature.properties.name] = {
          level: getThreatLevel(),
          threat: cyberThreats[Math.floor(Math.random() * cyberThreats.length)],
        };
      });
      setThreats(newThreats);
    };

    updateThreats();
    const interval = setInterval(updateThreats, 7000);
    return () => clearInterval(interval);
  }, []);

  // Generate new threat lines
  useEffect(() => {
    const generateNewLine = () => {
      if (threatLines.length >= 3) return;

      const continents = Object.keys(hackerOriginsByContinent);
      const randomContinent = continents[Math.floor(Math.random() * continents.length)];
      const origin = hackerOriginsByContinent[randomContinent][Math.floor(Math.random() * hackerOriginsByContinent[randomContinent].length)];
      const targetFeature = usStatesGeoJSON.features[Math.floor(Math.random() * usStatesGeoJSON.features.length)];
      const targetCoords = getRandomCoords(targetFeature);

      const newLine = {
        id: Date.now(),
        from: origin.coords,
        to: targetCoords,
        targetState: targetFeature.properties.name,
      };

      setThreatLines((prev) => [...prev, newLine]);
    };

    const interval = setInterval(generateNewLine, 3000);
    return () => clearInterval(interval);
  }, [threatLines]);

  const handleLineComplete = (id) => {
    setThreatLines((prev) => prev.filter((line) => line.id !== id));
  };

  const handleImpact = (coords) => {
    const matchedFeature = usStatesGeoJSON.features.find((feature) => {
      const [lat, lng] = getRandomCoords(feature);
      return Math.abs(lat - coords[0]) < 2 && Math.abs(lng - coords[1]) < 2;
    });

    if (matchedFeature) {
      const stateName = matchedFeature.properties.name;
      setImpactLog((prev) => ({
        ...prev,
        [stateName]: (prev[stateName] || 0) + 1,
      }));
    }
  };

  // Calculate analytics data
  const totalAttacks = Object.values(impactLog).reduce((sum, count) => sum + count, 0);
  const hardestHitStates = Object.entries(impactLog)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([state, hits]) => ({ state, hits }));

  const threatDistribution = {
    Critical: Object.values(threats).filter((t) => t.level > 80).length,
    High: Object.values(threats).filter((t) => t.level > 60 && t.level <= 80).length,
    Medium: Object.values(threats).filter((t) => t.level > 40 && t.level <= 60).length,
    Low: Object.values(threats).filter((t) => t.level <= 40).length,
  };

  return (
    <div className="cyber-threat-map">
      <div className="title-section">
        <h1 className="title-main">Kemgen Solutions</h1>
        <h2 className="title-sub">Cyber Threat Intelligence</h2>
      </div>
      <div className="map-dashboard-container">
        <div className="map-container">
          <MapContainer
            center={[37.8, -96]}
            zoom={4}
            scrollWheelZoom={true}
            style={{ height: '600px', width: '100%' }}
            maxBounds={[[15, -135], [60, -60]]}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution="© Kemgen Solutions | OpenStreetMap & CartoDB"
            />
            <GeoJSON
              data={usStatesGeoJSON}
              style={() => ({
                fillColor: '#2e8b57',
                weight: 1.5,
                color: '#4B6CB7',
                fillOpacity: 0.6,
              })}
              onEachFeature={(feature, layer) => {
                const stateName = feature.properties.name;
                const data = threats[stateName];
                if (data) {
                  const severityClass = `severity-${data.threat.severity.toLowerCase()}`;
                  layer.bindPopup(`
                    <div class="popup-content">
                      <strong>${stateName}</strong><br/>
                      Threat: <span class="${severityClass}">${data.threat.type}</span><br/>
                      Severity: <span class="${severityClass}">${data.threat.severity}</span><br/>
                      Level: ${data.level}%
                    </div>
                  `);
                }
              }}
            />
            {threatLines.map((line) => (
              <AnimatedThreatLine
                key={line.id}
                from={line.from}
                to={line.to}
                onComplete={() => handleLineComplete(line.id)}
                onImpact={(coords) => handleImpact(coords)}
              />
            ))}
            {targets.map((target, index) => (
              <Marker key={`target-${index}`} position={target.coords} icon={targetIcon} />
            ))}
            {hackerOriginsByContinent.Asia.filter(origin => origin.name === 'Hong Kong').map((origin, index) => (
              <Marker key={`source-${index}`} position={origin.coords} icon={sourceIcon} />
            ))}
          </MapContainer>
        </div>

        <div className="analytics-dashboard">
          <div className="dashboard-section">
            <h3>Timeframe: 24 Hours</h3>
            <h4>Top Threats</h4>
            <p>Most prevalent cyber exploits observed during the selected period.</p>
            {cyberThreats.map((threat, index) => (
              <div key={index} className="threat-item">
                <p>
                  <strong className={`severity-${threat.severity.toLowerCase()}`}>{threat.type}</strong> {threat.count ? threat.count.toLocaleString() : ''}
                </p>
                <p>IPS Target City <span className="dot target-dot"></span></p>
                <p>IPS Source City <span className="dot source-dot"></span></p>
                <p>Malware <span className="dot malware-dot"></span></p>
              </div>
            ))}
          </div>

          <div className="dashboard-section">
            <h4>Top Targeted Countries</h4>
            <p>Highlights the countries with the highest volume of cyber attacks within a specified time frame.</p>
            <ul>
              {topTargetedCountries.map((country, index) => (
                <li key={index}>
                  <span className={`flag-icon flag-icon-${country.code}`}></span>
                  {country.name} {country.attacks.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>

          <div className="dashboard-section">
            <h4>Real-Time Attacks at 4/8/2025, 10:50:42 AM</h4>
            <div className="attack-log">
              <div className="attack-item">
                <p>
                  IPS: <span className="severity-high">MS.NET Framework CVE-2024-29059.Information_Disclosure</span>
                </p>
                <p>
                  <span className="flag-icon flag-icon-hk"></span> Hong Kong →{' '}
                  <span className="flag-icon flag-icon-ph"></span> Mandaluyong
                </p>
                <p className="severity-high">High Microsoft.NET Framework Information Disclosure</p>
              </div>
              <div className="attack-item">
                <p>
                  IPS: <span className="severity-high">MS.NET Framework CVE-2024-29059.Information_Disclosure</span>
                </p>
                <p>
                  <span className="flag-icon flag-icon-hk"></span> Hong Kong →{' '}
                  <span className="flag-icon flag-icon-ph"></span> Mandaluyong
                </p>
                <p className="severity-high">High Microsoft.NET Framework Information Disclosure</p>
              </div>
            </div>
          </div>

          <div className="dashboard-section threat-dashboard">
            <h3>Threat Analytics Dashboard</h3>
            <div className="analytics-grid">
              <div className="analytic-card">
                <h4>Total Attacks</h4>
                <p>{totalAttacks}</p>
              </div>
              <div className="analytic-card">
                <h4>Hardest Hit States</h4>
                <ul>
                  {hardestHitStates.map(({ state, hits }) => (
                    <li key={state}>{state}: {hits} hits</li>
                  ))}
                </ul>
              </div>
              <div className="analytic-card">
                <h4>Threat Distribution</h4>
                <p>
                  Critical: {threatDistribution.Critical}<br />
                  High: {threatDistribution.High}<br />
                  Medium: {threatDistribution.Medium}<br />
                  Low: {threatDistribution.Low}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CyberThreatMap;