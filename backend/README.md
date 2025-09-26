# Agro Billing & AgroShop System - Backend

This is the backend server for the Agro Billing & AgroShop System, built with Node.js, Express, and MongoDB.

## Features

- User authentication with JWT
- Role-based access control (Admin, Staff, Customer)
- Product management
- Customer management
- Invoice generation with GST support
- Expense tracking
- Reporting and analytics
- File uploads
- Email notifications
- API documentation with Swagger

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5.0 or higher) or MongoDB Atlas
- npm (v8 or higher) or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/agro-billing-system.git
   cd agro-billing-system/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory and configure the environment variables (use `.env.example` as a reference):
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The server will start on `http://localhost:5000` by default.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/agro-billing

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7

# File Upload
MAX_FILE_UPLOAD=10000000
FILE_UPLOAD_PATH=./uploads

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@gmail.com
SMTP_PASSWORD=your-email-password
FROM_EMAIL=noreply@agrobilling.com
FROM_NAME=Agro Billing System

# Twilio Configuration (for SMS)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## API Documentation

API documentation is available at `/api-docs` when the server is running in development mode.

## Project Structure

```
backend/
├── config/               # Configuration files
├── controllers/          # Route controllers
├── middleware/           # Custom middleware
├── models/               # Database models
├── routes/               # API routes
├── services/             # Business logic
├── utils/                # Utility functions
├── uploads/              # File uploads (created at runtime)
├── .env                  # Environment variables
├── .gitignore            # Git ignore file
├── package.json          # Project dependencies
└── server.js             # Application entry point
```

## Scripts

- `npm run dev` - Start the development server with nodemon
- `npm start` - Start the production server
- `npm test` - Run tests
- `npm run lint` - Lint the code
- `npm run format` - Format the code

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
