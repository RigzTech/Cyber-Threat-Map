// CyberThreatMap.jsx
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import worldData from './world-110m.json';
import './CyberThreatMap.css';

const CyberThreatMap = () => {
  const mapRef = useRef(null);
  const dashboardRef = useRef(null);
  const analyticsRef = useRef(null);
  const mapInstance = useRef(null);
  const svgLayer = useRef(null);

  // Source countries (unchanged)
  const sourceCountries = [
    { name: 'Russia', lon: 37.6173, lat: 55.7558, gang: 'Evil Corp' },
    { name: 'China', lon: 116.4074, lat: 39.9042, gang: 'APT41' },
    { name: 'North Korea', lon: 127.7669, lat: 39.0392, gang: 'Lazarus Group' },
    { name: 'Iran', lon: 53.6880, lat: 32.4279, gang: 'Iranian Cyber Army' },
    { name: 'Nigeria', lon: 3.3792, lat: 6.5244, gang: 'Yahoo Boys' },
    { name: 'Iraq', lon: 33.3152, lat: 44.3661, gang: 'Iraqi Cyber Militia' },
    { name: 'Pakistan', lon: 30.3753, lat: 69.3451, gang: 'Crimson Typhoon' },
    { name: 'Brazil', lon: -47.8825, lat: -15.7942, gang: 'Brazilian Cyber Cartel' },
    { name: 'Ukraine', lon: 30.5234, lat: 50.4501, gang: 'Carbanak' },
    { name: 'Romania', lon: 26.1025, lat: 44.4268, gang: 'Romanian Skimmers' },
  ];

  // Destination cities (updated with Washington DC, Orlando, and Louisville)
  const destCities = [
    { name: 'Minneapolis', lon: -93.2650, lat: 44.9778 },
    { name: 'Dallas', lon: -96.7970, lat: 32.7767 },
    { name: 'Seattle', lon: -122.3321, lat: 47.6062 },
    { name: 'Miami', lon: -80.1918, lat: 25.7617 },
    { name: 'Indianapolis', lon: -86.1581, lat: 39.7684 },
    { name: 'Tokyo', lon: 139.6917, lat: 35.6895 },
    { name: 'London', lon: -0.1278, lat: 51.5074 },
    { name: 'Sydney', lon: 151.2093, lat: -33.8688 },
    { name: 'New York', lon: -74.006, lat: 40.7128 },
    { name: 'Paris', lon: 2.3522, lat: 48.8566 },
    { name: 'Washington DC', lon: -77.0369, lat: 38.9072 }, // Added Washington DC
    { name: 'Orlando', lon: -81.3789, lat: 28.5383 }, // Added Orlando, Florida
    { name: 'Louisville', lon: -85.7585, lat: 38.2527 }, // Added Louisville, Kentucky
  ];

  // Attack types
  const attackTypes = [
    { type: 'DDoS', color: '#ff4d4d' },
    { type: 'Malware', color: '#ffcc00' },
    { type: 'Phishing', color: '#3399ff' },
    { type: 'Ransomware', color: '#ff00ff' },
    { type: 'Spyware', color: '#00ffff' },
    { type: 'Botnet', color: '#ff9900' },
    { type: 'SQL Injection', color: '#9900ff' },
  ];

  // Initial attack data
  const initialAttackData = sourceCountries.map(source =>
    destCities.map(dest => ({
      source: { lon: source.lon, lat: source.lat },
      dest: { lon: dest.lon, lat: dest.lat },
      type: attackTypes[Math.floor(Math.random() * attackTypes.length)].type,
      count: Math.floor(Math.random() * 100) + 50,
      gang: source.gang,
    }))
  ).flat().slice(0, 20);

  const attackDataRef = useRef([...initialAttackData]);
  const historyRef = useRef([]);

  // Lookup
  const countryLookup = {};
  sourceCountries.forEach(c => {
    countryLookup[`${c.lon},${c.lat}`] = c.name;
  });
  destCities.forEach(c => {
    countryLookup[`${c.lon},${c.lat}`] = c.name;
  });

  useEffect(() => {
    if (!mapRef.current) {
      console.error('Map container not found');
      return;
    }

    const mapContainer = d3.select(mapRef.current);
    mapContainer.selectAll('*').remove();
    d3.select(analyticsRef.current).selectAll('*').remove();

    mapInstance.current = L.map(mapRef.current, {
      center: [0, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 18,
      zoomControl: false,
    });

    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 18,
    });

    tileLayer.on('tileerror', (error) => {
      console.error('Tile loading error:', error);
    });

    tileLayer.addTo(mapInstance.current);

    setTimeout(() => {
      if (mapInstance.current) {
        mapInstance.current.invalidateSize();
      }
    }, 0);

    svgLayer.current = L.svg({ clickable: true }).addTo(mapInstance.current);
    const svg = d3.select(mapRef.current).select('svg').attr('pointer-events', 'auto');
    const g = svg.append('g');

    if (!worldData?.objects?.ne_110m_admin_0_countries) {
      console.error('Invalid worldData structure');
      return;
    }

    const countries = topojson.feature(worldData, worldData.objects.ne_110m_admin_0_countries);
    countries.features = countries.features.filter(feature => {
      const coords = feature?.geometry?.coordinates;
      return coords && Array.isArray(coords) && coords.flat(Infinity).every(c => Number.isFinite(c));
    });

    g.append('g')
      .selectAll('path.country-boundary')
      .data(countries.features)
      .enter()
      .append('path')
      .attr('class', 'country-boundary')
      .attr('fill', 'none')
      .attr('stroke', '#00ff00')
      .attr('stroke-width', 0.5)
      .style('filter', 'url(#glow)')
      .attr('d', d => {
        const path = [];
        const project = ([lon, lat]) => mapInstance.current.latLngToLayerPoint([lat, lon]);
        if (d.geometry.type === 'Polygon') {
          d.geometry.coordinates.forEach(ring => {
            path.push('M' + ring.map(project).map(p => `${p.x},${p.y}`).join('L') + 'Z');
          });
        } else if (d.geometry.type === 'MultiPolygon') {
          d.geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => {
              path.push('M' + ring.map(project).map(p => `${p.x},${p.y}`).join('L') + 'Z');
            });
          });
        }
        return path.join('');
      });

    const continentMap = {
      Africa: ['Algeria', 'Nigeria', 'Kenya', 'South Africa'],
      Asia: ['China', 'India', 'Japan', 'Russia', 'North Korea', 'Iran', 'Iraq', 'Pakistan'],
      Australia: ['Australia'],
      Europe: ['Germany', 'France', 'United Kingdom', 'Italy', 'Ukraine', 'Romania'],
      'North America': ['United States', 'Canada', 'Mexico'],
      'South America': ['Brazil', 'Argentina', 'Chile'],
    };

    const continents = Object.keys(continentMap).map(continent => ({
      name: continent,
      countries: countries.features.filter(f => continentMap[continent].includes(f.properties.name)),
    }));

    g.append('g')
      .selectAll('path.continent-boundary')
      .data(continents)
      .enter()
      .append('path')
      .attr('class', 'continent-boundary')
      .attr('fill', 'none')
      .attr('stroke', '#00ff00')
      .attr('stroke-width', 1.5)
      .style('filter', 'url(#glow)')
      .attr('d', d => {
        const points = [];
        d.countries.forEach(country => {
          if (country.geometry.type === 'Polygon') {
            country.geometry.coordinates.forEach(ring => {
              ring.forEach(coord => points.push(coord));
            });
          } else if (country.geometry.type === 'MultiPolygon') {
            country.geometry.coordinates.forEach(polygon => {
              polygon.forEach(ring => {
                ring.forEach(coord => points.push(coord));
              });
            });
          }
        });
        if (!points.length) return '';
        const hull = d3.polygonHull(points);
        if (!hull) return '';
        const project = ([lon, lat]) => mapInstance.current.latLngToLayerPoint([lat, lon]);
        return 'M' + hull.map(project).map(p => `${p.x},${p.y}`).join('L') + 'Z';
      });

    const cityMarkers = {};
    [...sourceCountries, ...destCities].forEach(city => {
      const marker = L.marker([city.lat, city.lon], {
        icon: L.divIcon({
          className: 'city-label',
          html: `<span class="city-label-text" data-name="${city.name}" style="color: #3399ff; font-size: 10px; text-shadow: 0 0 2px #000;">${city.name}</span>`,
        }),
      }).addTo(mapInstance.current);
      cityMarkers[city.name] = marker;
    });

    const buttonContainer = d3
      .select('.map-container')
      .append('div')
      .attr('class', 'zoom-controls')
      .style('position', 'absolute')
      .style('top', '10px')
      .style('right', '10px')
      .style('z-index', '1000');

    buttonContainer
      .append('button')
      .attr('class', 'zoom-button zoom-in')
      .text('+')
      .on('click', () => {
        mapInstance.current.zoomIn();
        console.log('Zoom in clicked');
      });

    buttonContainer
      .append('button')
      .attr('class', 'zoom-button zoom-out')
      .text('−')
      .on('click', () => {
        mapInstance.current.zoomOut();
        console.log('Zoom out clicked');
      });

    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'glow');
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const getAttackColor = type => {
      const attack = attackTypes.find(a => a.type === type);
      return attack ? attack.color : '#fff';
    };

    const drawAttackLine = (attack, index, total) => {
      g.selectAll('.attack-line, .source-marker, .dest-marker').remove();

      const sourceLatLng = [attack.source.lat, attack.source.lon];
      const destLatLng = [attack.dest.lat, attack.dest.lon];

      console.log('Attack coordinates:', { attack, source: sourceLatLng, dest: destLatLng });

      if (
        !Number.isFinite(sourceLatLng[0]) ||
        !Number.isFinite(sourceLatLng[1]) ||
        !Number.isFinite(destLatLng[0]) ||
        !Number.isFinite(destLatLng[1])
      ) {
        console.warn('Invalid coordinates for attack:', attack);
        return;
      }

      const sourceName = countryLookup[`${attack.source.lon},${attack.source.lat}`];
      const destName = countryLookup[`${attack.dest.lon},${attack.dest.lat}`];
      if (sourceName && cityMarkers[sourceName]) {
        d3.select(cityMarkers[sourceName].getElement())
          .select('.city-label-text')
          .style('color', '#ff4d4d');
      }
      if (destName && cityMarkers[destName]) {
        d3.select(cityMarkers[destName].getElement())
          .select('.city-label-text')
          .style('color', '#3399ff');
      }

      const sourcePoint = mapInstance.current.latLngToLayerPoint(sourceLatLng);
      const sourceMarker = g
        .append('circle')
        .attr('class', 'source-marker')
        .attr('cx', sourcePoint.x)
        .attr('cy', sourcePoint.y)
        .attr('r', 5)
        .attr('fill', '#ff4d4d')
        .style('opacity', 0)
        .style('cursor', 'pointer')
        .on('click', () => {
          L.popup()
            .setLatLng(sourceLatLng)
            .setContent(`Type: ${attack.type}<br>Gang: ${attack.gang}`)
            .openOn(mapInstance.current);
        });

      const destPoint = mapInstance.current.latLngToLayerPoint(destLatLng);
      const destMarker = g
        .append('circle')
        .attr('class', 'dest-marker')
        .attr('cx', destPoint.x)
        .attr('cy', destPoint.y)
        .attr('r', 5)
        .attr('fill', getAttackColor(attack.type))
        .style('opacity', 0);

      const midPoint = [
        (sourcePoint.x + destPoint.x) / 2,
        Math.min(Math.max((sourcePoint.y + destPoint.y) / 2 - 50, 0), window.innerHeight * 0.6),
      ];

      console.log('MidPoint:', midPoint);

      if (!Number.isFinite(midPoint[0]) || !Number.isFinite(midPoint[1])) {
        console.warn('Invalid midPoint for attack:', attack);
        return;
      }

      const line = d3.line().curve(d3.curveBasis);
      const path = g
        .append('path')
        .attr('class', 'attack-line')
        .attr('stroke', getAttackColor(attack.type))
        .attr('stroke-width', 2)
        .attr('fill', 'none')
        .style('filter', 'url(#glow)')
        .style('opacity', 0);

      const animDuration = Math.random() * 1500 + 1500;

      sourceMarker.transition().duration(500).style('opacity', 1);
      destMarker.transition().duration(500).style('opacity', 1);
      path
        .transition()
        .duration(animDuration)
        .style('opacity', 1)
        .attrTween('d', () => {
          const points = [
            [sourcePoint.x, sourcePoint.y],
            midPoint,
            [destPoint.x, destPoint.y],
          ];
          return t => {
            const end = Math.min(t * points.length, points.length - 1);
            const interpolated = [];
            for (let i = 0; i <= Math.floor(end); i++) {
              if (i === Math.floor(end) && end % 1 > 0) {
                const frac = end % 1;
                const p1 = points[i];
                const p2 = points[i + 1] || p1;
                interpolated.push([
                  p1[0] + frac * (p2[0] - p1[0]),
                  p1[1] + frac * (p2[1] - p1[1]),
                ]);
              } else {
                interpolated.push(points[i]);
              }
            }
            return line(interpolated);
          };
        })
        .transition()
        .duration(1000)
        .style('opacity', 0)
        .on('end', () => {
          sourceMarker.remove();
          destMarker.remove();
          path.remove();
          if (sourceName && cityMarkers[sourceName]) {
            d3.select(cityMarkers[sourceName].getElement())
              .select('.city-label-text')
              .style('color', '#3399ff');
          }
          if (destName && cityMarkers[destName]) {
            d3.select(cityMarkers[destName].getElement())
              .select('.city-label-text')
              .style('color', '#3399ff');
          }
          const nextIndex = (index + 1) % total;
          if (nextIndex === 0) {
            attackDataRef.current = d3.shuffle([...attackDataRef.current]);
          }
          const randomDelay = Math.random() * 6000 + 1000;
          setTimeout(() => drawAttackLine(attackDataRef.current[nextIndex], nextIndex, total), randomDelay);
        });
    };

    const startAttackAnimation = () => {
      attackDataRef.current = d3.shuffle([...attackDataRef.current]);
      drawAttackLine(attackDataRef.current[0], 0, attackDataRef.current.length);
    };

    const updateMap = () => {
      g.selectAll('path.country-boundary').attr('d', d => {
        const path = [];
        const project = ([lon, lat]) => mapInstance.current.latLngToLayerPoint([lat, lon]);
        if (d.geometry.type === 'Polygon') {
          d.geometry.coordinates.forEach(ring => {
            path.push('M' + ring.map(project).map(p => `${p.x},${p.y}`).join('L') + 'Z');
          });
        } else if (d.geometry.type === 'MultiPolygon') {
          d.geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => {
              path.push('M' + ring.map(project).map(p => `${p.x},${p.y}`).join('L') + 'Z');
            });
          });
        }
        return path.join('');
      });

      g.selectAll('path.continent-boundary').attr('d', d => {
        const points = [];
        d.countries.forEach(country => {
          if (country.geometry.type === 'Polygon') {
            country.geometry.coordinates.forEach(ring => {
              ring.forEach(coord => points.push(coord));
            });
          } else if (country.geometry.type === 'MultiPolygon') {
            country.geometry.coordinates.forEach(polygon => {
              polygon.forEach(ring => {
                ring.forEach(coord => points.push(coord));
              });
            });
          }
        });
        if (!points.length) return '';
        const hull = d3.polygonHull(points);
        if (!hull) return '';
        const project = ([lon, lat]) => mapInstance.current.latLngToLayerPoint([lat, lon]);
        return 'M' + hull.map(project).map(p => `${p.x},${p.y}`).join('L') + 'Z';
      });
    };

    mapInstance.current.on('moveend zoomend', updateMap);
    startAttackAnimation();

    const updateDashboard = () => {
      d3.select(analyticsRef.current)
        .selectAll('.chart-container, .dashboard-tile')
        .remove();

      const newAttack = {
        source: sourceCountries[Math.floor(Math.random() * sourceCountries.length)],
        dest: destCities[Math.random() < 0.6 ? Math.floor(Math.random() * 5) : Math.floor(Math.random() * destCities.length)],
        type: attackTypes[Math.floor(Math.random() * attackTypes.length)].type,
        count: Math.floor(Math.random() * 100) + 50,
        gang: sourceCountries[Math.floor(Math.random() * sourceCountries.length)].gang,
      };
      attackDataRef.current.push({
        source: { lon: newAttack.source.lon, lat: newAttack.source.lat },
        dest: { lon: newAttack.dest.lon, lat: newAttack.dest.lat },
        type: newAttack.type,
        count: newAttack.count,
        gang: newAttack.gang,
      });
      if (attackDataRef.current.length > 50) attackDataRef.current.shift();
      historyRef.current.push({ time: Date.now(), count: attackDataRef.current.length });
      if (historyRef.current.length > 10) historyRef.current.shift();

      const attackSummary = d3.rollup(attackDataRef.current, v => v.length, d => d.type);
      const summaryData = Array.from(attackSummary, ([type, count]) => ({ type, count }));

      const sourceSummary = d3.rollup(
        attackDataRef.current,
        v => v.length,
        d => `${d.source.lon},${d.source.lat}`
      );
      const topSource = Array.from(sourceSummary, ([coords, count]) => ({ coords, count })).sort((a, b) => b.count - a.count)[0] || { coords: '', count: 0 };

      const destSummary = d3.rollup(
        attackDataRef.current,
        v => v.length,
        d => `${d.dest.lon},${d.dest.lat}`
      );
      const topDest = Array.from(destSummary, ([coords, count]) => ({ coords, count })).sort((a, b) => b.count - a.count)[0] || { coords: '', count: 0 };

      console.log('Attack Summary:', summaryData, 'Top Source:', topSource, 'Top Dest:', topDest);

      // Bar Chart (Updated)
      const chartContainer = d3.select(analyticsRef.current)
        .append('div')
        .attr('class', 'chart-container bar-tile')
        .style('width', '50%')
        .style('min-width', '300px');

      chartContainer
        .append('div')
        .attr('class', 'tile-title')
        .text('Attack Type Distribution');

      const margin = { top: 40, right: 30, bottom: 50, left: 50 };
      const barWidth = 300;
      const barHeight = 200;

      const barSvg = chartContainer
        .append('svg')
        .attr('width', barWidth + margin.left + margin.right)
        .attr('height', barHeight + margin.top + margin.bottom);

      const barG = barSvg.append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

      const xScale = d3
        .scaleBand()
        .domain(summaryData.map(d => d.type))
        .range([0, barWidth])
        .padding(0.3);

      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(summaryData, d => d.count) * 1.1 || 10]) // Add padding to max value
        .range([barHeight, 0]);

      // Add Y-axis grid lines
      barG.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
          .tickSize(-barWidth)
          .tickFormat('')
        )
        .selectAll('.tick line')
        .attr('stroke', '#00ffcc')
        .attr('stroke-opacity', 0.2);

      const bars = barG
        .selectAll('.bar')
        .data(summaryData, d => d.type);

      bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.type) || 0)
        .attr('y', barHeight) // Start at bottom
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', d => getAttackColor(d.type))
        .merge(bars)
        .transition()
        .duration(500)
        .attr('x', d => xScale(d.type) || 0)
        .attr('y', d => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => barHeight - yScale(d.count));

      bars.exit().remove();

      barG.append('g')
        .attr('class', 'bar-axis-x')
        .attr('transform', `translate(0, ${barHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('fill', '#00ffcc')
        .style('font-size', '12px')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

      barG.append('g')
        .attr('class', 'bar-axis-y')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('fill', '#00ffcc')
        .style('font-size', '12px');

      // Add Y-axis label
      barG.append('text')
        .attr('class', 'axis-label')
        .attr('x', -barHeight / 2)
        .attr('y', -margin.left + 15)
        .attr('transform', 'rotate(-90)')
        .style('fill', '#00ffcc')
        .style('font-family', 'sans-serif')
        .style('font-size', '12px')
        .style('text-anchor', 'middle')
        .text('Number of Attacks');

      // Recent Attacks Table
      const tableTile = d3.select(analyticsRef.current)
        .append('div')
        .attr('class', 'dashboard-tile table-analysis-container')
        .style('width', '50%')
        .style('min-width', '300px');

      tableTile
        .append('div')
        .attr('class', 'tile-title')
        .text('Recent Attacks');

      const tableSvg = tableTile
        .append('svg')
        .attr('width', '100%')
        .attr('height', 200);

      const recentAttacks = attackDataRef.current.slice(-5).map(attack => ({
        type: attack.type,
        gang: attack.gang,
        source: countryLookup[`${attack.source.lon},${attack.source.lat}`] || 'Unknown',
        dest: countryLookup[`${attack.dest.lon},${attack.dest.lat}`] || 'Unknown',
      }));

      const tableG = tableSvg
        .selectAll('.table-g')
        .data([null])
        .join('g')
        .attr('class', 'table-g')
        .attr('transform', 'translate(10, 20)');

      tableG
        .selectAll('.table-row')
        .data(recentAttacks)
        .join('g')
        .attr('class', 'table-row')
        .attr('transform', (d, i) => `translate(0, ${i * 20 + 20})`)
        .each(function (d) {
          d3.select(this)
            .selectAll('text')
            .data([d.type, d.gang, d.source, d.dest])
            .join('text')
            .attr('x', (d, i) => i * 80)
            .attr('y', 0)
            .attr('fill', '#00ffcc')
            .text(d => d);
        });

      tableG
        .selectAll('.table-header')
        .data([null])
        .join('g')
        .attr('class', 'table-header')
        .attr('transform', 'translate(0, 0)')
        .selectAll('text')
        .data(['Type', 'Gang', 'Source', 'Dest'])
        .join('text')
        .attr('x', (d, i) => i * 80)
        .attr('y', 0)
        .attr('fill', '#3399ff')
        .text(d => d);

      // Analysis Text
      const analysisTile = d3.select(analyticsRef.current)
        .append('div')
        .attr('class', 'dashboard-tile table-analysis-container')
        .style('width', '90%')
        .style('min-width', '300px');

      analysisTile
        .append('div')
        .attr('class', 'tile-title')
        .text('Threat Summary');

      const analysisSvg = analysisTile
        .append('svg')
        .attr('width', '100%')
        .attr('height', 120);

      const total = d3.sum(summaryData, d => d.count);
      const sortedAttacks = summaryData.sort((a, b) => b.count - a.count);
      const top3 = sortedAttacks.slice(0, 3).map(d => `${d.type} (${((d.count / total) * 100).toFixed(1)}%)`);
      const analysisText = [
        `Total Attacks: ${total}`,
        `Top Attacks: ${top3.join(', ')}`,
        `Top Source: ${countryLookup[topSource.coords] || 'Unknown'} (${topSource.count} attacks)`,
        `Top Target: ${countryLookup[topDest.coords] || 'Unknown'} (${topDest.count} attacks)`,
      ];

      analysisSvg
        .selectAll('.analysis-text')
        .data(analysisText)
        .join('text')
        .attr('class', 'analysis-text')
        .attr('x', 10)
        .attr('y', (d, i) => 20 + i * 20)
        .attr('fill', '#00ffcc')
        .text(d => d);
    };

    updateDashboard();
    const dashboardInterval = setInterval(updateDashboard, 5000);

    return () => {
      clearInterval(dashboardInterval);
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  return (
    <div className="cyber-threat-container">
      <div className="heading-container">
        <h1>Kemgen Live Threat Intelligence</h1>
      </div>
      <div className="map-container">
        <div className="cyber-map" ref={mapRef} />
      </div>
      <div className="dashboard-container">
        <div className="threat-analytics-container" ref={dashboardRef}>
          <h2>Threat Analytics</h2>
          <div className="attack-dashboard" ref={analyticsRef} />
        </div>
      </div>
    </div>
  );
};

export default CyberThreatMap;