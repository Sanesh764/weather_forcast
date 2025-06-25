// API-integrated weather forecast script
let temperatureUnit = 'celsius';
let temperatureChart;
let currentWeatherData = null;

async function fetchWeather(location) {
    const apiKey = '3be6844e22a0bd7845ca2a0f03a15b48'; // 🔑 Replace with your real OpenWeatherMap API key
    const apiUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${location}&units=metric&appid=${apiKey}`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.list || !data.city) throw new Error('Invalid API response');

        const forecast = [];
        for (let i = 0; i < data.list.length; i += 8) {
            forecast.push({
                day: new Date(data.list[i].dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
                temp: Math.round(data.list[i].main.temp),
            });
        }

        const weatherObj = {
            name: `${data.city.name}, ${data.city.country}`,
            temp: {
                celsius: Math.round(data.list[0].main.temp),
                fahrenheit: Math.round(data.list[0].main.temp * 9/5 + 32),
            },
            description: data.list[0].weather[0].description,
            icon: '⛅', // Replace with emoji or map from data.list[0].weather[0].icon
            windSpeed: `${data.list[0].wind.speed} m/s`,
            humidity: `${data.list[0].main.humidity}%`,
            pressure: `${data.list[0].main.pressure} hPa`,
            sunrise: '--:--', // Not available in this endpoint
            sunset: '--:--',
            forecast,
            tenDayForecast: forecast.map((f, i) => ({
                date: f.day,
                fullDate: new Date(Date.now() + i * 86400000).toLocaleDateString(),
                temp: {
                    celsius: f.temp,
                    fahrenheit: Math.round(f.temp * 9/5 + 32)
                },
                icon: '⛅',
                desc: data.list[0].weather[0].description,
                feelsLike: {
                    celsius: `${Math.round(data.list[0].main.feels_like)}°C`,
                    fahrenheit: `${Math.round(data.list[0].main.feels_like * 9/5 + 32)}°F`
                },
                wind: `${data.list[0].wind.speed} m/s`,
                humidity: `${data.list[0].main.humidity}%`,
                pressure: `${data.list[0].main.pressure} hPa`,
                uv: '--',
                visibility: '--',
                sunrise: '--:--',
                sunset: '--:--'
            }))
        };

        currentWeatherData = weatherObj;
        updateWeatherUI(weatherObj);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Failed to load weather data. Please check your API key or location.');
    }
}

function searchWeather() {
    const location = document.getElementById('locationInput').value.toLowerCase();
    fetchWeather(location);
}

function getCurrentLocation() {
    alert("Fetching current location... (Using Delhi for this demo)");
    fetchWeather('delhi');
    document.getElementById('locationInput').value = 'delhi';
}

function toggleTemperature(unit) {
    temperatureUnit = unit;
    document.getElementById('celsiusBtn').classList.toggle('active', unit === 'celsius');
    document.getElementById('fahrenheitBtn').classList.toggle('active', unit === 'fahrenheit');

    if (currentWeatherData) {
        updateWeatherUI(currentWeatherData);
    }
}

function updateWeatherUI(data) {
    document.getElementById('locationName').textContent = data.name;
    document.querySelector('.weather-icon').textContent = data.icon;
    document.getElementById('currentTemp').textContent = `${data.temp[temperatureUnit]}°${temperatureUnit === 'celsius' ? 'C' : 'F'}`;
    document.getElementById('weatherDescription').textContent = data.description;
    document.getElementById('windSpeed').textContent = data.windSpeed;
    document.getElementById('humidity').textContent = data.humidity;
    document.getElementById('pressure').textContent = data.pressure;
    document.getElementById('sunrise').textContent = data.sunrise;
    document.getElementById('sunset').textContent = data.sunset;

    if (data.forecast && Array.isArray(data.forecast)) {
        updateChart(data.forecast);
    }

    if (data.tenDayForecast && Array.isArray(data.tenDayForecast)) {
        renderTenDayForecast(data.tenDayForecast);
    }
}

function renderTenDayForecast(tenDayData) {
    const forecastContainer = document.getElementById('forecastContainer');
    forecastContainer.innerHTML = '';

    tenDayData.forEach((dayData, index) => {
        const dayElement = document.createElement('div');
        dayElement.className = 'forecast-day';
        const temp = dayData.temp[temperatureUnit];
        const tempSymbol = temperatureUnit === 'celsius' ? 'C' : 'F';
        dayElement.innerHTML = `
            <div class="forecast-date">${dayData.date}</div>
            <div class="forecast-icon">${dayData.icon}</div>
            <div class="forecast-temp">${temp}°${tempSymbol}</div>
            <div class="forecast-desc">${dayData.desc}</div>
        `;

        dayElement.addEventListener('click', () => {
            document.querySelectorAll('.forecast-day').forEach(el => el.classList.remove('active'));
            dayElement.classList.add('active');
            showDetailedInfo(dayData);
        });

        forecastContainer.appendChild(dayElement);

        if (index === 0) {
            dayElement.classList.add('active');
            showDetailedInfo(dayData);
        }
    });
}

function showDetailedInfo(dayData) {
    const tempSymbol = temperatureUnit === 'celsius' ? 'C' : 'F';
    document.getElementById('detailedDate').textContent = dayData.fullDate;
    document.getElementById('detailedTemp').textContent = `${dayData.temp[temperatureUnit]}°${tempSymbol}`;
    document.getElementById('detailedDesc').textContent = dayData.desc;
    document.getElementById('detailedFeelsLike').textContent = dayData.feelsLike[temperatureUnit];
    document.getElementById('detailedWind').textContent = dayData.wind;
    document.getElementById('detailedHumidity').textContent = dayData.humidity;
    document.getElementById('detailedPressure').textContent = dayData.pressure;
    document.getElementById('detailedUV').textContent = dayData.uv;
    document.getElementById('detailedVisibility').textContent = dayData.visibility;
    document.getElementById('detailedSunrise').textContent = dayData.sunrise;
    document.getElementById('detailedSunset').textContent = dayData.sunset;

    document.getElementById('detailedInfo').classList.add('show');
}

function updateChart(forecast) {
    const ctx = document.getElementById('temperatureChart').getContext('2d');
    const labels = forecast.map(d => d.day);
    const temps = forecast.map(d => temperatureUnit === 'celsius' ? d.temp : Math.round(d.temp * 9/5 + 32));

    if (temperatureChart) {
        temperatureChart.destroy();
    }

    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `Temperature (°${temperatureUnit === 'celsius' ? 'C' : 'F'})`,
                data: temps,
                borderColor: '#0984e3',
                backgroundColor: 'rgba(116, 185, 255, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0984e3',
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

window.onload = () => {
    searchWeather();
};