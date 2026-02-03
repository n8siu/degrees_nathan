const SCALE_FACTOR = 45 / 17;
const STORAGE_KEY = "northwind:last-location";

const appEl = document.querySelector(".app");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const locationEl = document.getElementById("location");
const tempNEl = document.getElementById("temp-n");
const tempCEl = document.getElementById("temp-c");
const summaryEl = document.getElementById("summary");
const feelsEl = document.getElementById("feels");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const forecastGrid = document.getElementById("forecast-grid");
const viewsEl = document.getElementById("views");
const viewButtons = Array.from(document.querySelectorAll(".view-btn"));
const thermoFillEl = document.getElementById("thermo-fill");
const thermoPointerEl = document.getElementById("thermo-pointer");
const thermoValueEl = document.getElementById("thermo-value");
const thermoNoteEl = document.getElementById("thermo-note");
const compareNEl = document.getElementById("compare-n");
const compareCEl = document.getElementById("compare-c");
const compareFEl = document.getElementById("compare-f");
const interactiveThermoEl = document.getElementById("interactive-thermo");
const interactiveFillEl = document.getElementById("interactive-fill");
const interactiveHandleEl = document.getElementById("interactive-handle");
const interactiveNEl = document.getElementById("interactive-n");
const interactiveCEl = document.getElementById("interactive-c");
const interactiveFEl = document.getElementById("interactive-f");

const WEATHER_LABELS = [
  { codes: [0], label: "Clear sky", theme: "clear" },
  { codes: [1, 2, 3], label: "Cloud cover", theme: "cloudy" },
  { codes: [45, 48], label: "Fog and mist", theme: "cloudy" },
  { codes: [51, 53, 55, 56, 57], label: "Drizzle", theme: "rain" },
  { codes: [61, 63, 65, 66, 67], label: "Rain", theme: "rain" },
  { codes: [71, 73, 75, 77], label: "Snow", theme: "cloudy" },
  { codes: [80, 81, 82], label: "Rain showers", theme: "rain" },
  { codes: [85, 86], label: "Snow showers", theme: "cloudy" },
  { codes: [95, 96, 99], label: "Thunderstorm", theme: "rain" },
];

const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const fmtDate = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

const setStatus = (message) => {
  statusEl.textContent = message;
};

const cToN = (celsius) => celsius * SCALE_FACTOR;
const cToF = (celsius) => (celsius * 9) / 5 + 32;
const nToC = (nValue) => nValue / SCALE_FACTOR;

const formatTempNValue = (celsius) => `${Math.round(cToN(celsius))}`;
const formatTempN = (celsius) => `${formatTempNValue(celsius)} °Ñ`;
const formatTempC = (celsius) => `${celsius.toFixed(1)} °C`;

const getWeatherMeta = (code) => {
  const found = WEATHER_LABELS.find((item) => item.codes.includes(code));
  return found || { label: "Unknown skies", theme: "clear" };
};

const findClosestIndex = (times, targetIso) => {
  if (!Array.isArray(times) || times.length === 0) return 0;
  const target = new Date(targetIso).getTime();
  let closestIndex = 0;
  let smallestDiff = Infinity;
  times.forEach((time, index) => {
    const diff = Math.abs(new Date(time).getTime() - target);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestIndex = index;
    }
  });
  return closestIndex;
};

const renderResults = (results) => {
  resultsEl.innerHTML = "";
  if (!results.length) return;

  results.forEach((result) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-button";
    button.textContent = formatLocation(result);
    button.addEventListener("click", () => {
      resultsEl.innerHTML = "";
      loadWeather({
        latitude: result.latitude,
        longitude: result.longitude,
        label: formatLocation(result),
      });
    });
    resultsEl.appendChild(button);
  });
};

const formatLocation = (result) => {
  const parts = [result.name, result.admin1, result.country].filter(Boolean);
  return parts.join(", ");
};

const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
};

const fetchWeather = async ({ latitude, longitude }) => {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("hourly", "relative_humidity_2m,apparent_temperature");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");

  return fetchJson(url);
};

