document.addEventListener("DOMContentLoaded", () => {
    const API_KEY = "9356ba008da24375b88bfdd22195f200";
    const URL = "https://api.openweathermap.org";
    const searchInput = document.getElementById('citySearch');
    const searchResults = document.getElementById('searchResults');
    const currentWeatherDetails = document.getElementById('currentWeatherDetails');
    const hourlyForecast = document.getElementById('hourlyForecast');
    const loadingOverlay = document.getElementById('loadingOverlay');
    let searchTimeout = null;

    loadDefaultCity();
    setupEventListeners();
    calculateWeeklyAverageTemperature();

    async function loadDefaultCity() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const city = { lat: position.coords.latitude, lon: position.coords.longitude };
                    try {
                        const response = await fetch(
                            `${URL}/geo/1.0/reverse?lat=${city.lat}&lon=${city.lon}&limit=1&appid=${API_KEY}`
                        );
                        const data = await response.json();

                        if (data.length > 0) {
                            city.name = data[0].name;
                            city.country = data[0].country;
                            await fetchAndDisplayWeather(city);
                        }
                    } catch (error) {
                        console.error("Error obteniendo ciudad por geolocalización:", error);
                    }
                },
                (error) => {
                    console.warn("Geolocalización denegada o error:", error.message);
                }
            );
        }
    }

    async function fetchAndDisplayWeather(city) {
        const [current, forecast] = await Promise.all([fetchCurrentWeather(city), fetchForecast(city)])
        const dailyAverages = calculateDailyAverageTemperature(forecast.list);
        const today = new Date().toLocaleDateString();
        displayCurrentWeather(current)
        displayHourlyForecast(forecast)
        displayWeeklyForecast(forecast)
        updateWeatherDetails(current, dailyAverages[today])
    }


    async function fetchCurrentWeather(city) {
        const response = await fetch(
            `${URL}/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric&lang=es`
        )
        return await response.json()
    }

    async function fetchForecast(city) {
        const response = await fetch(
            `${URL}/data/2.5/forecast?lat=${city.lat}&lon=${city.lon}&appid=${API_KEY}&units=metric&lang=es`
        )
        return await response.json()
    }

    function calculateDailyAverageTemperature(list) {
        const dailyData = groupByDay(list);
        const dailyAverages = {};

        Object.keys(dailyData).forEach(date => {
            const temps = list
                .filter(item => new Date(item.dt * 1000).toLocaleDateString() === date)
                .map(item => item.main.temp);

            const averageTemp = temps.reduce((sum, temp) => sum + temp, 0) / temps.length;
            dailyAverages[date] = averageTemp.toFixed(1);
        });

        return dailyAverages;
    }

    function groupByDay(list) {
        return list.reduce((days, item) => {
            const date = new Date(item.dt * 1000).toLocaleDateString()
            if (!days[date]) {
                days[date] = {
                    date: new Date(item.dt * 1000),
                    temp: { min: item.main.temp, max: item.main.temp },
                    weather: item.weather,
                }
            } else {
                days[date].temp.min = Math.min(days[date].temp.min, item.main.temp)
                days[date].temp.max = Math.max(days[date].temp.max, item.main.temp)
            }
            return days
        }, {})
    }

    function displayCurrentWeather(data) {
        const html = `
                <div class="current-weather-header">
                    <div>
                    <h1>${data.name}</h1>
                    <p class="current-temp">${Math.round(data.main.temp)} °C</p>
                    <p>${capitalizeFirstLetter(data.weather[0].description)}</p>
                </div>
                <div class="weather-icon">
                    <i class="${getWeatherIcon(data.weather[0].id)}"></i>
                </div>
                </div>
                <div class="current-weather-details">
                    <p>Sensación térmica: ${Math.round(data.main.feels_like)}°C</p>
                    <p>Humedad: ${data.main.humidity}%</p>
                    <p>Presión: ${data.main.pressure} hPa</p>
                </div>
        `
        currentWeatherDetails.innerHTML = html
    }

    function displayHourlyForecast(data) {
        const hourlyData = data.list.slice(0, 10) // Próximas 24 horas (cada 3 horas)
        const html = hourlyData
            .map(
                (hour) => `
            <div class="hourly-item">
                  <p>${new Date(hour.dt * 1000).getHours()}:00</p>
                <i class="${getWeatherIcon(hour.weather[0].id)}"></i>
                <p class="temp">${Math.round(hour.main.temp)}°C</p>
            </div>
        `,
            )
            .join("")
        hourlyForecast.innerHTML = html
    }

    function displayWeeklyForecast(data) {
        const dailyData = groupByDay(data.list)
        const html = Object.values(dailyData)
            .map(
                (day) => `
            <div class="weekly-day">
                <div class="day-info">
                    <h3>${formatDay(day.date)}</h3>
                    <p>${capitalizeFirstLetter(day.weather[0].description)}</p>
                </div>
                <div class="day-temp">
                    <i class="${getWeatherIcon(day.weather[0].id)}"></i>
                    <p>${Math.round(day.temp.max)}°C / ${Math.round(day.temp.min)}°C</p>
                </div>
            </div>
        `,
            )
            .join("")
        weeklyForecast.innerHTML = html
    }

    function updateWeatherDetails(data, dailyAverage) {
        document.getElementById("windSpeed").textContent = `${Math.round(data.wind.speed * 3.6)} km/h`
        document.getElementById("minium").textContent = `${data.main.temp_min} °C`
        document.getElementById("max").textContent = `${data.main.temp_max} °C`
        document.getElementById("media").textContent = `${dailyAverage} °C`
    }


    function capitalizeFirstLetter(text) {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function getWeatherIcon(code) {
        if (code >= 200 && code < 300) return "fas fa-bolt"; // Thunderstorm
        if (code >= 300 && code < 500) return "fas fa-cloud-rain";// With light rain
        if (code >= 500 && code < 600) return "fas fa-cloud-showers-heavy"; // Rain
        if (code >= 600 && code < 700) return "fas fa-snowflake";// Snow
        if (code >= 700 && code < 800) return "fas fa-smog";// Smog
        if (code === 800) return "fas fa-sun";// Clear sun
        if (code === 801) return "fas fa-cloud-sun"; // Some clouds
        if (code > 801 && code <= 804) return "fas fa-cloud";// Cloud
        return "fas fa-sun"; // Default sun
    }

    function formatDay(date) {
        return (
            new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date).charAt(0).toUpperCase() +
            new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date).slice(1)
        )
    }

    function setupEventListeners() {
        // Usar debounce para la búsqueda
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                handleSearchInput(e.target.value);
            }, 500);
        });

        // out click
        document.addEventListener('click', (e) => {
            if (!searchResults.contains(e.target) && e.target !== searchInput) {
                searchResults.style.display = 'none';
            }
        });

        // enter click
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                handleSearchInput(searchInput.value);
            }
        });
    }


    async function handleSearchInput(searchTerm) {
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        try {
            showLoading();
            const cities = await searchCities(searchTerm);
            displaySearchResults(cities);
        } catch (error) {
            showError('Error en la búsqueda: ' + error.message);
        } finally {
            hideLoading();
        }
    }

    function showLoading() {
        loadingOverlay.style.display = "flex"
    }

    function hideLoading() {
        loadingOverlay.style.display = "none"
    }

    async function searchCities(query) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const cities = await response.json();
            return cities.map(city => ({
                name: city.name,
                state: city.state,
                country: city.country,
                lat: city.lat,
                lon: city.lon
            }));
        } catch (error) {
            throw new Error('Error buscando ciudades: ' + error.message);
        }
    }

    function displaySearchResults(cities) {
        searchResults.innerHTML = '';

        if (cities.length === 0) {
            searchResults.innerHTML = `
                <div class="search-result-item no-results">
                    <i class="fas fa-info-circle"></i>
                    No se encontraron resultados
                </div>`;
            searchResults.style.display = 'block';
            return;
        }

        cities.forEach(city => {
            const div = document.createElement('div');
            div.className = 'search-result-item';

            // Crear el nombre completo de la ubicación
            let locationName = city.name;
            if (city.state) locationName += `, ${city.state}`;
            locationName += `, ${getCountryName(city.country)}`;

            div.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <div class="city-info">
                    <div class="city-name">${locationName}</div>
                    <div class="city-coords">
                        ${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°
                    </div>
                </div>
            `;

            div.addEventListener('click', () => selectCity(city));
            searchResults.appendChild(div);
        });

        searchResults.style.display = 'block';
    }



    function calculateWeeklyAverageTemperature() {
        const customTemperatures = [
            { max: 25, min: 12 },
            { max: 28, min: 14 },
            { max: 27, min: 13 },
            { max: 26, min: 15 },
            { max: 30, min: 18 },
            { max: 29, min: 17 },
            { max: 31, min: 19 }
        ];
        const maxAverage = calculateAverage(customTemperatures, "max");
        const minAverage = calculateAverage(customTemperatures, "min");

        console.log(`Media de temperaturas máximas: ${maxAverage}°C`);
        console.log(`Media de temperaturas mínimas: ${minAverage}°C`);
    }
    function calculateAverage(arr, tipo) {
        const sum = arr.reduce((total, dia) => total + dia[tipo], 0);
        return (sum / arr.length).toFixed(2);
    }

});

