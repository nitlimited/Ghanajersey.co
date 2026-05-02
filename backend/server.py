from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Cookie, UploadFile, File
from fastapi.responses import JSONResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from botocore.exceptions import BotoCoreError, ClientError
from pymongo.errors import DuplicateKeyError
import os
import logging
import json
import re
from pathlib import Path
from io import BytesIO
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import httpx
import hmac
import hashlib
import requests
import boto3
import stripe
import secrets
from PIL import Image, ImageOps
from urllib.parse import urlparse, urlunparse
from xml.sax.saxutils import escape as xml_escape

ROOT_DIR = Path(__file__).parent
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"
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
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
stripe.api_key = STRIPE_API_KEY

# Object Storage Config
APP_NAME = "blackstar-threads"
S3_BUCKET = os.environ.get('S3_BUCKET')
S3_REGION = os.environ.get('S3_REGION')
S3_ENDPOINT_URL = os.environ.get('S3_ENDPOINT_URL')
R2_PUBLIC_URL = os.environ.get('R2_PUBLIC_URL', '').rstrip('/')
s3_client = None

# Paystack Config
PAYSTACK_SECRET_KEY = os.environ.get('PAYSTACK_SECRET_KEY')
PAYSTACK_PUBLIC_KEY = os.environ.get('PAYSTACK_PUBLIC_KEY')
PAYSTACK_BASE_URL = "https://api.paystack.co"

# Email Config
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "Black Star Threads <no-reply@ghanajersey.co>")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "easante@nitlimited.com")

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

# ==================== OBJECT STORAGE FUNCTIONS ====================

async def send_resend_email(to_email: str, subject: str, html: str, text: Optional[str] = None) -> bool:
    """Send transactional email with Resend when configured."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set; skipping email '%s' to %s", subject, to_email)
        return False

    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
        return True
    except Exception as exc:
        logger.error("Failed to send Resend email to %s: %s", to_email, exc)
        return False

def build_confirmation_link(request: Request, order_id: str, token: str) -> str:
    base_url = os.environ.get("FRONTEND_URL") or str(request.base_url).rstrip("/")
    return f"{base_url}/api/orders/{order_id}/confirm/{token}"

async def notify_admin(subject: str, html: str, text: Optional[str] = None) -> bool:
    return await send_resend_email(ADMIN_EMAIL, subject, html, text=text)

def get_frontend_base_url(request: Optional[Request] = None) -> str:
    if os.environ.get("FRONTEND_URL"):
        return os.environ["FRONTEND_URL"].rstrip("/")
    if request:
        return str(request.base_url).rstrip("/")
    return "https://ghanajersey.co"

def build_vendor_email_verification_link(token: str, request: Optional[Request] = None) -> str:
    return f"{get_frontend_base_url(request)}/vendor/verify-email?token={token}"

def build_password_reset_link(token: str, request: Optional[Request] = None) -> str:
    return f"{get_frontend_base_url(request)}/auth?reset_token={token}"

def build_vendor_verification_email(name: str, verification_link: str) -> str:
    return f"""
    <div>
      <h2>Verify your vendor email</h2>
      <p>Hi {name},</p>
      <p>Thanks for registering as a vendor on GhanaJersey.co.</p>
      <p>Please verify your email address to continue to the vendor onboarding process.</p>
      <p><a href="{verification_link}" style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;">Verify Email And Continue</a></p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p>{verification_link}</p>
    </div>
    """

def build_password_reset_email(name: str, reset_link: str) -> str:
    return f"""
    <div>
      <h2>Reset your GhanaJersey.co password</h2>
      <p>Hi {name},</p>
      <p>We received a request to reset the password for your account.</p>
      <p><a href="{reset_link}" style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;">Reset Password</a></p>
      <p>This link expires in 1 hour. If you did not request it, you can safely ignore this email.</p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p>{reset_link}</p>
    </div>
    """

def normalize_email_address(email: str) -> str:
    return str(email or "").strip().lower()

def hash_token(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()

async def find_user_by_email(email: str, projection: Optional[dict] = None):
    normalized_email = normalize_email_address(email)
    if not normalized_email:
        return None
    query = {
        "$or": [
            {"email_normalized": normalized_email},
            {"email": {"$regex": f"^{re.escape(normalized_email)}$", "$options": "i"}}
        ]
    }
    return await db.users.find_one(query, projection)

def slugify_text(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").strip().lower())
    return slug.strip("-") or f"post-{uuid.uuid4().hex[:8]}"

def strip_html_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value or "").strip()

def estimate_reading_minutes(content: str) -> int:
    words = len(strip_html_tags(content).split())
    return max(1, round(words / 200)) if words else 1

async def ensure_unique_blog_slug(base_slug: str, existing_blog_id: Optional[str] = None) -> str:
    slug = slugify_text(base_slug)
    suffix = 1
    while True:
        existing = await db.blogs.find_one({"slug": slug}, {"_id": 0, "blog_id": 1})
        if not existing or existing.get("blog_id") == existing_blog_id:
            return slug
        suffix += 1
        slug = f"{slugify_text(base_slug)}-{suffix}"

async def ensure_unique_product_slug(base_slug: str, existing_product_id: Optional[str] = None) -> str:
    slug = slugify_text(base_slug)
    suffix = 1
    while True:
        existing = await db.products.find_one({"slug": slug}, {"_id": 0, "product_id": 1})
        if not existing or existing.get("product_id") == existing_product_id:
            return slug
        suffix += 1
        slug = f"{slugify_text(base_slug)}-{suffix}"

async def hide_vendor_products(vendor_id: str, hidden_status: str, admin_user_id: str) -> int:
    now = datetime.now(timezone.utc).isoformat()
    products = await db.products.find({"vendor_id": vendor_id}, {"_id": 0}).to_list(1000)
    hidden_count = 0

    for product in products:
        update_data = {
            "status": hidden_status,
            "hidden_by_vendor_status": True,
            "vendor_hidden_status": hidden_status,
            "vendor_hidden_at": now,
            "vendor_hidden_by": admin_user_id
        }
        if not product.get("hidden_by_vendor_status"):
            update_data["status_before_vendor_hold"] = product.get("status", "pending")

        await db.products.update_one(
            {"product_id": product["product_id"]},
            {"$set": update_data}
        )
        hidden_count += 1

    return hidden_count

async def restore_vendor_products(vendor_id: str, admin_user_id: str) -> int:
    now = datetime.now(timezone.utc).isoformat()
    products = await db.products.find(
        {
            "vendor_id": vendor_id,
            "hidden_by_vendor_status": True,
            "status": "vendor_suspended"
        },
        {"_id": 0}
    ).to_list(1000)
    restored_count = 0

    for product in products:
        restored_status = product.get("status_before_vendor_hold") or "pending"
        await db.products.update_one(
            {"product_id": product["product_id"]},
            {
                "$set": {
                    "status": restored_status,
                    "vendor_restored_at": now,
                    "vendor_restored_by": admin_user_id
                },
                "$unset": {
                    "hidden_by_vendor_status": "",
                    "vendor_hidden_status": "",
                    "vendor_hidden_at": "",
                    "vendor_hidden_by": "",
                    "status_before_vendor_hold": ""
                }
            }
        )
        restored_count += 1

    return restored_count

def normalize_blog_document(blog: dict, request: Optional[Request] = None) -> dict:
    base_url = get_frontend_base_url(request)
    blog["url"] = f"{base_url}/blog/{blog['slug']}"
    blog["meta_title"] = blog.get("meta_title") or blog.get("title")
    blog["meta_description"] = blog.get("meta_description") or blog.get("excerpt") or strip_html_tags(blog.get("content", ""))[:160]
    blog["og_image"] = blog.get("og_image") or blog.get("featured_image")
    blog["canonical_url"] = blog.get("canonical_url") or blog["url"]
    blog["keywords"] = blog.get("keywords") or []
    blog["tags"] = blog.get("tags") or []
    return blog

def build_file_url(path: str) -> str:
    if R2_PUBLIC_URL and path:
        return f"{R2_PUBLIC_URL}/{path}"
    return f"/api/files/{path}"

def extract_storage_path(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    if value.startswith("/api/files/"):
        return value[len("/api/files/"):]
    parsed = urlparse(value)
    if parsed.path.startswith("/api/files/"):
        return parsed.path[len("/api/files/"):]
    marker = f"/{APP_NAME}/"
    if marker in parsed.path:
        return f"{APP_NAME}/" + parsed.path.split(marker, 1)[1]
    if value.startswith(f"{APP_NAME}/"):
        return value
    return value

def normalize_image_url(image: str) -> str:
    if not image:
        return image
    if image.startswith("/api/files/"):
        return image
    if R2_PUBLIC_URL and image.startswith(R2_PUBLIC_URL):
        return image
    if image.startswith(f"{APP_NAME}/"):
        return build_file_url(image)
    marker = f"/{APP_NAME}/"
    if marker in image:
        return build_file_url(f"{APP_NAME}/" + image.split(marker, 1)[1])
    return image

def normalize_product_document(product: dict) -> dict:
    product["images"] = [normalize_image_url(image) for image in product.get("images", []) if image]
    product["slug"] = product.get("slug") or slugify_text(product.get("name") or product.get("product_id"))
    product["url"] = f"{get_frontend_base_url()}/products/{product['slug']}/{product.get('product_id') or product['slug']}"
    product["meta_title"] = product.get("meta_title") or f"{product.get('name', 'Ghana Jersey')} | Ghana Jersey"
    product["meta_description"] = product.get("meta_description") or (
        f"Buy {product.get('name', 'this Ghana jersey')} on GhanaJersey.co. "
        "Shop Ghana jersey styles, Black Stars jersey looks, and shipping for buyers in Ghana and abroad."
    )
    product["focus_keywords"] = product.get("focus_keywords") or []
    return product

def add_currency_amount(target: Dict[str, float], currency: Optional[str], amount: float) -> None:
    normalized_currency = (currency or "USD").upper()
    target[normalized_currency] = round(target.get(normalized_currency, 0) + float(amount or 0), 2)

def commission_breakdown(source: Dict[str, float], rate: float) -> Dict[str, float]:
    return {
        currency: round(amount * rate, 2)
        for currency, amount in source.items()
    }

def format_money_breakdown(source: Dict[str, float]) -> str:
    if not source:
        return "USD 0.00"
    return " • ".join(f"{currency} {amount:.2f}" for currency, amount in sorted(source.items()))

def build_login_code() -> str:
    return f"{secrets.randbelow(900000) + 100000}"

def build_vendor_login_email(name: str, code: str) -> str:
    return f"""
    <div>
      <h2>Vendor sign-in verification</h2>
      <p>Hi {name},</p>
      <p>Use this verification code to complete your vendor sign-in:</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">{code}</p>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this sign-in, you can safely ignore this email.</p>
    </div>
    """

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "JPG/JPEG",
    "image/png": "PNG",
    "image/webp": "WEBP",
}
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
PRODUCT_IMAGE_MIN_WIDTH = 1200
PRODUCT_IMAGE_MIN_HEIGHT = 1500
PRODUCT_IMAGE_RECOMMENDED_WIDTH = 1600
PRODUCT_IMAGE_RECOMMENDED_HEIGHT = 2000

def open_image_for_validation(data: bytes) -> Image.Image:
    try:
        image = Image.open(BytesIO(data))
        image.load()
        return image
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image") from exc

def border_white_ratio(image: Image.Image) -> float:
    rgb_image = image.convert("RGB")
    width, height = rgb_image.size
    border_x = max(12, int(width * 0.06))
    border_y = max(12, int(height * 0.06))
    pixels = []

    for x in range(width):
        for y in range(border_y):
            pixels.append(rgb_image.getpixel((x, y)))
        for y in range(height - border_y, height):
            pixels.append(rgb_image.getpixel((x, y)))

    for y in range(border_y, height - border_y):
        for x in range(border_x):
            pixels.append(rgb_image.getpixel((x, y)))
        for x in range(width - border_x, width):
            pixels.append(rgb_image.getpixel((x, y)))

    if not pixels:
        return 0.0

    white_pixels = 0
    for r, g, b in pixels:
        if min(r, g, b) >= 232 and max(r, g, b) - min(r, g, b) <= 22:
            white_pixels += 1

    return white_pixels / len(pixels)

def validate_image_upload(
    *,
    file: UploadFile,
    data: bytes,
    upload_type: str,
    require_white_background: bool = False,
) -> None:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Allowed image formats: JPG, JPEG, PNG, WEBP")

    image = open_image_for_validation(data)
    width, height = image.size

    if upload_type == "product":
        if len(data) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(status_code=400, detail="Image size must be 5MB or less")
        if width < PRODUCT_IMAGE_MIN_WIDTH or height < PRODUCT_IMAGE_MIN_HEIGHT:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Product images must be at least "
                    f"{PRODUCT_IMAGE_MIN_WIDTH}x{PRODUCT_IMAGE_MIN_HEIGHT}px. "
                    f"Recommended size is {PRODUCT_IMAGE_RECOMMENDED_WIDTH}x{PRODUCT_IMAGE_RECOMMENDED_HEIGHT}px."
                ),
            )
        if require_white_background:
            ratio = border_white_ratio(image)
            if ratio < 0.92:
                raise HTTPException(
                    status_code=400,
                    detail="Front and back product images must use a clean white background."
                )

def prepare_product_image_for_storage(data: bytes, content_type: str) -> tuple[bytes, str, str]:
    image = open_image_for_validation(data)
    prepared = ImageOps.exif_transpose(image)

    if prepared.mode in ("RGBA", "LA") or (prepared.mode == "P" and "transparency" in prepared.info):
        background = Image.new("RGBA", prepared.size, (255, 255, 255, 255))
        background.alpha_composite(prepared.convert("RGBA"))
        prepared = background.convert("RGB")
    else:
        prepared = prepared.convert("RGB")

    prepared = ImageOps.fit(
        prepared,
        (PRODUCT_IMAGE_RECOMMENDED_WIDTH, PRODUCT_IMAGE_RECOMMENDED_HEIGHT),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )

    output = BytesIO()
    prepared.save(output, format="JPEG", quality=92, optimize=True)
    return output.getvalue(), "image/jpeg", "jpg"

def init_storage():
    """Initialize S3-compatible storage client once and reuse it."""
    global s3_client
    if s3_client:
        return s3_client

    if not S3_BUCKET:
        logger.warning("S3_BUCKET not set, file storage unavailable")
        return None

    try:
        client_kwargs = {}
        if S3_REGION:
            client_kwargs["region_name"] = S3_REGION
        if S3_ENDPOINT_URL:
            parsed_endpoint = urlparse(S3_ENDPOINT_URL)
            normalized_endpoint = S3_ENDPOINT_URL

            # Cloudflare R2 API endpoint should not include the bucket path.
            # If a bucket URL was pasted in by mistake, strip the path and keep only scheme + host.
            if parsed_endpoint.scheme and parsed_endpoint.netloc and parsed_endpoint.path not in ("", "/"):
                normalized_endpoint = urlunparse((
                    parsed_endpoint.scheme,
                    parsed_endpoint.netloc,
                    "",
                    "",
                    "",
                    "",
                ))
                logger.warning(
                    "Normalized storage endpoint from %s to %s for R2 compatibility",
                    S3_ENDPOINT_URL,
                    normalized_endpoint,
                )

            client_kwargs["endpoint_url"] = normalized_endpoint
        if os.environ.get("AWS_ACCESS_KEY_ID"):
            client_kwargs["aws_access_key_id"] = os.environ.get("AWS_ACCESS_KEY_ID")
        if os.environ.get("AWS_SECRET_ACCESS_KEY"):
            client_kwargs["aws_secret_access_key"] = os.environ.get("AWS_SECRET_ACCESS_KEY")
        if os.environ.get("AWS_SESSION_TOKEN"):
            client_kwargs["aws_session_token"] = os.environ.get("AWS_SESSION_TOKEN")

        s3_client = boto3.client("s3", **client_kwargs)
        logger.info("S3-compatible storage initialized successfully")
        return s3_client
    except Exception as e:
        logger.error(f"Failed to initialize storage: {e}")
        return None

async def store_uploaded_image(
    file: UploadFile,
    user_id: str,
    folder: str,
    *,
    upload_type: str,
    require_white_background: bool = False,
) -> dict:
    """Upload an image to S3-compatible storage and persist file metadata."""
    data = await file.read()
    validate_image_upload(
        file=file,
        data=data,
        upload_type=upload_type,
        require_white_background=require_white_background,
    )

    content_type = file.content_type
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    if upload_type == "product":
        data, content_type, ext = prepare_product_image_for_storage(data, file.content_type)

    file_path = f"{APP_NAME}/{folder}/{user_id}/{uuid.uuid4().hex[:12]}.{ext}"

    result = put_object(file_path, data, content_type)
    file_doc = {
        "file_id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(data)),
        "user_id": user_id,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.uploaded_files.insert_one(file_doc)

    return {
        "file_id": file_doc["file_id"],
        "path": result["path"],
        "url": build_file_url(result["path"]),
        "size": file_doc["size"]
    }

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to S3-compatible object storage."""
    client = init_storage()
    if not client or not S3_BUCKET:
        raise HTTPException(status_code=500, detail="Storage not initialized")

    try:
        client.put_object(
            Bucket=S3_BUCKET,
            Key=path,
            Body=data,
            ContentType=content_type,
        )
        return {"path": path, "size": len(data)}
    except (BotoCoreError, ClientError) as e:
        logger.error(f"Failed to upload object: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file") from e

