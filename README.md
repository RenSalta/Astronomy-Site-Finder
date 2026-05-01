Light Pollution & Stargazing Analyzer

An interactive geospatial tool built with Google Earth Engine to evaluate **stargazing conditions** across cities worldwide.
Focused on some of the most populated cities in Colombia.

This project combines satellite data, atmospheric conditions, and astronomical factors to generate a **Stargazing Score (0–100)** for any selected city.
The project is still under development, and I am doing tests to make sure the program is useful and accurate. However, it might have errors or discrepancies from real-time data, and the one taken from the dataset.


---
How to Use

1. Go to Google Earth Engine Code Editor
2. Create a new script
3. Paste the code from `gee_script.js`
4. Click Run
5. Select a city and explore conditions

 
Features
* Global city selection
* Nighttime light pollution visualization (VIIRS)
* Temperature and wind analysis (ERA5-Land)
* Cloud cover estimation (ERA5)
* Real-time moon phase & illumination
* Monthly recommended celestial objects
* Custom Stargazing Score

---

How It Works

The app integrates multiple datasets:
Light Pollution
* Source: VIIRS Nighttime Lights
* Measures artificial brightness at night
Atmospheric Conditions
* Temperature, wind → ERA5-Land
* Cloud cover → ERA5
Astronomical Factors
Moon phase affects sky brightness
Monthly sky visibility for deep-sky objects



Stargazing Score
The score is calculated as:

* Cloud cover → 50% weight
* Moon illumination → 30%
* Wind conditions → 20%

```
Score = (Cloud + Moon + Wind)
```

Interpretation:
*75–100 → Excellent conditions 
*50–74 → Decent viewing 
*<50 → Challenging conditions 

---

Example Use Cases
---

Finding dark-sky observation spots,
Comparing cities for astronomy,
Educational tools for atmospheric science,
Personal stargazing planning.

---------

How to Use

1. Go to Google Earth Engine Code Editor
2. Create a new script
3. Paste the code from `gee_script.js`
4. Click **Run**
5. Select a city and explore conditions

---

Limitations to keep in mind

* Climate data is low resolution (~9 km)
* Light pollution is at a higher resolution (~500 m)
* Results are approximations, not exact forecasts

---

Some Future Improvements

* Add altitude data (Precise)
* Include humidity & aerosols
* Real-time weather APIs (Weather could be different from other apps because of the dataset, currently working on improvement).
* Dark-sky site detection (Starlight Recom)
---



Developed as a geospatial + astronomy exploration project by Sarah Saltaren. BS. Informatics and CompScie Eng. 2026.

