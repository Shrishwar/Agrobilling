import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    products: 'Products',
    customers: 'Customers',
    orders: 'Orders',
    reports: 'Reports',
    settings: 'Settings',
    logout: 'Logout',
    
    // Common
    search: 'Search',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    loading: 'Loading...',
    
    // Products
    medicines: 'Medicines',
    fertilizers: 'Fertilizers',
    seeds: 'Seeds',
    addProduct: 'Add Product',
    productName: 'Product Name',
    price: 'Price',
    stock: 'Stock',
    category: 'Category',
    
    // Auth
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    phone: 'Phone',
    
    // Weather
    weather: 'Weather',
    temperature: 'Temperature',
    humidity: 'Humidity',
    rainfall: 'Rainfall',
    
    // Disease Detection
    diseaseDetection: 'Plant Disease Detection',
    uploadPhoto: 'Upload Photo',
    detectDisease: 'Detect Disease',
    solutions: 'Solutions',
    organicTreatment: 'Organic Treatment',
    chemicalTreatment: 'Chemical Treatment',
  },
  mr: {
    // Navigation
    dashboard: 'डॅशबोर्ड',
    products: 'उत्पादने',
    customers: 'ग्राहक',
    orders: 'ऑर्डर',
    reports: 'अहवाल',
    settings: 'सेटिंग्ज',
    logout: 'लॉगआउट',
    
    // Common
    search: 'शोधा',
    add: 'जोडा',
    edit: 'संपादित करा',
    delete: 'हटवा',
    save: 'जतन करा',
    cancel: 'रद्द करा',
    submit: 'सबमिट करा',
    loading: 'लोड होत आहे...',
    
    // Products
    medicines: 'कृषी औषधं',
    fertilizers: 'खतं',
    seeds: 'बियाणं',
    addProduct: 'उत्पादन जोडा',
    productName: 'उत्पादनाचे नाव',
    price: 'किंमत',
    stock: 'स्टॉक',
    category: 'श्रेणी',
    
    // Auth
    login: 'लॉगिन',
    signup: 'साइन अप',
    email: 'ईमेल',
    password: 'पासवर्ड',
    name: 'नाव',
    phone: 'फोन',
    
    // Weather
    weather: 'हवामान',
    temperature: 'तापमान',
    humidity: 'आर्द्रता',
    rainfall: 'पाऊस',
    
    // Disease Detection
    diseaseDetection: 'वनस्पती रोग ओळख',
    uploadPhoto: 'फोटो अपलोड करा',
    detectDisease: 'रोग ओळखा',
    solutions: 'उपाय',
    organicTreatment: 'सेंद्रिय उपचार',
    chemicalTreatment: 'रासायनिक उपचार',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && translations[savedLanguage]) {
      setLanguage(savedLanguage);
    }
  }, []);

  const changeLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    changeLanguage,
    t,
    translations: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};