def get_object(path: str) -> tuple:
    """Download file from S3-compatible object storage."""
    client = init_storage()
    if not client or not S3_BUCKET:
        raise HTTPException(status_code=500, detail="Storage not initialized")

    try:
        resp = client.get_object(Bucket=S3_BUCKET, Key=path)
        return resp["Body"].read(), resp.get("ContentType", "application/octet-stream")
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code in {"NoSuchKey", "404"}:
            raise HTTPException(status_code=404, detail="File not found") from e
        logger.error(f"Failed to retrieve object: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve file") from e

def delete_object(path: str) -> None:
    """Delete file from S3-compatible object storage."""
    client = init_storage()
    if not client or not S3_BUCKET:
        raise HTTPException(status_code=500, detail="Storage not initialized")

    try:
        client.delete_object(Bucket=S3_BUCKET, Key=path)
    except (BotoCoreError, ClientError) as e:
        logger.error(f"Failed to delete object: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete file") from e

async def send_order_paid_notifications(order_id: str) -> None:
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        return

    if order.get("order_notifications_sent_at"):
        return

    customer_name = order.get("shipping_address", {}).get("full_name") or "Customer"
    customer_email = order.get("customer_email")
    formatted_total = f"{order.get('currency', 'GHS')} {float(order.get('total', 0)):.2f}"
    payment_method = order.get("payment_method", "payment")
    items = order.get("items", [])

    if customer_email:
        await send_resend_email(
            customer_email,
            f"Payment confirmed: {order_id}",
            f"""
            <div>
              <h2>Your payment was received</h2>
              <p>Hi {customer_name},</p>
              <p>Your payment for order <strong>{order_id}</strong> has been confirmed.</p>
              <p>Total paid: <strong>{formatted_total}</strong></p>
              <p>Payment method: {payment_method}</p>
              <p>We will keep you updated as the vendors process your order.</p>
            </div>
            """,
            text=(
                f"Hi {customer_name}, your payment for order {order_id} has been confirmed. "
                f"Total paid: {formatted_total}. Payment method: {payment_method}."
            ),
        )

    await notify_admin(
        f"Payment received: {order_id}",
        f"""
        <div>
          <h2>Payment received</h2>
          <p>Order <strong>{order_id}</strong> has been paid successfully.</p>
          <p>Customer: {customer_name} ({customer_email or 'No email'})</p>
          <p>Total paid: <strong>{formatted_total}</strong></p>
          <p>Payment method: {payment_method}</p>
        </div>
        """,
        text=(
            f"Payment received for order {order_id}. Customer: {customer_name} "
            f"({customer_email or 'No email'}). Total paid: {formatted_total}. "
            f"Payment method: {payment_method}."
        ),
    )

    vendor_ids = list({item["vendor_id"] for item in items if item.get("vendor_id")})
    if vendor_ids:
        vendors = await db.users.find(
            {"user_id": {"$in": vendor_ids}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1},
        ).to_list(len(vendor_ids))

        items_by_vendor: Dict[str, List[Dict[str, Any]]] = {}
        for item in items:
            vendor_id = item.get("vendor_id")
            if vendor_id:
                items_by_vendor.setdefault(vendor_id, []).append(item)

        for vendor in vendors:
            vendor_items = items_by_vendor.get(vendor["user_id"], [])
            if not vendor_items or not vendor.get("email"):
                continue

            item_lines = "".join(
                f"<li>{item['name']} x {item['quantity']} ({item['size']})</li>"
                for item in vendor_items
            )
            await send_resend_email(
                vendor["email"],
                f"Paid order received: {order_id}",
                f"""
                <div>
                  <h2>Payment confirmed for a new order</h2>
                  <p>Hi {vendor.get('name') or 'Vendor'},</p>
                  <p>Order <strong>{order_id}</strong> has been paid and is ready for processing.</p>
                  <ul>{item_lines}</ul>
                  <p>Customer: {customer_name}</p>
                </div>
                """,
                text=(
                    f"Hi {vendor.get('name') or 'Vendor'}, order {order_id} has been paid "
                    f"and is ready for processing."
                ),
            )

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"order_notifications_sent_at": datetime.now(timezone.utc).isoformat()}}
    )


async def _mark_transaction_paid(session_id: str):
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

        await send_order_paid_notifications(transaction["order_id"])

    return transaction

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp", "pdf": "application/pdf",
    "json": "application/json", "csv": "text/csv", "txt": "text/plain"
}

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

class DeleteUploadedFileRequest(BaseModel):
    path: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class VendorVerificationResendRequest(BaseModel):
    email: Optional[EmailStr] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
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
    slug: Optional[str] = None
    price: float  # USD price
    price_ghs: Optional[float] = None  # GHS price (optional, for Ghanaian customers)
    currency: str = "USD"
    category: str  # official-tournament, streetwear, fan, retro, creative-designer, local-club
    jersey_type: str = "fan"  # original, fan
    sizes: List[str]
    stock: int
    images: List[str]
    tags: Optional[List[str]] = []
    is_limited_edition: bool = False
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    focus_keywords: Optional[List[str]] = []
    # Customization options
    allows_customization: bool = False
    customization_price: Optional[float] = 0.0
    customization_price_ghs: Optional[float] = None  # GHS customization price

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    price: Optional[float] = None
    price_ghs: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    jersey_type: Optional[str] = None
    sizes: Optional[List[str]] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    is_limited_edition: Optional[bool] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    focus_keywords: Optional[List[str]] = None
    # Customization options
    allows_customization: Optional[bool] = None
    customization_price: Optional[float] = None
    customization_price_ghs: Optional[float] = None

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str
    slug: str
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
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    focus_keywords: List[str] = []
    rating: float = 0.0
    review_count: int = 0
    vote_count: int = 0
    created_at: datetime

# Cart Models
# Customization Model
class Customization(BaseModel):
    name: Optional[str] = None
    number: Optional[str] = None
    price: Optional[float] = 0.0

class CartItem(BaseModel):
    product_id: str
    quantity: int
    size: str
    customization: Optional[Customization] = None

class CartItemResponse(BaseModel):
    product_id: str
    name: str
    price: float
    currency: str
    quantity: int
    size: str
    image: str
    customization: Optional[dict] = None

# Wishlist Models
class WishlistItem(BaseModel):
    product_id: str

# User Activity Models
class UserActivityCreate(BaseModel):
    action: str  # view, click, browse, add_to_cart, purchase
    product_id: Optional[str] = None
    category: Optional[str] = None

class ActivitySync(BaseModel):
    recently_viewed: List[dict] = []
    category_preferences: Dict[str, float] = {}

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

# Paystack Payment Models
class PaystackInitialize(BaseModel):
    order_id: str
    email: str
    callback_url: str

class PaystackVerifyResponse(BaseModel):
    status: str
    message: str
    order_id: Optional[str] = None
    amount: Optional[float] = None

# Review Models
class ReviewCreate(BaseModel):
    product_id: str
    name: str
    email: EmailStr
    rating: int = Field(ge=1, le=5)
    comment: str

class ReviewResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str
    product_id: str
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

