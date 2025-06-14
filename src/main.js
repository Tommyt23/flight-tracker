import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { OSM } from 'ol/source';
import { Vector as VectorSource } from 'ol/source';
import { Point } from 'ol/geom';
import { Feature } from 'ol';
import { Icon, Style } from 'ol/style';
import { fromLonLat } from 'ol/proj';

// API Key from .env
const API_KEY = import.meta.env.VITE_AVIATION_API_KEY;
console.log('API Key:', API_KEY);

const vectorSource = new VectorSource();
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({ source: new OSM() }),
    new VectorLayer({ source: vectorSource }),
  ],
  view: new View({
    center: fromLonLat([-0.1276, 51.5072]), // London
    zoom: 3,
  }),
});

const flightDetailsEl = document.getElementById('flightDetails');
const messageBox = document.getElementById('messageBox');

async function fetchFlights() {
  try {
    messageBox.style.display = 'none';

    const res = await fetch(`http://api.aviationstack.com/v1/flights?access_key=${API_KEY}&flight_status=active&limit=100`);
    const data = await res.json();

    if (!data || !data.data) throw new Error('Invalid API response');

    const flights = data.data;

    // Log total flights vs flights with live position
    const flightsWithPosition = flights.filter(f => f.live && f.live.latitude != null && f.live.longitude != null);
    console.log(`Total flights: ${flights.length}, Flights with live position: ${flightsWithPosition.length}`);

    vectorSource.clear();
    flightDetailsEl.innerHTML = '';

    flightsWithPosition.forEach((flight) => {
      const callsign = flight.flight.iata || flight.flight.icao || 'N/A';
      const latitude = flight.live.latitude;
      const longitude = flight.live.longitude;
      const altitude = flight.live.altitude;
      const direction = flight.live.direction;
      const speed = flight.live.speed_horizontal;
      const country = flight.airline?.name || 'Unknown';

      // Map marker
      const feature = new Feature({
        geometry: new Point(fromLonLat([longitude, latitude])),
        name: callsign,
      });
      feature.setStyle(
        new Style({
          image: new Icon({
            src: 'https://img.icons8.com/ios-filled/50/000000/airplane-take-off.png',
            scale: 0.5,
          }),
        })
      );
      vectorSource.addFeature(feature);

      // Card info
      const card = document.createElement('div');
      card.className = 'flight-card';
      card.innerHTML = `
        <h3>${callsign}</h3>
        <p><strong>Airline:</strong> ${country}</p>
        <p><strong>Latitude:</strong> ${latitude.toFixed(2)}</p>
        <p><strong>Longitude:</strong> ${longitude.toFixed(2)}</p>
        <p><strong>Altitude:</strong> ${altitude ? altitude.toFixed(0) + ' m' : 'N/A'}</p>
        <p><strong>Speed:</strong> ${speed ? speed.toFixed(1) + ' km/h' : 'N/A'}</p>
        <p><strong>Direction:</strong> ${direction ? direction.toFixed(1) + '°' : 'N/A'}</p>
      `;
      flightDetailsEl.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    messageBox.style.display = 'block';
    messageBox.textContent = 'Error loading flight data. Please check your API key or try again later.';
  }
}

fetchFlights();
setInterval(fetchFlights, 8 * 60 * 60 * 1000); // every 8 hours (28800000 ms)
