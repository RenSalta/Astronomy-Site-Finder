# Astronomy Site Finder

Herramienta para analizar el porcentaje de contaminación lumínica y evaluar lugares para la observación astronómica.

Es una herramienta interactiva geoespacial que utiliza Google Earth Engine para analizar condiciones del cielo en distintas partes del mundo, con enfoque en ciudades de alta densidad poblacional en Colombia.

Este proyecto combina datos satelitales, condiciones atmosféricas y factores astronómicos para generar una puntuación de observación de estrellas (0–100) para cualquier ciudad seleccionada. Actualmente se encuentra en desarrollo, por lo que pueden existir discrepancias entre los datos mostrados y las condiciones reales.

---

## Cómo usar

1. Ir al editor de código de Google Earth Engine
2. Crear un nuevo script
3. Pegar el código de `gee_script.js`
4. Hacer clic en “Run”
5. Seleccionar una ciudad y explorar las condiciones

---

## Funciones principales (Etapa básica)

* Selección global de ciudades
* Visualización de contaminación lumínica nocturna (VIIRS)
* Análisis de temperatura y viento (ERA5-Land)
* Estimación de nubosidad (ERA5)
* Fase lunar e iluminación en tiempo real
* Recomendación mensual de objetos celestes
* Puntuación personalizada para la observación de estrellas

---

## Cómo funciona

La aplicación integra múltiples conjuntos de datos:

### Contaminación lumínica

* Fuente: VIIRS Nighttime Lights
* Mide el brillo artificial nocturno

### Condiciones atmosféricas

* Temperatura y viento: ERA5-Land
* Nubosidad: ERA5

### Factores astronómicos

* La fase lunar influye en el brillo del cielo
* Visibilidad mensual de objetos de cielo profundo

---

## Puntuación de observación de estrellas

La puntuación se calcula de la siguiente manera:

* Nubosidad → 50%
* Iluminación lunar → 30%
* Condiciones del viento → 20%

**Fórmula:**
Puntuación = (Nubes + Luna + Viento)

### Interpretación

* 75–100 → Condiciones excelentes
* 50–74 → Buena visibilidad
* <50 → Condiciones difíciles

---

## Ejemplos de uso

* Encontrar lugares con cielos oscuros
* Comparar ciudades para la observación astronómica
* Uso educativo en ciencia atmosférica
* Planificación de sesiones de observación

---

## Limitaciones

* Los datos climáticos tienen baja resolución (~9 km)
* La contaminación lumínica tiene mayor resolución (~500 m)
* Los resultados son aproximaciones, no predicciones exactas

---

## Mejoras futuras

* Incorporar datos de altitud más precisos
* Incluir humedad y aerosoles
* Integrar API de clima en tiempo real
* Detección automática de zonas con cielos oscuros

---

## Autor

Desarrollado como un proyecto de exploración geoespacial y astronómica por Sarah Saltaren
Ingeniería Informática (2026)
