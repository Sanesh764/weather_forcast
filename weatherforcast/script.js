const apiKey = "3be6844e22a0bd7845ca2a0f03a15b48"; // Replace with your OpenWeatherMap API key
const cityInput = document.querySelector(".city-input");
const searchBtn = document.querySelector(".search-btn");
const currentWeatherDiv = document.querySelector(".current-weather");
const weatherForecastDiv = document.querySelector(".weather-forecast");

function getWeather(city) {
    // Fetch current weather
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
    fetch(currentWeatherUrl)
        .then(response => response.json())
        .then(data => {
            if (data.cod === "404") {
                currentWeatherDiv.innerHTML = "<p>City not found!</p>";
                return;
            }
            displayCurrentWeather(data);
            getForecast(city); // Fetch 5-day forecast after current weather
        })
        .catch(error => {
            currentWeatherDiv.innerHTML = "<p>Something went wrong!</p>";
            console.error(error);
        });
}

function displayCurrentWeather(data) {
    const { name, main, weather, wind } = data;
    currentWeatherDiv.innerHTML = `
        <h2>${name}</h2>
        <img src="https://openweathermap.org/img/wn/${weather[0].icon}@2x.png" alt="weather icon">
        <p>${weather[0].description}</p>
        <p>Temperature: ${main.temp}°C</p>
        <p>Humidity: ${main.humidity}%</p>
        <p>Wind Speed: ${wind.speed} m/s</p>
    `;
}

function getForecast(city) {
    // Fetch 5-day forecast
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
    fetch(forecastUrl)
        .then(response => response.json())
        .then(data => {
            displayForecast(data);
        })
        .catch(error => {
            weatherForecastDiv.innerHTML = "<p>Unable to load forecast!</p>";
            console.error(error);
        });
}

function displayForecast(data) {
    weatherForecastDiv.innerHTML = "";
    // Filter to get one forecast per day (e.g., at 12:00 PM)
    const dailyForecasts = data.list.filter(item => item.dt_txt.includes("12:00:00"));
    dailyForecasts.slice(0, 5).forEach(item => {
        const { dt_txt, main, weather } = item;
        const date = new Date(dt_txt).toLocaleDateString();
        weatherForecastDiv.innerHTML += `
            <div class="forecast-card">
                <h3>${date}</h3>
                <img src="https://openweathermap.org/img/wn/${weather[0].icon}@2x.png" alt="weather icon">
                <p>Temp: ${main.temp}°C</p>
                <p>${weather[0].description}</p>
            </div>
        `;
    });
}

// Event listener for search button
searchBtn.addEventListener("click", () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeather(city);
        cityInput.value = ""; // Clear input after search
    } else {
        currentWeatherDiv.innerHTML = "<p>Please enter a city name!</p>";
    }
});

// Optional: Trigger search with Enter key
cityInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        searchBtn.click();
    }
});

// Default city on page load
getWeather("London");