var cities = {
  'Bogota':        {lat: 4.711,    lon: -74.0721, zoom: 10},
  'Medellin':      {lat: 6.2442,   lon: -75.5812, zoom: 10},
  'Cali':          {lat: 3.4516,   lon: -76.532,  zoom: 10},
  'Barranquilla':  {lat: 10.9685,  lon: -74.7813, zoom: 10},
  'Cartagena':     {lat: 10.391,   lon: -75.4794, zoom: 10},
  'Ibague':        {lat: 4.4389,   lon: -75.2322, zoom: 11},
  'Bucaramanga':   {lat: 7.1193,   lon: -73.1227, zoom: 11},
  'Santa Marta':   {lat: 11.2408,  lon: -74.1990, zoom: 10},
  'Pereira':       {lat: 4.8143,   lon: -75.6946, zoom: 11},
  'Manizales':     {lat: 5.0703,   lon: -75.5138, zoom: 11},
  'Cucuta':        {lat: 7.8891,   lon: -72.4967, zoom: 11},
  'Villavicencio': {lat: 4.1420,   lon: -73.6266, zoom: 11},
  'Pasto':         {lat: 1.2136,   lon: -77.2811, zoom: 11},
  'Neiva':         {lat: 2.93001,  lon: -75.27973,zoom: 11},
  'Soacha':        {lat: 4.57937,  lon: -74.21682,zoom: 11},
  'Monteria':      {lat: 8.75081,  lon: -75.87823,zoom: 11},
  'Valledupar':    {lat: 10.46538, lon: -73.2531, zoom: 11},
  'Bello':         {lat: 6.33732,  lon: -75.55795,zoom: 11},
  'Soledad':       {lat: 10.91843, lon: -74.76459,zoom: 11},
  'Popayan':       {lat: 2.43823,  lon: -76.61316,zoom: 11},
  'San Jose (CR)': {lat: 9.9281,   lon: -84.0907, zoom: 10},
  'Mexico City':   {lat: 19.4326,  lon: -99.1332, zoom: 10},
  'New York':      {lat: 40.7128,  lon: -74.0060, zoom: 10},
  'Madrid':        {lat: 40.4168,  lon: -3.7038,  zoom: 10}
};


var viirs = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG')
              .select('avg_rad');

var latestImage = viirs.sort('system:time_start', false).first();
var latestYear  = ee.Date(latestImage.get('system:time_start')).get('year');


function getMoonPhase() {
  var refDate      = new Date(2000, 0, 6);
  var lunarCycle   = 29.530588;
  var daysSinceRef = (new Date() - refDate) / 86400000;
  var phase        = ((daysSinceRef % lunarCycle) + lunarCycle) % lunarCycle;
  var illumination = (1 - Math.cos(phase / lunarCycle * 2 * Math.PI)) / 2;

  var name;
  if      (phase < 1.85)  name = 'New Moon';
  else if (phase < 7.38)  name = 'Waxing Crescent';
  else if (phase < 9.22)  name = 'First Quarter';
  else if (phase < 14.77) name = 'Waxing Gibbous';
  else if (phase < 16.61) name = 'Full Moon';
  else if (phase < 22.15) name = 'Waning Gibbous';
  else if (phase < 23.99) name = 'Last Quarter';
  else                    name = 'Waning Crescent';

  var pct    = Math.round(illumination * 100);
  var impact = pct < 25 ? 'Low impact' : pct < 65 ? 'Med impact' : 'High impact';
  return {name: name, pct: pct, impact: impact};
}

