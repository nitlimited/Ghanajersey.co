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

## What's Been Implemented

### MVP Launch
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

### Feature Update - Session 1
- **Voting System**: Users can vote for their favorite jersey designs
  - POST /api/products/{product_id}/vote (with device fingerprint)
  - GET /api/products/{product_id}/check-vote (check if voted)
  - GET /api/products/top-voted
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
- **Legal Pages**: Terms and Privacy policy pages
- **Product Comparison** (/compare): Side-by-side jersey comparison
- **Product Detail Updates**: Voting functionality, "More from this designer" section

### Feature Update - Session 2
- **Announcement Bar**: Top bar for promotions ("FREE SHIPPING on orders over $100 | Use code GHANA10 for 10% off")
- **Simplified Menu**: Tournament | Streetwear | Fan | Retro | Designers
- **Search Bar**: Header search with expandable input
- **Footer Updates**: 
  - "List Your Jersey" button prominently displayed
  - Company section with Become a Seller, Terms, Privacy, Compare links
  - Updated Shop links with category navigation
- **Product Card Enhancements**:
  - Shows vendor name/category above product name
  - Second image appears on hover
  - Limited edition badge support
- **Enhanced Voting System**:
  - Device fingerprint tracking (localStorage)
  - IP-based duplicate prevention
  - Check-vote endpoint for pre-load status

## Pages

| Route | Page | Description |
|-------|------|-------------|
| / | LandingPage | Homepage with hero, categories, sections |
| /products | ProductsPage | Product listing with filters + search |
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

## API Endpoints

### Products & Voting
- GET /api/products - List approved products (supports ?search=)
- GET /api/products/featured - Featured products
- GET /api/products/popular - Popular products
- GET /api/products/top-voted - Most voted product
- GET /api/products/{id} - Product detail
- POST /api/products/{id}/vote - Vote for product (accepts device_fingerprint)
- GET /api/products/{id}/check-vote - Check if user voted
- GET /api/products/{id}/votes - Get vote count

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login with email/password
- POST /api/auth/session - Exchange OAuth session
- GET /api/auth/me - Get current user
- POST /api/auth/logout - Logout user

## Prioritized Backlog

### P0 (Critical)
- None remaining

### P1 (High Priority)
- PayPal integration with API keys
- Paystack integration with API keys
- Image upload functionality with Object Storage

### P2 (Medium Priority)
- Discount codes system (GHANA10 code implementation)
- Email notifications (order confirmation, shipping updates)
- Order tracking with shipping providers

### P3 (Low Priority)
- 360-degree product view
- SEO meta tags optimization
- Social sharing for products
- Multi-language support

## Test Credentials

### Admin Account
- Email: easante@nitlimited.com
- Password: admin123

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
- Announcement bar at top
