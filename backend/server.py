from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
import hmac
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'blackstar_threads_secret_key')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 168))

# Stripe Config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')

# Create the main app
app = FastAPI(title="Black Star Threads API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS ====================

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "customer"  # admin, vendor, customer

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "customer"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    picture: Optional[str] = None
    created_at: datetime
    is_active: bool = True

class VendorProfile(BaseModel):
    brand_name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    logo_url: Optional[str] = None

class VendorProfileUpdate(BaseModel):
    brand_name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    contact_phone: Optional[str] = None
    logo_url: Optional[str] = None

# Product Models
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    currency: str = "USD"
    category: str  # official-tournament, streetwear, fan, retro, creative-designer, local-club
    jersey_type: str = "fan"  # original, fan
    sizes: List[str]
    stock: int
    images: List[str]
    tags: Optional[List[str]] = []
    is_limited_edition: bool = False

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    jersey_type: Optional[str] = None
    sizes: Optional[List[str]] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_limited_edition: Optional[bool] = None

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str
    vendor_id: str
    vendor_name: Optional[str] = None
    name: str
    description: str
    price: float
    currency: str
    category: str
    jersey_type: str = "fan"
    sizes: List[str]
    stock: int
    images: List[str]
    tags: List[str]
    status: str  # pending, approved, rejected
    featured: bool = False
    is_limited_edition: bool = False
    rating: float = 0.0
    review_count: int = 0
    vote_count: int = 0
    created_at: datetime

# Cart Models
class CartItem(BaseModel):
    product_id: str
    quantity: int
    size: str

class CartItemResponse(BaseModel):
    product_id: str
    name: str
    price: float
    currency: str
    quantity: int
    size: str
    image: str

# Wishlist Models
class WishlistItem(BaseModel):
    product_id: str

# Order Models
class OrderItem(BaseModel):
    product_id: str
    quantity: int
    size: str
    price: float
    currency: str

class ShippingAddress(BaseModel):
    full_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    phone: str

class OrderCreate(BaseModel):
    items: List[OrderItem]
    shipping_address: ShippingAddress
    payment_method: str  # stripe, paypal, paystack
    currency: str = "USD"

class OrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str
    customer_id: str
    items: List[dict]
    shipping_address: dict
    subtotal: float
    shipping_cost: float
    total: float
    currency: str
    payment_method: str
    payment_status: str  # pending, paid, failed, refunded
    order_status: str  # pending, processing, shipped, delivered, cancelled
    tracking_number: Optional[str] = None
    created_at: datetime

# Review Models
class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    comment: str

class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str
    product_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: datetime

# Payment Models
class CheckoutRequest(BaseModel):
    order_id: str
    origin_url: str

# Admin Models
class ProductApproval(BaseModel):
    status: str  # approved, rejected
    rejection_reason: Optional[str] = None

class FeaturedProductUpdate(BaseModel):
    featured: bool

# Discount Code Models
class DiscountCodeCreate(BaseModel):
    code: str
    discount_percent: float
    max_uses: int
    expires_at: datetime

# Newsletter Models
class NewsletterSubscribe(BaseModel):
    email: EmailStr

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, role: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)):
    # Try cookie first (for Emergent OAuth)
    token = session_token
    
    # Try Authorization header as fallback (for JWT)
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Try JWT first
    payload = decode_jwt_token(token)
    if payload:
        user = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if user:
            return user
    
    # Try session token (Emergent OAuth)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if user:
            return user
    
    raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_vendor_user(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    if user["role"] not in ["vendor", "admin"]:
        raise HTTPException(status_code=403, detail="Vendor access required")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pw = hash_password(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hashed_pw,
        "name": user_data.name,
        "role": user_data.role,
        "picture": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "vendor_profile": None
    }
    
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.role)
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": user_data.email,
            "name": user_data.name,
            "role": user_data.role
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["user_id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "picture": user.get("picture")
        }
    }

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.post("/auth/session")
async def exchange_session(request: Request):
    """Exchange Emergent OAuth session_id for session data"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        data = response.json()
    
    email = data.get("email")
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")
    
    # Check if user exists
    user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if user:
        user_id = user["user_id"]
        # Update user data
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": "customer",
            "picture": picture,
            "password": None,  # OAuth users don't have password
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "vendor_profile": None
        }
        await db.users.insert_one(user_doc)
    
    # Store session
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    response = JSONResponse(content={
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": user.get("role", "customer"),
            "picture": picture
        }
    })
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    return response

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "picture": user.get("picture")
    }

@api_router.post("/auth/logout")
async def logout(request: Request, session_token: Optional[str] = Cookie(None)):
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie(key="session_token", path="/")
    return response

# ==================== VENDOR ROUTES ====================

@api_router.get("/vendor/profile")
async def get_vendor_profile(user: dict = Depends(get_vendor_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "vendor_profile": user.get("vendor_profile")
    }

@api_router.put("/vendor/profile")
async def update_vendor_profile(profile: VendorProfileUpdate, user: dict = Depends(get_vendor_user)):
    update_data = {k: v for k, v in profile.model_dump().items() if v is not None}
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"vendor_profile": update_data}}
    )
    
    return {"message": "Profile updated"}

@api_router.get("/vendor/products")
async def get_vendor_products(user: dict = Depends(get_vendor_user)):
    products = await db.products.find(
        {"vendor_id": user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.post("/vendor/products")
async def create_product(product: ProductCreate, user: dict = Depends(get_vendor_user)):
    product_id = f"prod_{uuid.uuid4().hex[:12]}"
    
    # Safely get vendor name
    vendor_profile = user.get("vendor_profile") or {}
    vendor_name = vendor_profile.get("brand_name") if vendor_profile else None
    vendor_name = vendor_name or user.get("name", "Unknown Vendor")
    
    product_doc = {
        "product_id": product_id,
        "vendor_id": user["user_id"],
        "vendor_name": vendor_name,
        **product.model_dump(),
        "status": "pending",
        "featured": False,
        "rating": 0.0,
        "review_count": 0,
        "vote_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.insert_one(product_doc)
    
    return {"product_id": product_id, "message": "Product submitted for approval"}

@api_router.put("/vendor/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, user: dict = Depends(get_vendor_user)):
    existing = await db.products.find_one(
        {"product_id": product_id, "vendor_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    
    if update_data:
        await db.products.update_one(
            {"product_id": product_id},
            {"$set": update_data}
        )
    
    return {"message": "Product updated"}

@api_router.delete("/vendor/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_vendor_user)):
    result = await db.products.delete_one(
        {"product_id": product_id, "vendor_id": user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}

@api_router.get("/vendor/orders")
async def get_vendor_orders(user: dict = Depends(get_vendor_user)):
    # Get orders containing vendor's products
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    
    vendor_orders = []
    for order in orders:
        vendor_items = [
            item for item in order.get("items", [])
            if item.get("vendor_id") == user["user_id"]
        ]
        if vendor_items:
            order["items"] = vendor_items
            if isinstance(order.get('created_at'), str):
                order['created_at'] = datetime.fromisoformat(order['created_at'])
            vendor_orders.append(order)
    
    return vendor_orders

@api_router.put("/vendor/orders/{order_id}/status")
async def update_vendor_order_status(order_id: str, status: str, user: dict = Depends(get_vendor_user)):
    """Vendor can update order status: processing, shipped, delivered, cancelled"""
    valid_statuses = ["processing", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Verify this order contains vendor's products
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    vendor_items = [item for item in order.get("items", []) if item.get("vendor_id") == user["user_id"]]
    if not vendor_items:
        raise HTTPException(status_code=403, detail="Not authorized to update this order")
    
    # Update vendor-specific status for this order
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            f"vendor_status.{user['user_id']}": status,
            "order_status": status  # Also update main status
        }}
    )
    
    return {"message": f"Order status updated to {status}"}

@api_router.post("/vendor/orders/{order_id}/send-confirmation")
async def send_delivery_confirmation_request(order_id: str, user: dict = Depends(get_vendor_user)):
    """Vendor sends delivery confirmation request to customer (prepares for email integration)"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Generate confirmation token
    confirmation_token = f"confirm_{uuid.uuid4().hex}"
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "confirmation_token": confirmation_token,
            "confirmation_requested_at": datetime.now(timezone.utc).isoformat(),
            "confirmation_requested_by": user["user_id"]
        }}
    )
    
    # In production, this would trigger an email to the customer
    # For now, return the confirmation link
    return {
        "message": "Confirmation request sent",
        "confirmation_link": f"/api/orders/{order_id}/confirm/{confirmation_token}"
    }

