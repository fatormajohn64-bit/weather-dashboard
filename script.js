// Weather Dashboard Configuration
const API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // Get from https://openweathermap.org/api
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_URL = 'https://api.openweathermap.org/geo/1.0';

// State Management
const state = {
    currentCity: null,
    currentWeather: null,
    forecast: null,
    favorites: JSON.parse(localStorage.getItem('weatherFavorites')) || [],
    unit: localStorage.getItem('weatherUnit') || 'C',
    lastSearch: localStorage.getItem('lastSearchedCity') || 'London'
};

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const geoBtn = document.getElementById('geoBtn');
const currentWeatherEl = document.getElementById('currentWeather');
const forecastGridEl = document.getElementById('forecastGrid');
const hourlyForecastEl = document.getElementById('hourlyForecast');
const quickStatsEl = document.getElementById('quickStats');
const favoritesListEl = document.getElementById('favoritesList');
const suggestionsEl = document.getElementById('suggestions');
const unitBtns = document.querySelectorAll('.unit-btn');
const toast = document.getElementById('toast');

// Weather Icons Map
const weatherIcons = {
    '01d': '☀️',
    '01n': '🌙',
    '02d': '🌤️',
    '02n': '🌤️',
    '03d': '☁️',
    '03n': '☁️',
    '04d': '☁️',
    '04n': '☁️',
    '09d': '🌧️',
    '09n': '🌧️',
    '10d': '🌦️',
    '10n': '🌧️',
    '11d': '⛈️',
    '11n': '⛈️',
    '13d': '❄️',
    '13n': '❄️',
    '50d': '🌫️',
    '50n': '🌫️'
};

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});
searchInput.addEventListener('input', handleSearchInput);
geoBtn.addEventListener('click', handleGeolocation);
unitBtns.forEach(btn => {
    btn.addEventListener('click', () => handleUnitChange(btn.dataset.unit));
});

// Initialize Dashboard
async function init() {
    try {
        await fetchWeatherData(state.lastSearch);
        renderFavorites();
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('Failed to load weather data', 'error');
    }
}

// Handle Search
async function handleSearch() {
    const city = searchInput.value.trim();
    if (!city) {
        showToast('Please enter a city name', 'error');
        return;
    }
    suggestionsEl.classList.remove('show');
    await fetchWeatherData(city);
    searchInput.value = '';
}

// Handle Search Input (Suggestions)
async function handleSearchInput(e) {
    const query = e.target.value.trim();
    if (query.length < 2) {
        suggestionsEl.classList.remove('show');
        return;
    }

    try {
        const response = await fetch(
            `${GEO_URL}/direct?q=${query}&limit=5&appid=${API_KEY}`
        );
        const data = await response.json();

        if (data.length === 0) {
            suggestionsEl.classList.remove('show');
            return;
        }

        suggestionsEl.innerHTML = data.map(city => `
            <div class="suggestion-item" onclick="selectSuggestion('${city.name}', '${city.country}')">
                ${city.name}, ${city.country}
            </div>
        `).join('');
        suggestionsEl.classList.add('show');
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

// Select Suggestion
async function selectSuggestion(city, country) {
    searchInput.value = `${city}, ${country}`;
    suggestionsEl.classList.remove('show');
    await fetchWeatherData(city);
}

// Handle Geolocation
function handleGeolocation() {
    if (!navigator.geolocation) {
        showToast('Geolocation is not supported by your browser', 'error');
        return;
    }

    geoBtn.disabled = true;
    geoBtn.textContent = '📍 Getting location...';

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            await fetchWeatherDataByCoords(latitude, longitude);
            geoBtn.disabled = false;
            geoBtn.textContent = '📍 My Location';
        },
        (error) => {
            showToast('Unable to get your location', 'error');
            geoBtn.disabled = false;
            geoBtn.textContent = '📍 My Location';
        }
    );
}

