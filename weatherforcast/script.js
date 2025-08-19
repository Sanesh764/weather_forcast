// API-integrated weather forecast script
let temperatureUnit = localStorage.getItem('tempUnit') || 'celsius';
let temperatureChart;
let currentWeatherData = null;

async function fetchWeather(location) {
    const apiKey = '3be6844e22a0bd7845ca2a0f03a15b48'; // 🔑 Replace with your real OpenWeatherMap API key
    const units = 'metric';
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&units=${units}&appid=${apiKey}`;

    try {
        showError('');
        const response = await fetch(forecastUrl);
        if (!response.ok) {
            // Fallback to demo so the page always shows data (e.g., on GitHub Pages without an API key)
            const demo = buildDemoWeather(location || 'Demo City');
            currentWeatherData = demo;
            updateWeatherUI(demo);
            return;
        }
        const data = await response.json();

        if (!data.list || !data.city) throw new Error('Invalid API response');

        const noonSlices = data.list.filter(item => new Date(item.dt * 1000).getHours() === 12);
        const picked = noonSlices.length >= 5 ? noonSlices.slice(0, 5) : data.list.filter((_, i) => i % 8 === 0).slice(0, 5);
        const forecast = picked.map(item => ({
            day: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
            temp: Math.round(item.main.temp),
            iconCode: item.weather[0].icon,
            description: item.weather[0].description
        }));

        const sunrise = data.city && data.city.sunrise ? formatTime(data.city.sunrise, data.city.timezone) : '--:--';
        const sunset = data.city && data.city.sunset ? formatTime(data.city.sunset, data.city.timezone) : '--:--';

        const weatherObj = {
            name: `${data.city.name}, ${data.city.country}`,
            temp: {
                celsius: Math.round(data.list[0].main.temp),
                fahrenheit: Math.round(data.list[0].main.temp * 9/5 + 32),
            },
            description: capitalize(data.list[0].weather[0].description),
            icon: data.list[0].weather[0].icon,
            windSpeed: `${data.list[0].wind.speed} m/s`,
            humidity: `${data.list[0].main.humidity}%`,
            pressure: `${data.list[0].main.pressure} hPa`,
            sunrise,
            sunset,
            forecast,
            tenDayForecast: forecast.map((f, i) => ({
                date: f.day,
                fullDate: new Date(Date.now() + i * 86400000).toLocaleDateString(),
                temp: {
                    celsius: f.temp,
                    fahrenheit: Math.round(f.temp * 9/5 + 32)
                },
                icon: f.iconCode,
                desc: capitalize(f.description),
                feelsLike: {
                    celsius: `${Math.round(data.list[0].main.feels_like)}°C`,
                    fahrenheit: `${Math.round(data.list[0].main.feels_like * 9/5 + 32)}°F`
                },
                wind: `${data.list[0].wind.speed} m/s`,
                humidity: `${data.list[0].main.humidity}%`,
                pressure: `${data.list[0].main.pressure} hPa`,
                uv: '--',
                visibility: '--',
                sunrise,
                sunset
            }))
        };

        currentWeatherData = weatherObj;
        updateWeatherUI(weatherObj);

        // Try to enrich with UV index and visibility using One Call API
        const coords = data.city && data.city.coord ? data.city.coord : null;
        if (coords && coords.lat != null && coords.lon != null) {
            try {
                await enrichWithOneCall(coords.lat, coords.lon);
                updateWeatherUI(currentWeatherData);
            } catch (e) {
                // Ignore enrichment errors
                console.warn('Enrichment failed:', e);
            }
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        // Final fallback to demo data
        const demo = buildDemoWeather(location || 'Demo City');
        currentWeatherData = demo;
        updateWeatherUI(demo);
    }
}

function searchWeather() {
    const inputEl = document.getElementById('locationInput');
    const location = (inputEl.value || '').trim();
    if (!location) {
        showError('Please enter a city name.');
        return;
    }
    fetchWeather(location);
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported in this browser.');
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            showError('');
            const { latitude, longitude } = pos.coords;
            await fetchWeatherByCoords(latitude, longitude);
        } catch (e) {
            showError('Unable to fetch weather for your location.');
        }
    }, () => showError('Permission denied for location. You can search by city name.'));
}

function toggleTemperature(unit) {
    temperatureUnit = unit;
    document.getElementById('celsiusBtn').classList.toggle('active', unit === 'celsius');
    document.getElementById('fahrenheitBtn').classList.toggle('active', unit === 'fahrenheit');
    localStorage.setItem('tempUnit', unit);

    if (currentWeatherData) {
        updateWeatherUI(currentWeatherData);
    }
}

function updateWeatherUI(data) {
    document.getElementById('locationName').textContent = data.name;
    const iconImg = document.getElementById('weatherIcon');
    if (data.icon) {
        iconImg.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
        iconImg.style.display = 'block';
        iconImg.alt = data.description;
    } else {
        iconImg.style.display = 'none';
    }
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
            <div class="forecast-icon"><img src="https://openweathermap.org/img/wn/${dayData.icon}.png" alt="${dayData.desc}" class="forecast-icon-img"></div>
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

async function fetchWeatherByCoords(lat, lon) {
    const apiKey = '3be6844e22a0bd7845ca2a0f03a15b48';
    const units = 'metric';
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${units}&appid=${apiKey}`;
    try {
        showError('');
        const res = await fetch(url);
        if (!res.ok) {
            const demo = buildDemoWeather('Your Location');
            currentWeatherData = demo;
            updateWeatherUI(demo);
            return;
        }
        const data = await res.json();
        const cityName = `${data.city.name}, ${data.city.country}`;
        document.getElementById('locationInput').value = data.city.name;
        await fetchWeather(data.city.name);
        document.getElementById('locationName').textContent = cityName;
    } catch (e) {
        const demo = buildDemoWeather('Your Location');
        currentWeatherData = demo;
        updateWeatherUI(demo);
    }
}

