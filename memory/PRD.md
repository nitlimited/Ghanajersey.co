# Black Star Threads - Product Requirements Document

## Original Problem Statement
Build a modern, scalable international eCommerce web application focused on selling curated Ghanaian jerseys to a global audience. The platform should act as a marketplace where Ghanaian jersey producers/vendors can list their products, while an admin manually reviews and approves listings before they go live.

## Architecture Overview
- **Frontend**: React 19 with Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI (Python) with MongoDB
- **Authentication**: JWT + Emergent Google OAuth
- **Payments**: Stripe (integrated), PayPal (playbook ready), Paystack (requires API key)
- **File Storage**: Emergent Object Storage for vendor verification images
- **Localization**: 5 languages (EN, FR, ES, PT, NL) with dual currency (USD/GHS)
- **Hosting**: Emergent Platform

## User Roles & Credentials

### Admin
- Email: easante@nitlimited.com
- Password: admin123
- Capabilities: Full marketplace control, approve/reject products & vendors, manage orders, view analytics, 15% commission tracking

### Vendor
- Email: vendor@blackstar.com / testvendor@blackstar.com
- Password: vendor123 / testvendor123
- Capabilities: Upload products, manage inventory, update order status, view earnings, create promos
- **Must complete 9-step onboarding and be approved by admin before accessing dashboard**

### Customer
- Register via /auth page or Google OAuth
- Capabilities: Browse, cart, wishlist, checkout, track orders, vote for jerseys

## What's Been Implemented

### Core MVP
- Multi-role authentication (Admin, Vendor, Customer) with JWT + Google OAuth
- Product listing with approval workflow
- Shopping cart and wishlist
- Product detail pages with voting
- Stripe payment integration
- Premium Afro-Futurist design (Ghana flag colors)

### Phase 2: Internationalization (December 2024)

#### Multi-Language Support
- **5 Languages with Country Flags**:
  - 🇬🇧 English (default)
  - 🇫🇷 Français (French)
  - 🇪🇸 Español (Spanish)
  - 🇵🇹 Português (Portuguese)
  - 🇳🇱 Nederlands (Dutch)
- Language selector in header with flag icons
- All UI elements translated (navigation, buttons, labels, product cards)
- Language preference persists in localStorage

#### Geolocation-Based Currency
- **Automatic Detection**: Users in Ghana see GHS, others see USD
- **NO Manual Override**: Currency is determined ONLY by location
- **Vendor-Set Prices**: Vendors set independent prices for each market (no conversion)
- **Currency Display**:
  - 🇬🇭 Ghana users: GH₵ (Ghana Cedi) - vendor's GHS price
  - 🌍 International users: $ (US Dollar) - vendor's USD price
- **Free Shipping Threshold**: 
  - Ghana: GH₵500
  - International: $100

#### Vendor Dual Pricing
- Vendors MUST set both USD and GHS prices for products
- Separate fields for customization price in both currencies
- Prices are independent - no automatic conversion
- Ghana customers see GHS price, international see USD price

### Phase 3: Personalization & Privacy (December 2024)

#### Cookie Consent System
- **Cookie Banner**: Displays on first visit with exact legal text
- **Manage Cookies Modal**: Users can toggle:
  - Essential Cookies (required, cannot disable)
  - Analytics Cookies
  - Marketing Cookies
  - Personalization Cookies
- Links to Privacy Policy and Terms & Conditions
- Preferences stored in localStorage

#### Personalized Homepage
- **"Pick Up Where You Left Off"** section shows recently viewed products
- **"Recommended For You"** section (logged-in users) shows products based on:
  - Browsing history
  - Category preferences
  - Product views and clicks
- Homepage adapts to each user's interests
- Guest activity syncs to account on login

#### User Activity Tracking
- Tracks: product views, clicks, category browsing
- Category preferences weighted by interaction type
- Data stored locally for guests, server-side for logged users
- Respects cookie preferences (can disable personalization)

### Phase 1: Enhanced Dashboards (December 2024)

#### Admin Dashboard Features
- **Revenue Analytics**:
  - Total Revenue tracking
  - Platform Commission (15%) calculation
  - Vendor Earnings Total
  - Confirmed Deliveries count