const updateCurrent = (data, label) => {
  const current = data.current_weather;
  if (!current) {
    throw new Error("No current weather data available.");
  }

  const weatherMeta = getWeatherMeta(current.weathercode);
  appEl.dataset.theme = weatherMeta.theme;

  const hourlyTimes = data.hourly?.time || [];
  const index = findClosestIndex(hourlyTimes, current.time);
  const humiditySeries =
    data.hourly?.relative_humidity_2m || data.hourly?.relativehumidity_2m || [];
  const feelsSeries = data.hourly?.apparent_temperature || [];

  const feelsLike = feelsSeries[index];
  const humidity = humiditySeries[index];

  locationEl.textContent = label || "Current location";
  tempNEl.textContent = formatTempNValue(current.temperature);
  tempCEl.textContent = formatTempC(current.temperature);
  summaryEl.textContent = weatherMeta.label;
  feelsEl.textContent = feelsLike ? formatTempN(feelsLike) : "--";
  humidityEl.textContent = Number.isFinite(humidity) ? `${Math.round(humidity)}%` : "--";
  windEl.textContent = current.windspeed
    ? `${Math.round(current.windspeed)} km/h`
    : "--";

  updateScaleView(current.temperature);
  updateInteractiveThermo(cToN(current.temperature));
};

const updateScaleView = (celsius) => {
  if (!Number.isFinite(celsius)) return;
  const nValue = cToN(celsius);

  if (compareNEl) compareNEl.textContent = `${Math.round(nValue)} °Ñ`;
  if (compareCEl) compareCEl.textContent = `${celsius.toFixed(1)} °C`;
  if (compareFEl) compareFEl.textContent = `${cToF(celsius).toFixed(1)} °F`;

  if (thermoValueEl) thermoValueEl.textContent = `${Math.round(nValue)} °Ñ`;
  if (!thermoFillEl || !thermoPointerEl) return;

  const minN = 0;
  const maxN = 100;
  const clamped = Math.min(1, Math.max(0, (nValue - minN) / (maxN - minN)));
  thermoFillEl.style.height = `${(1 - clamped) * 100}%`;
  thermoPointerEl.style.top = `${(1 - clamped) * 100}%`;

  if (thermoNoteEl) {
    if (nValue < minN) {
      thermoNoteEl.textContent = "Below the scale range — anchored to 0°Ñ.";
    } else if (nValue > maxN) {
      thermoNoteEl.textContent = "Above the scale range — anchored to 100°Ñ.";
    } else {
      thermoNoteEl.textContent = "";
    }
  }
};

const updateInteractiveThermo = (nValue) => {
  if (!Number.isFinite(nValue)) return;
  const minN = 0;
  const maxN = 100;
  const clamped = Math.min(maxN, Math.max(minN, nValue));
  const percent = (clamped - minN) / (maxN - minN);

  if (interactiveNEl) interactiveNEl.textContent = `${Math.round(clamped)} °Ñ`;

  const celsius = nToC(clamped);
  if (interactiveCEl) interactiveCEl.textContent = `${celsius.toFixed(1)} °C`;
  if (interactiveFEl) interactiveFEl.textContent = `${cToF(celsius).toFixed(1)} °F`;

  if (interactiveFillEl) {
    interactiveFillEl.style.height = `${(1 - percent) * 100}%`;
  }
  if (interactiveHandleEl) {
    interactiveHandleEl.style.top = `${(1 - percent) * 100}%`;
  }
  if (interactiveThermoEl) {
    interactiveThermoEl.setAttribute("aria-valuenow", `${Math.round(clamped)}`);
  }
};

const initInteractiveThermo = () => {
  if (!interactiveThermoEl) return;

  let isDragging = false;
  let lastTick = null;
  const tickPoints = [0, 50, 100];
  const tickThreshold = 1.5;
  const vibrate = (pattern) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const updateFromEvent = (event) => {
    const rect = interactiveThermoEl.getBoundingClientRect();
    const clientY = event.clientY ?? (event.touches && event.touches[0]?.clientY);
    if (!clientY) return;
    const offset = Math.min(rect.height, Math.max(0, clientY - rect.top));
    const percent = 1 - offset / rect.height;
    const value = percent * 100;
    updateInteractiveThermo(value);

    const nearest = tickPoints.find((point) => Math.abs(point - value) <= tickThreshold);
    if (nearest !== undefined && nearest !== lastTick) {
      vibrate(15);
      lastTick = nearest;
    }
    if (nearest === undefined) {
      lastTick = null;
    }
  };

  const onPointerDown = (event) => {
    isDragging = true;
    interactiveThermoEl.setPointerCapture(event.pointerId);
    updateFromEvent(event);
  };

  const onPointerMove = (event) => {
    if (!isDragging) return;
    updateFromEvent(event);
  };

  const onPointerUp = (event) => {
    isDragging = false;
    interactiveThermoEl.releasePointerCapture(event.pointerId);
  };

  interactiveThermoEl.addEventListener("pointerdown", onPointerDown);
  interactiveThermoEl.addEventListener("pointermove", onPointerMove);
  interactiveThermoEl.addEventListener("pointerup", onPointerUp);
  interactiveThermoEl.addEventListener("pointercancel", onPointerUp);

  updateInteractiveThermo(50);
};