function showError(message) {
    const banner = document.getElementById('errorBanner');
    if (!banner) return;
    if (!message) {
        banner.style.display = 'none';
        banner.textContent = '';
    } else {
        banner.style.display = 'block';
        banner.textContent = message;
    }
}

window.onload = () => {
    const input = document.getElementById('locationInput');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                searchWeather();
            }
        });
    }
    // Default city to load
    document.getElementById('locationInput').value = 'Patna';
    document.getElementById('celsiusBtn').classList.toggle('active', temperatureUnit === 'celsius');
    document.getElementById('fahrenheitBtn').classList.toggle('active', temperatureUnit === 'fahrenheit');
    searchWeather();
};

function capitalize(text) {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatTime(unixSeconds, timezoneOffsetSeconds) {
    try {
        const date = new Date((unixSeconds + (timezoneOffsetSeconds || 0)) * 1000);
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const normalized = hours % 12 || 12;
        return `${normalized}:${minutes} ${ampm}`;
    } catch {
        return '--:--';
    }
}

function buildDemoWeather(locationName) {
    const baseTemp = 28;
    const days = Array.from({ length: 5 }, (_, i) => {
        const date = new Date(Date.now() + i * 86400000);
        return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            fullDate: date.toLocaleDateString(),
            temp: baseTemp + (i % 3) * 2,
            iconCode: ['01d', '02d', '03d', '10d', '04d'][i],
            description: ['clear sky', 'few clouds', 'scattered clouds', 'light rain', 'broken clouds'][i]
        };
    });

    const forecast = days.map(d => ({ day: d.day, temp: d.temp, iconCode: d.iconCode, description: d.description }));
    const sunrise = '6:00 AM';
    const sunset = '6:30 PM';

    return {
        name: `${locationName}, IN (Demo)`,
        temp: { celsius: baseTemp, fahrenheit: Math.round(baseTemp * 9 / 5 + 32) },
        description: capitalize('clear sky'),
        icon: '01d',
        windSpeed: '3.5 m/s',
        humidity: '55%',
        pressure: '1012 hPa',
        sunrise,
        sunset,
        forecast,
        tenDayForecast: days.map((d, i) => ({
            date: d.day,
            fullDate: d.fullDate,
            temp: {
                celsius: d.temp,
                fahrenheit: Math.round(d.temp * 9 / 5 + 32)
            },
            icon: d.iconCode,
            desc: capitalize(d.description),
            feelsLike: {
                celsius: `${baseTemp + 1}°C`,
                fahrenheit: `${Math.round((baseTemp + 1) * 9 / 5 + 32)}°F`
            },
            wind: '3.5 m/s',
            humidity: '55%',
            pressure: '1012 hPa',
            uv: (6.5 - i * 0.7).toFixed(1),
            visibility: i === 0 ? '10 km' : '--',
            sunrise,
            sunset
        }))
    };
}

function formatVisibility(meters) {
    if (meters == null) return '--';
    const km = meters / 1000;
    if (km >= 10) return `${Math.round(km)} km`;
    return `${km.toFixed(1)} km`;
}

async function enrichWithOneCall(lat, lon) {
    const apiKey = '3be6844e22a0bd7845ca2a0f03a15b48';
    const units = 'metric';
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=${units}&exclude=minutely,hourly,alerts&appid=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('One Call request failed');
    const oc = await res.json();

    const uvToday = oc.current && typeof oc.current.uvi === 'number' ? oc.current.uvi : null;
    const visToday = oc.current && typeof oc.current.visibility === 'number' ? oc.current.visibility : null;
    const daily = Array.isArray(oc.daily) ? oc.daily : [];

    if (currentWeatherData && Array.isArray(currentWeatherData.tenDayForecast)) {
        currentWeatherData.tenDayForecast = currentWeatherData.tenDayForecast.map((d, i) => {
            const uv = daily[i] && typeof daily[i].uvi === 'number' ? daily[i].uvi : (i === 0 ? uvToday : null);
            return {
                ...d,
                uv: uv != null ? uv.toFixed(1) : '--',
                visibility: i === 0 ? formatVisibility(visToday) : d.visibility
            };
        });
    }
}