@api_router.get("/orders/{order_id}/confirm/{token}")
async def confirm_delivery(order_id: str, token: str):
    """Customer confirms delivery via link (no auth required - link-based confirmation)"""
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get("confirmation_token") != token:
        raise HTTPException(status_code=400, detail="Invalid confirmation token")
    
    if order.get("delivery_confirmed"):
        return {"message": "Delivery already confirmed"}
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "delivery_confirmed": True,
            "delivery_confirmed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Delivery confirmed. Thank you!"}

@api_router.get("/vendor/dashboard")
async def get_vendor_dashboard(user: dict = Depends(get_vendor_user)):
    """Get comprehensive vendor dashboard data"""
    vendor_id = user["user_id"]
    
    # Get vendor's products
    products = await db.products.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(1000)
    product_ids = [p["product_id"] for p in products]
    
    # Get orders containing vendor's products
    all_orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    vendor_orders = []
    total_revenue = 0
    monthly_revenue = 0
    current_month = datetime.now(timezone.utc).month
    
    for order in all_orders:
        vendor_items = [item for item in order.get("items", []) if item.get("product_id") in product_ids]
        if vendor_items:
            order_copy = {**order, "items": vendor_items}
            if isinstance(order_copy.get('created_at'), str):
                order_copy['created_at'] = datetime.fromisoformat(order_copy['created_at'])
            vendor_orders.append(order_copy)
            
            if order.get("payment_status") == "paid":
                order_total = sum(item.get("price", 0) * item.get("quantity", 1) for item in vendor_items)
                total_revenue += order_total
                
                # Check if order is from current month
                order_date = order_copy['created_at']
                if hasattr(order_date, 'month') and order_date.month == current_month:
                    monthly_revenue += order_total
    
    # Calculate earnings
    platform_commission = total_revenue * 0.15
    net_earnings = total_revenue * 0.85
    
    # Calculate payouts
    confirmed_orders = [o for o in vendor_orders if o.get("delivery_confirmed") and o.get("payment_status") == "paid"]
    pending_orders = [o for o in vendor_orders if not o.get("delivery_confirmed") and o.get("payment_status") == "paid"]
    
    paid_payout = sum(
        sum(item.get("price", 0) * item.get("quantity", 1) for item in o.get("items", [])) * 0.85
        for o in confirmed_orders
    )
    pending_payout = sum(
        sum(item.get("price", 0) * item.get("quantity", 1) for item in o.get("items", [])) * 0.85
        for o in pending_orders
    )
    
    # Get low stock products (5 or fewer items)
    low_stock_products = [p for p in products if p.get("stock", 0) <= 5 and p.get("status") == "approved"]
    
    # Get top selling products
    product_sales = {}
    for order in vendor_orders:
        if order.get("payment_status") == "paid":
            for item in order.get("items", []):
                pid = item.get("product_id")
                if pid:
                    if pid not in product_sales:
                        product_sales[pid] = {"quantity": 0, "revenue": 0}
                    product_sales[pid]["quantity"] += item.get("quantity", 1)
                    product_sales[pid]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
    
    top_sellers = []
    for product in products:
        if product["product_id"] in product_sales:
            top_sellers.append({
                **product,
                "total_sold": product_sales[product["product_id"]]["quantity"],
                "total_revenue": product_sales[product["product_id"]]["revenue"]
            })
    top_sellers.sort(key=lambda x: x["total_sold"], reverse=True)
    
    # Get product views (we'll track this in product_views collection)
    views = await db.product_views.find({"product_id": {"$in": product_ids}}, {"_id": 0}).to_list(1000)
    most_viewed = {}
    for view in views:
        pid = view.get("product_id")
        if pid:
            most_viewed[pid] = most_viewed.get(pid, 0) + 1
    
    return {
        "total_products": len(products),
        "approved_products": len([p for p in products if p.get("status") == "approved"]),
        "pending_products": len([p for p in products if p.get("status") == "pending"]),
        "paused_products": len([p for p in products if p.get("is_paused")]),
        "total_orders": len(vendor_orders),
        "new_orders": len([o for o in vendor_orders if o.get("order_status") == "processing"]),
        "total_revenue": round(total_revenue, 2),
        "monthly_revenue": round(monthly_revenue, 2),
        "platform_commission": round(platform_commission, 2),
        "net_earnings": round(net_earnings, 2),
        "pending_payout": round(pending_payout, 2),
        "paid_payout": round(paid_payout, 2),
        "low_stock_products": low_stock_products,
        "top_sellers": top_sellers[:5],
        "total_votes": sum(p.get("vote_count", 0) for p in products)
    }

