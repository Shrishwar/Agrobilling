# Agro Billing System

A complete, production-ready billing and POS system for agro shops with modern web interface and mobile APK support.

## Features

- **Authentication & Roles**: JWT-based auth with Admin, Staff, and Customer roles
- **Admin Dashboard**: Product management, staff management, reports, settings
- **Staff POS**: Quick billing with product search, GST calculation, invoice generation
- **Customer Portal**: Invoice history, outstanding balance tracking
- **Invoice Generation**: PDF invoices with Puppeteer, WhatsApp sharing
- **Payments**: Razorpay integration for UPI/Cards
- **Notifications**: Firebase FCM push notifications, Twilio SMS/WhatsApp
- **Mobile Support**: Capacitor wrapper for Android APK

## Tech Stack

### Frontend
- React 18 + Vite
- TailwindCSS + ShadCN UI
- React Router + Context API
- Axios for API calls
- React Hot Toast for notifications

### Backend
- Node.js + Express.js
- MongoDB + Mongoose
- JWT Authentication
- Puppeteer for PDF generation
- Razorpay for payments
- Twilio for SMS/WhatsApp
- Firebase FCM for push notifications

### Mobile
- Capacitor for web-to-mobile wrapping

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agro-billing-system
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

4. **Mobile APK (Optional)**
   ```bash
   cd frontend
   npx cap add android
   npx cap copy
   npx cap open android  # Open in Android Studio
   ```

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/agro-billing
JWT_SECRET=your-super-secret-jwt-key-here
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

- **Admin**: admin@agrobilling.com / admin123
- **Staff**: staff@agrobilling.com / staff123
- **Customer**: customer@agrobilling.com / customer123

### API Endpoints

Base URL: `http://localhost:5000/api`

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/signup` - User registration

#### Products (Admin/Staff)
- `GET /products` - List products
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

#### Invoices (Staff)
- `GET /invoices` - List invoices
- `POST /invoices` - Create invoice
- `GET /invoices/:id` - Get invoice details
- `GET /invoices/:id/pdf` - Download PDF

#### Customers (Admin/Staff)
- `GET /customers` - List customers
- `POST /customers` - Create customer

#### Reports (Admin)
- `GET /reports/sales` - Sales reports
- `GET /reports/gst` - GST reports

## Postman Collection

Import `postman_collection.json` for API testing.

## Building for Production

### Backend
```bash
cd backend
npm run build  # If using build script
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve dist/ folder with nginx or similar
```

### Mobile APK
```bash
cd frontend
npm run build
npx cap copy android
npx cap build android --prod
```

## Project Structure

```
agro-billing-system/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── middleware/
│   ├── config/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── lib/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── mobile-app/  # Future native app
└── README.md
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details.

## Support

For support, email support@agrobilling.com or create an issue in the repository.
