"""
Invoicing Routes Module
Handles invoice management, quotes, recurring invoices, clients, and reporting
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from bson import ObjectId
import uuid

router = APIRouter(prefix="/invoices", tags=["Invoicing"])
security = HTTPBearer()

# Module-level variables
db = None
_get_current_user = None


def set_dependencies(database, current_user_dep):
    """Initialize router dependencies"""
    global db, _get_current_user
    db = database
    _get_current_user = current_user_dep


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Auth wrapper"""
    if _get_current_user is None:
        raise HTTPException(status_code=500, detail="Auth not initialized")
    return await _get_current_user(credentials)


# ============== INVOICE ROUTES ==============
@router.get("")
async def get_invoices(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    if status and status != "all":
        query["status"] = status
    
    if search:
        query["$or"] = [
            {"invoice_number": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"customer_email": {"$regex": search, "$options": "i"}}
        ]
    
    invoices = await db.invoices.find(query).sort("created_at", -1).to_list(None)
    
    return [
        {
            "id": str(inv["_id"]),
            "invoice_number": inv.get("invoice_number", ""),
            "customer_name": inv.get("customer_name", ""),
            "customer_email": inv.get("customer_email", ""),
            "invoice_date": inv.get("invoice_date", ""),
            "due_date": inv.get("due_date", ""),
            "items": inv.get("items", []),
            "subtotal": inv.get("subtotal", 0),
            "tax_total": inv.get("tax_total", 0),
            "total": inv.get("total", 0),
            "amount_paid": inv.get("amount_paid", 0),
            "balance_due": inv.get("balance_due", 0),
            "status": inv.get("status", "draft"),
            "created_at": inv.get("created_at", datetime.utcnow()).isoformat() if inv.get("created_at") else "",
        }
        for inv in invoices
    ]


@router.get("/summary")
async def get_invoices_summary(current_user: dict = Depends(get_current_user)):
    """Get invoice summary stats"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    invoices = await db.invoices.find(query).to_list(None)
    
    total_invoices = len(invoices)
    total_amount = sum(inv.get("total", 0) for inv in invoices)
    total_paid = sum(inv.get("amount_paid", 0) for inv in invoices)
    total_outstanding = total_amount - total_paid
    
    status_counts = {}
    for inv in invoices:
        status = inv.get("status", "draft")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    return {
        "total_invoices": total_invoices,
        "total_amount": total_amount,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
        "by_status": status_counts,
    }


@router.get("/chart-data")
async def get_invoice_chart_data(
    period: str = "6months",
    current_user: dict = Depends(get_current_user)
):
    """Get invoice chart data"""
    business_id = current_user.get("business_id")
    query = {"business_id": business_id} if business_id else {}
    
    invoices = await db.invoices.find(query).to_list(None)
    
    monthly_data = {}
    for inv in invoices:
        created = inv.get("created_at", datetime.utcnow())
        if isinstance(created, str):
            try:
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            except:
                created = datetime.utcnow()
        month_key = created.strftime("%Y-%m")
        if month_key not in monthly_data:
            monthly_data[month_key] = {"invoiced": 0, "paid": 0}
        monthly_data[month_key]["invoiced"] += inv.get("total", 0)
        monthly_data[month_key]["paid"] += inv.get("amount_paid", 0)
    
    return {
        "labels": list(monthly_data.keys())[-6:],
        "invoiced": [monthly_data[k]["invoiced"] for k in list(monthly_data.keys())[-6:]],
        "paid": [monthly_data[k]["paid"] for k in list(monthly_data.keys())[-6:]],
    }


@router.post("")
async def create_invoice(
    data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Create a new invoice"""
    business_id = current_user.get("business_id")
    
    count = await db.invoices.count_documents({"business_id": business_id})
    invoice_number = f"INV-{count + 1:05d}"
    
    items = data.get("items", [])
    subtotal = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in items)
    tax_total = sum(
        item.get("quantity", 1) * item.get("unit_price", 0) * item.get("tax_rate", 0) / 100 
        for item in items
    )
    
    discount_type = data.get("discount_type")
    discount_value = data.get("discount_value", 0)
    discount_amount = 0
    if discount_type == "percentage":
        discount_amount = subtotal * discount_value / 100
    elif discount_type == "fixed":
        discount_amount = discount_value
    
    total = subtotal + tax_total - discount_amount
    
    invoice_doc = {
        "business_id": business_id,
        "invoice_number": invoice_number,
        "customer_name": data.get("customer_name", ""),
        "customer_email": data.get("customer_email", ""),
        "customer_phone": data.get("customer_phone", ""),
        "customer_address": data.get("customer_address", ""),
        "invoice_date": data.get("invoice_date") or datetime.utcnow().strftime("%Y-%m-%d"),
        "due_date": data.get("due_date") or (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
        "items": items,
        "subtotal": subtotal,
        "tax_total": tax_total,
        "discount_type": discount_type,
        "discount_value": discount_value,
        "discount_amount": discount_amount,
        "total": total,
        "amount_paid": 0,
        "balance_due": total,
        "status": "draft",
        "notes": data.get("notes", ""),
        "terms": data.get("terms", ""),
        "currency": data.get("currency", "USD"),
        "created_at": datetime.utcnow(),
    }
    
    result = await db.invoices.insert_one(invoice_doc)
    
    return {"id": str(result.inserted_id), "invoice_number": invoice_number, "message": "Invoice created"}


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Get single invoice"""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "id": str(invoice["_id"]),
        "invoice_number": invoice.get("invoice_number", ""),
        "customer_name": invoice.get("customer_name", ""),
        "customer_email": invoice.get("customer_email", ""),
        "items": invoice.get("items", []),
        "subtotal": invoice.get("subtotal", 0),
        "tax_total": invoice.get("tax_total", 0),
        "total": invoice.get("total", 0),
        "amount_paid": invoice.get("amount_paid", 0),
        "balance_due": invoice.get("balance_due", 0),
        "status": invoice.get("status", "draft"),
    }


@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    data: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Update an invoice"""
    items = data.get("items", [])
    subtotal = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in items)
    tax_total = sum(
        item.get("quantity", 1) * item.get("unit_price", 0) * item.get("tax_rate", 0) / 100 
        for item in items
    )
    total = subtotal + tax_total
    
    try:
        result = await db.invoices.update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": {
                "customer_name": data.get("customer_name"),
                "customer_email": data.get("customer_email"),
                "items": items,
                "subtotal": subtotal,
                "tax_total": tax_total,
                "total": total,
                "notes": data.get("notes"),
                "updated_at": datetime.utcnow(),
            }}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    return {"message": "Invoice updated"}