function getWindDirection(u, v) {
  var deg  = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360;
  var dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function getCelestialObjects(month) {
  var objects = {
    1:  ['Saturn', 'Orion Nebula', 'Pleiades', 'Milky Way core'],
    2:  ['Jupiter', 'Orion Nebula', 'Carina Nebula', 'Virgo Cluster'],
    3:  ['Jupiter', 'Leo Triplet', 'Virgo Cluster', 'Omega Centauri'],
    4:  ['Saturn', 'Omega Centauri', 'Centaurus A', 'Milky Way core'],
    5:  ['Saturn', 'Milky Way core', 'Omega Centauri', 'Scorpius Neb.'],
    6:  ['Saturn', 'Milky Way core', 'Lagoon Nebula', 'Trifid Nebula'],
    7:  ['Saturn', 'Milky Way core', 'Lagoon Nebula', 'Eagle Nebula'],
    8:  ['Saturn', 'Neptune', 'Milky Way core', 'Andromeda'],
    9:  ['Neptune', 'Uranus', 'Andromeda', 'Milky Way core'],
    10: ['Jupiter', 'Uranus', 'Andromeda', 'Perseus Cluster'],
    11: ['Jupiter', 'Pleiades', 'Orion Nebula', 'Andromeda'],
    12: ['Jupiter', 'Saturn', 'Orion Nebula', 'Pleiades']
  };
  return objects[month] || objects[1];
}

function getStargrazingScore(cloudPct, windSpeed, moonPct) {
  var cloudScore = Math.max(0, 100 - cloudPct * 1.2);
  var windScore  = windSpeed < 3 ? 100 : windSpeed < 7 ? 80 : windSpeed < 12 ? 55 : 30;
  var moonScore  = Math.max(0, 100 - moonPct * 0.8);
  return Math.round(cloudScore * 0.5 + moonScore * 0.3 + windScore * 0.2);
}

function makeDivider(label) {
  return ui.Label({
    value: label,
    style: {
      fontSize: '9px',
      color: '#3a6a9a',
      backgroundColor: '#E5E4F5',
      padding: '2px 4px',
      margin: '6px 0 4px 0',
      stretch: 'horizontal'
    }
  });
}


latestYear.evaluate(function(latestYearValue) {


  function addLegend() {
    var legend = ui.Panel({
      style: {
        position: 'bottom-left',
        padding: '10px',
        backgroundColor: '#E5E4F5',
        borderRadius: '8px',
        border: '1px solid #1e3a5a'
      }
    });
    legend.add(ui.Label({
      value: 'Light Intensity',
      style: {fontWeight: 'bold', margin: '0 0 6px 0', color: '#041C69'}
    }));
    var palette = ['#000000','#0b1d51','#1e3a8a','#2563eb','#38bdf8','#a3e635','#fde047','#f97316','#ef4444'];
    var names   = ['Low','','','','','','','','High'];
    for (var i = 0; i < palette.length; i++) {
      legend.add(ui.Panel(
        [
          ui.Label('', {backgroundColor: palette[i], padding: '8px'}),
          ui.Label(names[i], {margin: '0 0 4px 6px', color: '#041C69', fontSize: '11px'})
        ],
        ui.Panel.Layout.Flow('horizontal')
      ));
    }
    Map.add(legend);
  }
  addLegend();

 
  var visParams = {
    min: 0, max: 25,
    palette: ['#000000','#0b1d51','#1e3a8a','#2563eb','#38bdf8','#a3e635','#fde047','#f97316','#ef4444']
  };


  Map.addLayer(
    viirs.filter(ee.Filter.calendarRange(latestYearValue, latestYearValue, 'year')).mean(),
    visParams, 'Nighttime Lights ' + latestYearValue, true, 0.6
  );


  var cityMarkerLayer = ui.Map.Layer();
  Map.layers().add(cityMarkerLayer);

  // --- Info panel (bottom-right) ---
  var infoPanel = ui.Panel({
    style: {
      width: '240px',
      position: 'bottom-right',
      padding: '16px 20px',
      backgroundColor: '#E5E4F5',
      border: '1px solid #1e3a5a',
      borderRadius: '10px'
    }
  });
  infoPanel.add(ui.Label({
    value: 'Select a city to begin',
    style: {color: '#3a6a9a', fontSize: '12px'}
  }));
  Map.add(infoPanel);

  // --- Cloud panel (top-right) ---
  var cloudPanel = ui.Panel({
    style: {
      width: '240px',
      position: 'top-right',
      padding: '12px 16px',
      backgroundColor: '#E5E4F5',
      border: '1px solid #1e3a5a',
      borderRadius: '10px'
    }
  });
  cloudPanel.add(ui.Label({
    value: 'Cloud cover: select a city',
    style: {color: '#3a6a9a', fontSize: '12px'}
  }));
  Map.add(cloudPanel);

  
  function updateMainInfo(city, coords) {
    var region = ee.Geometry.Point([coords.lon, coords.lat]).buffer(50000);

    infoPanel.clear();
    infoPanel.add(ui.Label({
      value: 'Loading ' + city + '...',
      style: {color: '#041C69', fontSize: '12px'}
    }));

    ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY')
      .select(['temperature_2m','u_component_of_wind_10m','v_component_of_wind_10m'])
      .sort('system:time_start', false)
      .first()
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region,
        scale: 10000,
        bestEffort: true
      })
      .evaluate(function(v) {
        if (!v) {
          infoPanel.clear();
          infoPanel.add(ui.Label({value: 'Data unavailable.', style: {color: '#3a6a9a', fontSize: '12px'}}));
          return;
        }

        var temp      = v.temperature_2m
                        ? (v.temperature_2m - 273.15).toFixed(1) + ' C'
                        : 'N/A';
        var u         = v.u_component_of_wind_10m || 0;
        var vv        = v.v_component_of_wind_10m || 0;
        var windSpeed = Math.sqrt(u*u + vv*vv).toFixed(1);
        var windDir   = getWindDirection(u, vv);
        var moon      = getMoonPhase();
        var score     = getStargrazingScore(50, parseFloat(windSpeed), moon.pct);
        var scoreDesc = score >= 75 ? 'Great night for observing'
                      : score >= 50 ? 'Decent conditions'
                      : 'Challenging tonight';
        var scoreColor = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';
        var moonColor  = moon.pct < 25 ? '#4ade80' : moon.pct < 65 ? '#fbbf24' : '#f87171';
        var objects    = getCelestialObjects(new Date().getMonth() + 1);

        infoPanel.clear();

        infoPanel.add(ui.Label({
          value: city,
          style: {fontWeight: 'bold', fontSize: '18px', color: '#041C69', margin: '0'}
        }));
        infoPanel.add(ui.Label({
          value: coords.lat + 'N   ' + Math.abs(coords.lon) + 'W',
          style: {fontSize: '11px', color: '#041C69', margin: '0 0 4px 0'}
        }));
        infoPanel.add(ui.Label({
          value: 'STARGAZING SCORE   ' + score + ' / 100',
          style: {fontWeight: 'bold', fontSize: '12px', color: scoreColor, margin: '4px 0 0 0'}
        }));
        infoPanel.add(ui.Label({
          value: scoreDesc + ' (updates with clouds)',
          style: {fontSize: '10px', color: '#4a6a88', margin: '0'}
        }));

        infoPanel.add(makeDivider('  MOON'));
        infoPanel.add(ui.Label({
          value: moon.name + '   ' + moon.pct + '% illuminated',
          style: {fontSize: '12px', color: '#041C69', margin: '0 0 2px 0'}
        }));
        infoPanel.add(ui.Label({
          value: 'Sky impact: ' + moon.impact,
          style: {fontSize: '11px', color: moonColor, margin: '0'}
        }));

        infoPanel.add(makeDivider('  ATMOSPHERE'));
        infoPanel.add(ui.Label({
          value: 'Temp      ' + temp,
          style: {fontSize: '12px', color: '#041C69', margin: '0 0 2px 0'}
        }));
        infoPanel.add(ui.Label({
          value: 'Wind      ' + windSpeed + ' m/s  ' + windDir,
          style: {fontSize: '12px', color: '#041C69', margin: '0 0 2px 0'}
        }));

        infoPanel.add(makeDivider('  BEST OBJECTS TONIGHT'));
        for (var i = 0; i < objects.length; i++) {
          infoPanel.add(ui.Label({
            value: '+ ' + objects[i],
            style: {fontSize: '12px', color: '#041C69', margin: '0 0 2px 0'}
          }));
        }
      });
  }

  // --- Cloud info (dewpoint depression method) ---
  function updateCloudInfo(city, coords) {
    var region = ee.Geometry.Point([coords.lon, coords.lat]).buffer(50000);

    cloudPanel.clear();
    cloudPanel.add(ui.Label({
      value: 'Cloud cover: loading...',
      style: {color: '#041C69', fontSize: '12px'}
    }));

    ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY')
      .select(['temperature_2m', 'dewpoint_temperature_2m'])
      .sort('system:time_start', false)
      .first()
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region,
        scale: 10000,
        bestEffort: true
      })
      .evaluate(function(v) {
        cloudPanel.clear();

        if (!v || v.temperature_2m == null || v.dewpoint_temperature_2m == null) {
          cloudPanel.add(ui.Label({
            value: 'Cloud data unavailable.',
            style: {fontSize: '11px', color: '#3a6a9a'}
          }));
          return;
        }

        var temp  = v.temperature_2m;
        var dewpt = v.dewpoint_temperature_2m;

        // Dewpoint depression: 0 = saturated (cloudy), 25+ = dry (clear)
        var depression = temp - dewpt;
        var cloudPct   = Math.min(100, Math.max(0, Math.round(100 - (depression / 25) * 100)));
        var cloudDesc  = cloudPct < 20 ? 'Clear'
                       : cloudPct < 50 ? 'Partly cloudy'
                       : cloudPct < 80 ? 'Mostly cloudy'
                       : 'Overcast';

        // Relative humidity via Magnus formula
        var tempC = temp  - 273.15;
        var dewC  = dewpt - 273.15;
        var rh    = Math.round(
                      100 * Math.exp((17.625 * dewC)  / (243.04 + dewC)) /
                                Math.exp((17.625 * tempC) / (243.04 + tempC))
                    );

        cloudPanel.add(ui.Label({
          value: city + ' — Sky conditions',
          style: {fontWeight: 'bold', fontSize: '13px', color: '#041C69', margin: '0 0 6px 0'}
        }));
        cloudPanel.add(ui.Label({
          value: 'Cloud cover:   ' + cloudPct + '%   ' + cloudDesc,
          style: {fontSize: '12px', color: '#041C69', margin: '0 0 2px 0'}
        }));
        cloudPanel.add(ui.Label({
          value: 'Humidity:        ' + rh + '%',
          style: {fontSize: '12px', color: '#041C69', margin: '0 0 2px 0'}
        }));
        cloudPanel.add(ui.Label({
          value: 'Dew point:      ' + dewC.toFixed(1) + ' C',
          style: {fontSize: '12px', color: '#041C69', margin: '0 0 6px 0'}
        }));
        cloudPanel.add(ui.Label({
          value: 'Source: ERA5-Land dewpoint depression',
          style: {fontSize: '10px', color: '#3a6a9a', margin: '0'}
        }));
      });
  }

  // --- Control panel (top-left) ---
  var title = ui.Label({
    value: 'Light Pollution Tracker',
    style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 8px 0', color: '#041C69'}
  });

  var citySelect = ui.Select({
    items: Object.keys(cities),
    placeholder: 'Select a city',
    onChange: function(city) {
      var coords = cities[city];
      if (!coords) return;
      title.setValue(city + ' - Light Pollution');
      var point = ee.Geometry.Point([coords.lon, coords.lat]);
      Map.centerObject(point, coords.zoom);
      cityMarkerLayer.setEeObject(ee.FeatureCollection([ee.Feature(point, {name: city})]));
      cityMarkerLayer.setVisParams({color: 'red'});
      updateMainInfo(city, coords);
      updateCloudInfo(city, coords);
    }
  });

  // --- Year slider ---
  var pollutionLayer = ui.Map.Layer();
  var lastYear = null;

  function updateMapForYear(year) {
    pollutionLayer.setEeObject(
      viirs.filter(ee.Filter.calendarRange(year, year, 'year')).mean()
    );
    pollutionLayer.setVisParams({
      min: visParams.min, max: visParams.max,
      palette: visParams.palette, opacity: 0.6
    });
    pollutionLayer.setName('Light Pollution ' + year);
    if (!Map.layers().contains(pollutionLayer)) {
      Map.layers().add(pollutionLayer);
    }
  }

  var yearSlider = ui.Slider({
    min: 2013, max: latestYearValue, value: latestYearValue, step: 1,
    style: {stretch: 'horizontal', margin: '6px 0'},
    onChange: function(value) {
      var year = parseInt(value);
      if (year !== lastYear) { lastYear = year; updateMapForYear(year); }
    }
  });

  var panel = ui.Panel({
    widgets: [
      title,
      citySelect,
      ui.Label('Select year:', {fontWeight: 'bold', margin: '10px 0 0 0', color: '#041C69'}),
      yearSlider
    ],
    style: {
      width: '260px', padding: '12px', position: 'top-left',
      backgroundColor: '#E5E4F5', border: '1px solid #1e3a5a', borderRadius: '10px'
    }
  });

  Map.add(panel);
  updateMapForYear(latestYearValue);
});

Map.setOptions('SATELLITE');
