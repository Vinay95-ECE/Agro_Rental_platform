import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Cloud, Droplets, Wind, Thermometer, RefreshCw,
  AlertTriangle, Sprout, Truck, Calendar
} from 'lucide-react';

// Weather icon mapping
const getWeatherEmoji = (condition) => {
  const map = {
    Clear: '☀️', Clouds: '🌥️', Rain: '🌧️', Drizzle: '🌦️',
    Thunderstorm: '⛈️', Snow: '❄️', Mist: '🌫️', Fog: '🌫️',
    Haze: '😶‍🌫️', Smoke: '💨', Dust: '🌪️', Tornado: '🌪️'
  };
  return map[condition] || '🌤️';
};

const WeatherPage = () => {
  const [weather, setWeather] = useState(null);
  const [farmingAdvice, setFarmingAdvice] = useState([]);
  const [sprayingAdvice, setSprayingAdvice] = useState([]);
  const [irrigationAdvice, setIrrigationAdvice] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [source, setSource] = useState('');

  const fetchWeather = async (cityQuery = '') => {
    setLoading(true);
    setError('');
    try {
      const params = cityQuery ? { city: cityQuery } : { lat: 28.6139, lon: 77.2090 };
      const res = await axios.get('/api/weather', { params });
      if (res.data.success) {
        setWeather(res.data.weather);
        setFarmingAdvice(res.data.farmingAdvice || []);
        setSprayingAdvice(res.data.sprayingAdvice || []);
        setIrrigationAdvice(res.data.irrigationAdvice || []);
        setSource(res.data.source);
      }
    } catch (err) {
      setError('Could not fetch weather data. Showing demo data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          axios.get('/api/weather', {
            params: { lat: pos.coords.latitude, lon: pos.coords.longitude }
          }).then(res => {
            if (res.data.success) {
              setWeather(res.data.weather);
              setFarmingAdvice(res.data.farmingAdvice || []);
              setSprayingAdvice(res.data.sprayingAdvice || []);
              setIrrigationAdvice(res.data.irrigationAdvice || []);
              setSource(res.data.source);
            }
          }).catch(() => fetchWeather()).finally(() => setLoading(false));
        },
        () => fetchWeather()
      );
    } else {
      fetchWeather();
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchCity.trim()) {
      setCity(searchCity.trim());
      fetchWeather(searchCity.trim());
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw size={32} className="text-emerald-500 animate-spin" />
        <p className="text-slate-400 text-sm">Fetching weather data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🌦️ Weather & Rain Forecast
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Real-time weather with farm-specific recommendations
            {source === 'demo' && (
              <span className="ml-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold">
                DEMO MODE — Add OpenWeatherMap key for real data
              </span>
            )}
          </p>
        </div>

        {/* City Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            placeholder="Search city..."
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 w-40"
          />
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-3 rounded-xl">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {weather && (
        <>
          {/* Current Weather Card */}
          <div className="glass border border-slate-800 rounded-2xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main reading */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
                  <Calendar size={13} />
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  <span className="ml-1 font-bold text-emerald-400">{weather.location}</span>
                </div>

                <div className="flex items-center gap-5">
                  <span className="text-7xl">{getWeatherEmoji(weather.condition)}</span>
                  <div>
                    <div className="text-6xl font-black text-white">{weather.temp}°C</div>
                    <div className="text-sm text-slate-400 capitalize mt-1">{weather.description}</div>
                    <div className="text-xs text-slate-500">Feels like {weather.feelsLike}°C</div>
                  </div>
                </div>

                {/* Rain Probability — Big Highlight */}
                <div className={`p-4 rounded-xl border ${
                  weather.rainProb > 60
                    ? 'bg-blue-950/30 border-blue-500/30'
                    : weather.rainProb > 30
                    ? 'bg-amber-950/20 border-amber-500/20'
                    : 'bg-emerald-950/20 border-emerald-500/20'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-300">Rain Probability</span>
                    <span className={`text-xl font-black ${weather.rainProb > 60 ? 'text-blue-400' : weather.rainProb > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {weather.rainProb}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        weather.rainProb > 60 ? 'bg-blue-500' : weather.rainProb > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${weather.rainProb}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {weather.rainProb > 70
                      ? '⚠️ High chance of rain — avoid outdoor operations'
                      : weather.rainProb > 40
                      ? '🌦️ Moderate chance — plan activities in morning'
                      : '✅ Low rain chance — good for field work'}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Droplets, label: 'Humidity', value: `${weather.humidity}%`, color: 'text-blue-400' },
                  { icon: Wind, label: 'Wind Speed', value: `${weather.windSpeed} km/h`, color: 'text-teal-400' },
                  { icon: Thermometer, label: 'Feels Like', value: `${weather.feelsLike}°C`, color: 'text-orange-400' },
                  { icon: Cloud, label: 'Condition', value: weather.condition, color: 'text-slate-300' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={color} />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">{label}</span>
                    </div>
                    <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7-Day Forecast */}
          <div className="glass border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Calendar size={15} className="text-emerald-400" /> 7-Day Forecast
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {weather.forecast?.slice(0, 7).map((day, i) => (
                <div
                  key={i}
                  className={`text-center p-3 rounded-xl border transition-all ${
                    i === 0
                      ? 'bg-emerald-600/20 border-emerald-500/30'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <p className="text-[10px] font-bold text-slate-400 mb-1">{i === 0 ? 'Today' : day.day}</p>
                  <span className="text-2xl block mb-1">{getWeatherEmoji(day.condition)}</span>
                  <p className="text-xs font-extrabold text-white">{day.temp}°</p>
                  <p className="text-[9px] text-blue-400 font-bold mt-0.5">{day.rainProb}%🌧️</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{day.tempMin}° / {day.tempMax}°</p>
                </div>
              ))}
            </div>
          </div>

          {/* Farming Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Farming Advice */}
            <div className="glass border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sprout size={15} className="text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Farming Advice</h3>
              </div>
              <div className="space-y-2">
                {farmingAdvice.map((advice, i) => (
                  <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                    <p className="text-[11px] text-slate-300 leading-relaxed">{advice}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Spraying Advice */}
            <div className="glass border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Truck size={15} className="text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Spray Recommendations</h3>
              </div>
              <div className="space-y-2">
                {sprayingAdvice.map((advice, i) => (
                  <div key={i} className={`rounded-xl p-3 border ${
                    advice.startsWith('❌')
                      ? 'bg-red-950/20 border-red-500/20'
                      : advice.startsWith('⚠️')
                      ? 'bg-amber-950/20 border-amber-500/20'
                      : 'bg-emerald-950/20 border-emerald-500/20'
                  }`}>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{advice}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Irrigation Advice */}
            <div className="glass border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Droplets size={15} className="text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Irrigation Guide</h3>
              </div>
              <div className="space-y-2">
                {irrigationAdvice.map((advice, i) => (
                  <div key={i} className="bg-blue-950/20 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-[11px] text-slate-300 leading-relaxed">{advice}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeatherPage;