@api_router.put("/vendor/products/{product_id}/pause")
async def toggle_product_pause(product_id: str, is_paused: bool, user: dict = Depends(get_vendor_user)):
    """Pause or unpause a product"""
    result = await db.products.update_one(
        {"product_id": product_id, "vendor_id": user["user_id"]},
        {"$set": {"is_paused": is_paused}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": f"Product {'paused' if is_paused else 'unpaused'}"}

@api_router.post("/vendor/products/{product_id}/duplicate")
async def duplicate_product(product_id: str, user: dict = Depends(get_vendor_user)):
    """Duplicate an existing product"""
    existing = await db.products.find_one(
        {"product_id": product_id, "vendor_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    
    new_product_id = f"prod_{uuid.uuid4().hex[:12]}"
    new_product = {
        **existing,
        "product_id": new_product_id,
        "name": f"{existing['name']} (Copy)",
        "status": "pending",
        "vote_count": 0,
        "rating": 0.0,
        "review_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.products.insert_one(new_product)
    
    return {"product_id": new_product_id, "message": "Product duplicated and submitted for approval"}

@api_router.put("/vendor/products/{product_id}/stock")
async def update_product_stock(product_id: str, stock: int, user: dict = Depends(get_vendor_user)):
    """Update product stock quantity"""
    result = await db.products.update_one(
        {"product_id": product_id, "vendor_id": user["user_id"]},
        {"$set": {"stock": stock}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Stock updated"}

# Vendor discount/promo routes
class VendorPromoCreate(BaseModel):
    code: str
    discount_type: str = "percentage"  # percentage or fixed
    discount_value: float
    min_purchase: Optional[float] = None
    max_uses: Optional[int] = None
    expires_at: Optional[str] = None
    product_ids: Optional[List[str]] = None  # If empty, applies to all vendor products

@api_router.post("/vendor/promos")
async def create_vendor_promo(promo: VendorPromoCreate, user: dict = Depends(get_vendor_user)):
    """Create a vendor-specific promo code"""
    promo_id = f"promo_{uuid.uuid4().hex[:12]}"
    
    promo_doc = {
        "promo_id": promo_id,
        "vendor_id": user["user_id"],
        "code": promo.code.upper(),
        "discount_type": promo.discount_type,
        "discount_value": promo.discount_value,
        "min_purchase": promo.min_purchase,
        "max_uses": promo.max_uses,
        "uses": 0,
        "expires_at": promo.expires_at,
        "product_ids": promo.product_ids,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.vendor_promos.insert_one(promo_doc)
    
    return {"promo_id": promo_id, "message": "Promo code created"}

@api_router.get("/vendor/promos")
async def get_vendor_promos(user: dict = Depends(get_vendor_user)):
    """Get all promos created by vendor"""
    promos = await db.vendor_promos.find({"vendor_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return promos

@api_router.delete("/vendor/promos/{promo_id}")
async def delete_vendor_promo(promo_id: str, user: dict = Depends(get_vendor_user)):
    """Delete a vendor promo"""
    result = await db.vendor_promos.delete_one({"promo_id": promo_id, "vendor_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo not found")
    return {"message": "Promo deleted"}

# ==================== PRODUCT ROUTES (PUBLIC) ====================

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: Optional[str] = "latest",  # latest, price_asc, price_desc, popular
    search: Optional[str] = None,
    featured: Optional[bool] = None
):
    query = {"status": "approved"}
    
    if category:
        query["category"] = category
    
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    
    if max_price is not None:
        if "price" in query:
            query["price"]["$lte"] = max_price
        else:
            query["price"] = {"$lte": max_price}
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    
    if featured is not None:
        query["featured"] = featured
    
    sort_options = {
        "latest": [("created_at", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "popular": [("review_count", -1), ("rating", -1)]
    }
    
    sort = sort_options.get(sort_by, [("created_at", -1)])
    
    products = await db.products.find(query, {"_id": 0}).sort(sort).to_list(100)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/products/featured")
async def get_featured_products():
    products = await db.products.find(
        {"status": "approved", "featured": True},
        {"_id": 0}
    ).limit(8).to_list(8)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/products/categories")
async def get_categories():
    return [
        {"id": "official-tournament", "name": "Official Tournament", "description": "Original and fan tournament jerseys"},
        {"id": "streetwear", "name": "Streetwear", "description": "Modern street style jerseys"},
        {"id": "fan", "name": "Fan Jerseys", "description": "Fan-made tribute jerseys"},
        {"id": "retro", "name": "Retro Designs", "description": "Classic and vintage designs"},
        {"id": "creative-designer", "name": "Creative Designer", "description": "Unique designer collections"},
        {"id": "local-club", "name": "Local Club", "description": "Support your local Ghanaian clubs"}
    ]

# Voting endpoints
class VoteRequest(BaseModel):
    device_fingerprint: Optional[str] = None

@api_router.post("/products/{product_id}/vote")
async def vote_for_product(product_id: str, request: Request, vote_data: Optional[VoteRequest] = None):
    # Get voter IP for uniqueness
    voter_ip = request.client.host if request.client else "unknown"
    
    # Get device fingerprint if provided (for better duplicate detection)
    device_fingerprint = vote_data.device_fingerprint if vote_data else None
    
    # Check if already voted by IP
    existing_vote_ip = await db.votes.find_one({
        "product_id": product_id,
        "voter_ip": voter_ip
    })
    
    if existing_vote_ip:
        raise HTTPException(status_code=400, detail="You have already voted for this jersey")
    
    # Check if already voted by device fingerprint (if provided)
    if device_fingerprint:
        existing_vote_fp = await db.votes.find_one({
            "product_id": product_id,
            "device_fingerprint": device_fingerprint
        })
        if existing_vote_fp:
            raise HTTPException(status_code=400, detail="You have already voted for this jersey")
    
    # Record vote
    vote_doc = {
        "product_id": product_id,
        "voter_ip": voter_ip,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    if device_fingerprint:
        vote_doc["device_fingerprint"] = device_fingerprint
    
    await db.votes.insert_one(vote_doc)
    
    # Update product vote count
    await db.products.update_one(
        {"product_id": product_id},
        {"$inc": {"vote_count": 1}}
    )
    
    return {"message": "Vote recorded successfully"}

@api_router.get("/products/{product_id}/check-vote")
async def check_vote_status(product_id: str, request: Request, device_fingerprint: Optional[str] = None):
    """Check if user has already voted for this product"""
    voter_ip = request.client.host if request.client else "unknown"
    
    # Check by IP
    existing_vote_ip = await db.votes.find_one({
        "product_id": product_id,
        "voter_ip": voter_ip
    })
    
    if existing_vote_ip:
        return {"has_voted": True}
    
    # Check by device fingerprint if provided
    if device_fingerprint:
        existing_vote_fp = await db.votes.find_one({
            "product_id": product_id,
            "device_fingerprint": device_fingerprint
        })
        if existing_vote_fp:
            return {"has_voted": True}
    
    return {"has_voted": False}

@api_router.get("/products/{product_id}/votes")
async def get_product_votes(product_id: str):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"vote_count": product.get("vote_count", 0)}

@api_router.get("/products/top-voted")
async def get_top_voted_product():
    product = await db.products.find_one(
        {"status": "approved"},
        {"_id": 0},
        sort=[("vote_count", -1)]
    )
    if product and isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    return product

@api_router.get("/products/by-category/{category}")
async def get_products_by_category(category: str, limit: int = 8):
    products = await db.products.find(
        {"status": "approved", "category": category},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/products/popular")
async def get_popular_products(limit: int = 8):
    products = await db.products.find(
        {"status": "approved"},
        {"_id": 0}
    ).sort([("review_count", -1), ("rating", -1)]).limit(limit).to_list(limit)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/vendor/{vendor_id}/products")
async def get_vendor_public_products(vendor_id: str, limit: int = 8):
    products = await db.products.find(
        {"status": "approved", "vendor_id": vendor_id},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/vendor/{vendor_id}/public")
async def get_vendor_public_profile(vendor_id: str):
    user = await db.users.find_one(
        {"user_id": vendor_id, "role": "vendor"},
        {"_id": 0, "password": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Designer not found")
    
    # Get product count
    product_count = await db.products.count_documents({"vendor_id": vendor_id, "status": "approved"})
    
    return {
        "vendor_id": user["user_id"],
        "name": user.get("vendor_profile", {}).get("brand_name") if user.get("vendor_profile") else None or user["name"],
        "description": user.get("vendor_profile", {}).get("description") if user.get("vendor_profile") else None,
        "location": user.get("vendor_profile", {}).get("location") if user.get("vendor_profile") else None,
        "product_count": product_count
    }

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, request: Request):
    product = await db.products.find_one(
        {"product_id": product_id, "status": "approved"},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    # Ensure vote_count exists for consistency
    if 'vote_count' not in product:
        product['vote_count'] = 0
    
    # Track product view for analytics
    viewer_ip = request.client.host if request.client else "unknown"
    await db.product_views.insert_one({
        "product_id": product_id,
        "viewer_ip": viewer_ip,
        "viewed_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get reviews
    reviews = await db.reviews.find(
        {"product_id": product_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    for review in reviews:
        if isinstance(review.get('created_at'), str):
            review['created_at'] = datetime.fromisoformat(review['created_at'])
    
    product["reviews"] = reviews
    
    return product

# ==================== CART ROUTES ====================

@api_router.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not cart:
        return {"items": [], "total": 0}
    
    # Populate product details
    items = []
    total = 0
    
    for item in cart.get("items", []):
        product = await db.products.find_one(
            {"product_id": item["product_id"]},
            {"_id": 0}
        )
        if product:
            item_total = product["price"] * item["quantity"]
            total += item_total
            items.append({
                "product_id": product["product_id"],
                "name": product["name"],
                "price": product["price"],
                "currency": product["currency"],
                "quantity": item["quantity"],
                "size": item["size"],
                "image": product["images"][0] if product["images"] else ""
            })
    
    return {"items": items, "total": round(total, 2)}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user: dict = Depends(get_current_user)):
    # Verify product exists
    product = await db.products.find_one(
        {"product_id": item.product_id, "status": "approved"},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if item.size not in product["sizes"]:
        raise HTTPException(status_code=400, detail="Size not available")
    
    cart = await db.carts.find_one({"user_id": user["user_id"]})
    
    if cart:
        # Check if item already exists
        existing_item = None
        for i, existing in enumerate(cart.get("items", [])):
            if existing["product_id"] == item.product_id and existing["size"] == item.size:
                existing_item = i
                break
        
        if existing_item is not None:
            await db.carts.update_one(
                {"user_id": user["user_id"]},
                {"$set": {f"items.{existing_item}.quantity": cart["items"][existing_item]["quantity"] + item.quantity}}
            )
        else:
            await db.carts.update_one(
                {"user_id": user["user_id"]},
                {"$push": {"items": item.model_dump()}}
            )
    else:
        cart_doc = {
            "user_id": user["user_id"],
            "items": [item.model_dump()],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.carts.insert_one(cart_doc)
    
    return {"message": "Item added to cart"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItem, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["user_id"]})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    for i, existing in enumerate(cart.get("items", [])):
        if existing["product_id"] == item.product_id and existing["size"] == item.size:
            if item.quantity <= 0:
                await db.carts.update_one(
                    {"user_id": user["user_id"]},
                    {"$pull": {"items": {"product_id": item.product_id, "size": item.size}}}
                )
            else:
                await db.carts.update_one(
                    {"user_id": user["user_id"]},
                    {"$set": {f"items.{i}.quantity": item.quantity}}
                )
            return {"message": "Cart updated"}
    
    raise HTTPException(status_code=404, detail="Item not found in cart")

@api_router.delete("/cart/item/{product_id}/{size}")
async def remove_from_cart(product_id: str, size: str, user: dict = Depends(get_current_user)):
    result = await db.carts.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"items": {"product_id": product_id, "size": size}}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.delete("/cart/clear")
async def clear_cart(user: dict = Depends(get_current_user)):
    await db.carts.delete_one({"user_id": user["user_id"]})
    return {"message": "Cart cleared"}

# ==================== WISHLIST ROUTES ====================

@api_router.get("/wishlist")
async def get_wishlist(user: dict = Depends(get_current_user)):
    wishlist = await db.wishlists.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not wishlist:
        return {"items": []}
    
    # Populate product details
    items = []
    for product_id in wishlist.get("products", []):
        product = await db.products.find_one(
            {"product_id": product_id, "status": "approved"},
            {"_id": 0}
        )
        if product:
            if isinstance(product.get('created_at'), str):
                product['created_at'] = datetime.fromisoformat(product['created_at'])
            items.append(product)
    
    return {"items": items}

@api_router.post("/wishlist/add")
async def add_to_wishlist(item: WishlistItem, user: dict = Depends(get_current_user)):
    # Verify product exists
    product = await db.products.find_one(
        {"product_id": item.product_id, "status": "approved"},
        {"_id": 0}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.wishlists.update_one(
        {"user_id": user["user_id"]},
        {"$addToSet": {"products": item.product_id}},
        upsert=True
    )
    
    return {"message": "Added to wishlist"}

@api_router.delete("/wishlist/{product_id}")
async def remove_from_wishlist(product_id: str, user: dict = Depends(get_current_user)):
    await db.wishlists.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"products": product_id}}
    )
    
    return {"message": "Removed from wishlist"}

# ==================== ORDER ROUTES ====================

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, user: dict = Depends(get_current_user)):
    order_id = f"order_{uuid.uuid4().hex[:12]}"
    
    # Validate items and calculate totals
    items = []
    subtotal = 0
    
    for item in order_data.items:
        product = await db.products.find_one(
            {"product_id": item.product_id, "status": "approved"},
            {"_id": 0}
        )
        
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        item_total = product["price"] * item.quantity
        subtotal += item_total
        
        items.append({
            "product_id": product["product_id"],
            "vendor_id": product["vendor_id"],
            "name": product["name"],
            "price": product["price"],
            "quantity": item.quantity,
            "size": item.size,
            "image": product["images"][0] if product["images"] else ""
        })
    
    # Calculate shipping (simple flat rate for demo)
    shipping_cost = 15.0 if order_data.shipping_address.country != "Ghana" else 5.0
    total = subtotal + shipping_cost
    
    order_doc = {
        "order_id": order_id,
        "customer_id": user["user_id"],
        "customer_email": user["email"],
        "items": items,
        "shipping_address": order_data.shipping_address.model_dump(),
        "subtotal": round(subtotal, 2),
        "shipping_cost": shipping_cost,
        "total": round(total, 2),
        "currency": order_data.currency,
        "payment_method": order_data.payment_method,
        "payment_status": "pending",
        "order_status": "pending",
        "tracking_number": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.carts.delete_one({"user_id": user["user_id"]})
    
    return {"order_id": order_id, "total": total, "currency": order_data.currency}

@api_router.get("/orders")
async def get_user_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"customer_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one(
        {"order_id": order_id, "customer_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if isinstance(order.get('created_at'), str):
        order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return order

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/stripe/checkout")
async def create_stripe_checkout(checkout: CheckoutRequest, request: Request, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    order = await db.orders.find_one(
        {"order_id": checkout.order_id, "customer_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    success_url = f"{checkout.origin_url}/order-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout.origin_url}/checkout?order_id={checkout.order_id}"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(order["total"]),
        currency=order["currency"].lower(),
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": checkout.order_id,
            "user_id": user["user_id"]
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction_doc = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.session_id,
        "order_id": checkout.order_id,
        "user_id": user["user_id"],
        "amount": float(order["total"]),
        "currency": order["currency"],
        "payment_method": "stripe",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction_doc)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/stripe/status/{session_id}")
async def get_stripe_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update payment transaction and order
    if status.payment_status == "paid":
        transaction = await db.payment_transactions.find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if transaction and transaction["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid"}}
            )
            
            await db.orders.update_one(
                {"order_id": transaction["order_id"]},
                {"$set": {"payment_status": "paid", "order_status": "processing"}}
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            session_id = webhook_response.session_id
            
            transaction = await db.payment_transactions.find_one(
                {"session_id": session_id},
                {"_id": 0}
            )
            
            if transaction and transaction["payment_status"] != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid"}}
                )
                
                await db.orders.update_one(
                    {"order_id": transaction["order_id"]},
                    {"$set": {"payment_status": "paid", "order_status": "processing"}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        return {"status": "error"}

# PayPal routes
@api_router.post("/payments/paypal/create")
async def create_paypal_order(checkout: CheckoutRequest, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one(
        {"order_id": checkout.order_id, "customer_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # For demo, return mock PayPal order
    # In production, integrate with PayPal SDK
    paypal_order_id = f"paypal_{uuid.uuid4().hex[:12]}"
    
    transaction_doc = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": paypal_order_id,
        "order_id": checkout.order_id,
        "user_id": user["user_id"],
        "amount": float(order["total"]),
        "currency": order["currency"],
        "payment_method": "paypal",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction_doc)
    
    return {
        "order_id": paypal_order_id,
        "status": "CREATED"
    }

@api_router.post("/payments/paypal/capture/{paypal_order_id}")
async def capture_paypal_order(paypal_order_id: str, user: dict = Depends(get_current_user)):
    # For demo, simulate capture
    transaction = await db.payment_transactions.find_one(
        {"session_id": paypal_order_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update payment status
    await db.payment_transactions.update_one(
        {"session_id": paypal_order_id},
        {"$set": {"payment_status": "paid"}}
    )
    
    await db.orders.update_one(
        {"order_id": transaction["order_id"]},
        {"$set": {"payment_status": "paid", "order_status": "processing"}}
    )
    
    return {"status": "COMPLETED"}

# Paystack routes
@api_router.post("/payments/paystack/initialize")
async def initialize_paystack(checkout: CheckoutRequest, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one(
        {"order_id": checkout.order_id, "customer_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    paystack_secret = os.environ.get("PAYSTACK_SECRET_KEY")
    
    if not paystack_secret:
        raise HTTPException(status_code=500, detail="Paystack not configured")
    
    # Convert amount to smallest unit
    amount_kobo = int(order["total"] * 100)
    reference = f"ref_{uuid.uuid4().hex[:16]}"
    callback_url = f"{checkout.origin_url}/payment/callback?reference={reference}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.paystack.co/transaction/initialize",
            headers={
                "Authorization": f"Bearer {paystack_secret}",
                "Content-Type": "application/json"
            },
            json={
                "email": user["email"],
                "amount": amount_kobo,
                "reference": reference,
                "callback_url": callback_url,
                "metadata": {
                    "order_id": checkout.order_id,
                    "user_id": user["user_id"]
                }
            }
        )
        
        result = response.json()
    
    if result.get("status"):
        transaction_doc = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "session_id": reference,
            "order_id": checkout.order_id,
            "user_id": user["user_id"],
            "amount": float(order["total"]),
            "currency": order["currency"],
            "payment_method": "paystack",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(transaction_doc)
        
        return {
            "authorization_url": result["data"]["authorization_url"],
            "reference": result["data"]["reference"]
        }
    
    raise HTTPException(status_code=400, detail=result.get("message", "Failed to initialize payment"))

@api_router.get("/payments/paystack/verify/{reference}")
async def verify_paystack(reference: str, user: dict = Depends(get_current_user)):
    paystack_secret = os.environ.get("PAYSTACK_SECRET_KEY")
    
    if not paystack_secret:
        raise HTTPException(status_code=500, detail="Paystack not configured")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.paystack.co/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {paystack_secret}"}
        )
        
        result = response.json()
    
    if result.get("status") and result["data"]["status"] == "success":
        transaction = await db.payment_transactions.find_one(
            {"session_id": reference},
            {"_id": 0}
        )
        
        if transaction and transaction["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": reference},
                {"$set": {"payment_status": "paid"}}
            )
            
            await db.orders.update_one(
                {"order_id": transaction["order_id"]},
                {"$set": {"payment_status": "paid", "order_status": "processing"}}
            )
        
        return {"status": "success", "data": result["data"]}
    
    return {"status": "failed"}

@api_router.post("/webhook/paystack")
async def paystack_webhook(request: Request):
    paystack_secret = os.environ.get("PAYSTACK_SECRET_KEY")
    
    if not paystack_secret:
        return {"status": "error"}
    
    signature = request.headers.get("x-paystack-signature")
    body = await request.body()
    
    computed_signature = hmac.new(
        paystack_secret.encode('utf-8'),
        body,
        hashlib.sha512
    ).hexdigest()
    
    if not hmac.compare_digest(computed_signature, signature or ""):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    event = await request.json()
    
    if event.get("event") == "charge.success":
        reference = event["data"]["reference"]
        
        transaction = await db.payment_transactions.find_one(
            {"session_id": reference},
            {"_id": 0}
        )
        
        if transaction and transaction["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": reference},
                {"$set": {"payment_status": "paid"}}
            )
            
            await db.orders.update_one(
                {"order_id": transaction["order_id"]},
                {"$set": {"payment_status": "paid", "order_status": "processing"}}
            )
    
    return {"status": "ok"}

# ==================== REVIEW ROUTES ====================

@api_router.post("/reviews")
async def create_review(review: ReviewCreate, user: dict = Depends(get_current_user)):
    # Check if user purchased the product
    order = await db.orders.find_one({
        "customer_id": user["user_id"],
        "items.product_id": review.product_id,
        "payment_status": "paid"
    })
    
    # Allow review without purchase for demo
    
    review_id = f"review_{uuid.uuid4().hex[:12]}"
    
    review_doc = {
        "review_id": review_id,
        "product_id": review.product_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "rating": review.rating,
        "comment": review.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review.product_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    
    await db.products.update_one(
        {"product_id": review.product_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(reviews)}}
    )
    
    return {"review_id": review_id}

@api_router.get("/reviews/{product_id}")
async def get_product_reviews(product_id: str):
    reviews = await db.reviews.find(
        {"product_id": product_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    for review in reviews:
        if isinstance(review.get('created_at'), str):
            review['created_at'] = datetime.fromisoformat(review['created_at'])
    
    return reviews

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/dashboard")
async def get_admin_dashboard(user: dict = Depends(get_admin_user)):
    # Get statistics
    total_products = await db.products.count_documents({})
    pending_products = await db.products.count_documents({"status": "pending"})
    total_orders = await db.orders.count_documents({})
    total_vendors = await db.users.count_documents({"role": "vendor"})
    total_customers = await db.users.count_documents({"role": "customer"})
    
    # Calculate revenue with 15% platform commission
    paid_orders = await db.orders.find({"payment_status": "paid"}, {"_id": 0}).to_list(1000)
    total_revenue = sum(order.get("total", 0) for order in paid_orders)
    platform_commission = total_revenue * 0.15
    vendor_earnings_total = total_revenue * 0.85
    
    # Get confirmed deliveries count
    confirmed_deliveries = await db.orders.count_documents({"delivery_confirmed": True})
    pending_confirmations = await db.orders.count_documents({"payment_status": "paid", "delivery_confirmed": {"$ne": True}})
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    for order in recent_orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return {
        "total_products": total_products,
        "pending_products": pending_products,
        "total_orders": total_orders,
        "total_vendors": total_vendors,
        "total_customers": total_customers,
        "total_revenue": round(total_revenue, 2),
        "platform_commission": round(platform_commission, 2),
        "vendor_earnings_total": round(vendor_earnings_total, 2),
        "confirmed_deliveries": confirmed_deliveries,
        "pending_confirmations": pending_confirmations,
        "recent_orders": recent_orders
    }

@api_router.get("/admin/analytics/vendors")
async def get_vendor_analytics(user: dict = Depends(get_admin_user)):
    """Get detailed analytics for all vendors including their earnings"""
    vendors = await db.users.find({"role": "vendor"}, {"_id": 0, "password": 0}).to_list(100)
    
    vendor_analytics = []
    for vendor in vendors:
        vendor_id = vendor["user_id"]
        
        # Get vendor's products
        products = await db.products.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(100)
        product_ids = [p["product_id"] for p in products]
        
        # Get vendor's orders (orders containing their products)
        vendor_orders = []
        all_orders = await db.orders.find({"payment_status": "paid"}, {"_id": 0}).to_list(1000)
        
        vendor_revenue = 0
        for order in all_orders:
            for item in order.get("items", []):
                if item.get("product_id") in product_ids:
                    item_total = item.get("price", 0) * item.get("quantity", 1)
                    vendor_revenue += item_total
                    if order not in vendor_orders:
                        vendor_orders.append(order)
        
        platform_commission = vendor_revenue * 0.15
        net_earnings = vendor_revenue * 0.85
        
        # Get confirmed deliveries for this vendor
        confirmed_orders = [o for o in vendor_orders if o.get("delivery_confirmed")]
        pending_payout = sum(
            sum(item.get("price", 0) * item.get("quantity", 1) 
                for item in o.get("items", []) 
                if item.get("product_id") in product_ids) * 0.85
            for o in vendor_orders if not o.get("delivery_confirmed")
        )
        paid_payout = sum(
            sum(item.get("price", 0) * item.get("quantity", 1) 
                for item in o.get("items", []) 
                if item.get("product_id") in product_ids) * 0.85
            for o in confirmed_orders
        )
        
        # Get vote counts for vendor's products
        total_votes = sum(p.get("vote_count", 0) for p in products)
        
        vendor_analytics.append({
            "vendor_id": vendor_id,
            "name": vendor.get("name"),
            "email": vendor.get("email"),
            "brand_name": vendor.get("vendor_profile", {}).get("brand_name"),
            "total_products": len(products),
            "approved_products": len([p for p in products if p.get("status") == "approved"]),
            "pending_products": len([p for p in products if p.get("status") == "pending"]),
            "total_orders": len(vendor_orders),
            "total_revenue": round(vendor_revenue, 2),
            "platform_commission": round(platform_commission, 2),
            "net_earnings": round(net_earnings, 2),
            "pending_payout": round(pending_payout, 2),
            "paid_payout": round(paid_payout, 2),
            "total_votes": total_votes,
            "created_at": vendor.get("created_at"),
            "is_active": vendor.get("is_active", True)
        })
    
    return vendor_analytics

@api_router.get("/admin/vendors/{vendor_id}/products")
async def get_vendor_products_admin(vendor_id: str, user: dict = Depends(get_admin_user)):
    """Get all products for a specific vendor (admin view)"""
    products = await db.products.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(100)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.get("/admin/voting-stats")
async def get_voting_stats(user: dict = Depends(get_admin_user)):
    """Get voting statistics for all products (view only)"""
    products = await db.products.find(
        {"status": "approved"},
        {"_id": 0, "product_id": 1, "name": 1, "vote_count": 1, "vendor_name": 1, "images": 1}
    ).sort("vote_count", -1).to_list(100)
    
    total_votes = sum(p.get("vote_count", 0) for p in products)
    
    return {
        "total_votes": total_votes,
        "products": products,
        "top_voted": products[0] if products else None
    }

@api_router.get("/admin/products/pending")
async def get_pending_products(user: dict = Depends(get_admin_user)):
    products = await db.products.find({"status": "pending"}, {"_id": 0}).to_list(100)
    
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    
    return products

@api_router.put("/admin/products/{product_id}/approve")
async def approve_product(product_id: str, approval: ProductApproval, user: dict = Depends(get_admin_user)):
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"status": approval.status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": f"Product {approval.status}"}

@api_router.put("/admin/products/{product_id}/featured")
async def toggle_featured(product_id: str, update: FeaturedProductUpdate, user: dict = Depends(get_admin_user)):
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": {"featured": update.featured}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Featured status updated"}

@api_router.get("/admin/vendors")
async def get_all_vendors(user: dict = Depends(get_admin_user)):
    vendors = await db.users.find({"role": "vendor"}, {"_id": 0, "password": 0}).to_list(100)
    
    for vendor in vendors:
        if isinstance(vendor.get('created_at'), str):
            vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
    
    return vendors

@api_router.put("/admin/vendors/{user_id}/status")
async def update_vendor_status(user_id: str, is_active: bool, user: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"user_id": user_id, "role": "vendor"},
        {"$set": {"is_active": is_active}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {"message": "Vendor status updated"}

@api_router.get("/admin/orders")
async def get_all_orders(user: dict = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
    
    return orders

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, order_status: str, tracking_number: Optional[str] = None, user: dict = Depends(get_admin_user)):
    update_data = {"order_status": order_status}
    if tracking_number:
        update_data["tracking_number"] = tracking_number
    
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated"}

@api_router.get("/admin/customers")
async def get_all_customers(user: dict = Depends(get_admin_user)):
    customers = await db.users.find({"role": "customer"}, {"_id": 0, "password": 0}).to_list(100)
    
    for customer in customers:
        if isinstance(customer.get('created_at'), str):
            customer['created_at'] = datetime.fromisoformat(customer['created_at'])
    
    return customers

# ==================== DISCOUNT CODE ROUTES ====================

@api_router.post("/admin/discounts")
async def create_discount(discount: DiscountCodeCreate, user: dict = Depends(get_admin_user)):
    existing = await db.discount_codes.find_one({"code": discount.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Discount code already exists")
    
    discount_doc = {
        "code": discount.code.upper(),
        "discount_percent": discount.discount_percent,
        "max_uses": discount.max_uses,
        "current_uses": 0,
        "expires_at": discount.expires_at.isoformat(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.discount_codes.insert_one(discount_doc)
    
    return {"message": "Discount code created"}

@api_router.get("/admin/discounts")
async def get_discounts(user: dict = Depends(get_admin_user)):
    discounts = await db.discount_codes.find({}, {"_id": 0}).to_list(100)
    return discounts

@api_router.post("/discounts/validate")
async def validate_discount(code: str, user: dict = Depends(get_current_user)):
    discount = await db.discount_codes.find_one({"code": code.upper()}, {"_id": 0})
    
    if not discount:
        raise HTTPException(status_code=404, detail="Invalid discount code")
    
    if not discount["is_active"]:
        raise HTTPException(status_code=400, detail="Discount code is inactive")
    
    if discount["current_uses"] >= discount["max_uses"]:
        raise HTTPException(status_code=400, detail="Discount code has reached maximum uses")
    
    expires_at = datetime.fromisoformat(discount["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Discount code has expired")
    
    return {"discount_percent": discount["discount_percent"]}

# ==================== NEWSLETTER ROUTES ====================

@api_router.post("/newsletter/subscribe")
async def subscribe_newsletter(data: NewsletterSubscribe):
    existing = await db.newsletter.find_one({"email": data.email})
    
    if existing:
        return {"message": "Already subscribed"}
    
    await db.newsletter.insert_one({
        "email": data.email,
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Subscribed successfully"}

# ==================== UTILITY ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Black Star Threads API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Create default admin user if not exists
    admin_email = "easante@nitlimited.com"
    admin = await db.users.find_one({"email": admin_email})
    
    if not admin:
        admin_doc = {
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": admin_email,
            "password": hash_password("admin123"),
            "name": "Admin",
            "role": "admin",
            "picture": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "vendor_profile": None
        }
        await db.users.insert_one(admin_doc)
        logger.info("Default admin user created")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.products.create_index("product_id", unique=True)
    await db.products.create_index("vendor_id")
    await db.products.create_index("status")
    await db.orders.create_index("order_id", unique=True)
    await db.orders.create_index("customer_id")
    
    logger.info("Database indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