@router.post("/{invoice_id}/send")
async def send_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Mark invoice as sent"""
    try:
        await db.invoices.update_one(
            {"_id": ObjectId(invoice_id)},
            {"$set": {"status": "sent", "sent_at": datetime.utcnow()}}
        )
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    return {"message": "Invoice sent"}


@router.post("/{invoice_id}/payment")
async def record_payment(
    invoice_id: str,
    amount: float = Body(..., embed=True),
    current_user: dict = Depends(get_current_user)
):
    """Record payment"""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    new_paid = invoice.get("amount_paid", 0) + amount
    new_balance = invoice.get("total", 0) - new_paid
    status = "paid" if new_balance <= 0 else "partial"
    
    await db.invoices.update_one(
        {"_id": ObjectId(invoice_id)},
        {"$set": {"amount_paid": new_paid, "balance_due": max(0, new_balance), "status": status}}
    )
    
    return {"message": "Payment recorded", "new_balance": max(0, new_balance)}


@router.delete("/{invoice_id}")
async def delete_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    """Delete invoice"""
    try:
        await db.invoices.delete_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    return {"message": "Invoice deleted"}


# ============== PRODUCTS ==============
@router.get("/products")
async def get_products(current_user: dict = Depends(get_current_user)):
    """Get invoice products"""
    business_id = current_user.get("business_id")
    products = await db.invoice_products.find({"business_id": business_id}).to_list(None)
    return [{"id": str(p["_id"]), "name": p.get("name"), "unit_price": p.get("unit_price", 0)} for p in products]


@router.post("/products")
async def create_product(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Create product"""
    result = await db.invoice_products.insert_one({
        "business_id": current_user.get("business_id"),
        "name": data.get("name"),
        "unit_price": data.get("unit_price", 0),
        "created_at": datetime.utcnow(),
    })
    return {"id": str(result.inserted_id)}


# ============== QUOTES ==============
@router.get("/quotes")
async def get_quotes(current_user: dict = Depends(get_current_user)):
    """Get quotes"""
    business_id = current_user.get("business_id")
    quotes = await db.quotes.find({"business_id": business_id}).sort("created_at", -1).to_list(None)
    return [
        {"id": str(q["_id"]), "quote_number": q.get("quote_number"), "customer_name": q.get("customer_name"), "total": q.get("total", 0), "status": q.get("status")}
        for q in quotes
    ]