class BlogBase(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: str
    featured_image: Optional[str] = None
    featured_image_alt: Optional[str] = None
    category: Optional[str] = "News"
    tags: List[str] = []
    keywords: List[str] = []
    author_name: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    canonical_url: Optional[str] = None
    og_image: Optional[str] = None
    is_published: bool = False
    publish_at: Optional[str] = None

class BlogCreate(BlogBase):
    pass

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image: Optional[str] = None
    featured_image_alt: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    author_name: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    canonical_url: Optional[str] = None
    og_image: Optional[str] = None
    is_published: Optional[bool] = None
    publish_at: Optional[str] = None

# Newsletter Models
class NewsletterSubscribe(BaseModel):
    email: EmailStr

# Vendor Onboarding Models
class VendorIdentity(BaseModel):
    full_name: str
    business_name: str
    phone_number: str
    email: str
    city_location: str
    social_handles: List[dict] = []  # [{platform: str, handle: str}]
    years_in_business: str  # "less_than_6_months", "6_months_to_1_year", "1_to_3_years", "3_plus_years"

class BusinessLegitimacy(BaseModel):
    sells_online_offline: str  # "online", "offline", "both"
    selling_platforms: List[str] = []  # instagram, whatsapp, physical_shop, tiktok, other_website, multiple
    jerseys_per_month: str  # "1_10", "10_30", "30_100", "100_plus"

class InventoryInfo(BaseModel):
    keeps_stock: str  # "yes_ready_to_ship", "no_made_after_order"
    stock_quantity: str  # "1_20", "20_50", "50_100", "100_plus"
    stock_sizes: List[str] = []  # S, M, L, XL, XXL

class ProductionCapacity(BaseModel):
    weekly_capacity: str  # "5_10", "10_30", "30_100", "100_plus"
    production_time: str  # "same_day", "1_2_days", "3_5_days", "1_week_plus"

class DeliveryCapability(BaseModel):
    delivery_methods: List[str] = []  # bolt, courier, ghana_post, pickup, multiple
    city_delivery_time: str  # "same_day", "1_2_days", "2_4_days", "5_plus_days"
    delivers_outside_city: bool = False
    delivers_outside_ghana: bool = False
    accra_delivery_time: Optional[str] = None
    central_western_delivery_time: Optional[str] = None
    eastern_volta_delivery_time: Optional[str] = None
    ashanti_bono_delivery_time: Optional[str] = None
    northern_upper_delivery_time: Optional[str] = None

class QualityInfo(BaseModel):
    jersey_source: str  # "design_produce", "source_suppliers", "both"
    materials: List[str] = []  # polyester, mesh, breathable_performance

class VendorCommitment(BaseModel):
    fulfill_on_time: bool = False
    fulfill_through_platform: bool = False
    agree_terms: bool = False

class VendorPayout(BaseModel):
    payout_method: str  # momo, bank
    momo_number: Optional[str] = None
    momo_network: Optional[str] = None
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    bank_branch: Optional[str] = None

class VendorVerification(BaseModel):
    jersey_photos: List[str] = []  # URLs of uploaded photos
    packaging_photo: Optional[str] = None

class VendorOnboardingSubmit(BaseModel):
    identity: VendorIdentity
    business: BusinessLegitimacy
    inventory: InventoryInfo
    production: ProductionCapacity
    delivery: DeliveryCapability
    quality: QualityInfo
    commitment: VendorCommitment
    payout: VendorPayout
    verification: VendorVerification

class LoginVerify2FA(BaseModel):
    challenge_id: str
    code: str

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

async def get_current_user_optional(request: Request, session_token: Optional[str] = Cookie(None)):
    try:
        return await get_current_user(request, session_token)
    except HTTPException:
        return None

async def get_admin_user(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def resolve_legacy_vendor_status(user: dict) -> dict:
    if user.get("role") != "vendor":
        return user

    vendor_status = user.get("vendor_status")
    if vendor_status not in [None, "pending_onboarding"]:
        return user

    if user.get("is_active", True) is False:
        return user

    product_count = await db.products.count_documents({"vendor_id": user["user_id"]})
    if product_count == 0:
        return user

    now = datetime.now(timezone.utc).isoformat()
    update_data = {
        "vendor_status": "approved",
        "vendor_email_verified": True,
        "is_active": True,
        "legacy_vendor_auto_approved_at": now,
        "legacy_vendor_product_count": product_count
    }
    await db.users.update_one(
        {"user_id": user["user_id"], "role": "vendor"},
        {"$set": update_data}
    )
    user.update(update_data)
    return user

async def get_vendor_user(request: Request, session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(request, session_token)
    if user["role"] not in ["vendor", "admin"]:
        raise HTTPException(status_code=403, detail="Vendor access required")
    
    # Check if vendor is approved (admins bypass this check)
    if user["role"] == "vendor":
        user = await resolve_legacy_vendor_status(user)
        vendor_status = user.get("vendor_status", "pending_onboarding")
        if vendor_status != "approved":
            raise HTTPException(
                status_code=403, 
                detail=f"Vendor not approved. Current status: {vendor_status}"
            )
    
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    email = normalize_email_address(user_data.email)
    if len(user_data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = await find_user_by_email(email, {"_id": 0, "user_id": 1})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    hashed_pw = hash_password(user_data.password)
    vendor_verification_token = secrets.token_urlsafe(32) if user_data.role == "vendor" else None
    
    user_doc = {
        "user_id": user_id,
        "email": email,
        "email_normalized": email,
        "password": hashed_pw,
        "name": user_data.name,
        "role": user_data.role,
        "picture": None,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "vendor_profile": None,
        "vendor_status": "pending_email_verification" if user_data.role == "vendor" else None,
        "vendor_email_verified": False if user_data.role == "vendor" else None,
        "vendor_email_verification_token": vendor_verification_token,
        "vendor_email_verified_at": None
    }
    
    try:
        await db.users.insert_one(user_doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=400, detail="Email already registered")

    if user_data.role == "customer":
        await send_resend_email(
            email,
            "Welcome to Black Star Threads",
            f"""
            <div>
              <h2>Welcome to Black Star Threads</h2>
              <p>Hi {user_data.name},</p>
              <p>Your customer account has been created successfully.</p>
              <p>You can now browse jerseys, save favorites, and place orders from the marketplace.</p>
            </div>
            """,
            text=(
                f"Hi {user_data.name}, welcome to Black Star Threads. "
                "Your customer account has been created successfully."
            ),
        )
    elif user_data.role == "vendor":
        verification_link = build_vendor_email_verification_link(vendor_verification_token)
        email_sent = await send_resend_email(
            email,
            "Verify your vendor email to continue onboarding",
            build_vendor_verification_email(user_data.name, verification_link),
            text=(
                f"Hi {user_data.name}, verify your vendor email to continue onboarding: "
                f"{verification_link}"
            ),
        )
        if not email_sent:
            logger.warning("Vendor verification email failed for %s", email)
    
    token = create_jwt_token(user_id, user_data.role)
    
    return {
        "token": token,
        "user": {
            "user_id": user_id,
            "email": email,
            "name": user_data.name,
            "role": user_data.role
        },
        "requires_email_verification": user_data.role == "vendor"
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await find_user_by_email(credentials.email, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.get("password"):
        raise HTTPException(status_code=401, detail="Use social sign-in or reset your password")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user["role"] == "vendor":
        if not user.get("vendor_email_verified", False):
            token = create_jwt_token(user["user_id"], user["role"])
            return {
                "token": token,
                "requires_email_verification": True,
                "user": {
                    "user_id": user["user_id"],
                    "email": user["email"],
                    "name": user["name"],
                    "role": user["role"],
                    "picture": user.get("picture")
                }
            }

        if not RESEND_API_KEY:
            raise HTTPException(status_code=503, detail="Vendor two-step verification is not configured")

        challenge_id = f"challenge_{uuid.uuid4().hex[:16]}"
        code = build_login_code()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        await db.login_challenges.insert_one({
            "challenge_id": challenge_id,
            "user_id": user["user_id"],
            "email": user["email"],
            "code": hash_password(code),
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "verified": False
        })

        email_sent = await send_resend_email(
            user["email"],
            "Your vendor verification code",
            build_vendor_login_email(user.get("name", "Vendor"), code),
            text=f"Your vendor verification code is {code}. It expires in 10 minutes."
        )
        if not email_sent:
            raise HTTPException(status_code=503, detail="Could not send verification code. Please try again.")

        return {
            "requires_2fa": True,
            "challenge_id": challenge_id,
            "email": user["email"],
            "user": {
                "user_id": user["user_id"],
                "email": user["email"],
                "name": user["name"],
                "role": user["role"],
                "picture": user.get("picture")
            }
        }

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

@api_router.post("/auth/vendor/resend-verification")
async def resend_vendor_verification_email(
    payload: VendorVerificationResendRequest,
    user: Optional[dict] = Depends(get_current_user_optional)
):
    target_user = None
    if user and user.get("role") == "vendor":
        target_user = user
    elif payload.email:
        target_user = await find_user_by_email(payload.email, {"_id": 0})
        if target_user and target_user.get("role") != "vendor":
            target_user = None

    if not target_user:
        raise HTTPException(status_code=404, detail="Vendor account not found")

    if target_user.get("vendor_email_verified", False):
        return {"message": "Vendor email already verified"}

    token = secrets.token_urlsafe(32)
    await db.users.update_one(
        {"user_id": target_user["user_id"]},
        {"$set": {"vendor_email_verification_token": token}}
    )
    verification_link = build_vendor_email_verification_link(token)
    email_sent = await send_resend_email(
        target_user["email"],
        "Verify your vendor email to continue onboarding",
        build_vendor_verification_email(target_user.get("name", "Vendor"), verification_link),
        text=f"Verify your vendor email to continue onboarding: {verification_link}",
    )
    if not email_sent:
        raise HTTPException(status_code=503, detail="Failed to send verification email")

    return {"message": "Verification email sent"}

@api_router.post("/auth/password-reset/request")
async def request_password_reset(payload: PasswordResetRequest, request: Request):
    user = await find_user_by_email(payload.email, {"_id": 0})
    generic_response = {"message": "If an account exists for that email, a password reset link has been sent."}

    if not user:
        return generic_response

    raw_token = secrets.token_urlsafe(32)
    reset_doc = {
        "reset_id": f"reset_{uuid.uuid4().hex[:16]}",
        "user_id": user["user_id"],
        "email_normalized": normalize_email_address(user["email"]),
        "token_hash": hash_token(raw_token),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used": False
    }

    await db.password_resets.update_many(
        {"user_id": user["user_id"], "used": False},
        {"$set": {"used": True, "superseded_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.password_resets.insert_one(reset_doc)

    reset_link = build_password_reset_link(raw_token, request)
    email_sent = await send_resend_email(
        user["email"],
        "Reset your GhanaJersey.co password",
        build_password_reset_email(user.get("name", "there"), reset_link),
        text=f"Reset your GhanaJersey.co password: {reset_link}. This link expires in 1 hour.",
    )
    if not email_sent:
        logger.warning("Password reset email failed for %s", user["email"])

    return generic_response

@api_router.post("/auth/password-reset/confirm")
async def confirm_password_reset(payload: PasswordResetConfirm):
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    token_hash = hash_token(payload.token)
    reset_doc = await db.password_resets.find_one(
        {"token_hash": token_hash, "used": False},
        {"_id": 0}
    )
    if not reset_doc:
        raise HTTPException(status_code=400, detail="Password reset link is invalid or expired")

    expires_at = reset_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        await db.password_resets.update_one(
            {"reset_id": reset_doc["reset_id"]},
            {"$set": {"used": True, "expired_at": datetime.now(timezone.utc).isoformat()}}
        )
        raise HTTPException(status_code=400, detail="Password reset link is invalid or expired")

    hashed_pw = hash_password(payload.password)
    result = await db.users.update_one(
        {"user_id": reset_doc["user_id"]},
        {"$set": {"password": hashed_pw, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account not found")

    await db.password_resets.update_many(
        {"user_id": reset_doc["user_id"]},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    await db.user_sessions.delete_many({"user_id": reset_doc["user_id"]})

    return {"message": "Password reset successfully"}

@api_router.post("/auth/vendor/verify-email")
async def verify_vendor_email_token(payload: Dict[str, str]):
    token = payload.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    user = await db.users.find_one(
        {"role": "vendor", "vendor_email_verification_token": token},
        {"_id": 0}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Verification link is invalid or expired")

    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "vendor_email_verified": True,
            "vendor_email_verified_at": datetime.now(timezone.utc).isoformat(),
            "vendor_status": "pending_onboarding"
        }, "$unset": {"vendor_email_verification_token": ""}}
    )

    return {"message": "Vendor email verified successfully"}

@api_router.post("/auth/login/verify-2fa")
async def verify_login_2fa(payload: LoginVerify2FA):
    challenge = await db.login_challenges.find_one({"challenge_id": payload.challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="Verification session not found")

    if challenge.get("verified"):
        raise HTTPException(status_code=400, detail="Verification code already used")

    expires_at = challenge.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired")

    if not verify_password(payload.code, challenge["code"]):
        raise HTTPException(status_code=401, detail="Invalid verification code")

    user = await db.users.find_one({"user_id": challenge["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.login_challenges.update_one(
        {"challenge_id": payload.challenge_id},
        {"$set": {"verified": True, "verified_at": datetime.now(timezone.utc).isoformat()}}
    )

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
    requested_role = body.get("role", "customer")
    new_user_role = "vendor" if requested_role == "vendor" else "customer"
    
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
    
    email = normalize_email_address(data.get("email"))
    name = data.get("name")
    picture = data.get("picture")
    session_token = data.get("session_token")

    if not email or not session_token:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check if user exists
    user = await find_user_by_email(email, {"_id": 0})
    
    created_oauth_user = False
    if user:
        user_id = user["user_id"]
        # Update user data
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"email": email, "email_normalized": email, "name": name, "picture": picture}}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "email_normalized": email,
            "name": name,
            "role": new_user_role,
            "picture": picture,
            "password": None,  # OAuth users don't have password
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "vendor_profile": None,
            "vendor_status": "pending_onboarding" if new_user_role == "vendor" else None,
            "vendor_email_verified": True if new_user_role == "vendor" else None,
            "vendor_email_verified_at": datetime.now(timezone.utc).isoformat() if new_user_role == "vendor" else None
        }
        try:
            await db.users.insert_one(user_doc)
            created_oauth_user = True
        except DuplicateKeyError:
            user = await find_user_by_email(email, {"_id": 0})
            if not user:
                raise HTTPException(status_code=400, detail="Email already registered")
            user_id = user["user_id"]
    if created_oauth_user:
        if new_user_role == "vendor":
            await send_resend_email(
                email,
                "Welcome to the GhanaJersey.co vendor portal",
                f"""
                <div>
                  <h2>Welcome to GhanaJersey.co</h2>
                  <p>Hi {name},</p>
                  <p>Your vendor account has been created with your social sign-in.</p>
                  <p>You can now continue to vendor onboarding and submit jerseys for approval.</p>
                </div>
                """,
                text=(
                    f"Hi {name}, your GhanaJersey.co vendor account has been created. "
                    "You can now continue to vendor onboarding."
                ),
            )
        else:
            await send_resend_email(
                email,
                "Welcome to Black Star Threads",
                f"""
                <div>
                  <h2>Welcome to Black Star Threads</h2>
                  <p>Hi {name},</p>
                  <p>Your customer account has been created successfully.</p>
                  <p>You can now browse jerseys, save favorites, and place orders from the marketplace.</p>
                </div>
                """,
                text=(
                    f"Hi {name}, welcome to Black Star Threads. "
                    "Your customer account has been created successfully."
                ),
            )
    
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

# Vendor onboarding status check (doesn't require approved status)
@api_router.get("/vendor/onboarding-status")
async def get_vendor_onboarding_status(user: dict = Depends(get_current_user)):
    if user.get("role") != "vendor":
        raise HTTPException(status_code=403, detail="Not a vendor account")

    user = await resolve_legacy_vendor_status(user)
    
    vendor_status = user.get("vendor_status", "pending_onboarding")
    onboarding_data = user.get("onboarding_data")
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "vendor_status": vendor_status,  # pending_onboarding, pending_approval, approved, rejected
        "vendor_email_verified": user.get("vendor_email_verified", True),
        "has_completed_onboarding": onboarding_data is not None,
        "rejection_reason": user.get("rejection_reason")
    }

@api_router.post("/vendor/onboarding")
async def submit_vendor_onboarding(data: VendorOnboardingSubmit, user: dict = Depends(get_current_user)):
    if user.get("role") != "vendor":
        raise HTTPException(status_code=403, detail="Not a vendor account")
    if not user.get("vendor_email_verified", True):
        raise HTTPException(status_code=403, detail="Please verify your email before accessing vendor onboarding")
    
    # Check if already submitted
    if user.get("vendor_status") == "pending_approval":
        raise HTTPException(status_code=400, detail="Onboarding already submitted, awaiting approval")
    
    if user.get("vendor_status") == "approved":
        raise HTTPException(status_code=400, detail="Vendor already approved")
    
    # Store onboarding data
    onboarding_doc = {
        "identity": data.identity.model_dump(),
        "business": data.business.model_dump(),
        "inventory": data.inventory.model_dump(),
        "production": data.production.model_dump(),
        "delivery": data.delivery.model_dump(),
        "quality": data.quality.model_dump(),
        "commitment": data.commitment.model_dump(),
        "payout": data.payout.model_dump(),
        "verification": data.verification.model_dump(),
        "submitted_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Update vendor profile with business info
    vendor_profile = {
        "brand_name": data.identity.business_name,
        "phone": data.identity.phone_number,
        "location": data.identity.city_location,
        "social_handles": data.identity.social_handles,
        "payout_details": data.payout.model_dump()
    }
    
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "onboarding_data": onboarding_doc,
            "vendor_status": "pending_approval",
            "vendor_profile": vendor_profile
        }}
    )
    
    return {"message": "Onboarding submitted successfully. Your application is pending admin approval."}

# File upload endpoint for vendor onboarding
@api_router.post("/upload/vendor-image")
async def upload_vendor_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Upload an image for vendor onboarding verification"""
    if user.get("role") != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can upload verification images")
    if not user.get("vendor_email_verified", True):
        raise HTTPException(status_code=403, detail="Please verify your email before accessing vendor onboarding")
    
    try:
        return await store_uploaded_image(
            file,
            user["user_id"],
            "vendor-onboarding",
            upload_type="onboarding"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")

@api_router.post("/upload/product-image")
async def upload_product_image(
    file: UploadFile = File(...),
    slot_index: int = 0,
    user: dict = Depends(get_current_user)
):
    """Upload a product image to S3-compatible storage such as Cloudflare R2."""
    if user.get("role") != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can upload product images")

    try:
        return await store_uploaded_image(
            file,
            user["user_id"],
            "product-images",
            upload_type="product",
            require_white_background=slot_index in [0, 1]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Product image upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload product image: {str(e)}")

@api_router.delete("/upload/file")
async def delete_uploaded_file(
    payload: DeleteUploadedFileRequest,
    user: dict = Depends(get_current_user)
):
    if user.get("role") != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can delete uploaded images")

    storage_path = extract_storage_path(payload.path)
    if not storage_path:
        raise HTTPException(status_code=400, detail="File path is required")

    file_record = await db.uploaded_files.find_one(
        {"storage_path": storage_path, "user_id": user["user_id"], "is_deleted": False},
        {"_id": 0}
    )
    if not file_record:
        logger.info(
            "Upload metadata not found for %s owned by %s; treating delete as reference-only removal",
            storage_path,
            user["user_id"],
        )
        return {
            "message": "Image reference removed",
            "deleted_from_storage": False
        }

    delete_object(storage_path)
    await db.uploaded_files.update_one(
        {"storage_path": storage_path, "user_id": user["user_id"]},
        {"$set": {
            "is_deleted": True,
            "deleted_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    return {
        "message": "Image removed successfully",
        "deleted_from_storage": True
    }

# Serve uploaded files
@api_router.get("/files/{path:path}")
async def get_file(path: str, request: Request, auth: Optional[str] = None):
    """Serve uploaded files"""
    # Auth check via header or query param
    auth_header = request.headers.get("Authorization")
    token = None
    
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    elif auth:
        token = auth
    
    # Public storefront images and onboarding review images can be read without auth
    public_prefixes = [
        f"{APP_NAME}/vendor-onboarding/",
        f"{APP_NAME}/product-images/",
    ]
    if not any(path.startswith(prefix) for prefix in public_prefixes):
        if not token:
            raise HTTPException(status_code=401, detail="Authentication required")
    
    # Check file exists in DB
    file_record = await db.uploaded_files.find_one({"storage_path": path, "is_deleted": False})
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        data, content_type = get_object(path)
        return Response(
            content=data,
            media_type=file_record.get("content_type", content_type)
        )
    except Exception as e:
        logger.error(f"Failed to retrieve file: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve file")

@api_router.get("/vendor/profile")
async def get_vendor_profile(user: dict = Depends(get_vendor_user)):
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "vendor_profile": user.get("vendor_profile"),
        "vendor_status": user.get("vendor_status", "approved")
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
        if isinstance(product.get('reviewed_at'), str):
            product['reviewed_at'] = datetime.fromisoformat(product['reviewed_at'])
        normalize_product_document(product)
    
    return products

@api_router.post("/vendor/products")
async def create_product(product: ProductCreate, user: dict = Depends(get_vendor_user)):
    product_id = f"prod_{uuid.uuid4().hex[:12]}"
    product_slug = await ensure_unique_product_slug(product.slug or product.name)
    
    # Safely get vendor name
    vendor_profile = user.get("vendor_profile") or {}
    vendor_name = vendor_profile.get("brand_name") if vendor_profile else None
    vendor_name = vendor_name or user.get("name", "Unknown Vendor")
    
    product_doc = {
        "product_id": product_id,
        "slug": product_slug,
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
    product_doc["slug"] = product_slug
    product_doc["meta_title"] = product.meta_title or f"{product.name} | Ghana Jersey"
    product_doc["meta_description"] = product.meta_description or (
        f"Buy {product.name} on GhanaJersey.co. Shop Ghana jersey styles and Black Stars jersey-inspired looks for buyers in Ghana and abroad."
    )
    product_doc["focus_keywords"] = product.focus_keywords or []
    
    await db.products.insert_one(product_doc)
    
    return {"product_id": product_id, "slug": product_slug, "message": "Product submitted for approval"}

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
        next_name = update_data.get("name") or existing.get("name")
        requested_slug = update_data.get("slug") or next_name
        update_data["slug"] = await ensure_unique_product_slug(requested_slug, existing_product_id=product_id)
        update_data["meta_title"] = update_data.get("meta_title") or existing.get("meta_title") or f"{next_name} | Ghana Jersey"
        update_data["meta_description"] = update_data.get("meta_description") or existing.get("meta_description") or (
            f"Buy {next_name} on GhanaJersey.co. Shop Ghana jersey styles and Black Stars jersey-inspired looks for buyers in Ghana and abroad."
        )
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
    
    status_timestamp = datetime.now(timezone.utc).isoformat()

    # Update vendor-specific status for this order
    await db.orders.update_one(
        {"order_id": order_id},
        {
            "$set": {
                f"vendor_status.{user['user_id']}": status,
                "order_status": status  # Also update main status
            },
            "$push": {
                f"vendor_status_history.{user['user_id']}": {
                    "status": status,
                    "timestamp": status_timestamp,
                    "source": "vendor"
                }
            }
        }
    )

    if status == "shipped":
        customer_name = order.get("shipping_address", {}).get("full_name") or "Customer"
        tracking_number = order.get("tracking_number")
        tracking_message = f"Tracking number: <strong>{tracking_number}</strong>" if tracking_number else "Tracking information will be shared as soon as it is available."
        item_summary = "".join(
            f"<li>{item.get('name', 'Jersey')} x{item.get('quantity', 1)}</li>"
            for item in vendor_items
        )
        await send_resend_email(
            order.get("customer_email"),
            f"Your GhanaJersey.co order {order_id} has shipped",
            f"""
            <div>
              <h2>Your order is on the way</h2>
              <p>Hi {customer_name},</p>
              <p>Your order <strong>{order_id}</strong> has been shipped by {user.get('name', 'your vendor')}.</p>
              <p>Order details:</p>
              <ul>{item_summary}</ul>
              <p>{tracking_message}</p>
            </div>
            """,
            text=(
                f"Hi {customer_name}, your order {order_id} has been shipped by {user.get('name', 'your vendor')}. "
                f"{'Tracking number: ' + tracking_number if tracking_number else 'Tracking information will follow soon.'}"
            ),
        )

    if status == "delivered":
        await notify_admin(
            f"Vendor marked order delivered: {order_id}",
            f"""
            <div>
              <h2>Order marked delivered</h2>
              <p>Vendor <strong>{user.get('name', 'Vendor')}</strong> marked order <strong>{order_id}</strong> as delivered.</p>
              <p>Customer email: {order.get('customer_email', 'N/A')}</p>
            </div>
            """,
            text=(
                f"Vendor {user.get('name', 'Vendor')} marked order {order_id} as delivered. "
                f"Customer email: {order.get('customer_email', 'N/A')}"
            ),
        )
    
    return {"message": f"Order status updated to {status}"}

@api_router.post("/vendor/orders/{order_id}/send-confirmation")
async def send_delivery_confirmation_request(order_id: str, request: Request, user: dict = Depends(get_vendor_user)):
    """Vendor sends delivery confirmation request to customer."""
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

    confirmation_link = build_confirmation_link(request, order_id, confirmation_token)
    vendor_name = user.get("name", "your vendor")
    customer_name = order.get("shipping_address", {}).get("full_name") or "Customer"
    await send_resend_email(
        order.get("customer_email"),
        f"Confirm delivery for order {order_id}",
        f"""
        <div>
          <h2>Delivery confirmation requested</h2>
          <p>Hi {customer_name},</p>
          <p>{vendor_name} has marked your order as delivered. Please confirm once you have received it.</p>
          <p><a href="{confirmation_link}">Confirm delivery</a></p>
          <p>If the button does not work, copy this link into your browser:</p>
          <p>{confirmation_link}</p>
        </div>
        """,
        text=(
            f"Hi {customer_name}, {vendor_name} has requested delivery confirmation for order {order_id}. "
            f"Confirm here: {confirmation_link}"
        ),
    )

    return {
        "message": "Confirmation request sent",
        "confirmation_link": confirmation_link
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

    vendor_ids = list({item.get("vendor_id") for item in order.get("items", []) if item.get("vendor_id")})
    vendors = []
    if vendor_ids:
        vendors = await db.users.find(
            {"user_id": {"$in": vendor_ids}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1},
        ).to_list(len(vendor_ids))

    customer_name = order.get("shipping_address", {}).get("full_name") or "Customer"
    for vendor in vendors:
        if not vendor.get("email"):
            continue
        await send_resend_email(
            vendor["email"],
            f"Customer confirmed receipt: {order_id}",
            f"""
            <div>
              <h2>Receipt confirmed</h2>
              <p>Hi {vendor.get('name') or 'Vendor'},</p>
              <p>{customer_name} confirmed receipt of order <strong>{order_id}</strong>.</p>
            </div>
            """,
            text=f"{customer_name} confirmed receipt of order {order_id}.",
        )

    await notify_admin(
        f"Customer confirmed receipt: {order_id}",
        f"""
        <div>
          <h2>Customer confirmed receipt</h2>
          <p>{customer_name} confirmed receipt of order <strong>{order_id}</strong>.</p>
        </div>
        """,
        text=f"{customer_name} confirmed receipt of order {order_id}.",
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
    revenue_breakdown = {}
    monthly_revenue_breakdown = {}
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
                order_currency = (order.get("currency") or "USD").upper()
                total_revenue += order_total
                add_currency_amount(revenue_breakdown, order_currency, order_total)
                
                # Check if order is from current month
                order_date = order_copy['created_at']
                if hasattr(order_date, 'month') and order_date.month == current_month:
                    monthly_revenue += order_total
                    add_currency_amount(monthly_revenue_breakdown, order_currency, order_total)
    
    # Calculate earnings
    platform_commission = total_revenue * 0.15
    net_earnings = total_revenue * 0.85
    platform_commission_breakdown = commission_breakdown(revenue_breakdown, 0.15)
    net_earnings_breakdown = commission_breakdown(revenue_breakdown, 0.85)
    
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
    paid_payout_breakdown = {}
    pending_payout_breakdown = {}
    for payout_order in confirmed_orders:
        add_currency_amount(
            paid_payout_breakdown,
            payout_order.get("currency"),
            sum(item.get("price", 0) * item.get("quantity", 1) for item in payout_order.get("items", [])) * 0.85
        )
    for payout_order in pending_orders:
        add_currency_amount(
            pending_payout_breakdown,
            payout_order.get("currency"),
            sum(item.get("price", 0) * item.get("quantity", 1) for item in payout_order.get("items", [])) * 0.85
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
                        product_sales[pid] = {"quantity": 0, "revenue": 0, "revenue_breakdown": {}}
                    product_sales[pid]["quantity"] += item.get("quantity", 1)
                    product_sales[pid]["revenue"] += item.get("price", 0) * item.get("quantity", 1)
                    add_currency_amount(
                        product_sales[pid]["revenue_breakdown"],
                        order.get("currency"),
                        item.get("price", 0) * item.get("quantity", 1)
                    )
    
    top_sellers = []
    for product in products:
        if product["product_id"] in product_sales:
            top_sellers.append({
                **product,
                "total_sold": product_sales[product["product_id"]]["quantity"],
                "total_revenue": product_sales[product["product_id"]]["revenue"],
                "revenue_breakdown": product_sales[product["product_id"]]["revenue_breakdown"]
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
        "revenue_breakdown": revenue_breakdown,
        "monthly_revenue": round(monthly_revenue, 2),
        "monthly_revenue_breakdown": monthly_revenue_breakdown,
        "platform_commission": round(platform_commission, 2),
        "platform_commission_breakdown": platform_commission_breakdown,
        "net_earnings": round(net_earnings, 2),
        "net_earnings_breakdown": net_earnings_breakdown,
        "pending_payout": round(pending_payout, 2),
        "pending_payout_breakdown": pending_payout_breakdown,
        "paid_payout": round(paid_payout, 2),
        "paid_payout_breakdown": paid_payout_breakdown,
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
    new_name = f"{existing['name']} (Copy)"
    new_product = {
        **existing,
        "product_id": new_product_id,
        "slug": await ensure_unique_product_slug(new_name),
        "name": new_name,
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

def build_blog_document(payload: Dict[str, Any], author_name: str, existing: Optional[dict] = None) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    title = payload.get("title") if payload.get("title") is not None else (existing.get("title") if existing else "")
    content = payload.get("content") if payload.get("content") is not None else (existing.get("content") if existing else "")
    excerpt = payload.get("excerpt")
    if not excerpt:
        excerpt = (existing.get("excerpt") if existing else None) or strip_html_tags(content)[:180]

    blog_doc = {
        "blog_id": existing.get("blog_id") if existing else f"blog_{uuid.uuid4().hex[:12]}",
        "title": title,
        "slug": payload.get("slug") or (existing.get("slug") if existing else None),
        "excerpt": excerpt,
        "content": content,
        "featured_image": payload.get("featured_image") if payload.get("featured_image") is not None else (existing.get("featured_image") if existing else None),
        "featured_image_alt": payload.get("featured_image_alt") if payload.get("featured_image_alt") is not None else (existing.get("featured_image_alt") if existing else None),
        "category": payload.get("category") if payload.get("category") is not None else (existing.get("category") if existing else "News"),
        "tags": payload.get("tags") if payload.get("tags") is not None else (existing.get("tags") if existing else []),
        "keywords": payload.get("keywords") if payload.get("keywords") is not None else (existing.get("keywords") if existing else []),
        "author_name": payload.get("author_name") if payload.get("author_name") is not None else (existing.get("author_name") if existing else author_name),
        "meta_title": payload.get("meta_title") if payload.get("meta_title") is not None else (existing.get("meta_title") if existing else title),
        "meta_description": payload.get("meta_description") if payload.get("meta_description") is not None else (existing.get("meta_description") if existing else excerpt),
        "canonical_url": payload.get("canonical_url") if payload.get("canonical_url") is not None else (existing.get("canonical_url") if existing else None),
        "og_image": payload.get("og_image") if payload.get("og_image") is not None else (existing.get("og_image") if existing else payload.get("featured_image")),
        "is_published": payload.get("is_published") if payload.get("is_published") is not None else (existing.get("is_published") if existing else False),
        "publish_at": payload.get("publish_at") if payload.get("publish_at") is not None else (existing.get("publish_at") if existing else None),
        "reading_minutes": estimate_reading_minutes(content),
        "updated_at": now,
        "created_at": existing.get("created_at") if existing else now,
    }
    if blog_doc["is_published"] and not blog_doc["publish_at"]:
        blog_doc["publish_at"] = now
    return blog_doc

# ==================== BLOG ROUTES ====================

@api_router.get("/blogs")
async def get_blogs(
    limit: int = 12,
    category: Optional[str] = None,
    search: Optional[str] = None
):
    query: Dict[str, Any] = {"is_published": True}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"excerpt": {"$regex": search, "$options": "i"}},
            {"keywords": {"$in": [search.lower()]}},
            {"tags": {"$in": [search.lower()]}}
        ]

    blogs = await db.blogs.find(query, {"_id": 0}).sort([("publish_at", -1), ("created_at", -1)]).limit(limit).to_list(limit)
    for blog in blogs:
        normalize_blog_document(blog)
    return blogs

@api_router.get("/blogs/categories")
async def get_blog_categories():
    categories = await db.blogs.distinct("category", {"is_published": True})
    return [category for category in categories if category]

@api_router.get("/blogs/{slug}")
async def get_blog_post(slug: str, request: Request):
    blog = await db.blogs.find_one({"slug": slug, "is_published": True}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog post not found")
    normalize_blog_document(blog, request=request)
    return blog

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
            {"meta_title": {"$regex": search, "$options": "i"}},
            {"meta_description": {"$regex": search, "$options": "i"}},
            {"focus_keywords": {"$in": [search.lower()]}},
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
        normalize_product_document(product)
    
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
        normalize_product_document(product)
    
    return products

@api_router.get("/products/categories")
async def get_categories():
    return [
        {
            "id": "official-tournament",
            "name": "Official Tournament",
            "description": "Shop Ghana jersey tournament releases and Black Stars match-inspired kits.",
            "seo_title": "Ghana Jersey Tournament Collection",
            "meta_description": "Buy Ghana jersey tournament styles and Black Stars-inspired match kits on GhanaJersey.co for shoppers in Ghana and abroad.",
            "keywords": ["ghana jersey", "black stars jersey", "ghana tournament jersey"],
            "url": "/products/ghana-jersey-tournament"
        },
        {
            "id": "streetwear",
            "name": "Streetwear",
            "description": "Modern Ghana jersey streetwear built for style, culture, and daily wear.",
            "seo_title": "Ghana Jersey Streetwear",
            "meta_description": "Shop Ghana jersey streetwear and fashion-led football looks on GhanaJersey.co.",
            "keywords": ["ghana jersey streetwear", "ghana jersey", "black stars streetwear"],
            "url": "/products/ghana-jersey-streetwear"
        },
        {
            "id": "fan",
            "name": "Fan Jerseys",
            "description": "Fan-focused Ghana jersey styles celebrating Black Stars pride and culture.",
            "seo_title": "Ghana Fan Jersey Collection",
            "meta_description": "Browse fan-made Ghana jersey and Black Stars jersey styles on GhanaJersey.co.",
            "keywords": ["ghana fan jersey", "ghana jersey", "black stars jersey"],
            "url": "/products/ghana-fan-jersey"
        },
        {
            "id": "retro",
            "name": "Retro Designs",
            "description": "Retro Ghana jersey styles inspired by classic football heritage and vintage looks.",
            "seo_title": "Retro Ghana Jersey Collection",
            "meta_description": "Shop retro Ghana jersey styles and vintage Black Stars-inspired football shirts on GhanaJersey.co.",
            "keywords": ["retro ghana jersey", "ghana jersey retro", "vintage ghana football shirt"],
            "url": "/products/retro-ghana-jersey"
        },
        {
            "id": "creative-designer",
            "name": "Creative Designer",
            "description": "Creative Ghana jersey drops from designers blending football, heritage, and fashion.",
            "seo_title": "Creative Ghana Jersey Designer Collection",
            "meta_description": "Discover creative Ghana jersey designs and original fashion-led drops on GhanaJersey.co.",
            "keywords": ["creative ghana jersey", "ghana jersey designer", "ghana jersey"],
            "url": "/products/creative-ghana-jersey"
        },
        {
            "id": "local-club",
            "name": "Local Club",
            "description": "Support local club culture with Ghana jersey club styles and homegrown pride.",
            "seo_title": "Local Club Ghana Jersey Collection",
            "meta_description": "Shop local club Ghana jersey styles and football-inspired shirts on GhanaJersey.co.",
            "keywords": ["local club ghana jersey", "ghana club jersey", "ghana jersey"],
            "url": "/products/local-club-ghana-jersey"
        }
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
    if product:
        normalize_product_document(product)
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
        normalize_product_document(product)
    
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
        normalize_product_document(product)
    
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
        normalize_product_document(product)
    
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

@api_router.get("/products/{product_lookup}")
async def get_product(product_lookup: str, request: Request):
    product = await db.products.find_one(
        {"slug": product_lookup, "status": "approved"},
        {"_id": 0}
    )
    if not product:
        product = await db.products.find_one(
            {"product_id": product_lookup, "status": "approved"},
            {"_id": 0}
        )
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    if isinstance(product.get('created_at'), str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    normalize_product_document(product)
    
    # Ensure vote_count exists for consistency
    if 'vote_count' not in product:
        product['vote_count'] = 0
    
    # Track product view for analytics
    viewer_ip = request.client.host if request.client else "unknown"
    await db.product_views.insert_one({
        "product_id": product["product_id"],
        "viewer_ip": viewer_ip,
        "viewed_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Get reviews
    reviews = await db.reviews.find(
        {"product_id": product["product_id"]},
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
        return {"items": [], "total": 0, "total_ghs": 0}
    
    # Populate product details
    items = []
    total = 0
    total_ghs = 0
    
    for item in cart.get("items", []):
        product = await db.products.find_one(
            {"product_id": item["product_id"]},
            {"_id": 0}
        )
        if product:
            normalize_product_document(product)
            item_price = product["price"]
            item_price_ghs = product.get("price_ghs") or 0
            
            # Add customization price if present
            customization = item.get("customization")
            if customization and (customization.get("name") or customization.get("number")):
                item_price += product.get("customization_price", 0)
                item_price_ghs += product.get("customization_price_ghs", 0) or 0
            
            item_total = item_price * item["quantity"]
            item_total_ghs = item_price_ghs * item["quantity"]
            total += item_total
            total_ghs += item_total_ghs
            
            items.append({
                "product_id": product["product_id"],
                "slug": product.get("slug"),
                "name": product["name"],
                "price": item_price,
                "price_ghs": item_price_ghs,
                "base_price": product["price"],
                "base_price_ghs": product.get("price_ghs"),
                "currency": product["currency"],
                "quantity": item["quantity"],
                "size": item["size"],
                "image": product["images"][0] if product["images"] else "",
                "customization": customization
            })
    
    return {"items": items, "total": round(total, 2), "total_ghs": round(total_ghs, 2)}

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
    
    # Validate customization
    if item.customization and item.customization.name:
        if not product.get("allows_customization"):
            raise HTTPException(status_code=400, detail="This product does not allow customization")
    
    cart = await db.carts.find_one({"user_id": user["user_id"]})
    
    # Build cart item data
    cart_item_data = {
        "product_id": item.product_id,
        "quantity": item.quantity,
        "size": item.size,
        "vendor_id": product.get("vendor_id"),
        "customization": item.customization.model_dump() if item.customization else None
    }
    
    if cart:
        # Check if item already exists (without customization)
        # Note: customized items are always added as new items
        existing_item = None
        if not item.customization or (not item.customization.name and not item.customization.number):
            for i, existing in enumerate(cart.get("items", [])):
                if (existing["product_id"] == item.product_id and 
                    existing["size"] == item.size and 
                    not existing.get("customization", {}).get("name")):
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
                {"$push": {"items": cart_item_data}}
            )
    else:
        cart_doc = {
            "user_id": user["user_id"],
            "items": [cart_item_data],
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

# ==================== USER ACTIVITY & PERSONALIZATION ROUTES ====================

@api_router.post("/user/activity")
async def track_activity(activity: UserActivityCreate, user: dict = Depends(get_current_user)):
    """Track user activity for personalization"""
    activity_doc = {
        "user_id": user["user_id"],
        "action": activity.action,
        "product_id": activity.product_id,
        "category": activity.category,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_activity.insert_one(activity_doc)
    
    # Update user's category preferences
    if activity.category:
        weight = 1.0 if activity.action == "view" else 0.5 if activity.action == "click" else 0.3
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$inc": {f"category_preferences.{activity.category}": weight}},
        )
    
    # Update recently viewed
    if activity.action == "view" and activity.product_id:
        product = await db.products.find_one(
            {"product_id": activity.product_id},
            {"_id": 0, "product_id": 1, "name": 1, "category": 1, "images": 1, "price": 1, "price_ghs": 1}
        )
        if product:
            product["viewed_at"] = datetime.now(timezone.utc).isoformat()
            
            # Remove old entry if exists, add to front
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$pull": {"recently_viewed": {"product_id": activity.product_id}}}
            )
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {
                    "$push": {
                        "recently_viewed": {
                            "$each": [product],
                            "$position": 0,
                            "$slice": 20  # Keep only last 20
                        }
                    }
                }
            )
    
    return {"message": "Activity tracked"}

@api_router.post("/user/activity/sync")
async def sync_activity(sync_data: ActivitySync, user: dict = Depends(get_current_user)):
    """Sync local activity data with server on login"""
    
    # Merge category preferences
    if sync_data.category_preferences:
        for category, score in sync_data.category_preferences.items():
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {"$inc": {f"category_preferences.{category}": score * 0.5}}  # Lower weight for old data
            )
    
    # Merge recently viewed (avoid duplicates)
    if sync_data.recently_viewed:
        existing = await db.users.find_one(
            {"user_id": user["user_id"]},
            {"recently_viewed": 1}
        )
        existing_ids = {p["product_id"] for p in (existing.get("recently_viewed") or [])} if existing else set()
        
        new_items = [item for item in sync_data.recently_viewed if item.get("product_id") not in existing_ids]
        
        if new_items:
            await db.users.update_one(
                {"user_id": user["user_id"]},
                {
                    "$push": {
                        "recently_viewed": {
                            "$each": new_items[:10],  # Add up to 10 new items
                            "$slice": 20
                        }
                    }
                }
            )
    
    return {"message": "Activity synced"}

@api_router.get("/user/recommendations")
async def get_recommendations(user: dict = Depends(get_current_user)):
    """Get personalized product recommendations based on user activity"""
    
    user_data = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"category_preferences": 1, "recently_viewed": 1}
    )
    
    recommendations = []
    recently_viewed_ids = []
    
    # Get recently viewed products
    recently_viewed = user_data.get("recently_viewed", []) if user_data else []
    recently_viewed_ids = [p.get("product_id") for p in recently_viewed if p.get("product_id")]
    
    # Get top categories from user preferences
    category_prefs = user_data.get("category_preferences", {}) if user_data else {}
    top_categories = sorted(category_prefs.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Get products from preferred categories (excluding already viewed)
    for category, _ in top_categories:
        products = await db.products.find(
            {
                "status": "approved",
                "category": category,
                "product_id": {"$nin": recently_viewed_ids}
            },
            {"_id": 0}
        ).sort("votes", -1).limit(4).to_list(4)
        
        recommendations.extend(products)
    
    # If not enough recommendations, add popular products
    if len(recommendations) < 8:
        exclude_ids = recently_viewed_ids + [p["product_id"] for p in recommendations]
        popular = await db.products.find(
            {
                "status": "approved",
                "product_id": {"$nin": exclude_ids}
            },
            {"_id": 0}
        ).sort("votes", -1).limit(8 - len(recommendations)).to_list(8 - len(recommendations))
        
        recommendations.extend(popular)
    
    return {
        "recently_viewed": recently_viewed[:8],
        "for_you": recommendations[:8],
        "top_categories": [cat for cat, _ in top_categories]
    }

@api_router.get("/user/recently-viewed")
async def get_recently_viewed(user: dict = Depends(get_current_user)):
    """Get user's recently viewed products"""
    user_data = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"recently_viewed": 1}
    )
    
    recently_viewed = user_data.get("recently_viewed", []) if user_data else []
    
    # Fetch full product data for recently viewed
    products = []
    for item in recently_viewed[:12]:
        product = await db.products.find_one(
            {"product_id": item.get("product_id"), "status": "approved"},
            {"_id": 0}
        )
        if product:
            products.append(product)
    
    return products

# ==================== ORDER ROUTES ====================

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, user: dict = Depends(get_current_user)):
    order_id = f"order_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()
    
    # Use currency to determine which price to use
    use_ghs = order_data.currency == "GHS"
    
    # Validate items and calculate totals
    items = []
    subtotal = 0
    subtotal_usd = 0
    
    for item in order_data.items:
        product = await db.products.find_one(
            {"product_id": item.product_id, "status": "approved"},
            {"_id": 0}
        )
        
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        
        # Use GHS price if customer is from Ghana, otherwise USD
        item_price = product.get("price_ghs", product["price"]) if use_ghs else product["price"]
        item_price_usd = product["price"]
        
        item_total = item_price * item.quantity
        subtotal += item_total
        subtotal_usd += item_price_usd * item.quantity
        
        items.append({
            "product_id": product["product_id"],
            "vendor_id": product["vendor_id"],
            "name": product["name"],
            "price": item_price,
            "price_usd": item_price_usd,
            "price_ghs": product.get("price_ghs"),
            "quantity": item.quantity,
            "size": item.size,
            "image": product["images"][0] if product["images"] else ""
        })
    
    # Calculate shipping based on currency
    if use_ghs:
        # GHS shipping rates
        shipping_cost = 250.0 if order_data.shipping_address.country != "Ghana" else 50.0
    else:
        # USD shipping rates
        shipping_cost = 15.0 if order_data.shipping_address.country != "Ghana" else 5.0
    
    total = subtotal + shipping_cost
    
    vendor_status = {
        item["vendor_id"]: "order_placed"
        for item in items
        if item.get("vendor_id")
    }
    vendor_status_history = {
        vendor_id: [{
            "status": "order_placed",
            "timestamp": created_at,
            "source": "system"
        }]
        for vendor_id in vendor_status
    }

    order_doc = {
        "order_id": order_id,
        "customer_id": user["user_id"],
        "customer_email": user["email"],
        "items": items,
        "shipping_address": order_data.shipping_address.model_dump(),
        "subtotal": round(subtotal, 2),
        "subtotal_usd": round(subtotal_usd, 2),
        "shipping_cost": shipping_cost,
        "total": round(total, 2),
        "currency": order_data.currency,
        "payment_method": order_data.payment_method,
        "payment_status": "pending",
        "order_status": "pending",
        "vendor_status": vendor_status,
        "vendor_status_history": vendor_status_history,
        "tracking_number": None,
        "created_at": created_at
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
    order = await db.orders.find_one(
        {"order_id": checkout.order_id, "customer_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    success_url = f"{checkout.origin_url}/order-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout.origin_url}/checkout?order_id={checkout.order_id}"

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            client_reference_id=checkout.order_id,
            payment_method_types=["card"],
            metadata={
                "order_id": checkout.order_id,
                "user_id": user["user_id"],
            },
            line_items=[{
                "price_data": {
                    "currency": order["currency"].lower(),
                    "product_data": {
                        "name": f"Order {checkout.order_id}",
                    },
                    "unit_amount": int(round(float(order["total"]) * 100)),
                },
                "quantity": 1,
            }],
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout creation failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to create Stripe checkout session") from e
    
    # Create payment transaction record
    transaction_doc = {
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "session_id": session.id,
        "order_id": checkout.order_id,
        "user_id": user["user_id"],
        "amount": float(order["total"]),
        "currency": order["currency"],
        "payment_method": "stripe",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction_doc)
    
    return {"url": session.url, "session_id": session.id}

@api_router.get("/payments/stripe/status/{session_id}")
async def get_stripe_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as e:
        logger.error(f"Stripe status lookup failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch Stripe payment status") from e

    if session.get("payment_status") == "paid":
        await _mark_transaction_paid(session_id)
    
    return {
        "status": session.get("status"),
        "payment_status": session.get("payment_status"),
        "amount_total": session.get("amount_total"),
        "currency": session.get("currency")
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")

    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(
                payload=body,
                sig_header=signature,
                secret=STRIPE_WEBHOOK_SECRET,
            )
        else:
            event = json.loads(body.decode("utf-8"))

        event_type = event.get("type")
        event_object = event.get("data", {}).get("object", {})

        if event_type == "checkout.session.completed" and event_object.get("payment_status") == "paid":
            session_id = event_object.get("id")
            if session_id:
                await _mark_transaction_paid(session_id)

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
    paid_at = datetime.now(timezone.utc).isoformat()

    await db.payment_transactions.update_one(
        {"session_id": paypal_order_id},
        {"$set": {"payment_status": "paid", "paid_at": paid_at}}
    )
    
    await db.orders.update_one(
        {"order_id": transaction["order_id"]},
        {"$set": {"payment_status": "paid", "order_status": "processing", "paid_at": paid_at}}
    )

    await send_order_paid_notifications(transaction["order_id"])
    
    return {"status": "COMPLETED"}

# Paystack routes
@api_router.post("/payments/paystack/initialize")
async def initialize_paystack(checkout: PaystackInitialize, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one(
        {"order_id": checkout.order_id, "customer_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    paystack_secret = os.environ.get("PAYSTACK_SECRET_KEY")
    
    if not paystack_secret:
        raise HTTPException(status_code=500, detail="Paystack not configured")
    
    # Convert amount to smallest unit (kobo for NGN, pesewas for GHS)
    amount_smallest = int(round(float(order["total"]) * 100))
    reference = f"bst_{uuid.uuid4().hex[:16]}"
    
    # Use callback_url from request or default
    callback_url = checkout.callback_url or f"{os.environ.get('FRONTEND_URL', 'https://curated-threads-3.preview.emergentagent.com')}/payment/paystack/callback"
    
    # Determine currency - Paystack supports GHS and NGN primarily
    currency = order.get("currency", "GHS")
    if currency not in ["GHS", "NGN", "USD"]:
        currency = "GHS"  # Default to GHS for Ghana
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.paystack.co/transaction/initialize",
            headers={
                "Authorization": f"Bearer {paystack_secret}",
                "Content-Type": "application/json"
            },
            json={
                "email": checkout.email or user["email"],
                "amount": amount_smallest,
                "currency": currency,
                "reference": reference,
                "callback_url": callback_url,
                "metadata": {
                    "order_id": checkout.order_id,
                    "user_id": user["user_id"],
                    "custom_fields": [
                        {
                            "display_name": "Order ID",
                            "variable_name": "order_id",
                            "value": checkout.order_id
                        }
                    ]
                }
            }
        )
        
        result = response.json()
    
    if result.get("status"):
        transaction_doc = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
            "session_id": reference,
            "paystack_reference": result["data"]["reference"],
            "order_id": checkout.order_id,
            "user_id": user["user_id"],
            "amount": float(order["total"]),
            "currency": currency,
            "payment_method": "paystack",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payment_transactions.insert_one(transaction_doc)
        
        return {
            "authorization_url": result["data"]["authorization_url"],
            "reference": result["data"]["reference"],
            "access_code": result["data"]["access_code"]
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
        # Find transaction by reference or paystack_reference
        transaction = await db.payment_transactions.find_one(
            {"$or": [
                {"session_id": reference},
                {"paystack_reference": reference}
            ]},
            {"_id": 0}
        )
        
        if transaction and transaction["payment_status"] != "paid":
            paid_at = datetime.now(timezone.utc).isoformat()
            # Update payment transaction
            await db.payment_transactions.update_one(
                {"$or": [
                    {"session_id": reference},
                    {"paystack_reference": reference}
                ]},
                {"$set": {
                    "payment_status": "paid",
                    "paystack_transaction_id": result["data"].get("id"),
                    "paid_at": paid_at
                }}
            )
            
            # Update order
            await db.orders.update_one(
                {"order_id": transaction["order_id"]},
                {"$set": {
                    "payment_status": "paid",
                    "order_status": "processing",
                    "paid_at": paid_at
                }}
            )

            await send_order_paid_notifications(transaction["order_id"])
        
        return {
            "status": "success",
            "message": "Payment verified successfully",
            "data": result["data"],
            "order_id": transaction["order_id"] if transaction else None
        }
    
    return {
        "status": "failed",
        "message": result.get("message", "Payment verification failed")
    }

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
            paid_at = datetime.now(timezone.utc).isoformat()
            await db.payment_transactions.update_one(
                {"session_id": reference},
                {"$set": {"payment_status": "paid", "paid_at": paid_at}}
            )
            
            await db.orders.update_one(
                {"order_id": transaction["order_id"]},
                {"$set": {"payment_status": "paid", "order_status": "processing", "paid_at": paid_at}}
            )

            await send_order_paid_notifications(transaction["order_id"])
    
    return {"status": "ok"}

# ==================== REVIEW ROUTES ====================

@api_router.post("/reviews")
async def create_review(review: ReviewCreate):
    normalized_email = review.email.strip().lower()
    cleaned_name = " ".join(review.name.strip().split())
    if not cleaned_name:
        raise HTTPException(status_code=400, detail="Name is required")
    public_name = cleaned_name.split(" ")[0]

    existing_review = await db.reviews.find_one(
        {"product_id": review.product_id, "reviewer_email": normalized_email},
        {"_id": 0}
    )

    review_id = existing_review["review_id"] if existing_review else f"review_{uuid.uuid4().hex[:12]}"
    review_doc = {
        "review_id": review_id,
        "product_id": review.product_id,
        "reviewer_email": normalized_email,
        "reviewer_name": cleaned_name,
        "user_name": public_name,
        "rating": review.rating,
        "comment": review.comment.strip(),
        "created_at": existing_review.get("created_at") if existing_review else datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    await db.reviews.update_one(
        {"product_id": review.product_id, "reviewer_email": normalized_email},
        {"$set": review_doc},
        upsert=True
    )
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review.product_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    
    await db.products.update_one(
        {"product_id": review.product_id},
        {"$set": {"rating": round(avg_rating, 1), "review_count": len(reviews)}}
    )
    
    return {"review_id": review_id, "updated": existing_review is not None}

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

@api_router.get("/admin/blogs")
async def get_admin_blogs(user: dict = Depends(get_admin_user)):
    blogs = await db.blogs.find({}, {"_id": 0}).sort([("updated_at", -1), ("created_at", -1)]).to_list(200)
    for blog in blogs:
        normalize_blog_document(blog)
    return blogs

@api_router.post("/admin/blogs")
async def create_admin_blog(blog: BlogCreate, user: dict = Depends(get_admin_user)):
    payload = blog.model_dump()
    blog_doc = build_blog_document(payload, user.get("name") or "Admin")
    blog_doc["slug"] = await ensure_unique_blog_slug(blog_doc.get("slug") or blog_doc["title"])
    normalize_blog_document(blog_doc)
    await db.blogs.insert_one(blog_doc)
    return {"blog_id": blog_doc["blog_id"], "slug": blog_doc["slug"], "message": "Blog post saved"}

@api_router.put("/admin/blogs/{blog_id}")
async def update_admin_blog(blog_id: str, blog: BlogUpdate, user: dict = Depends(get_admin_user)):
    existing = await db.blogs.find_one({"blog_id": blog_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Blog post not found")

    payload = {k: v for k, v in blog.model_dump().items() if v is not None}
    blog_doc = build_blog_document(payload, user.get("name") or "Admin", existing=existing)
    blog_doc["slug"] = await ensure_unique_blog_slug(blog_doc.get("slug") or blog_doc["title"], existing_blog_id=blog_id)
    normalize_blog_document(blog_doc)

    await db.blogs.update_one({"blog_id": blog_id}, {"$set": blog_doc})
    return {"blog_id": blog_id, "slug": blog_doc["slug"], "message": "Blog post updated"}

@api_router.delete("/admin/blogs/{blog_id}")
async def delete_admin_blog(blog_id: str, user: dict = Depends(get_admin_user)):
    result = await db.blogs.delete_one({"blog_id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return {"message": "Blog post deleted"}

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
    revenue_breakdown = {}
    for order in paid_orders:
        add_currency_amount(revenue_breakdown, order.get("currency"), order.get("total", 0))
    platform_commission = total_revenue * 0.15
    vendor_earnings_total = total_revenue * 0.85
    platform_commission_breakdown = commission_breakdown(revenue_breakdown, 0.15)
    vendor_earnings_breakdown = commission_breakdown(revenue_breakdown, 0.85)
    
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
        "revenue_breakdown": revenue_breakdown,
        "platform_commission": round(platform_commission, 2),
        "platform_commission_breakdown": platform_commission_breakdown,
        "vendor_earnings_total": round(vendor_earnings_total, 2),
        "vendor_earnings_breakdown": vendor_earnings_breakdown,
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
        revenue_breakdown = {}
        for order in all_orders:
            for item in order.get("items", []):
                if item.get("product_id") in product_ids:
                    item_total = item.get("price", 0) * item.get("quantity", 1)
                    vendor_revenue += item_total
                    add_currency_amount(revenue_breakdown, order.get("currency"), item_total)
                    if order not in vendor_orders:
                        vendor_orders.append(order)
        
        platform_commission = vendor_revenue * 0.15
        net_earnings = vendor_revenue * 0.85
        platform_commission_breakdown = commission_breakdown(revenue_breakdown, 0.15)
        net_earnings_breakdown = commission_breakdown(revenue_breakdown, 0.85)
        
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
        pending_payout_breakdown = {}
        paid_payout_breakdown = {}
        for payout_order in vendor_orders:
            if payout_order.get("delivery_confirmed"):
                continue
            payout_total = sum(
                item.get("price", 0) * item.get("quantity", 1)
                for item in payout_order.get("items", [])
                if item.get("product_id") in product_ids
            ) * 0.85
            add_currency_amount(pending_payout_breakdown, payout_order.get("currency"), payout_total)
        for payout_order in confirmed_orders:
            payout_total = sum(
                item.get("price", 0) * item.get("quantity", 1)
                for item in payout_order.get("items", [])
                if item.get("product_id") in product_ids
            ) * 0.85
            add_currency_amount(paid_payout_breakdown, payout_order.get("currency"), payout_total)
        
        # Get vote counts for vendor's products
        total_votes = sum(p.get("vote_count", 0) for p in products)
        
        vendor_profile = vendor.get("vendor_profile") or {}
        vendor_analytics.append({
            "vendor_id": vendor_id,
            "name": vendor.get("name"),
            "email": vendor.get("email"),
            "brand_name": vendor_profile.get("brand_name") if vendor_profile else None,
            "total_products": len(products),
            "approved_products": len([p for p in products if p.get("status") == "approved"]),
            "pending_products": len([p for p in products if p.get("status") == "pending"]),
            "total_orders": len(vendor_orders),
            "total_revenue": round(vendor_revenue, 2),
            "revenue_breakdown": revenue_breakdown,
            "platform_commission": round(platform_commission, 2),
            "platform_commission_breakdown": platform_commission_breakdown,
            "net_earnings": round(net_earnings, 2),
            "net_earnings_breakdown": net_earnings_breakdown,
            "pending_payout": round(pending_payout, 2),
            "pending_payout_breakdown": pending_payout_breakdown,
            "paid_payout": round(paid_payout, 2),
            "paid_payout_breakdown": paid_payout_breakdown,
            "total_votes": total_votes,
            "created_at": vendor.get("created_at"),
            "is_active": vendor.get("is_active", True),
            "vendor_status": vendor.get("vendor_status", "pending_onboarding"),
            "suspended_at": vendor.get("suspended_at"),
            "restored_at": vendor.get("restored_at")
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
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if approval.status == "approved":
        vendor = await db.users.find_one(
            {"user_id": product.get("vendor_id"), "role": "vendor"},
            {"_id": 0, "user_id": 1, "is_active": 1, "vendor_status": 1}
        )
        if not vendor or not vendor.get("is_active", True) or vendor.get("vendor_status") in ["suspended", "deleted"]:
            raise HTTPException(status_code=400, detail="Cannot approve products for suspended or deleted vendors")

    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": {
            "status": approval.status,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewed_by": user["user_id"]
        }}
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

@api_router.get("/admin/vendors/pending")
async def get_pending_vendors(user: dict = Depends(get_admin_user)):
    """Get vendors pending approval"""
    vendors = await db.users.find(
        {"role": "vendor", "vendor_status": "pending_approval"},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    for vendor in vendors:
        if isinstance(vendor.get('created_at'), str):
            vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
    
    return vendors

@api_router.put("/admin/vendors/{user_id}/approve")
async def approve_vendor(user_id: str, approved: bool, rejection_reason: Optional[str] = None, user: dict = Depends(get_admin_user)):
    """Approve or reject a vendor application"""
    vendor = await db.users.find_one({"user_id": user_id, "role": "vendor"})
    
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    if approved:
        update_data = {
            "vendor_status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": user["user_id"]
        }
    else:
        update_data = {
            "vendor_status": "rejected",
            "rejection_reason": rejection_reason,
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "rejected_by": user["user_id"]
        }
    
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )

    subject = "Your vendor application has been approved" if approved else "Update on your vendor application"
    vendor_name = vendor.get("name") or "Vendor"
    status_message = (
        "Your seller account is now approved and you can access the vendor dashboard."
        if approved
        else f"Your application was not approved at this time. Reason: {rejection_reason or 'No reason provided.'}"
    )
    await send_resend_email(
        vendor["email"],
        subject,
        f"""
        <div>
          <h2>{subject}</h2>
          <p>Hi {vendor_name},</p>
          <p>{status_message}</p>
        </div>
        """,
        text=f"Hi {vendor_name}, {status_message}",
    )
    
    return {"message": f"Vendor {'approved' if approved else 'rejected'}"}

@api_router.put("/admin/vendors/{user_id}/status")
async def update_vendor_status(user_id: str, is_active: bool, user: dict = Depends(get_admin_user)):
    vendor = await db.users.find_one({"user_id": user_id, "role": "vendor"}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    now = datetime.now(timezone.utc).isoformat()
    hidden_count = 0
    restored_count = 0

    if is_active:
        restored_status = vendor.get("vendor_status_before_suspension")
        if not restored_status or restored_status in ["suspended", "deleted"]:
            restored_status = "approved"

        result = await db.users.update_one(
            {"user_id": user_id, "role": "vendor"},
            {
                "$set": {
                    "is_active": True,
                    "vendor_status": restored_status,
                    "restored_at": now,
                    "restored_by": user["user_id"]
                },
                "$unset": {
                    "vendor_status_before_suspension": "",
                    "suspended_at": "",
                    "suspended_by": ""
                }
            }
        )
        restored_count = await restore_vendor_products(user_id, user["user_id"])
    else:
        update_data = {
            "is_active": False,
            "vendor_status": "suspended",
            "suspended_at": now,
            "suspended_by": user["user_id"]
        }
        if vendor.get("vendor_status") != "suspended":
            update_data["vendor_status_before_suspension"] = vendor.get("vendor_status", "approved")

        result = await db.users.update_one(
            {"user_id": user_id, "role": "vendor"},
            {"$set": update_data}
        )
        hidden_count = await hide_vendor_products(user_id, "vendor_suspended", user["user_id"])
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    return {
        "message": f"Vendor {'restored' if is_active else 'suspended'}",
        "hidden_products": hidden_count,
        "restored_products": restored_count
    }

@api_router.delete("/admin/vendors/{user_id}")
async def delete_vendor_account(user_id: str, user: dict = Depends(get_admin_user)):
    vendor = await db.users.find_one({"user_id": user_id, "role": "vendor"}, {"_id": 0})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    hidden_count = await hide_vendor_products(user_id, "vendor_deleted", user["user_id"])
    await db.vendor_promos.delete_many({"vendor_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.login_challenges.delete_many({"user_id": user_id})
    await db.password_resets.delete_many({"user_id": user_id})

    result = await db.users.delete_one({"user_id": user_id, "role": "vendor"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")

    return {
        "message": "Vendor account deleted",
        "hidden_products": hidden_count
    }

@api_router.get("/admin/orders")
async def get_all_orders(user: dict = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    vendor_ids = {
        item.get("vendor_id")
        for order in orders
        for item in order.get("items", [])
        if item.get("vendor_id")
    }
    vendors_by_id = {}

    if vendor_ids:
        vendors = await db.users.find(
            {"user_id": {"$in": list(vendor_ids)}},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1}
        ).to_list(len(vendor_ids))
        vendors_by_id = {vendor["user_id"]: vendor for vendor in vendors}
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])

        vendor_status = order.get("vendor_status", {})
        vendor_status_history = order.get("vendor_status_history", {})
        enriched_items = []

        for item in order.get("items", []):
            vendor_id = item.get("vendor_id")
            vendor = vendors_by_id.get(vendor_id, {})
            history = vendor_status_history.get(vendor_id, [])

            enriched_items.append({
                **item,
                "vendor_name": vendor.get("name", "Vendor"),
                "vendor_email": vendor.get("email"),
                "processing_status": vendor_status.get(vendor_id, "order_placed"),
                "processing_history": history,
            })

        order["items"] = enriched_items
    
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


async def _run_health_checks(include_optional: bool = False) -> tuple[dict, bool]:
    checks = {}
    healthy = True

    try:
        await db.command("ping")
        checks["database"] = "ok"
    except Exception as e:
        healthy = False
        checks["database"] = f"error: {e}"

    index_file = FRONTEND_BUILD_DIR / "index.html"
    if index_file.exists():
        checks["frontend_build"] = "ok"
    else:
        healthy = False
        checks["frontend_build"] = "missing"

    if include_optional:
        checks["stripe"] = "configured" if STRIPE_API_KEY else "missing"

        if S3_BUCKET:
            try:
                checks["storage"] = "configured" if init_storage() else "unavailable"
                if checks["storage"] != "configured":
                    healthy = False
            except Exception as e:
                healthy = False
                checks["storage"] = f"error: {e}"
        else:
            checks["storage"] = "not_configured"

    return checks, healthy


@api_router.get("/health")
async def health_check():
    checks, healthy = await _run_health_checks()
    payload = {"status": "healthy" if healthy else "unhealthy", "checks": checks}
    if healthy:
        return payload
    return JSONResponse(status_code=503, content=payload)


@api_router.get("/health/live")
async def health_live():
    return {"status": "alive"}


@api_router.get("/health/ready")
async def health_ready():
    checks, healthy = await _run_health_checks()
    payload = {"status": "ready" if healthy else "not_ready", "checks": checks}
    if healthy:
        return payload
    return JSONResponse(status_code=503, content=payload)


@api_router.get("/health/deep")
async def health_deep():
    checks, healthy = await _run_health_checks(include_optional=True)
    payload = {
        "status": "healthy" if healthy else "degraded",
        "checks": checks,
    }
    if healthy:
        return payload
    return JSONResponse(status_code=503, content=payload)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

if (FRONTEND_BUILD_DIR / "static").exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD_DIR / "static"), name="frontend-static")

@app.get("/robots.txt", include_in_schema=False)
async def robots_txt(request: Request):
    base_url = get_frontend_base_url(request)
    admin_path = os.environ.get("REACT_APP_ADMIN_PORTAL_PATH", "/control-room")
    if not admin_path.startswith("/"):
        admin_path = f"/{admin_path}"
    content = (
        "User-agent: *\n"
        "Allow: /\n"
        f"Disallow: {admin_path}\n"
        "Disallow: /api/admin/\n"
        f"Sitemap: {base_url}/sitemap.xml\n"
    )
    return Response(content=content, media_type="text/plain")

@app.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml(request: Request):
    base_url = get_frontend_base_url(request)
    static_urls = [
        ("", "daily", "1.0"),
        ("/products", "daily", "0.9"),
        ("/products/ghana-jersey-tournament", "weekly", "0.8"),
        ("/products/ghana-jersey-streetwear", "weekly", "0.8"),
        ("/products/ghana-fan-jersey", "weekly", "0.8"),
        ("/products/retro-ghana-jersey", "weekly", "0.8"),
        ("/products/creative-ghana-jersey", "weekly", "0.8"),
        ("/products/local-club-ghana-jersey", "weekly", "0.8"),
        ("/sell", "weekly", "0.7"),
        ("/blog", "daily", "0.8"),
        ("/compare", "weekly", "0.5"),
        ("/privacy", "yearly", "0.3"),
        ("/terms", "yearly", "0.3"),
    ]

    products = await db.products.find(
        {"status": "approved"},
        {"_id": 0, "product_id": 1, "slug": 1, "name": 1, "updated_at": 1, "created_at": 1}
    ).to_list(5000)
    blogs = await db.blogs.find(
        {"is_published": True},
        {"_id": 0, "slug": 1, "updated_at": 1, "publish_at": 1, "created_at": 1}
    ).to_list(5000)

    url_entries = []
    for path, changefreq, priority in static_urls:
        url_entries.append(
            f"<url><loc>{xml_escape(base_url + path)}</loc><changefreq>{changefreq}</changefreq><priority>{priority}</priority></url>"
        )

    for product in products:
        lastmod = product.get("updated_at") or product.get("created_at")
        lastmod_xml = f"<lastmod>{xml_escape(lastmod)}</lastmod>" if lastmod else ""
        url_entries.append(
            f"<url><loc>{xml_escape(base_url + '/products/' + (product.get('slug') or slugify_text(product.get('name') or product['product_id'])) + '/' + product['product_id'])}</loc>{lastmod_xml}<changefreq>weekly</changefreq><priority>0.8</priority></url>"
        )

    for blog in blogs:
        lastmod = blog.get("updated_at") or blog.get("publish_at") or blog.get("created_at")
        lastmod_xml = f"<lastmod>{xml_escape(lastmod)}</lastmod>" if lastmod else ""
        url_entries.append(
            f"<url><loc>{xml_escape(base_url + '/blog/' + blog['slug'])}</loc>{lastmod_xml}<changefreq>weekly</changefreq><priority>0.7</priority></url>"
        )

    xml_content = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        + "".join(url_entries) +
        '</urlset>'
    )
    return Response(content=xml_content, media_type="application/xml")


def _frontend_asset_response(requested_path: str = ""):
    if not FRONTEND_BUILD_DIR.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    build_root = FRONTEND_BUILD_DIR.resolve()
    candidate = (build_root / requested_path).resolve()

    try:
        candidate.relative_to(build_root)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Not found") from exc

    if requested_path and candidate.is_file():
        return FileResponse(candidate)

    index_file = build_root / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend entrypoint not found")

    return FileResponse(index_file)


@app.get("/", include_in_schema=False)
async def serve_frontend_root():
    return _frontend_asset_response()


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    return _frontend_asset_response(full_path)

@app.on_event("startup")
async def startup_event():
    # Initialize object storage
    try:
        init_storage()
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
    try:
        await db.command("ping")
        logger.info("Database connection verified during startup")

        # Create default admin user if not exists
        admin_email = "easante@nitlimited.com"
        admin_email_normalized = normalize_email_address(admin_email)
        admin = await find_user_by_email(admin_email_normalized)

        if not admin:
            admin_doc = {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": admin_email_normalized,
                "email_normalized": admin_email_normalized,
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

        async for existing_user in db.users.find(
            {"email": {"$exists": True}},
            {"_id": 0, "user_id": 1, "email": 1, "email_normalized": 1}
        ):
            normalized_email = normalize_email_address(existing_user.get("email"))
            if normalized_email and existing_user.get("email_normalized") != normalized_email:
                await db.users.update_one(
                    {"user_id": existing_user["user_id"]},
                    {"$set": {"email_normalized": normalized_email}}
                )

        # Create indexes
        try:
            await db.users.create_index("email", unique=True)
        except Exception as exc:
            logger.warning("Could not create unique email index; check existing duplicate emails: %s", exc)
        try:
            await db.users.create_index("email_normalized", unique=True, sparse=True)
        except Exception as exc:
            logger.warning("Could not create unique normalized email index; check existing duplicate emails: %s", exc)
        await db.users.create_index("user_id", unique=True)
        await db.password_resets.create_index("token_hash", unique=True)
        await db.password_resets.create_index("expires_at")
        await db.password_resets.create_index("user_id")
        await db.products.create_index("product_id", unique=True)
        await db.products.create_index("slug", unique=True)
        await db.products.create_index("vendor_id")
        await db.products.create_index("status")
        await db.blogs.create_index("blog_id", unique=True)
        await db.blogs.create_index("slug", unique=True)
        await db.blogs.create_index("is_published")
        await db.orders.create_index("order_id", unique=True)
        await db.orders.create_index("customer_id")
        await db.login_challenges.create_index("challenge_id", unique=True)
        await db.login_challenges.create_index("expires_at")
        await db.user_activity.create_index("user_id")
        await db.user_activity.create_index([("user_id", 1), ("action", 1)])

        logger.info("Database indexes created")

        existing_products = await db.products.find({}, {"_id": 0, "product_id": 1, "name": 1, "slug": 1}).to_list(5000)
        for product in existing_products:
            if product.get("slug"):
                continue
            slug = await ensure_unique_product_slug(product.get("name") or product["product_id"], existing_product_id=product["product_id"])
            await db.products.update_one({"product_id": product["product_id"]}, {"$set": {"slug": slug}})
    except Exception as e:
        logger.error(f"Database startup initialization failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