const updateForecast = (data) => {
  forecastGrid.innerHTML = "";
  const daily = data.daily;
  if (!daily || !daily.time) {
    forecastGrid.innerHTML = "<p>Forecast unavailable.</p>";
    return;
  }

  const maxTemps = daily.temperature_2m_max || [];
  const minTemps = daily.temperature_2m_min || [];
  const codes = daily.weather_code || daily.weathercode || [];

  const totalDays = Math.min(daily.time.length, 5);
  for (let i = 1; i < totalDays; i += 1) {
    const card = document.createElement("div");
    card.className = "forecast-card";

    const date = new Date(daily.time[i]);
    const title = `${fmtDay.format(date)} · ${fmtDate.format(date)}`;
    const weatherMeta = getWeatherMeta(codes[i]);

    card.innerHTML = `
      <div>
        <h3>${title}</h3>
        <p>${weatherMeta.label}</p>
      </div>
      <div class="range">${
        Number.isFinite(minTemps[i]) && Number.isFinite(maxTemps[i])
          ? `${Math.round(cToN(maxTemps[i]))} / ${Math.round(cToN(minTemps[i]))} °Ñ`
          : "--"
      }</div>
    `;

    forecastGrid.appendChild(card);
  }
};

const saveLocation = (payload) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

const loadWeather = async ({ latitude, longitude, label }) => {
  setStatus("Gathering weather...");
  try {
    const data = await fetchWeather({ latitude, longitude });
    updateCurrent(data, label);
    updateForecast(data);
    saveLocation({ latitude, longitude, label });
    setStatus("Updated just now.");
  } catch (error) {
    console.error(error);
    setStatus("Unable to load weather. Please try again.");
  }
};

const useGeolocation = () => {
  if (!navigator.geolocation) {
    setStatus("Geolocation not supported in this browser.");
    return;
  }

  setStatus("Locating you...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      loadWeather({ latitude, longitude, label: "Current location" });
    },
    () => {
      setStatus("Location access denied. Search for a city instead.");
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
};

const searchLocations = async (query) => {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  return fetchJson(url);
};

const handleSearch = async (event) => {
  event.preventDefault();
  const input = document.getElementById("search-input");
  const query = input.value.trim();
  if (!query) return;

  setStatus("Searching...");
  resultsEl.innerHTML = "";
  try {
    const data = await searchLocations(query);
    const results = data.results || [];
    if (results.length === 0) {
      setStatus("No matches found. Try another search.");
      return;
    }
    setStatus(`Found ${results.length} spot${results.length > 1 ? "s" : ""}.`);
    renderResults(results);
  } catch (error) {
    console.error(error);
    setStatus("Search failed. Please try again.");
  }
};

const restoreLastLocation = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return false;
  try {
    const payload = JSON.parse(stored);
    if (payload?.latitude && payload?.longitude) {
      loadWeather(payload);
      return true;
    }
  } catch (error) {
    console.error(error);
  }
  return false;
};

const updateActiveView = (index) => {
  viewButtons.forEach((button, idx) => {
    const isActive = idx === index;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
};

const setView = (index, behavior = "smooth") => {
  if (!viewsEl) return;
  const width = viewsEl.clientWidth || 1;
  viewsEl.scrollTo({ left: width * index, behavior });
  updateActiveView(index);
};

const initViewSwitcher = () => {
  if (!viewsEl || viewButtons.length === 0) return;

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.view || 0);
      setView(index);
    });
  });

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      const width = viewsEl.clientWidth || 1;
      const index = Math.round(viewsEl.scrollLeft / width);
      updateActiveView(index);
      ticking = false;
    });
  };

  viewsEl.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => onScroll());
};

const init = () => {
  document.getElementById("search-form").addEventListener("submit", handleSearch);
  document.getElementById("geo-btn").addEventListener("click", useGeolocation);
  initViewSwitcher();
  initInteractiveThermo();

  const restored = restoreLastLocation();
  if (!restored) {
    useGeolocation();
  }
};

init();
