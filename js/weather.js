// Inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
    const app = new WeatherApp()
})


class WeatherApp {
    constructor() {
        this.API_KEY = "9356ba008da24375b88bfdd22195f200"
        this.initializeElements()
        this.setupEventListeners();
        this.searchTimeout = null;
        this.loadDefaultCity();
    }
    initializeElements() {
        this.searchInput = document.getElementById('citySearch');
        this.searchResults = document.getElementById('searchResults');
        this.currentWeatherDetails = document.getElementById('currentWeatherDetails');
        this.hourlyForecast = document.getElementById('hourlyForecast');
        this.weeklyForecast = document.getElementById('weeklyForecast');
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    setupEventListeners() {
        // Usar debounce para la búsqueda
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.handleSearchInput(e.target.value);
            }, 500); // Esperar 500ms después de que el usuario deje de escribir
        });

        // Cerrar resultados cuando se hace clic fuera
        document.addEventListener('click', (e) => {
            if (!this.searchResults.contains(e.target) && e.target !== this.searchInput) {
                this.searchResults.style.display = 'none';
            }
        });

        // Manejar la tecla Enter en el input
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.searchInput.value.trim() !== '') {
                this.handleSearchInput(this.searchInput.value);
            }
        });
    }

    async handleSearchInput(searchTerm) {
        if (searchTerm.length < 2) {
            this.searchResults.style.display = 'none';
            return;
        }

        try {
            this.showLoading();
            const cities = await this.searchCities(searchTerm);
            this.displaySearchResults(cities);
        } catch (error) {
            this.showError('Error en la búsqueda: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async searchCities(query) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${this.API_KEY}`
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


    showLoading() {
        this.loadingOverlay.style.display = "flex"
    }

    hideLoading() {
        this.loadingOverlay.style.display = "none"
    }


    displaySearchResults(cities) {
        this.searchResults.innerHTML = '';
        
        if (cities.length === 0) {
            this.searchResults.innerHTML = `
                <div class="search-result-item no-results">
                    <i class="fas fa-info-circle"></i>
                    No se encontraron resultados
                </div>`;
            this.searchResults.style.display = 'block';
            return;
        }

        cities.forEach(city => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            
            // Crear el nombre completo de la ubicación
            let locationName = city.name;
            if (city.state) locationName += `, ${city.state}`;
            locationName += `, ${this.getCountryName(city.country)}`;

            div.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <div class="city-info">
                    <div class="city-name">${locationName}</div>
                    <div class="city-coords">
                        ${city.lat.toFixed(2)}°, ${city.lon.toFixed(2)}°
                    </div>
                </div>
            `;
            
            div.addEventListener('click', () => this.selectCity(city));
            this.searchResults.appendChild(div);
        });

        this.searchResults.style.display = 'block';
    }

    getCountryName(countryCode) {
        try {
            return new Intl.DisplayNames(['es'], { type: 'region' }).of(countryCode);
        } catch (error) {
            return countryCode;
        }
    }


    async selectCity(city) {
        this.searchInput.value = `${city.name}, ${city.country}`

        this.searchResults.style.display = "none"
        this.showLoading()

        try {
            await this.fetchAndDisplayWeather(city)
        } catch (error) {
            console.error("Error fetching weather:", error)
        } finally {
            this.hideLoading()
        }
    }

    async fetchAndDisplayWeather(city) {
        const [current, forecast] = await Promise.all([this.fetchCurrentWeather(city), this.fetchForecast(city)])

        this.displayCurrentWeather(current)
        this.displayHourlyForecast(forecast)
        this.displayWeeklyForecast(forecast)
        this.updateWeatherDetails(current)
    }

    async fetchCurrentWeather(city) {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&appid=${this.API_KEY}&units=metric&lang=es`,
            
        )
        return await response.json()
    }

    async fetchForecast(city) {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${city.lat}&lon=${city.lon}&appid=${this.API_KEY}&units=metric&lang=es`,
        )
        return await response.json()
    }

    displayCurrentWeather(data) {
        const html = `
                <div class="current-weather-header">
                    <div>
                    <h1>${data.name} - ${data}</h1>
                    <p class="current-temp">${Math.round(data.main.temp)}°C</p>
                    <p>${capitalizeFirstLetter(data.weather[0].description)}</p>
                </div>
                <div class="weather-icon">
                    <i class="${this.getWeatherIcon(data.weather[0].id)}"></i>
                </div>
                </div>
                <div class="current-weather-details">
                    <p>Temperatura mínima: ${Math.round(data.main.temp_min)}°C</p>
                    <p>Temperatura máxima: ${Math.round(data.main.temp_max)}°C</p>
                    <p>Sensación térmica: ${Math.round(data.main.feels_like)}°C</p>
                    <p>Humedad: ${data.main.humidity}%</p>
                </div>
        `
        console.log(data)
        console.log(data.weather[0].id)

        this.currentWeatherDetails.innerHTML = html
    }

    displayHourlyForecast(data) {
        const hourlyData = data.list.slice(0, 8) // Próximas 24 horas (cada 3 horas)
        const html = hourlyData
            .map(
                (hour) => `
            <div class="hourly-item">
                  <p>${new Date(hour.dt * 1000).getHours()}:00</p>
                <i class="${this.getWeatherIcon(hour.weather[0].id)}"></i>
                <p class="temp">${Math.round(hour.main.temp)}°C</p>
            </div>
        `,
            )
            .join("")
        this.hourlyForecast.innerHTML = html
    }

    displayWeeklyForecast(data) {
        // Agrupar por día y obtener el pronóstico diario
        const dailyData = this.groupByDay(data.list)

        const html = Object.values(dailyData)
            .map(
                (day) => `
            <div class="weekly-day">
                <div class="day-info">
                    <h3>${this.formatDay(day.date)}</h3>
                    <p>${capitalizeFirstLetter(day.weather[0].description)}</p>
                </div>
                <div class="day-temp">
                    <i class="${this.getWeatherIcon(day.weather[0].id)}"></i>
                    <p>${Math.round(day.temp.max)}°C / ${Math.round(day.temp.min)}°C</p>
                </div>
            </div>
        `,
        console.log(dailyData)

            )
            .join("")
        this.weeklyForecast.innerHTML = html
    }

    updateWeatherDetails(data) {
        document.getElementById("windSpeed").textContent = `${Math.round(data.wind.speed * 3.6)} km/h`
        document.getElementById("humidity").textContent = `${data.main.humidity}%`
        document.getElementById("pressure").textContent = `${data.main.pressure} hPa`
        document.getElementById("uvIndex").textContent = `${data.main.temp}`
    }

    groupByDay(list) {
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

    formatDay(date) {
        return (
            new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date).charAt(0).toUpperCase() +
            new Intl.DateTimeFormat("es-ES", { weekday: "long" }).format(date).slice(1)
        )
    }

    getWeatherIcon(code) {
        // Mapeo de códigos de clima a iconos de Font Awesome
        const icons = {
            200: "fas fa-cloud-bolt", // Tormenta con lluvia ligera
            300: "fas fa-cloud-rain", // Llovizna
            500: "fas fa-cloud-showers-heavy", // Lluvia
            600: "fas fa-snowflake", // Nieve
            700: "fas fa-smog", // Atmósfera (niebla, etc.)
            800: "fas fa-sun", // Despejado
            801: "fas fa-cloud-sun", // Algunas nubes
            802: "fas fa-cloud", // Nublado
            default: "fas fa-cloud",
        }

        // Encontrar el icono correspondiente o usar el predeterminado
        const iconCode = Object.keys(icons).find((key) => code >= Number.parseInt(key) && code < Number.parseInt(key) + 100)
        return icons[iconCode] || icons.default
    }

    loadDefaultCity() {
        // Detectar ubicación del usuario
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const city = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    };
                    
                    try {
                        // Obtener el nombre de la ciudad usando geocodificación inversa
                        const response = await fetch(
                            `https://api.openweathermap.org/geo/1.0/reverse?lat=${city.lat}&lon=${city.lon}&limit=1&appid=${this.API_KEY}`
                        );
                        const data = await response.json();
                        
                        if (data && data[0]) {
                            city.name = data[0].name;
                            city.country = data[0].country;
                            city.state = data[0].state;
                        }
                        
                        await this.selectCity(city);
                    } catch (error) {
                        console.error('Error getting city name:', error);
                        this.loadDefaultMadrid();
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    this.loadDefaultMadrid();
                }
            );
        } else {
            this.loadDefaultMadrid();
        }
    }

    loadDefaultMadrid() {
        const madrid = {
            name: "Madrid",
            country: "ES",
            lat: 40.4165,
            lon: -3.7026
        };
        this.selectCity(madrid);
    }    
}


function capitalizeFirstLetter(text) {
    return text.replace(/^./, (c) => c.toUpperCase());
}

