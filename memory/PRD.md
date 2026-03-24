# Black Star Threads - Product Requirements Document

## Original Problem Statement
Build a modern, scalable international eCommerce web application focused on selling curated Ghanaian jerseys to a global audience. The platform should act as a marketplace where Ghanaian jersey producers/vendors can list their products, while an admin manually reviews and approves listings before they go live.

## Architecture Overview
- **Frontend**: React 19 with Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI (Python) with MongoDB
- **Authentication**: JWT + Emergent Google OAuth
- **Payments**: Stripe (integrated), PayPal (mocked), Paystack (requires API key)
- **Hosting**: Emergent Platform

## User Personas

### Admin (Super Admin)
- Email: easante@nitlimited.com
- Password: admin123
- Capabilities: Full marketplace control, approve/reject products, manage vendors, manage orders, view analytics

### Vendor (Jersey Producers)
- Can register via /auth page selecting "Vendor" role
- Capabilities: Upload products, manage inventory, view orders, update profile

### Customer (Buyers)
- Can register via /auth page or Google OAuth
- Capabilities: Browse, cart, wishlist, checkout, track orders

## Core Requirements (Static)

### Must Have
- [x] Multi-role authentication (Admin, Vendor, Customer)
- [x] Product listing with approval workflow
- [x] Shopping cart and wishlist
- [x] Multi-currency checkout (USD, GBP, EUR, GHS)
- [x] Stripe payment integration
- [x] Admin dashboard with analytics
- [x] Vendor dashboard with product management
- [x] Customer dashboard with order tracking
- [x] Responsive design (mobile-first)
- [x] Ghana-inspired premium aesthetic

### Should Have
- [x] Product categories (clubs, national, retro, streetwear)
- [x] Product search and filtering
- [x] Product reviews and ratings
- [x] Newsletter subscription
- [ ] PayPal integration (requires API keys)
- [ ] Paystack integration (requires API keys)
- [ ] Image upload functionality (deferred)

### Nice to Have
- [ ] Discount codes and promotions
- [ ] Email notifications
- [ ] Order tracking with shipping providers
- [ ] SEO optimization
- [ ] Mobile app (API-ready architecture)

## What's Been Implemented

### 2024-03-24 - MVP Launch
- Complete backend API with 40+ endpoints
- Landing page with hero, categories, featured products
- Products listing page with filters (category, price, sort)
- Product detail page with size selection, reviews
- Shopping cart functionality
- Checkout flow with Stripe integration
- User authentication (JWT + Google OAuth)
- Customer dashboard (orders, wishlist, account)
- Vendor dashboard (products, orders, profile)
- Admin dashboard (stats, pending approvals, orders, vendors, customers)
- Sample products created and approved
- Premium Afro-Futurist design with Cinzel + Outfit fonts

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login with email/password
- POST /api/auth/session - Exchange OAuth session
- GET /api/auth/me - Get current user
- POST /api/auth/logout - Logout user

### Products
- GET /api/products - List approved products
- GET /api/products/featured - Featured products
- GET /api/products/categories - Product categories
- GET /api/products/{id} - Product detail

### Cart & Wishlist
- GET /api/cart - Get user cart
- POST /api/cart/add - Add to cart
- PUT /api/cart/update - Update cart item
- DELETE /api/cart/item/{id}/{size} - Remove from cart
- GET /api/wishlist - Get user wishlist
- POST /api/wishlist/add - Add to wishlist

### Orders
- POST /api/orders - Create order
- GET /api/orders - Get user orders
- GET /api/orders/{id} - Order detail

### Payments
- POST /api/payments/stripe/checkout - Create Stripe checkout
- GET /api/payments/stripe/status/{session_id} - Check payment status

### Vendor Routes
- GET /api/vendor/products - Vendor's products
- POST /api/vendor/products - Create product
- PUT /api/vendor/products/{id} - Update product
- DELETE /api/vendor/products/{id} - Delete product
- GET /api/vendor/orders - Vendor's orders

### Admin Routes
- GET /api/admin/dashboard - Dashboard stats
- GET /api/admin/products/pending - Pending products
- PUT /api/admin/products/{id}/approve - Approve/reject product
- PUT /api/admin/products/{id}/featured - Toggle featured
- GET /api/admin/vendors - All vendors
- GET /api/admin/orders - All orders
- GET /api/admin/customers - All customers

## Prioritized Backlog

### P0 (Critical)
- None remaining

### P1 (High Priority)
- PayPal integration with API keys
- Paystack integration with API keys
- Image upload functionality with Object Storage

### P2 (Medium Priority)
- Discount codes system
- Email notifications (order confirmation, shipping updates)
- Order tracking with shipping providers
- Vendor profile customization

### P3 (Low Priority)
- SEO meta tags optimization
- Social sharing for products
- Advanced analytics dashboard
- Multi-language support

## Next Tasks

1. **Image Storage**: Integrate Emergent Object Storage for product images
2. **PayPal Keys**: Get PayPal API keys and enable full integration
3. **Paystack Keys**: Get Paystack API keys for African payments
4. **Email Notifications**: Set up email service for order confirmations
5. **Discount Codes**: Implement promotional code system
6. **SEO Optimization**: Add meta tags, structured data

## Test Credentials

### Admin Account
- Email: easante@nitlimited.com
- Password: admin123

### Vendor Account (Sample)
- Email: vendor@blackstar.com
- Password: vendor123

## Design System

### Colors
- Primary: #000000 (Black)
- Secondary: #D4AF37 (Ashanti Gold)
- Accent Red: #CE1126 (Ghana Red)
- Accent Green: #006B3F (Ghana Green)
- Background: #F9F9F7 (Bone White)

### Typography
- Headings: Cinzel (serif)
- Body: Outfit (sans-serif)

### Style
- Sharp corners (0px radius)
- Minimal gradients
- High-contrast editorial aesthetic