- **Onboarding Tab** (NEW - December 2024):
  - Review pending vendor applications
  - View complete onboarding data (Identity, Business, Inventory, Production, Delivery, Quality, Commitment, Verification Images)
  - Approve or Reject applications with one click
  - Full application detail modal
- **Vendors & Earnings Tab**:
  - View all vendors with earnings breakdown
  - See products per vendor ("View Products" button)
  - Track pending vs paid payouts
  - Commission/Net earnings per vendor
- **Voting Panel** (View Only):
  - Jersey Voting Statistics
  - Current leader display
  - Ranked list of all products by votes
  - Admin cannot manipulate votes
- **Orders Tab**:
  - All orders with customer details
  - Delivery confirmation tracking
  - Order status management
- **Pending Products Tab**:
  - Approve/Reject new submissions
- **Customers Tab**:
  - View all registered customers

#### Vendor Onboarding Flow (NEW - December 2024)
- **9-Step Questionnaire**:
  1. **Identity**: Full name, business name, phone, email, city, social media, years in business
  2. **Business Legitimacy**: Online/offline sales, selling platforms, monthly jersey sales
  3. **Inventory**: Stock type (ready/made-to-order), stock quantity, sizes available
  4. **Production Capacity**: Weekly capacity, production time per jersey
  5. **Delivery**: Methods (Bolt, courier, Ghana Post, pickup), delivery times by region
  6. **Quality**: Jersey source (design/resell/both), materials used
  7. **Commitment**: Fulfill on time, fulfill through platform
  8. **Agreement**: Accept terms & conditions (15% commission, respond in 24h, etc.)
  9. **Verification**: Upload jersey photos and packaging photos (via Object Storage)
- **Vendor Status Flow**:
  - `pending_onboarding` → (submit form) → `pending_approval` → (admin approves) → `approved`
  - Rejected vendors can resubmit

#### Vendor Dashboard Features
- **Access Control**: Only approved vendors can access dashboard
- **Pending/Rejected vendors see appropriate status screens**
- **Financial Overview**:
  - Total Revenue
  - Platform Fee (15%)
  - Net Earnings
  - Pending Payout
  - Paid Out
- **Order Management**:
  - View orders with customer name, address, phone
  - See jersey size, quantity per order
  - Update status: Processing → Shipped → Delivered → Cancelled
  - Request delivery confirmation (email-ready)
- **Product Management**:
  - Add New Jersey (modal with form)
  - Edit product details
  - Upload images (front/back for hover)
  - Set price, sizes, stock
  - Duplicate product (for color variants)
  - Pause/Unpause products
  - Delete products
- **Inventory Tracking**:
  - Low stock alerts (≤5 items)
  - Quick stock update
- **Performance Insights**:
  - Top selling jerseys
  - Monthly sales
  - Total votes on products
- **Promos Tab**:
  - Create discount codes
  - Percentage or fixed amount
  - Min purchase, max uses
- **Support Tab**:
  - Contact Admin
  - Seller Guidelines
  - Payout Policy

### Delivery Confirmation Flow
1. Vendor marks order as "Delivered"
2. Vendor clicks "Request Confirmation"
3. System generates confirmation link
4. Customer clicks link to confirm receipt
5. Confirmation unlocks vendor payout
6. Admin sees confirmed deliveries count

## API Endpoints

### Admin Routes
- GET /api/admin/dashboard - Revenue stats with 15% commission
- GET /api/admin/analytics/vendors - Detailed vendor earnings
- GET /api/admin/vendors/{vendor_id}/products - Vendor's products
- GET /api/admin/voting-stats - Voting statistics (view-only)
- GET /api/admin/orders - All orders with confirmation status
- PUT /api/admin/orders/{order_id}/status - Update order status
- GET /api/admin/products/pending - Pending approvals
- PUT /api/admin/products/{id}/approve - Approve/reject product
- **GET /api/admin/vendors/pending** - Get vendors awaiting approval (NEW)
- **PUT /api/admin/vendors/{user_id}/approve?approved=true/false** - Approve/reject vendor (NEW)

