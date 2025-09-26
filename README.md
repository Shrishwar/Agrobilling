# AgroShop - Complete Agricultural Web & Mobile App

A complete, production-ready agricultural e-commerce platform with modern web interface, mobile PWA support, and comprehensive features for farmers, agro shops, and administrators.

## Features

### 🌾 Core Features
- **Multi-role Authentication**: Admin, Staff, and Customer roles with JWT
- **Product Catalog**: Seeds, Fertilizers, Pesticides, Medicines with detailed info
- **Smart POS System**: Quick billing with barcode scanning and invoice generation
- **Disease Detection**: AI-powered plant disease identification with treatment suggestions
- **Weather Integration**: Real-time weather updates and agricultural advice
- **Scheme Management**: Government schemes and discount notifications
- **Multilingual Support**: English and Marathi language support

### 🎨 Modern UI/UX
- **Responsive Design**: Mobile-first approach with tablet and desktop optimization
- **Professional Theme**: Agricultural green color scheme with modern aesthetics
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **PWA Ready**: Installable web app with offline capabilities
- **Accessibility**: WCAG compliant with keyboard navigation and screen reader support

### 📱 Mobile & Offline
- **Progressive Web App**: Install as native app on mobile devices
- **Offline-first**: Service worker caching for offline functionality
- **Push Notifications**: Firebase FCM for real-time updates
- **SMS/WhatsApp**: Twilio integration for customer communication

## Tech Stack

### Frontend
- React 18 + Vite
- TailwindCSS + shadcn/ui components
- Framer Motion for animations
- React Router + Context API for state management
- Axios for API calls
- React Hot Toast for notifications
- React Hook Form + Zod for form validation

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- PDFKit for invoice generation
- Razorpay for payments
- Twilio for SMS/WhatsApp
- Firebase FCM for push notifications
- Multer for file uploads

### Mobile
- PWA with Service Workers
- Web App Manifest for installation
- Offline caching strategies

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agroshop-app
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run seed  # Populate sample data
   npm run dev   # Start backend on port 5000
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev   # Start frontend on port 5173
   ```

4. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000/api
   - API Health: http://localhost:5000/api/health

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/agroshop
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=http://localhost:5173
APP_NAME=AgroShop
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
FCM_SERVER_KEY=your-fcm-server-key
TWILIO_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Usage

### Default Accounts
After running `npm run seed`, use these accounts:

- **Admin**: admin@agroshop.com / admin123
- **Staff**: staff@agroshop.com / staff123
- **Customer**: customer@agroshop.com / customer123

### User Roles & Permissions

#### 👨‍💼 Admin Features
- Complete product management (CRUD operations)
- Customer and staff management
- POS billing system
- Sales reports and analytics
- Scheme and discount management
- Inventory tracking and alerts
- System settings and configuration

#### 👨‍💻 Staff Features
- POS billing and invoice generation
- Product inventory viewing
- Customer management
- Order processing
- Basic reporting

#### 👨‍🌾 Customer Features (Public)
- Browse products without login
- View schemes and weather updates
- Plant disease detection
- Product search and filtering

#### 👤 Customer Features (Logged In)
- Shopping cart and checkout
- Order history and tracking
- Invoice downloads
- Personalized notifications
- Profile management
### API Endpoints

Base URL: `http://localhost:5000/api`

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `POST /auth/change-password` - Change password

#### Products (Admin/Staff)
- `GET /products` - List products
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `GET /products/stats/low-stock` - Get low stock products

#### Invoices (Staff)
- `GET /invoices` - List invoices
- `POST /invoices` - Create invoice
- `GET /invoices/:id` - Get invoice details
- `GET /invoices/:id/download` - Download PDF
- `PUT /invoices/:id/status` - Update invoice status

#### Customers (Admin/Staff)
- `GET /customers` - List customers
- `POST /customers` - Create customer
- `PUT /customers/:id` - Update customer
- `GET /customers/:id/invoices` - Get customer invoices

#### Reports (Admin)
- `GET /reports/sales` - Sales reports
- `GET /reports/inventory` - Inventory reports
- `GET /reports/profit-loss` - Profit & loss reports

## Application Structure

### Frontend Pages
- **Public Pages**: Home, Products, Disease Detection, Weather
- **Auth Pages**: Login, Signup
- **Admin Pages**: Dashboard, Product Management, Customer Management, Reports
- **Staff Pages**: Dashboard, POS Billing
- **Customer Pages**: Dashboard, Order History, Profile

### Key Components
- **Layout System**: Responsive sidebar and topbar navigation
- **UI Components**: Modern shadcn/ui based component library
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React Context for auth and language
- **Animations**: Framer Motion for smooth transitions
## Building for Production

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Deploy dist/ folder to your hosting provider
```

### PWA Installation
```bash
# The app can be installed as PWA from the browser
# Service worker handles offline caching automatically
```

## Project Structure

```
agroshop-app/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── middleware/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── lib/
│   │   └── main.jsx
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js
│   ├── package.json
│   └── vite.config.js
├── postman_collection.json
├── TODO.md
└── README.md
```

## Features in Detail

### 🌱 Disease Detection
- Upload plant images for AI analysis
- Get disease identification with confidence scores
- Receive organic and chemical treatment recommendations
- Product suggestions for treatment
- Downloadable diagnosis reports

### 🌤️ Weather Integration
- Real-time weather data for agricultural regions
- 7-day weather forecast
- Agricultural advice based on weather conditions
- Crop calendar and planting recommendations
- Weather alerts and notifications

### 🛒 E-commerce Features
- Product catalog with categories and filters
- Shopping cart and checkout process
- Multiple payment methods (Cash, Card, UPI)
- Order tracking and history
- Invoice generation and download

### 📊 Analytics & Reporting
- Sales analytics with charts and graphs
- Inventory management and stock alerts
- Customer analytics and insights
- Profit & loss reporting
- Export capabilities (Excel, PDF)

### 🔔 Notification System
- Push notifications for important updates
- SMS and WhatsApp integration
- Email notifications for orders and updates
- Real-time alerts for low stock and weather

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## Testing

### API Testing
Import `postman_collection.json` into Postman for comprehensive API testing.

### Frontend Testing
```bash
cd frontend
npm run test
```

### End-to-End Testing
```bash
# Start both backend and frontend
npm run dev # in both directories
# Test all user flows manually or with automation tools
```

## Deployment

### Backend Deployment
- Deploy to services like Heroku, Railway, or DigitalOcean
- Set up MongoDB Atlas for production database
- Configure environment variables for production

### Frontend Deployment
- Deploy to Vercel, Netlify, or similar static hosting
- Configure build settings and environment variables
- Set up custom domain and SSL

### Mobile App
- PWA can be installed directly from browser
- For native apps, use Capacitor or React Native wrapper
- Submit to app stores if needed

## Security Features

- JWT-based authentication with secure token handling
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting for API endpoints
- CORS configuration for cross-origin requests
- Helmet.js for security headers
- File upload restrictions and validation

## Performance Optimizations

- Code splitting and lazy loading
- Image optimization and lazy loading
- API response caching
- Database indexing for faster queries
- Compression middleware
- Service worker caching strategies

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@agroshop.com or create an issue in the repository.

## Roadmap

- [ ] Advanced AI disease detection with more plant types
- [ ] Integration with IoT sensors for real-time farm monitoring
- [ ] Marketplace for farmers to sell their produce
- [ ] Advanced analytics with machine learning insights
- [ ] Multi-tenant support for multiple agro shops
- [ ] Integration with government databases for schemes
- [ ] Blockchain integration for supply chain transparency
- [ ] Voice commands and regional language support