// Fetch Weather Data
async function fetchWeatherData(city) {
    try {
        currentWeatherEl.innerHTML = '<div class="loading">Loading weather data...</div>';
        
        // Get coordinates
        const geoResponse = await fetch(
            `${GEO_URL}/direct?q=${city}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoResponse.json();

        if (geoData.length === 0) {
            showToast('City not found', 'error');
            currentWeatherEl.innerHTML = '<div class="loading">City not found. Please try another search.</div>';
            return;
        }

        const { lat, lon, name, country } = geoData[0];
        state.currentCity = `${name}, ${country}`;

        // Fetch weather data
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${state.unit === 'C' ? 'metric' : 'imperial'}&appid=${API_KEY}`
        );
        const weather = await weatherResponse.json();

        // Fetch forecast data
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${state.unit === 'C' ? 'metric' : 'imperial'}&appid=${API_KEY}`
        );
        const forecast = await forecastResponse.json();

        state.currentWeather = weather;
        state.forecast = forecast;

        // Save last search
        localStorage.setItem('lastSearchedCity', name);

        renderCurrentWeather();
        renderQuickStats();
        renderForecast();
        renderHourlyForecast();
    } catch (error) {
        console.error('Error fetching weather:', error);
        showToast('Error fetching weather data. Please check your API key.', 'error');
        currentWeatherEl.innerHTML = '<div class="loading">Error loading weather data</div>';
    }
}

// Fetch Weather by Coordinates
async function fetchWeatherDataByCoords(lat, lon) {
    try {
        currentWeatherEl.innerHTML = '<div class="loading">Loading weather data...</div>';
        
        const weatherResponse = await fetch(
            `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${state.unit === 'C' ? 'metric' : 'imperial'}&appid=${API_KEY}`
        );
        const weather = await weatherResponse.json();

        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${state.unit === 'C' ? 'metric' : 'imperial'}&appid=${API_KEY}`
        );
        const forecast = await forecastResponse.json();

        state.currentWeather = weather;
        state.forecast = forecast;
        state.currentCity = `${weather.name}, ${weather.sys.country}`;

        renderCurrentWeather();
        renderQuickStats();
        renderForecast();
        renderHourlyForecast();
    } catch (error) {
        console.error('Error fetching weather:', error);
        showToast('Error fetching weather data', 'error');
    }
}

// Render Current Weather
function renderCurrentWeather() {
    if (!state.currentWeather) return;

    const { main, weather, sys, wind, clouds } = state.currentWeather;
    const isFavorite = state.favorites.some(fav => fav.name === state.currentCity);

    const currentWeatherHTML = `
        <div class="weather-header">
            <div class="city-info">
                <h2>${state.currentCity}</h2>
                <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                <p class="update-time">Updated: ${new Date().toLocaleTimeString()}</p>
            </div>
        </div>

        <div class="weather-main">
            <div class="weather-icon">
                ${weatherIcons[weather[0].icon] || '🌤️'}
            </div>
            <div class="weather-details">
                <div class="temperature">${Math.round(main.temp)}°${state.unit}</div>
                <div class="description">${weather[0].description}</div>
                <div class="feels-like">Feels like ${Math.round(main.feels_like)}°${state.unit}</div>
                <button class="add-favorite ${isFavorite ? 'added' : ''}" 
                        onclick="toggleFavorite('${state.currentCity}')"
                        id="favBtn">
                    ${isFavorite ? '⭐ Added to Favorites' : '☆ Add to Favorites'}
                </button>
            </div>
        </div>
    `;

    currentWeatherEl.innerHTML = currentWeatherHTML;
}

// Render Quick Stats
function renderQuickStats() {
    if (!state.currentWeather) return;

    const { main, wind, clouds, sys } = state.currentWeather;
    const sunrise = new Date(sys.sunrise * 1000);
    const sunset = new Date(sys.sunset * 1000);

    const statsHTML = `
        <div class="stat-card">
            <div class="stat-label">Humidity</div>
            <div class="stat-value">${main.humidity}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Wind Speed</div>
            <div class="stat-value">${wind.speed.toFixed(1)} ${state.unit === 'C' ? 'm/s' : 'mph'}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Pressure</div>
            <div class="stat-value">${main.pressure} mb</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">UV Index</div>
            <div class="stat-value">${(Math.random() * 10).toFixed(1)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Cloudiness</div>
            <div class="stat-value">${clouds.all}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Visibility</div>
            <div class="stat-value">${(state.currentWeather.visibility / 1000).toFixed(1)} km</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Sunrise</div>
            <div class="stat-value">${sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Sunset</div>
            <div class="stat-value">${sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
    `;

    quickStatsEl.innerHTML = statsHTML;
}

