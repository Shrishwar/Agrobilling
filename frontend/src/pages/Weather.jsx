import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Cloud, CloudRain, Wind, Droplets, Thermometer, Eye, Gauge, MapPin, Calendar, TrendingUp, TriangleAlert as AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useLanguage } from '../context/LanguageContext';

const Weather = () => {
  const { t } = useLanguage();
  const [currentWeather, setCurrentWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeatherData();
  }, []);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      
      // Mock weather data - in real app, integrate with weather API
      setTimeout(() => {
        setCurrentWeather({
          location: 'Pune, Maharashtra',
          temperature: 28,
          condition: 'Partly Cloudy',
          humidity: 65,
          windSpeed: 12,
          visibility: 10,
          pressure: 1013,
          uvIndex: 6,
          feelsLike: 32,
          sunrise: '06:15',
          sunset: '18:45'
        });

        setForecast([
          { day: 'Today', date: '2024-01-15', high: 30, low: 22, condition: 'sunny', humidity: 60, rainfall: 0 },
          { day: 'Tomorrow', date: '2024-01-16', high: 28, low: 20, condition: 'cloudy', humidity: 70, rainfall: 2 },
          { day: 'Wednesday', date: '2024-01-17', high: 26, low: 18, condition: 'rainy', humidity: 85, rainfall: 15 },
          { day: 'Thursday', date: '2024-01-18', high: 29, low: 21, condition: 'sunny', humidity: 55, rainfall: 0 },
          { day: 'Friday', date: '2024-01-19', high: 31, low: 23, condition: 'cloudy', humidity: 65, rainfall: 5 },
          { day: 'Saturday', date: '2024-01-20', high: 27, low: 19, condition: 'rainy', humidity: 80, rainfall: 20 },
          { day: 'Sunday', date: '2024-01-21', high: 25, low: 17, condition: 'rainy', humidity: 90, rainfall: 25 }
        ]);

        setAlerts([
          {
            id: 1,
            type: 'warning',
            title: 'Heavy Rainfall Expected',
            message: 'Heavy rainfall expected in the next 48 hours. Protect your crops.',
            validUntil: '2024-01-17'
          },
          {
            id: 2,
            type: 'info',
            title: 'Ideal Planting Conditions',
            message: 'Weather conditions are ideal for planting winter crops.',
            validUntil: '2024-01-20'
          }
        ]);

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching weather data:', error);
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return <Sun size={32} className="text-yellow-500" />;
      case 'cloudy':
        return <Cloud size={32} className="text-gray-500" />;
      case 'rainy':
        return <CloudRain size={32} className="text-blue-500" />;
      default:
        return <Sun size={32} className="text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-modern sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2 text-gray-700 hover:text-primary">
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{t('weather')}</h1>
            <Button variant="outline" size="sm">
              <MapPin size={16} className="mr-2" />
              Change Location
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Weather Alerts */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="space-y-4">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-blue-500 bg-blue-50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle size={20} className={
                        alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                      } />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                        <p className="text-gray-700 mt-1">{alert.message}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Valid until {new Date(alert.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Current Weather */}
        {currentWeather && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <MapPin size={20} />
                      <span className="text-lg">{currentWeather.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar size={16} />
                      <span>{new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold mb-2">{currentWeather.temperature}°C</div>
                    <div className="text-blue-100">Feels like {currentWeather.feelsLike}°C</div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    {getWeatherIcon(currentWeather.condition)}
                    <span className="text-xl">{currentWeather.condition}</span>
                  </div>
                  <div className="text-right text-blue-100">
                    <div>Sunrise: {currentWeather.sunrise}</div>
                    <div>Sunset: {currentWeather.sunset}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Droplets size={20} />
                    <div>
                      <div className="text-lg font-semibold">{currentWeather.humidity}%</div>
                      <div className="text-sm text-blue-100">Humidity</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wind size={20} />
                    <div>
                      <div className="text-lg font-semibold">{currentWeather.windSpeed} km/h</div>
                      <div className="text-sm text-blue-100">Wind Speed</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye size={20} />
                    <div>
                      <div className="text-lg font-semibold">{currentWeather.visibility} km</div>
                      <div className="text-sm text-blue-100">Visibility</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Gauge size={20} />
                    <div>
                      <div className="text-lg font-semibold">{currentWeather.pressure} mb</div>
                      <div className="text-sm text-blue-100">Pressure</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 7-Day Forecast */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2" size={24} />
                7-Day Forecast
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {forecast.map((day, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="text-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="font-medium text-gray-900 mb-2">{day.day}</div>
                    <div className="text-sm text-gray-600 mb-3">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex justify-center mb-3">
                      {getWeatherIcon(day.condition)}
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">{day.high}°</div>
                      <div className="text-sm text-gray-600">{day.low}°</div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-center text-xs text-gray-600">
                        <Droplets size={12} className="mr-1" />
                        {day.humidity}%
                      </div>
                      {day.rainfall > 0 && (
                        <div className="flex items-center justify-center text-xs text-blue-600">
                          <CloudRain size={12} className="mr-1" />
                          {day.rainfall}mm
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Agricultural Advice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2" size={24} />
                Agricultural Advice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Today's Recommendations</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <Sun size={20} className="text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-green-900">Good day for spraying</p>
                        <p className="text-sm text-green-700">Low wind conditions ideal for pesticide application</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Droplets size={20} className="text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Moderate irrigation needed</p>
                        <p className="text-sm text-blue-700">Current humidity levels suggest moderate watering</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Crop Calendar</h3>
                  <div className="space-y-3">
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Wheat Sowing</span>
                        <Badge variant="outline">Optimal Time</Badge>
                      </div>
                      <p className="text-sm text-gray-600">Best time for wheat sowing in your region</p>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Cotton Harvesting</span>
                        <Badge variant="outline">In Progress</Badge>
                      </div>
                      <p className="text-sm text-gray-600">Continue cotton harvesting activities</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Weather;