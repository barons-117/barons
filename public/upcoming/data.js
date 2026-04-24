// Dummy upcoming trips data — matches the shape used in Travels.jsx
// Dates are relative to "today" so the countdown stays meaningful.

(function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function addDays(n) {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  window.UPCOMING_TRIPS = [
    {
      id: 'paris-26',
      name: 'Paris with Dana',
      name_he: 'פריז עם דנה',
      startDate: addDays(32),
      endDate: addDays(39),
      cities: ['Paris'],
      countries: ['France'],
      continents: ['אירופה'],
      companions: ['דנה'],
      bookedOn: addDays(-45),   // how long ago we booked it
      hasFlights: true,
      hasLodging: true,
      weather: { temp: 14, cond: 'מעונן חלקית' },
      tzOffset: 1,              // Paris = UTC+1
      hero: { emoji: '🗼', glyph: 'FR', hue: 215 },
    },
    {
      id: 'bkk-26',
      name: 'Bangkok with Roy',
      name_he: 'בנגקוק עם רועי',
      startDate: addDays(6),
      endDate: addDays(20),
      cities: ['Bangkok', 'Phuket'],
      countries: ['Thailand'],
      continents: ['אסיה'],
      companions: ['רועי', 'שירה'],
      bookedOn: addDays(-120),
      hasFlights: true,
      hasLodging: false,
      weather: { temp: 32, cond: 'שמשי' },
      tzOffset: 7,
      hero: { emoji: '🛕', glyph: 'TH', hue: 35 },
    },
    {
      id: 'ny-26',
      name: 'New York long weekend',
      name_he: 'סופ״ש ארוך בניו יורק',
      startDate: addDays(78),
      endDate: addDays(83),
      cities: ['New York City'],
      countries: ['New York'],
      continents: ['צפון אמריקה'],
      companions: [],
      bookedOn: addDays(-20),
      hasFlights: true,
      hasLodging: true,
      weather: { temp: 8, cond: 'גשום' },
      tzOffset: -5,
      hero: { emoji: '🗽', glyph: 'NY', hue: 155 },
    },
  ];
})();
