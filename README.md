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
| `R2_PUBLIC_URL` | Optional | Public Cloudflare R2 base URL used for storefront image delivery |
| `S3_BUCKET` | Recommended | Cloudflare R2 bucket name for vendor onboarding and product image uploads |
| `S3_REGION` | Optional | Cloudflare R2 region. Use `auto` |
| `S3_ENDPOINT_URL` | Optional | Cloudflare R2 endpoint URL |
| `AWS_ACCESS_KEY_ID` | Recommended | Cloudflare R2 access key ID |
| `AWS_SECRET_ACCESS_KEY` | Recommended | Cloudflare R2 secret access key |
| `AWS_SESSION_TOKEN` | Optional | Leave empty unless your R2 setup explicitly requires it |
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
R2_PUBLIC_URL=https://<your-public-r2-url>
S3_BUCKET=ghanajersey
S3_REGION=auto
S3_ENDPOINT_URL=https://1d41c778934a555b292d094d17777c61.r2.cloudflarestorage.com
AWS_ACCESS_KEY_ID=<your-r2-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-r2-secret-access-key>
```

Important:
- `R2_PUBLIC_URL` is the public bucket/base URL used for displaying images in the storefront
- `S3_ENDPOINT_URL` is the Cloudflare R2 API endpoint used for uploads
- Do not include the bucket path in `S3_ENDPOINT_URL`
- Example:
  - `R2_PUBLIC_URL=https://1d41c778934a555b292d094d17777c61.r2.cloudflarestorage.com/ghanajersey`
  - `S3_ENDPOINT_URL=https://1d41c778934a555b292d094d17777c61.r2.cloudflarestorage.com`

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
export R2_PUBLIC_URL="https://1d41c778934a555b292d094d17777c61.r2.cloudflarestorage.com/ghanajersey"
export S3_BUCKET="ghanajersey"
export S3_REGION="auto"
export S3_ENDPOINT_URL="https://1d41c778934a555b292d094d17777c61.r2.cloudflarestorage.com"
export AWS_ACCESS_KEY_ID="<your-r2-access-key-id>"
export AWS_SECRET_ACCESS_KEY="<your-r2-secret-access-key>"
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
- Cloudflare R2 for vendor onboarding and product image uploads
- Resend for transactional emails and internal marketplace notifications

## Current Production Behavior

### Image Storage

- Vendor onboarding verification images upload through the backend and are stored in the configured Cloudflare R2 bucket
- Vendor product images also upload through the backend and are stored in the same Cloudflare R2 bucket
- The vendor dashboard now requires file uploads for product images; manual external image URLs are no longer used for new product submissions
- When `R2_PUBLIC_URL` is set, uploaded image URLs are returned using that public R2 base URL for storefront rendering
- In Coolify, the app uses the existing bucket/env variable names to connect to Cloudflare R2

### Email Notifications

When Resend is configured, the backend sends:

- welcome emails for newly created customer accounts
- order confirmation emails to customers after purchase
- new order notification emails to each vendor involved in the order
- new order purchased notifications to `ADMIN_EMAIL`
- delivery confirmation request emails from vendor dashboard actions to customers
- vendor approval or rejection emails during onboarding review
- delivery-success notifications to `ADMIN_EMAIL` when a vendor marks an order as delivered
- receipt-confirmed notifications to both the vendor and `ADMIN_EMAIL` when the customer confirms receipt from the email link

### Admin Order Visibility

- The admin dashboard orders tab now shows per-product vendor processing progress
- New orders begin with `Order Placed`
- Vendor updates append timeline steps such as `Processing`, `Shipped`, `Delivered`, or `Cancelled`
- Older orders created before this change may show a shorter history than newly created orders

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
- Cloudflare R2 credentials are set if vendor onboarding and product image uploads should work
- if using Cloudflare R2, `S3_REGION`, `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` are all set correctly

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

### Images are not saving to Cloudflare R2

Check:
- `S3_BUCKET` is the exact R2 bucket name
- `S3_REGION=auto`
- `S3_ENDPOINT_URL` matches your Cloudflare account R2 endpoint exactly
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are valid for that bucket
- vendors are uploading images through the product or onboarding forms rather than trying to paste external URLs

### Emails are not being delivered

Check:
- `RESEND_API_KEY` is valid
- `RESEND_FROM_EMAIL` is a verified sender or domain in Resend
- `ADMIN_EMAIL` is set to the inbox that should receive internal notifications
- your deployment can reach the public Resend API

### Refreshing a frontend route gives 404

The backend should now fall back to `index.html` for client-side routes. If this still happens, rebuild the image and confirm the frontend build exists inside the container.
