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


// 2. Datasets
var viirs = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMCFG')
              .select('avg_rad');

var latestImage = viirs.sort('system:time_start', false).first();
var latestYear  = ee.Date(latestImage.get('system:time_start')).get('year');


function getMoonPhase() {
  var now         = new Date();
  var refDate     = new Date(2000, 0, 6);
  var lunarCycle  = 29.530588;
  var daysSinceRef = (now - refDate) / 86400000;
  var phase       = ((daysSinceRef % lunarCycle) + lunarCycle) % lunarCycle;
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


latestYear.evaluate(function(latestYearValue){
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

    var palette = [
      '#000000',
      '#0b1d51',
      '#1e3a8a',
      '#2563eb',
      '#38bdf8',
      '#a3e635',
      '#fde047',
      '#f97316',
      '#ef4444'
    ];
    var names   = ['Low', '', '', '', '', '', '', '', 'High'];

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
    palette: [
      '#000000',
      '#0b1d51',
      '#1e3a8a',
      '#2563eb',
      '#38bdf8',
      '#a3e635',
      '#fde047',
      '#f97316',
      '#ef4444'
    ]
  };

  var initialImage = viirs
    .filter(ee.Filter.calendarRange(latestYearValue, latestYearValue, 'year'))
    .mean();
  Map.addLayer(initialImage, visParams, 'Nighttime Lights ' + latestYearValue, true, 0.6);

  var cityMarkerLayer = ui.Map.Layer();
  Map.layers().add(cityMarkerLayer);

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

  function updateCityInfo(city, coords) {
    var point = ee.Geometry.Point([coords.lon, coords.lat]);

    var era5land = ee.ImageCollection('ECMWF/ERA5_LAND/MONTHLY')
      .select(['temperature_2m', 'u_component_of_wind_10m', 'v_component_of_wind_10m'])
      .sort('system:time_start', false)
      .first();

    var era5 = ee.ImageCollection('ECMWF/ERA5/MONTHLY')
      .select(['total_cloud_cover'])
      .sort('system:time_start', false)
      .first();

    var landData = era5land.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: point,
      scale: 10000
    });

    var cloudData = era5.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: point,
      scale: 27830
    });

    infoPanel.clear();
    infoPanel.add(ui.Label({
      value: 'Loading ' + city + '...',
      style: {color: '#041C69', fontSize: '12px'}
    }));

    landData.evaluate(function(landValues) {
      if (!landValues) {
        infoPanel.clear();
        infoPanel.add(ui.Label({value: 'Data unavailable.', style: {color: '#f87171', fontSize: '14px'}}));
        return;
      }

      var temp      = landValues.temperature_2m
                      ? (landValues.temperature_2m - 273.15).toFixed(1) + ' C'
                      : 'N/A';
      var u         = landValues.u_component_of_wind_10m || 0;
      var v         = landValues.v_component_of_wind_10m || 0;
      var windSpeed = Math.sqrt(u*u + v*v).toFixed(1);
      var windDir   = getWindDirection(u, v);

      cloudData.evaluate(function(cloudValues) {
        var cloudRaw  = (cloudValues && cloudValues.total_cloud_cover !== null)
                        ? cloudValues.total_cloud_cover : 0;
        var cloudPct  = Math.round(cloudRaw * 100);
        var cloudDesc = cloudPct < 20 ? 'Clear'
                      : cloudPct < 50 ? 'Partly cloudy'
                      : cloudPct < 80 ? 'Mostly cloudy'
                      : 'Overcast';

        var moon       = getMoonPhase();
        var score      = getStargrazingScore(cloudPct, parseFloat(windSpeed), moon.pct);
        var scoreDesc  = score >= 75 ? 'Great night for observing'
                       : score >= 50 ? 'Decent conditions'
                       : 'Challenging tonight';
        var scoreColor = score >= 75 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171';
        var moonColor  = moon.pct < 25 ? '#4ade80' : moon.pct < 65 ? '#fbbf24' : '#f87171';

        var month   = new Date().getMonth() + 1;
        var objects = getCelestialObjects(month);

        infoPanel.clear();

        infoPanel.add(ui.Label({
          value: city,
          style: {fontWeight: 'bold', fontSize: '18px', color: '#041C69', margin: '0'}
        }));
        infoPanel.add(ui.Label({
          value: coords.lat + 'N   ' + Math.abs(coords.lon) + 'W',
          style: {fontSize: '13px', color: '#041C69', margin: '0 0 4px 0'}
        }));

        infoPanel.add(ui.Label({
          value: 'STARGAZING SCORE   ' + score + ' / 100',
          style: {fontWeight: 'bold', fontSize: '12px', color: scoreColor, margin: '4px 0 0 0'}
        }));
        infoPanel.add(ui.Label({
          value: scoreDesc,
          style: {fontSize: '11px', color: '#4a6a88', margin: '0'}
        }));

        infoPanel.add(makeDivider('  MOON'));
        infoPanel.add(ui.Label({
          value: moon.name + '   ' + moon.pct + '% illuminated',
          style: {fontSize: '12px', color: '#e2d060', margin: '0 0 2px 0'}
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
        infoPanel.add(ui.Label({
          value: 'Clouds    ' + cloudPct + '%  ' + cloudDesc,
          style: {fontSize: '12px', color: '#041C69', margin: '0'}
        }));

        infoPanel.add(makeDivider('  BEST OBJECTS TONIGHT'));
        for (var i = 0; i < objects.length; i++) {
          infoPanel.add(ui.Label({
            value: '+ ' + objects[i],
            style: {fontSize: '12px', color: '#041C69', margin: '0 0 2px 0'}
          }));
        }
      });
    });
  }

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
      var feature = ee.Feature(point, {name: city});
      cityMarkerLayer.setEeObject(ee.FeatureCollection([feature]));
      cityMarkerLayer.setVisParams({color: 'red'});
      updateCityInfo(city, coords);
    }
  });

  var yearLabel = ui.Label('Select year:', {
    fontWeight: 'bold',
    margin: '10px 0 0 0',
    color: '#041C69'
  });

  var pollutionLayer = ui.Map.Layer();
  var lastYear = null;

  function updateMapForYear(year) {
    var yearImage = viirs
      .filter(ee.Filter.calendarRange(year, year, 'year'))
      .mean();
    pollutionLayer.setEeObject(yearImage);
    pollutionLayer.setVisParams({
  min: visParams.min,
  max: visParams.max,
  palette: visParams.palette,
  opacity: 0.6
});
    pollutionLayer.setName('Light Pollution ' + year);
    if (!Map.layers().contains(pollutionLayer)) {
      Map.layers().add(pollutionLayer);
    }
  }

  var yearSlider = ui.Slider({
    min: 2013,
    max: latestYearValue,
    value: latestYearValue,
    step: 1,
    style: {stretch: 'horizontal', margin: '6px 0'},
    onChange: function(value) {
      var year = parseInt(value);
      if (year !== lastYear) {
        lastYear = year;
        updateMapForYear(year);
      }
    }
  });

  var panel = ui.Panel({
    widgets: [title, citySelect, yearLabel, yearSlider],
    style: {
      width: '260px',
      padding: '12px',
      position: 'top-left',
      backgroundColor: '#E5E4F5',
      border: '1px solid #1e3a5a',
      borderRadius: '10px'
    }
  });

  Map.add(panel);
  updateMapForYear(latestYearValue);
});

Map.setOptions('SATELLITE');
