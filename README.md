markdown
# EventEase Planner API 🎉

A comprehensive RESTful API for event planning and RSVP management built with Node.js, Express, and MongoDB.

## 📋 Project Overview

EventEase Planner is a backend API that provides complete event management functionality, including user registration, event creation, and RSVP tracking. This project was developed for CSE 341 - Web Services.

**Live Demo**: [https://eventease-planner.onrender.com](https://eventease-planner.onrender.com)  
**API Documentation**: [https://eventease-planner.onrender.com/api-docs](https://eventease-planner.onrender.com/api-docs)  
**GitHub Repository**: [https://github.com/Impulsible/eventease-planner.git](https://github.com/Impulsible/eventease-planner.git)

## 🚀 Features

### ✅ Completed (Week 05)
- **User Management** - Complete CRUD operations with JWT authentication
- **Event Management** - Full event lifecycle with validation
- **API Documentation** - Comprehensive Swagger/OpenAPI documentation
- **Error Handling** - Robust error handling with proper HTTP status codes
- **Security** - Password hashing, JWT tokens, input validation
- **Deployment** - Successfully deployed to Render

### 🔄 Planned (Week 06-07)
- Invitations system
- RSVP management
- Email notifications
- Advanced search and filtering

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT (JSON Web Tokens)
- **Documentation**: Swagger/OpenAPI 3.0
- **Deployment**: Render
- **Security**: bcryptjs, CORS, environment variables

## 📁 Project Structure
eventease-planner/
├── controllers/ # Route handlers
│ ├── usersController.js
│ └── eventsController.js
├── models/ # MongoDB schemas
│ ├── User.js
│ └── Event.js
├── routes/ # API routes
│ ├── users.js
│ └── events.js
├── middleware/ # Custom middleware
│ └── auth.js
├── docs/ # Swagger configuration
│ └── swagger.js
├── config/ # Database configuration
├── .env # Environment variables (local)
├── server.js # Application entry point
└── package.json

text

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB Atlas account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Impulsible/eventease-planner.git
   cd eventease-planner
Install dependencies

bash
npm install
Environment Setup
Create a .env file in the root directory:

env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
Start the development server

bash
npm run dev
The API will be available at http://localhost:3000

📚 API Documentation
Base URL
text
https://eventease-planner.onrender.com  # Production
http://localhost:3000                   # Development
Interactive Documentation
Visit /api-docs for full interactive API documentation with Swagger UI.

🔐 Authentication
The API uses JWT (JSON Web Tokens) for authentication. Protected routes require a Bearer token in the Authorization header.

http
Authorization: Bearer <your_jwt_token>
📋 API Endpoints
Users Collection
Method	Endpoint	Description	Auth Required
POST	/api/users	Register new user	No
POST	/api/users/login	User login	No
GET	/api/users	Get all users	Yes
GET	/api/users/:id	Get user by ID	Yes
PUT	/api/users/:id	Update user	Yes
DELETE	/api/users/:id	Delete user	Yes
Events Collection
Method	Endpoint	Description	Auth Required
POST	/api/events	Create new event	Yes
GET	/api/events	Get all events	No
GET	/api/events/:id	Get event by ID	No
PUT	/api/events/:id	Update event	Yes
DELETE	/api/events/:id	Delete event	Yes
💾 Database Models
User Model
javascript
{
  name: String,        // User's full name
  email: String,       // Unique email address
  password: String,    // Hashed password
  role: String,        // 'organizer' or 'guest'
  createdAt: Date,     // Auto-generated
  updatedAt: Date      // Auto-generated
}
Event Model
javascript
{
  title: String,       // Event title
  description: String, // Event description
  date: Date,          // Event date (must be future)
  time: String,        // Event time (HH:MM)
  location: String,    // Event location
  organizerId: ObjectId, // Reference to User
  status: String,      // 'active', 'cancelled', 'completed'
  createdAt: Date,     // Auto-generated
  updatedAt: Date      // Auto-generated
}
🧪 Testing the API
1. User Registration
bash
curl -X POST https://eventease-planner.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "organizer"
  }'
2. User Login
bash
curl -X POST https://eventease-planner.onrender.com/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
3. Create Event (Authenticated)
bash
curl -X POST https://eventease-planner.onrender.com/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>" \
  -d '{
    "title": "Summer BBQ",
    "description": "Annual summer party",
    "date": "2025-07-15",
    "time": "18:00",
    "location": "Central Park"
  }'
🎯 Quick Start Demo
Visit the API Documentation: https://eventease-planner.onrender.com/api-docs

Register a new user using POST /api/users

Login with your credentials using POST /api/users/login

Authorize Swagger with your JWT token

Create an event using POST /api/events

Explore all endpoints with full CRUD operations

🔒 Security Features
Password Hashing: bcryptjs with salt rounds

JWT Tokens: Secure authentication with 30-day expiration

Input Validation: Mongoose schema validation

CORS: Cross-Origin Resource Sharing enabled

Environment Variables: Sensitive data protection

Error Handling: No sensitive data exposure in errors

🚧 Error Handling
The API returns appropriate HTTP status codes:

200 - Success

201 - Created successfully

400 - Bad request (validation errors)

401 - Unauthorized (authentication required)

403 - Forbidden (authorization failed)

404 - Resource not found

500 - Internal server error

👥 Development Team
EventEase Development Team - CSE 341

Henry Osuagwu - Project Lead & Authentication

Daniel Okoye - Deployment & Git Management

Amina Collins - Project Structure & Events CRUD

Michael Adeyemi - Database Design & User CRUD

📄 License
This project is licensed under the ISC License.

🤝 Contributing
Fork the project

Create a feature branch (git checkout -b feature/AmazingFeature)

Commit changes (git commit -m 'Add some AmazingFeature')

Push to branch (git push origin feature/AmazingFeature)

Open a Pull Request

📞 Support
For support or questions, please contact the development team or create an issue in the repository.

Built with ❤️ for CSE 341 - Web Services

Live Demo: https://eventease-planner.onrender.com
API Docs: https://eventease-planner.onrender.com/api-docs
GitHub: https://github.com/Impulsible/eventease-planner.git