### Vendor Routes
- **GET /api/vendor/onboarding-status** - Check vendor's approval status (NEW)
- **POST /api/vendor/onboarding** - Submit 9-step onboarding form (NEW)
- GET /api/vendor/dashboard - Comprehensive stats
- GET /api/vendor/orders - Orders with customer details
- PUT /api/vendor/orders/{order_id}/status - Update order status
- POST /api/vendor/orders/{order_id}/send-confirmation - Request delivery confirmation
- GET /api/vendor/products - All products
- POST /api/vendor/products - Create product
- PUT /api/vendor/products/{id} - Update product
- DELETE /api/vendor/products/{id} - Delete product
- POST /api/vendor/products/{id}/duplicate - Duplicate product
- PUT /api/vendor/products/{id}/pause - Toggle pause
- PUT /api/vendor/products/{id}/stock - Update stock
- GET /api/vendor/promos - List promos
- POST /api/vendor/promos - Create promo
- DELETE /api/vendor/promos/{id} - Delete promo

### File Upload Routes (NEW)
- **POST /api/upload/vendor-image** - Upload verification images for onboarding
- **GET /api/files/{path}** - Retrieve uploaded files

### Delivery Confirmation
- GET /api/orders/{order_id}/confirm/{token} - Customer confirms delivery (link-based)

## Current Product Catalog (6 Items)
1. Ghana Away Jersey 2026 FIFA World Cup - $89.99 (Tournament)
2. Ghana Home Jersey 2026 FIFA World Cup - $99.99 (Tournament)
3. Ghana Home Jersey 2022 World Cup - $79.99 (Tournament)
4. Ghana Black Star Mizizi '57 Designer Jersey - $85.00 (Designer)
5. Ghana Retro Classic Jersey - $69.99 (Retro)
6. Ghana Training Jersey Red - $55.00 (Streetwear)

## Prioritized Backlog

### P0 (Critical) - Completed
- ✅ Admin/Vendor dashboard enhancements
- ✅ Vendor Onboarding 9-step questionnaire
- ✅ Admin vendor approval workflow
- ✅ Object Storage integration for file uploads

### P1 (High Priority) - Next
- Email integration (order confirmation, delivery confirmation, vendor approval notification)
- PayPal payment integration
- Paystack payment integration
- Customization details display in Cart/Checkout (Name/Number + $15 fee)

### P2 (Medium Priority)
- Implement GHANA10 discount code at checkout
- Order tracking with shipping providers
- Inventory alerts via email
- Performance insights (conversion rate, most viewed)

### P3 (Low Priority)
- 360-degree product view
- Multi-language support
- Mobile app

## Design System

### Colors
- Primary: #000000 (Black)
- Secondary: #fed506 (Ashanti Gold)
- Accent Red: #CE1126 (Ghana Red)
- Accent Green: #006B3F (Ghana Green)
- Background: #F9F9F7 (Bone White)

### Typography
- Headings: Cinzel (serif)
- Body: Outfit (sans-serif)

## Test Reports
- /app/test_reports/iteration_4.json - Phase 1 dashboard testing (100% pass)
- /app/test_reports/iteration_5.json - Vendor Onboarding testing (100% pass)
- /app/test_reports/iteration_6.json - Localization testing (100% pass)
- /app/backend/tests/test_admin_vendor_dashboards.py - Backend tests
- /app/backend/tests/test_vendor_onboarding.py - Onboarding tests
- /app/backend/tests/test_localization.py - Localization tests

## Files of Reference
- backend/server.py - All API endpoints
- frontend/src/App.js - Main router including /vendor/onboarding route
- frontend/src/localization/ - Translations, LocalizationContext, LanguageCurrencySelector
- frontend/src/pages/AdminDashboard.jsx - Admin panel with Onboarding tab
- frontend/src/pages/VendorDashboard.jsx - Vendor panel with dual pricing
- frontend/src/pages/VendorOnboarding.jsx - 9-step onboarding form
- frontend/src/pages/LandingPage.jsx - Homepage with Header/Footer and language selector
- frontend/src/pages/ProductDetailPage.jsx - Product page with localized prices
