const express = require('express');
const router = express.Router();
const axios = require('axios');

// Farming recommendations based on weather condition
const getFarmingAdvice = (data) => {
  const rain = data.rain1h || 0;
  const temp = data.temp;
  const humidity = data.humidity;
  const windSpeed = data.windSpeed;
  const rainProb = data.rainProb || 0;

  const advice = [];
  const spraying = [];
  const irrigation = [];

  // Rain-based advice
  if (rainProb > 70 || rain > 5) {
    advice.push('🌧️ Heavy rain expected — avoid field operations today.');
    spraying.push('❌ Do NOT spray fertilizers or pesticides — rain will wash them away.');
    irrigation.push('✅ Skip irrigation today — rain will provide sufficient moisture.');
  } else if (rainProb > 40) {
    advice.push('🌦️ Light rain possible — plan outdoor work in morning hours.');
    spraying.push('⚠️ Spray before 8 AM if necessary — avoid late afternoon.');
    irrigation.push('💧 Reduce irrigation by 50% today.');
  } else {
    advice.push('☀️ Good weather for field operations.');
    spraying.push('✅ Ideal conditions for pesticide/fertilizer spraying (early morning).');
  }

  // Temperature-based advice
  if (temp > 38) {
    advice.push('🌡️ Extreme heat — protect crops with mulching. Irrigate in early morning or evening.');
    irrigation.push('💧 Irrigate twice daily — early morning (5–7 AM) and evening (6–8 PM).');
  } else if (temp < 10) {
    advice.push('❄️ Cold weather — protect seedlings with covers. Delay spraying.');
  } else if (temp >= 20 && temp <= 30) {
    advice.push('🌿 Optimal temperature for crop growth.');
    if (!irrigation.length) irrigation.push('💧 Normal irrigation schedule is fine.');
  }

  // Humidity-based advice
  if (humidity > 80) {
    advice.push('💦 High humidity — high risk of fungal diseases. Apply preventive fungicide.');
    spraying.push('🦠 Apply Mancozeb 75% WP @ 2.5g/L as preventive fungal treatment.');
  }

  // Wind speed
  if (windSpeed > 20) {
    spraying.push('🌬️ High wind speed — postpone spraying to avoid drift and wastage.');
  }

  return {
    farmingAdvice: advice,
    sprayingAdvice: spraying,
    irrigationAdvice: irrigation.length ? irrigation : ['💧 Follow your regular irrigation schedule.']
  };
};

// @desc    Get current weather + 7-day forecast + farming advice
// @route   GET /api/weather
// @access  Public
router.get('/', async (req, res) => {
  const { lat, lon, city } = req.query;

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    // If API key is configured, fetch real weather
    if (apiKey && apiKey !== 'your_openweather_key') {
      const locationQuery = city
        ? `q=${encodeURIComponent(city)}`
        : `lat=${lat}&lon=${lon}`;

      // Current weather
      const currentRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?${locationQuery}&appid=${apiKey}&units=metric`
      );

      // 5-day forecast (every 3 hours)
      const forecastRes = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?${locationQuery}&appid=${apiKey}&units=metric`
      );

      const current = currentRes.data;
      const forecast = forecastRes.data;

      // Process daily forecast (take 12:00 reading for each day)
      const dailyMap = {};
      forecast.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyMap[date] || item.dt_txt.includes('12:00')) {
          dailyMap[date] = {
            date,
            day: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
            temp: Math.round(item.main.temp),
            tempMin: Math.round(item.main.temp_min),
            tempMax: Math.round(item.main.temp_max),
            condition: item.weather[0].main,
            description: item.weather[0].description,
            icon: item.weather[0].icon,
            humidity: item.main.humidity,
            rainProb: Math.round((item.pop || 0) * 100),
            windSpeed: Math.round(item.wind.speed * 3.6) // m/s to km/h
          };
        }
      });

      const weatherData = {
        location: current.name + ', ' + current.sys.country,
        temp: Math.round(current.main.temp),
        feelsLike: Math.round(current.main.feels_like),
        humidity: current.main.humidity,
        windSpeed: Math.round(current.wind.speed * 3.6),
        condition: current.weather[0].main,
        description: current.weather[0].description,
        icon: current.weather[0].icon,
        rainProb: 0,
        rain1h: current.rain ? current.rain['1h'] || 0 : 0,
        forecast: Object.values(dailyMap).slice(0, 7)
      };

      // Add rain probability from next forecast item
      if (forecast.list[0]) {
        weatherData.rainProb = Math.round((forecast.list[0].pop || 0) * 100);
      }

      const { farmingAdvice, sprayingAdvice, irrigationAdvice } = getFarmingAdvice(weatherData);

      return res.json({
        success: true,
        weather: weatherData,
        farmingAdvice,
        sprayingAdvice,
        irrigationAdvice,
        source: 'openweathermap'
      });
    }

    // Demo mode — realistic mock data for India
    const mockWeather = {
      location: 'New Delhi, IN',
      temp: 28,
      feelsLike: 30,
      humidity: 72,
      windSpeed: 12,
      condition: 'Clouds',
      description: 'light rain',
      icon: '10d',
      rainProb: 82,
      rain1h: 2.5,
      forecast: [
        { date: '2024-06-21', day: 'Fri', temp: 28, tempMin: 22, tempMax: 31, condition: 'Rain', description: 'light rain', humidity: 75, rainProb: 82, windSpeed: 14 },
        { date: '2024-06-22', day: 'Sat', temp: 31, tempMin: 24, tempMax: 35, condition: 'Clouds', description: 'overcast clouds', humidity: 68, rainProb: 30, windSpeed: 10 },
        { date: '2024-06-23', day: 'Sun', temp: 30, tempMin: 23, tempMax: 33, condition: 'Clear', description: 'clear sky', humidity: 60, rainProb: 10, windSpeed: 8 },
        { date: '2024-06-24', day: 'Mon', temp: 33, tempMin: 26, tempMax: 37, condition: 'Clear', description: 'clear sky', humidity: 55, rainProb: 5, windSpeed: 6 },
        { date: '2024-06-25', day: 'Tue', temp: 29, tempMin: 22, tempMax: 32, condition: 'Rain', description: 'moderate rain', humidity: 80, rainProb: 70, windSpeed: 18 },
        { date: '2024-06-26', day: 'Wed', temp: 27, tempMin: 21, tempMax: 30, condition: 'Thunderstorm', description: 'thunderstorm', humidity: 85, rainProb: 90, windSpeed: 25 },
        { date: '2024-06-27', day: 'Thu', temp: 29, tempMin: 23, tempMax: 33, condition: 'Clouds', description: 'few clouds', humidity: 65, rainProb: 25, windSpeed: 9 }
      ]
    };

    const { farmingAdvice, sprayingAdvice, irrigationAdvice } = getFarmingAdvice(mockWeather);

    res.json({
      success: true,
      weather: mockWeather,
      farmingAdvice,
      sprayingAdvice,
      irrigationAdvice,
      source: 'demo'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Weather service error'
    });
  }
});

module.exports = router;