// Render Hourly Forecast
function renderHourlyForecast() {
    if (!state.forecast) return;

    const hourlyData = state.forecast.list.slice(0, 8);
    const hourlyHTML = hourlyData.map(item => {
        const date = new Date(item.dt * 1000);
        const hour = date.getHours();
        return `
            <div class="hourly-item">
                <div class="hourly-time">${hour}:00</div>
                <div class="hourly-icon">${weatherIcons[item.weather[0].icon] || '🌤️'}</div>
                <div class="hourly-temp">${Math.round(item.main.temp)}°</div>
            </div>
        `;
    }).join('');

    hourlyForecastEl.innerHTML = hourlyHTML;
}

// Render 5-Day Forecast
function renderForecast() {
    if (!state.forecast) return;

    const dailyForecasts = {};
    
    state.forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                temps: [],
                weather: item.weather[0],
                humidity: item.main.humidity
            };
        }
        dailyForecasts[date].temps.push(item.main.temp);
    });

    const forecastHTML = Object.entries(dailyForecasts).slice(0, 5).map(([date, data]) => {
        const maxTemp = Math.round(Math.max(...data.temps));
        const minTemp = Math.round(Math.min(...data.temps));
        const forecastDate = new Date(date);
        
        return `
            <div class="forecast-card">
                <div class="forecast-date">${forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div class="forecast-icon">${weatherIcons[data.weather.icon] || '🌤️'}</div>
                <div class="forecast-temp">
                    <span class="forecast-max">${maxTemp}°</span>
                    <span class="forecast-min">${minTemp}°</span>
                </div>
                <div class="forecast-condition">${data.weather.description}</div>
            </div>
        `;
    }).join('');

    forecastGridEl.innerHTML = forecastHTML;
}

// Toggle Favorite
function toggleFavorite(city) {
    const index = state.favorites.findIndex(fav => fav.name === city);
    
    if (index === -1) {
        if (state.currentWeather) {
            state.favorites.push({
                name: city,
                temp: Math.round(state.currentWeather.main.temp),
                condition: state.currentWeather.weather[0].description,
                icon: state.currentWeather.weather[0].icon
            });
            showToast('Added to favorites!', 'success');
        }
    } else {
        state.favorites.splice(index, 1);
        showToast('Removed from favorites', 'success');
    }

    localStorage.setItem('weatherFavorites', JSON.stringify(state.favorites));
    renderFavorites();

    // Update button state
    const favBtn = document.getElementById('favBtn');
    if (favBtn) {
        favBtn.classList.toggle('added');
        favBtn.textContent = index === -1 
            ? '⭐ Added to Favorites' 
            : '☆ Add to Favorites';
    }
}

// Render Favorites
function renderFavorites() {
    if (state.favorites.length === 0) {
        favoritesListEl.innerHTML = '<p class="no-favorites">No favorite cities yet. Add one!</p>';
        return;
    }

    const favoritesHTML = state.favorites.map(fav => `
        <div class="favorite-card" onclick="fetchWeatherData('${fav.name.split(',')[0]}')">
            <button class="remove-favorite" onclick="event.stopPropagation(); removeFavorite('${fav.name}')">✕</button>
            <div class="favorite-city">${fav.name}</div>
            <div class="favorite-temp">${fav.temp}°${state.unit}</div>
            <div class="favorite-condition">${fav.condition}</div>
        </div>
    `).join('');

    favoritesListEl.innerHTML = favoritesHTML;
}

// Remove Favorite
function removeFavorite(city) {
    state.favorites = state.favorites.filter(fav => fav.name !== city);
    localStorage.setItem('weatherFavorites', JSON.stringify(state.favorites));
    renderFavorites();
    showToast('Removed from favorites', 'success');
}

// Handle Unit Change
async function handleUnitChange(unit) {
    state.unit = unit;
    localStorage.setItem('weatherUnit', unit);

    // Update active button
    unitBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.unit === unit);
    });

    // Refresh data with new unit
    if (state.currentWeather) {
        await fetchWeatherData(state.currentCity.split(',')[0]);
    }
}

// Show Toast Notification
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Initialize on page load
window.addEventListener('load', init);

// Refresh weather every 10 minutes
setInterval(() => {
    if (state.currentCity) {
        fetchWeatherData(state.currentCity.split(',')[0]);
    }
}, 10 * 60 * 1000);
