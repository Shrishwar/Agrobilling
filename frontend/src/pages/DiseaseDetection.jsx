import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Upload, Leaf, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, ArrowLeft, Lightbulb, ShoppingCart, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useLanguage } from '../context/LanguageContext';
import toast from 'react-hot-toast';

const DiseaseDetection = () => {
  const { t } = useLanguage();
  const [selectedImage, setSelectedImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
    }

    setAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      const mockResults = [
        {
          disease: 'Leaf Blight',
          confidence: 92,
          severity: 'moderate',
          description: 'A fungal disease that affects the leaves, causing brown spots and yellowing.',
          organicTreatment: [
            'Apply neem oil spray twice a week',
            'Remove affected leaves and destroy them',
            'Improve air circulation around plants',
            'Use copper-based fungicide'
          ],
          chemicalTreatment: [
            'Apply Mancozeb 75% WP @ 2g/liter',
            'Use Propiconazole 25% EC @ 1ml/liter',
            'Spray Carbendazim 50% WP @ 1g/liter'
          ],
          recommendedProducts: [
            { id: 1, name: 'Neem Oil Spray', price: 250, category: 'Organic' },
            { id: 2, name: 'Mancozeb Fungicide', price: 180, category: 'Chemical' },
            { id: 3, name: 'Copper Sulfate', price: 120, category: 'Organic' }
          ]
        },
        {
          disease: 'Healthy Plant',
          confidence: 88,
          severity: 'none',
          description: 'Your plant appears to be healthy with no visible signs of disease.',
          organicTreatment: [
            'Continue regular watering schedule',
            'Apply organic compost monthly',
            'Monitor for any changes in leaf color'
          ],
          chemicalTreatment: [],
          recommendedProducts: [
            { id: 4, name: 'Organic Compost', price: 150, category: 'Fertilizer' },
            { id: 5, name: 'Plant Growth Booster', price: 200, category: 'Organic' }
          ]
        }
      ];

      const randomResult = mockResults[Math.floor(Math.random() * mockResults.length)];
      setResult(randomResult);
      setAnalyzing(false);
      toast.success('Analysis complete!');
    }, 3000);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-modern sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2 text-gray-700 hover:text-primary">
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </Link>
            <div className="flex items-center space-x-2">
              <Leaf className="w-6 h-6 text-primary" />
              <span className="text-xl font-bold text-primary">Plant Disease Detection</span>
            </div>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Camera className="mr-2" size={24} />
                  {t('uploadPhoto')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Image Upload Area */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {selectedImage ? (
                    <div className="space-y-4">
                      <img
                        src={selectedImage}
                        alt="Selected plant"
                        className="max-w-full h-64 object-cover rounded-lg mx-auto"
                      />
                      <p className="text-sm text-gray-600">Click to change image</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload size={48} className="text-gray-400 mx-auto" />
                      <div>
                        <p className="text-lg font-medium text-gray-900">Upload plant image</p>
                        <p className="text-sm text-gray-600">
                          Click to select or drag and drop an image
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Button
                    onClick={analyzeImage}
                    disabled={!selectedImage || analyzing}
                    loading={analyzing}
                    className="flex-1"
                  >
                    {analyzing ? 'Analyzing...' : t('detectDisease')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedImage(null);
                      setResult(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    Clear
                  </Button>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Lightbulb size={16} className="mr-2" />
                    Tips for better results
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Take clear, well-lit photos</li>
                    <li>• Focus on affected areas</li>
                    <li>• Avoid blurry or dark images</li>
                    <li>• Include multiple leaves if possible</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results Section */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {result ? (
              <div className="space-y-6">
                {/* Disease Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center">
                        {result.severity === 'none' ? (
                          <CheckCircle className="mr-2 text-green-600" size={24} />
                        ) : (
                          <AlertTriangle className="mr-2 text-yellow-600" size={24} />
                        )}
                        {result.disease}
                      </span>
                      <Badge className={getSeverityColor(result.severity)}>
                        {result.confidence}% confident
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{result.description}</p>
                    {result.severity !== 'none' && (
                      <Badge variant="outline" className={getSeverityColor(result.severity)}>
                        Severity: {result.severity}
                      </Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Treatment Options */}
                {result.organicTreatment.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-green-700">
                        {t('organicTreatment')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.organicTreatment.map((treatment, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{treatment}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {result.chemicalTreatment.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-blue-700">
                        {t('chemicalTreatment')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {result.chemicalTreatment.map((treatment, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <CheckCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{treatment}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Products */}
                {result.recommendedProducts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recommended Products</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.recommendedProducts.map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div>
                              <h4 className="font-medium text-gray-900">{product.name}</h4>
                              <p className="text-sm text-gray-600">{product.category}</p>
                              <p className="text-lg font-semibold text-primary">₹{product.price}</p>
                            </div>
                            <Button size="sm">
                              <ShoppingCart size={16} className="mr-1" />
                              Buy Now
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Download Report */}
                <Button variant="outline" className="w-full">
                  <Download size={16} className="mr-2" />
                  Download Report
                </Button>
              </div>
            ) : (
              <Card className="h-fit">
                <CardContent className="p-12 text-center">
                  <Leaf size={64} className="text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Upload an image to get started
                  </h3>
                  <p className="text-gray-600">
                    Our AI will analyze your plant and provide disease detection results
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>

        {/* How it Works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-center">How Disease Detection Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  {
                    step: 1,
                    icon: Camera,
                    title: 'Upload Photo',
                    description: 'Take a clear photo of the affected plant or leaf'
                  },
                  {
                    step: 2,
                    icon: Leaf,
                    title: 'AI Analysis',
                    description: 'Our AI analyzes the image to identify diseases'
                  },
                  {
                    step: 3,
                    icon: Lightbulb,
                    title: 'Get Solutions',
                    description: 'Receive treatment recommendations and product suggestions'
                  }
                ].map((item, index) => (
                  <div key={index} className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <item.icon size={32} className="text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {item.step}. {item.title}
                    </h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
};

export default DiseaseDetection;