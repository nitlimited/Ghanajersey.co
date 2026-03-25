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
- [x] Product categories (clubs, national, retro, streetwear, creative-designer, local-club)
- [x] Product search and filtering
- [x] Product reviews and ratings
- [x] Newsletter subscription
- [x] Product voting system
- [x] Product comparison page
- [x] Sell Your Jersey page (vendor recruitment)
- [x] Legal pages (Terms, Privacy)
- [ ] PayPal integration (requires API keys)
- [ ] Paystack integration (requires API keys)
- [ ] Image upload functionality (deferred)

### Nice to Have
- [ ] Discount codes and promotions
- [ ] Email notifications
- [ ] Order tracking with shipping providers
- [ ] SEO optimization (partial - meta tags added)
- [ ] 360-degree product view
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

### 2024-12 - Feature Update
- **Voting System**: Users can vote for their favorite jersey designs
  - POST /api/products/{product_id}/vote
  - GET /api/products/top-voted
  - Vote count displayed on product detail page with Vote button
- **Homepage Redesign**: New sections added
  - Vote banner section
  - Popular Jerseys section
  - Official Tournament Jerseys banner
  - Designer Jerseys section
  - Limited Editions banner
  - Street Style Jerseys section
  - Local Club Jersey banner
  - Compare Jerseys CTA
- **Sell Your Jersey Page** (/sell): Complete vendor recruitment page
  - How It Works steps
  - Payment information (15% commission)
  - Example earnings calculator
  - Listing requirements
- **Legal Pages**: Terms and Privacy policy pages
  - /terms - Full terms and conditions
  - /privacy - Complete privacy policy
- **Product Comparison** (/compare): Side-by-side jersey comparison
  - Select two jerseys to compare
  - Comparison table with specs
  - Add to cart from comparison view
- **Product Detail Updates**:
  - Voting functionality with real-time updates
  - "More from this designer" section
  - Designer name displayed
- **Footer Updates**: Links to Terms and Privacy pages

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
- GET /api/products/popular - Popular products
- GET /api/products/top-voted - Most voted product
- GET /api/products/categories - Product categories
- GET /api/products/by-category/{category} - Products by category
- GET /api/products/{id} - Product detail
- POST /api/products/{id}/vote - Vote for product
- GET /api/products/{id}/votes - Get vote count

### Vendor (Public)
- GET /api/vendor/{vendor_id}/products - Vendor's public products
- GET /api/vendor/{vendor_id}/public - Vendor's public profile

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

### Vendor Routes (Authenticated)
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

## Pages

| Route | Page | Description |
|-------|------|-------------|
| / | LandingPage | Homepage with hero, categories, sections |
| /products | ProductsPage | Product listing with filters |
| /products/:id | ProductDetailPage | Product detail with voting |
| /cart | CartPage | Shopping cart |
| /checkout | CheckoutPage | Checkout flow |
| /wishlist | WishlistPage | User wishlist |
| /auth | AuthPage | Login/Register |
| /dashboard | CustomerDashboard | Customer orders |
| /vendor | VendorDashboard | Vendor management |
| /admin | AdminDashboard | Admin panel |
| /sell | SellYourJerseyPage | Vendor recruitment |
| /terms | TermsPage | Terms and conditions |
| /privacy | PrivacyPage | Privacy policy |
| /compare | ComparePage | Jersey comparison |

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
- 360-degree product view

### P3 (Low Priority)
- SEO meta tags optimization
- Social sharing for products
- Advanced analytics dashboard
- Multi-language support

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
- Secondary: #fed506 (Ashanti Gold)
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
- Ghana flag border (red, yellow, green) in header
