# BioStoreX

BioStoreX is a MERN biotechnology department store management platform for managing lab inventory, student requests, stock movement, expiry risk, reporting, and AI-assisted inventory decisions.

## Features

- Student registration, login, and request tracking
- Storekeeper inventory management with batch-wise stock
- Admin user management and student approval
- Request lifecycle: pending, approved, declined, issued, returned
- Low-stock and expiry-risk tracking
- AI Dashboard with inventory insights, stock prediction, expiry analysis, and chatbot
- Reports for inventory, low stock, expiry, issued/returned items, and monthly usage
- Activity logs for stock movement, item issue/return, and admin audit actions
- Responsive SaaS-style frontend with modern cards, tables, filters, pagination, and toasts

## Tech Stack

Frontend:
- React
- Vite
- Tailwind CSS
- Framer Motion
- Axios
- React Router
- Lucide Icons

Backend:
- Node.js
- Express
- MongoDB
- Mongoose
- JWT authentication
- Nodemailer
- Cloudinary
- Groq/OpenAI-compatible AI APIs

## Setup

Install backend dependencies:

```bash
cd backend
npm install
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Create backend environment file:

```bash
cd backend
copy .env.example .env
```

Start MongoDB locally, then start backend:

```bash
cd backend
npm run dev
```

Start frontend:

```bash
cd frontend
npm run dev
```

Open:

```txt
http://localhost:5173
```

## Backend Environment Variables

Required:

```env
PORT=8000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
MONGODB_URI=mongodb://127.0.0.1:27017
ACCESS_TOKEN_SECRET=change-this-access-secret
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=change-this-refresh-secret
REFRESH_TOKEN_EXPIRY=10d
```

Optional default admin:

```env
DEFAULT_ADMIN_EMAIL=
DEFAULT_ADMIN_PASSWORD=
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_FULLNAME=System Administrator
```

Optional AI:

```env
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

Optional email:

```env
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM=BioStoreX <no-reply@biostorex.app>
```

## Main API Areas

- `/api/v1/user` - authentication, profile, password reset
- `/api/v1/item` - inventory and stock operations
- `/api/v1/request` - student requests and issue/return workflow
- `/api/v1/admin` - users, storekeepers, student approval
- `/api/v1/ai` and `/api/ai` - AI chat, insights, prediction, expiry risk
- `/api/v1/reports` - reports overview
- `/api/v1/activity` - stock, issue, return, and audit logs

## Roles

Student:
- Browse inventory
- Request items
- Track request status
- Use AI assistant

Storekeeper:
- Add/remove stock
- Approve, decline, issue, and return requests
- Review pending students
- View reports, activity logs, and AI dashboard

Admin:
- Manage users
- Add storekeepers
- Deactivate/reactivate accounts
- View reports, activity logs, and AI dashboard

## Testing

Backend:

```bash
cd backend
npm test
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Demo Notes

For a strong demo:
- Add a few items with expiry dates within 30, 60, and 90 days.
- Create low-stock items by setting `minThreshold` above current stock.
- Submit a few student requests and process some as issued/returned.
- Open AI Dashboard, Reports, and Activity Logs to show end-to-end intelligence.

