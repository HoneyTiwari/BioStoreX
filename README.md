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
- SendGrid
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

Cloudinary for item image uploads:

```env
# Option 1: paste the single URL from Cloudinary
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME

# Option 2: set the three separate Render environment variables
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
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

Password reset and notification emails support SMTP. SMTP takes priority when `SMTP_HOST` and `FROM_EMAIL` are set; otherwise the app uses SendGrid when configured.

SMTP example (use the values supplied by your email provider):

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
FROM_EMAIL=your_verified_email@example.com
```

For implicit TLS, use port `465` and set `SMTP_SECURE=true`. For providers that do not require authentication, leave `SMTP_USER` and `SMTP_PASS` unset.

Optional email via SendGrid:

```env
SENDGRID_API_KEY=
FROM_EMAIL=your_verified_email@yourdomain.com
EXPIRY_ALERT_DAYS=30
INVENTORY_ALERT_INTERVAL_HOURS=24
```

## Deployment Environment

Frontend:

```env
VITE_API_BASE_URL=https://biostorex.onrender.com
```

Backend:

```env
NODE_ENV=production
CORS_ORIGIN=https://bio-store-x.vercel.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

On Render, add these in the backend service's Environment tab. The variable
names must match exactly; `CLOUDINARY_NAME` is also accepted as an alias for
`CLOUDINARY_CLOUD_NAME`, and `CLOUDINARY_URL` can be used instead of the three
separate Cloudinary variables.

If the login page says it cannot reach the server after deployment, confirm:
- `VITE_API_BASE_URL` is set on the deployed frontend before building.
- `CORS_ORIGIN` or `FRONTEND_URL` on the backend matches the deployed frontend origin exactly, without a trailing slash.
- The backend health URL responds: `https://biostorex.onrender.com/api/v1/health`.

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