@router.post("/quotes")
async def create_quote(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Create quote"""
    business_id = current_user.get("business_id")
    count = await db.quotes.count_documents({"business_id": business_id})
    
    items = data.get("items", [])
    total = sum(item.get("quantity", 1) * item.get("unit_price", 0) for item in items)
    
    result = await db.quotes.insert_one({
        "business_id": business_id,
        "quote_number": f"QT-{count + 1:05d}",
        "customer_name": data.get("customer_name"),
        "items": items,
        "total": total,
        "status": "draft",
        "created_at": datetime.utcnow(),
    })
    return {"id": str(result.inserted_id)}


@router.post("/quotes/{quote_id}/convert")
async def convert_quote(quote_id: str, current_user: dict = Depends(get_current_user)):
    """Convert quote to invoice"""
    try:
        quote = await db.quotes.find_one({"_id": ObjectId(quote_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid quote ID")
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    business_id = current_user.get("business_id")
    count = await db.invoices.count_documents({"business_id": business_id})
    
    result = await db.invoices.insert_one({
        "business_id": business_id,
        "invoice_number": f"INV-{count + 1:05d}",
        "customer_name": quote.get("customer_name"),
        "items": quote.get("items", []),
        "total": quote.get("total", 0),
        "amount_paid": 0,
        "balance_due": quote.get("total", 0),
        "status": "draft",
        "created_at": datetime.utcnow(),
    })
    
    await db.quotes.update_one({"_id": ObjectId(quote_id)}, {"$set": {"status": "converted"}})
    return {"invoice_id": str(result.inserted_id)}


# ============== CLIENTS ==============
@router.get("/clients")
async def get_clients(current_user: dict = Depends(get_current_user)):
    """Get clients"""
    clients = await db.invoice_clients.find({"business_id": current_user.get("business_id")}).to_list(None)
    return [{"id": str(c["_id"]), "name": c.get("name"), "email": c.get("email")} for c in clients]


@router.post("/clients")
async def create_client(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Create client"""
    result = await db.invoice_clients.insert_one({
        "business_id": current_user.get("business_id"),
        "name": data.get("name"),
        "email": data.get("email"),
        "phone": data.get("phone"),
        "created_at": datetime.utcnow(),
    })
    return {"id": str(result.inserted_id)}


# ============== RECURRING ==============
@router.get("/recurring")
async def get_recurring(current_user: dict = Depends(get_current_user)):
    """Get recurring invoices"""
    recurring = await db.recurring_invoices.find({"business_id": current_user.get("business_id")}).to_list(None)
    return [{"id": str(r["_id"]), "customer_name": r.get("customer_name"), "frequency": r.get("frequency"), "status": r.get("status")} for r in recurring]


@router.post("/recurring")
async def create_recurring(data: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Create recurring invoice"""
    result = await db.recurring_invoices.insert_one({
        "business_id": current_user.get("business_id"),
        "customer_name": data.get("customer_name"),
        "items": data.get("items", []),
        "frequency": data.get("frequency", "monthly"),
        "status": "active",
        "created_at": datetime.utcnow(),
    })
    return {"id": str(result.inserted_id)}


# ============== REPORTS ==============
@router.get("/reports/summary")
async def get_report_summary(current_user: dict = Depends(get_current_user)):
    """Get report summary"""
    invoices = await db.invoices.find({"business_id": current_user.get("business_id")}).to_list(None)
    total = sum(inv.get("total", 0) for inv in invoices)
    paid = sum(inv.get("amount_paid", 0) for inv in invoices)
    return {"total_invoiced": total, "total_paid": paid, "outstanding": total - paid}


@router.get("/reports/tax")
async def get_tax_report(current_user: dict = Depends(get_current_user)):
    """Get tax report"""
    invoices = await db.invoices.find({"business_id": current_user.get("business_id")}).to_list(None)
    total_tax = sum(inv.get("tax_total", 0) for inv in invoices)
    return {"total_tax": total_tax, "invoice_count": len(invoices)}


# ============== PUBLIC ==============
@router.get("/public/{invoice_id}")
async def get_public_invoice(invoice_id: str):
    """Public invoice view (no auth)"""
    try:
        invoice = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
    except:
        raise HTTPException(status_code=400, detail="Invalid invoice ID")
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "id": str(invoice["_id"]),
        "invoice_number": invoice.get("invoice_number"),
        "customer_name": invoice.get("customer_name"),
        "total": invoice.get("total", 0),
        "status": invoice.get("status"),
    }
