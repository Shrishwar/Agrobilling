import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  Leaf, 
  Sun, 
  Droplets, 
  Thermometer, 
  Search, 
  ShoppingCart, 
  Camera,
  ArrowRight,
  Star,
  MapPin,
  Calendar,
  TrendingUp,
  Shield,
  Truck,
  Phone,
  Mail,
  Globe
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Home = () => {
  const { t, language, changeLanguage } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomeData();
  }, []);

  const fetchHomeData = async () => {
    try {
      setLoading(true);
      
      // Fetch products
      const productsRes = await axios.get('/products?limit=12');
      setProducts(productsRes.data.data || []);

      // Mock weather data
      setWeather({
        location: 'Maharashtra, India',
        temperature: 28,
        humidity: 65,
        rainfall: 12,
        condition: 'Partly Cloudy',
        forecast: [
          { day: 'Today', temp: 28, condition: 'sunny' },
          { day: 'Tomorrow', temp: 30, condition: 'cloudy' },
          { day: 'Wed', temp: 26, condition: 'rainy' },
        ]
      });

      // Mock schemes data
      setSchemes([
        {
          id: 1,
          title: 'Kisan Credit Card Scheme',
          description: 'Get easy credit for agricultural needs',
          discount: '10% off',
          validTill: '2024-12-31',
          image: 'https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&w=400'
        },
        {
          id: 2,
          title: 'Organic Fertilizer Discount',
          description: 'Special discount on organic fertilizers',
          discount: '25% off',
          validTill: '2024-11-30',
          image: 'https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&w=400'
        }
      ]);

    } catch (error) {
      console.error('Error fetching home data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Products', icon: Leaf },
    { id: 'medicines', name: t('medicines'), icon: Shield },
    { id: 'fertilizers', name: t('fertilizers'), icon: TrendingUp },
    { id: 'seeds', name: t('seeds'), icon: Leaf },
  ];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
      product.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-modern sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">AgroShop</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-primary transition-colors">Home</Link>
              <Link to="/products" className="text-gray-700 hover:text-primary transition-colors">Products</Link>
              <Link to="/disease-detection" className="text-gray-700 hover:text-primary transition-colors">Disease Detection</Link>
              <Link to="/weather" className="text-gray-700 hover:text-primary transition-colors">Weather</Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Language Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => changeLanguage(language === 'en' ? 'mr' : 'en')}
                className="hidden sm:flex"
              >
                <Globe size={16} className="mr-1" />
                {language === 'en' ? 'मर' : 'EN'}
              </Button>

              <Button variant="ghost" size="icon">
                <ShoppingCart size={20} />
              </Button>
              
              <Link to="/login">
                <Button>Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Your Digital
                <span className="text-primary block">Agriculture Partner</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Get the best quality seeds, fertilizers, and medicines for your crops. 
                Expert advice and modern solutions for traditional farming.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="text-lg px-8">
                  <ShoppingCart className="mr-2" size={20} />
                  Shop Now
                </Button>
                <Button variant="outline" size="lg" className="text-lg px-8">
                  <Camera className="mr-2" size={20} />
                  Detect Disease
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <img
                src="https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Agriculture"
                className="rounded-2xl shadow-modern-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Weather Widget */}
      {weather && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <Sun className="mr-2" size={24} />
                    {t('weather')} - {weather.location}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="flex items-center space-x-3">
                      <Thermometer size={24} />
                      <div>
                        <p className="text-2xl font-bold">{weather.temperature}°C</p>
                        <p className="text-blue-100">{t('temperature')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Droplets size={24} />
                      <div>
                        <p className="text-2xl font-bold">{weather.humidity}%</p>
                        <p className="text-blue-100">{t('humidity')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Droplets size={24} />
                      <div>
                        <p className="text-2xl font-bold">{weather.rainfall}mm</p>
                        <p className="text-blue-100">{t('rainfall')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Sun size={24} />
                      <div>
                        <p className="text-lg font-semibold">{weather.condition}</p>
                        <p className="text-blue-100">Condition</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>
      )}

      {/* Schemes & Offers */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Latest Schemes & Offers</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Take advantage of government schemes and special discounts on agricultural products
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {schemes.map((scheme, index) => (
              <motion.div
                key={scheme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="overflow-hidden hover:shadow-modern-lg transition-all duration-300 group">
                  <div className="relative">
                    <img
                      src={scheme.image}
                      alt={scheme.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-4 right-4 bg-secondary text-white">
                      {scheme.discount}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{scheme.title}</h3>
                    <p className="text-gray-600 mb-4">{scheme.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={16} className="mr-1" />
                        Valid till {new Date(scheme.validTill).toLocaleDateString()}
                      </div>
                      <Button size="sm">
                        Learn More
                        <ArrowRight size={16} className="ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Find everything you need for your agricultural requirements
            </p>
          </motion.div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex items-center space-x-2 whitespace-nowrap"
                  >
                    <Icon size={16} />
                    <span>{category.name}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="group hover:shadow-modern-lg transition-all duration-300 overflow-hidden">
                  <div className="relative">
                    <img
                      src={product.image || 'https://images.pexels.com/photos/1595104/pexels-photo-1595104.jpeg?auto=compress&cs=tinysrgb&w=400'}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge className="absolute top-2 right-2 bg-primary">
                      {product.category}
                    </Badge>
                    {product.stock <= 10 && (
                      <Badge variant="destructive" className="absolute top-2 left-2">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-2xl font-bold text-primary">₹{product.price}</span>
                        {product.mrp && product.mrp > product.price && (
                          <span className="text-sm text-gray-500 line-through ml-2">₹{product.mrp}</span>
                        )}
                      </div>
                      <div className="flex items-center text-yellow-500">
                        <Star size={16} fill="currentColor" />
                        <span className="text-sm ml-1">4.5</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Stock: {product.stock}</span>
                      <Button size="sm" className="group-hover:bg-primary-600">
                        Add to Cart
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Search size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Disease Detection CTA */}
      <section className="py-16 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Camera size={64} className="text-white mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t('diseaseDetection')}
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Upload a photo of your plant and get instant disease diagnosis with treatment recommendations
            </p>
            <Link to="/disease-detection">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                <Camera className="mr-2" size={20} />
                {t('uploadPhoto')}
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose AgroShop?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We provide comprehensive solutions for all your agricultural needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: 'Quality Assured',
                description: 'All products are tested and certified for quality'
              },
              {
                icon: Truck,
                title: 'Fast Delivery',
                description: 'Quick delivery to your doorstep across Maharashtra'
              },
              {
                icon: Phone,
                title: 'Expert Support',
                description: '24/7 agricultural expert consultation available'
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="text-center p-6 hover:shadow-modern-lg transition-all duration-300">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon size={32} className="text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">AgroShop</span>
              </div>
              <p className="text-gray-400">
                Your trusted partner for all agricultural needs. Quality products, expert advice, and modern solutions.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Products</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/products?category=medicines" className="hover:text-white transition-colors">Medicines</Link></li>
                <li><Link to="/products?category=fertilizers" className="hover:text-white transition-colors">Fertilizers</Link></li>
                <li><Link to="/products?category=seeds" className="hover:text-white transition-colors">Seeds</Link></li>
                <li><Link to="/products?category=tools" className="hover:text-white transition-colors">Tools</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/disease-detection" className="hover:text-white transition-colors">Disease Detection</Link></li>
                <li><Link to="/weather" className="hover:text-white transition-colors">Weather Updates</Link></li>
                <li><Link to="/expert-advice" className="hover:text-white transition-colors">Expert Advice</Link></li>
                <li><Link to="/schemes" className="hover:text-white transition-colors">Government Schemes</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center space-x-2">
                  <Phone size={16} />
                  <span>+91 98765 43210</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail size={16} />
                  <span>support@agroshop.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin size={16} />
                  <span>Maharashtra, India</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AgroShop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;