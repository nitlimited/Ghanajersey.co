# Ghanajersey.co

A full-stack eCommerce marketplace for curated Ghanaian jerseys, built for customers, vendors, and admins.

This version is set up for a single Coolify deployment:
- the React frontend is built inside the container
- the FastAPI backend serves the built frontend
- one public domain serves both the website and the API

## Project Structure

```text
Ghanajersey.co-main/
├── backend/                # FastAPI API
│   ├── server.py
│   └── requirements.txt
├── frontend/               # React app (CRACO)
│   ├── package.json
│   └── src/
├── Dockerfile              # Single-app production build
└── README.md
```

## Single-App Coolify Deployment

Deploy this project in Coolify as one Dockerfile-based application.

### How It Works

- Coolify builds the React app from `frontend/`
- the build output is copied into the final Python image
- FastAPI serves API routes under `/api`
- FastAPI also serves the frontend for `/` and all client-side routes

That means you only need one domain, for example:

```text
https://ghanajersey.co
```

The backend will then be available on the same domain under:

```text
https://ghanajersey.co/api
```

## Coolify Setup

Create a new Coolify application using the repo root.

Suggested settings:
- Resource type: `Dockerfile`
- Dockerfile path: `Dockerfile`
- Port: `8000`
- Health check path: `/api/health/ready`

### Required Environment Variables

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | Database name |
| `JWT_SECRET_KEY` | Yes | Secret used to sign auth tokens |
| `CORS_ORIGINS` | Yes | Public app URL, for example `https://ghanajersey.co` |
| `FRONTEND_URL` | Recommended | Usually the same public app URL |
| `STRIPE_API_KEY` | Optional | Needed for Stripe checkout |
| `STRIPE_WEBHOOK_SECRET` | Recommended | Needed to verify Stripe webhook signatures |
| `PAYSTACK_SECRET_KEY` | Optional | Needed for Paystack payments |
| `PAYSTACK_PUBLIC_KEY` | Optional | Needed for Paystack frontend flow |
| `RESEND_API_KEY` | Optional | Needed when Resend is used for transactional emails |
| `RESEND_FROM_EMAIL` | Optional | Verified sender identity used for Resend emails |
| `ADMIN_EMAIL` | Optional | Receives internal marketplace notifications such as new orders and delivery confirmations |
| `S3_BUCKET` | Recommended | Bucket name for vendor onboarding uploads |
| `S3_REGION` | Optional | S3 or compatible storage region |
| `S3_ENDPOINT_URL` | Optional | Custom endpoint for MinIO, R2, Spaces, or other S3-compatible storage |
| `AWS_ACCESS_KEY_ID` | Recommended | Access key for object storage |
| `AWS_SECRET_ACCESS_KEY` | Recommended | Secret key for object storage |
| `AWS_SESSION_TOKEN` | Optional | Session token if your storage provider requires one |
| `JWT_ALGORITHM` | Optional | Defaults to `HS256` |
| `JWT_EXPIRATION_HOURS` | Optional | Defaults to `168` |

### Optional Build Argument

The Dockerfile supports:

| Build Arg | Default | Notes |
| --- | --- | --- |
| `REACT_APP_BACKEND_URL` | `/api` | Leave this as `/api` for same-domain deployment |

In a single-app deployment, the frontend should call the backend through the same domain, so `/api` is the correct default.

## Recommended Production Values

If your live domain is `https://ghanajersey.co`, use:

```env
CORS_ORIGINS=https://ghanajersey.co
FRONTEND_URL=https://ghanajersey.co
JWT_SECRET_KEY=replace-with-a-long-random-secret
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Black Star Threads <no-reply@ghanajersey.co>
ADMIN_EMAIL=admin@ghanajersey.co
S3_BUCKET=ghanajersey-uploads
```

Leave the frontend build arg as:

```text
REACT_APP_BACKEND_URL=/api
```

## Local Development

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export MONGO_URL="your-mongodb-url"
export DB_NAME="ghanajersey"
export RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx"
export RESEND_FROM_EMAIL="Black Star Threads <no-reply@ghanajersey.co>"
export ADMIN_EMAIL="admin@ghanajersey.co"
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:8000/api yarn start
```

## Production Docker Behavior

The root `Dockerfile` now:
1. installs frontend dependencies
2. builds the React app
3. installs backend dependencies
4. copies the frontend build into the final image
5. starts FastAPI with `uvicorn`

This project now uses:
- the official `stripe` Python SDK for Stripe Checkout and webhooks
- S3-compatible object storage through `boto3` for vendor image uploads

FastAPI serves:
- `/api/*` for backend endpoints
- `/static/*` for built frontend assets
- `/` and all frontend routes from `frontend/build/index.html`

## Deployment Checklist

Before going live, verify:
- the app responds at `/api/health/ready`
- `CORS_ORIGINS` exactly matches your public domain
- MongoDB is reachable from the container
- `JWT_SECRET_KEY` is set to a strong value
- payment keys are set if Stripe or Paystack should work in production
- `RESEND_API_KEY` is set if transactional emails should work in production
- `RESEND_FROM_EMAIL` is set to a verified Resend sender identity
- `ADMIN_EMAIL` is set to the address that should receive internal marketplace alerts
- object storage credentials are set if vendor onboarding uploads should work

Health endpoints:
- `/api/health/live` for liveness
- `/api/health/ready` for readiness
- `/api/health/deep` for readiness plus optional Stripe and storage checks

## Troubleshooting

### The homepage loads but API calls fail

Check:
- `CORS_ORIGINS` matches the live domain exactly
- the app is running on the port Coolify expects
- the frontend build arg was not changed away from `/api`

### Coolify marks the app unhealthy

Check:
- the container is exposing port `8000`
- the health check path is `/api/health/ready`
- the start command from the Dockerfile is running successfully

### Refreshing a frontend route gives 404

The backend should now fall back to `index.html` for client-side routes. If this still happens, rebuild the image and confirm the frontend build exists inside the container.
