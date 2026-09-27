"""MetricBoard (متریک‌برد) demo API: seeded KPI dashboards with a lazy live simulation."""
import asyncio
import json
import random
import time
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

TICK = 2.0          # seconds per simulation tick
MAX_CATCHUP = 30    # ticks replayed at most after idle time
rnd = random.Random(7)


def L(fa, en):
    return {"fa": fa, "en": en}


def now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat(timespec="seconds")


def rounded(x, unit):
    if unit in ("toman", "count"):
        return int(round(x))
    if unit is None:
        return round(x, 2)
    return round(x, 2)  # 1dp stuck small percents: walk step < rounding step


def walk(x, lo, hi, pct):
    x *= 1 + rnd.uniform(-pct, pct)
    return min(max(x, lo), hi)


def bounds(v, unit):
    return v * 0.6, (min(v * 1.5, 100.0) if unit == "percent" else v * 1.5)


def make_series(v, unit, n):
    lo, hi = bounds(v, unit)
    pts, x, t0 = [], v, now()
    for i in range(n):
        pts.append({"t": iso(t0 - timedelta(seconds=TICK * i)), "v": rounded(x, unit)})
        x = walk(x, lo, hi, 0.03)
    return pts[::-1]


def w(id, type, fa, en, unit, span=1, **kw):
    return {"id": id, "type": type, "title": L(fa, en), "span": span, "unit": unit, **kw}


def num(id, fa, en, unit, value, previous, good="up", span=1):
    return w(id, "number", fa, en, unit, span, value=value, previous=previous, good=good,
             series=make_series(value, unit, 20), _b=bounds(value, unit))


def line(id, fa, en, unit, value, span=2):
    return w(id, "line", fa, en, unit, span, series=make_series(value, unit, 30), _b=bounds(value, unit))


def listing(type, id, fa, en, unit, pairs, span=1):
    items = [{"label": L(f, e), "v": v} for f, e, v in pairs]
    return w(id, type, fa, en, unit, span, **{"bars" if type == "bar" else "items": items},
             _ib=[bounds(v, unit) for _, _, v in pairs])


def gauge(id, fa, en, unit, value, goal, span=1):
    return w(id, "gauge", fa, en, unit, span, value=value, goal=goal)


CITIES = [("تهران", "Tehran"), ("مشهد", "Mashhad"), ("اصفهان", "Isfahan"),
          ("شیراز", "Shiraz"), ("تبریز", "Tabriz"), ("کرج", "Karaj")]


def by_city(values):
    return [(f, e, v) for (f, e), v in zip(CITIES, values)]


# ponytail: in-memory seeded state for one process; swap for Postgres/ClickHouse when real connectors land.
DASHBOARDS = {
    "sales": (L("پیش‌خوان فروش", "Sales"), "shopping-bag", [
        num("revenue_today", "درآمد امروز", "Today's revenue", "toman", 4_850_000_000, 4_420_000_000),
        num("orders", "سفارش‌های امروز", "Orders today", "count", 2140, 1985),
        num("conversion", "نرخ تبدیل", "Conversion rate", "percent", 3.4, 3.1),
        num("aov", "میانگین ارزش سفارش", "Average order value", "toman", 2_270_000, 2_230_000),
        line("revenue_trend", "روند درآمد", "Revenue trend", "toman", 350_000_000),
        listing("bar", "revenue_by_city", "درآمد به تفکیک شهر", "Revenue by city", "toman",
                by_city([1_900_000_000, 720_000_000, 610_000_000, 480_000_000, 420_000_000, 390_000_000]), 2),
        listing("leaderboard", "top_products", "پرفروش‌ترین کالاها", "Top products", "count", [
            ("هدفون بی‌سیم", "Wireless headphones", 412), ("گوشی هوشمند", "Smartphone", 356),
            ("ساعت هوشمند", "Smartwatch", 298), ("اسپیکر بلوتوث", "Bluetooth speaker", 241),
            ("لپ‌تاپ", "Laptop", 187)]),
        listing("donut", "channels", "سهم کانال‌های فروش", "Sales channels", "count", [
            ("وب‌سایت", "Website", 980), ("اپلیکیشن", "App", 720),
            ("فروشگاه حضوری", "In-store", 290), ("شبکه‌های اجتماعی", "Social media", 150)]),
        gauge("monthly_target", "هدف فروش ماهانه", "Monthly sales target", "toman", 98_000_000_000, 130_000_000_000),
    ]),
    "finance": (L("پیش‌خوان مالی", "Finance"), "wallet", [
        num("cash_balance", "موجودی نقد", "Cash balance", "toman", 62_000_000_000, 58_000_000_000),
        num("receivables", "مطالبات", "Receivables", "toman", 18_400_000_000, 19_700_000_000, "down"),
        num("gross_margin", "حاشیه سود ناخالص", "Gross margin", "percent", 34.2, 32.8),
        num("expenses", "هزینه‌های این ماه", "Expenses this month", "toman", 21_500_000_000, 22_800_000_000, "down"),
        line("cash_flow", "جریان نقد", "Cash flow", "toman", 1_200_000_000),
        listing("bar", "revenue_by_line", "درآمد به تفکیک خط محصول", "Revenue by product line", "toman", [
            ("کالای دیجیتال", "Digital goods", 14_200_000_000), ("لوازم خانگی", "Home appliances", 9_800_000_000),
            ("مد و پوشاک", "Fashion", 6_400_000_000), ("زیبایی و سلامت", "Beauty & health", 4_900_000_000),
            ("کتاب و لوازم‌التحریر", "Books & stationery", 2_300_000_000)], 2),
        listing("donut", "expense_mix", "ترکیب هزینه‌ها", "Expense breakdown", "toman", [
            ("حقوق و دستمزد", "Payroll", 9_800_000_000), ("بازاریابی", "Marketing", 4_200_000_000),
            ("اجاره و انرژی", "Rent & utilities", 3_100_000_000), ("لجستیک", "Logistics", 2_900_000_000),
            ("سایر", "Other", 1_500_000_000)]),
        gauge("budget", "مصرف بودجه سالانه", "Annual budget used", "toman", 71_000_000_000, 95_000_000_000),
    ]),
    "operations": (L("پیش‌خوان عملیات", "Operations"), "truck", [
        num("in_fulfillment", "سفارش‌های در حال آماده‌سازی", "Orders in fulfillment", "count", 640, 710, "down"),
        num("on_time", "تحویل به‌موقع", "On-time delivery", "percent", 94.6, 93.1),
        num("processing_time", "میانگین زمان پردازش سفارش", "Avg. order processing time", "minutes", 42.0, 47.0, "down"),
        num("return_rate", "نرخ مرجوعی", "Return rate", "percent", 2.1, 2.4, "down"),
        line("shipments", "روند ارسال‌ها", "Shipments trend", "count", 85),
        listing("bar", "shipments_by_city", "ارسال‌ها به تفکیک شهر", "Shipments by city", "count",
                by_city([820, 310, 265, 210, 190, 175]), 2),
        listing("leaderboard", "carriers", "عملکرد شرکت‌های حمل", "Carrier performance", "count", [
            ("تیپاکس", "Tipax", 520), ("پست پیشتاز", "Post Express", 470), ("پیک اختصاصی", "In-house couriers", 390),
            ("چاپار", "Chapar", 260), ("ماهکس", "Mahex", 180)]),
        gauge("warehouse_util", "بهره‌وری انبار", "Warehouse utilization", "percent", 78.0, 85.0),
    ]),
    "marketing": (L("پیش‌خوان بازاریابی", "Marketing"), "megaphone", [
        num("visitors", "بازدیدکنندگان امروز", "Visitors today", "count", 48_500, 44_200),
        num("leads", "سرنخ‌های جدید", "New leads", "count", 1260, 1140),
        num("cpl", "هزینه هر سرنخ", "Cost per lead", "toman", 185_000, 210_000, "down"),
        num("roas", "بازگشت هزینه تبلیغات", "ROAS", None, 4.2, 3.8),
        line("traffic", "روند بازدید", "Traffic trend", "count", 2000),
        listing("bar", "leads_by_city", "سرنخ‌ها به تفکیک شهر", "Leads by city", "count",
                by_city([540, 190, 165, 130, 120, 115]), 2),
        listing("leaderboard", "campaigns", "برترین کارزارها", "Top campaigns", "count", [
            ("کارزار نوروزی", "Nowruz campaign", 386), ("جشنواره یلدا", "Yalda festival", 312),
            ("حراج آخر فصل", "End-of-season sale", 244), ("ارسال رایگان", "Free shipping", 198),
            ("باشگاه مشتریان", "Customer club", 120)]),
        listing("donut", "traffic_sources", "منابع ورودی", "Traffic sources", "count", [
            ("جستجوی گوگل", "Google search", 19_400), ("اینستاگرام", "Instagram", 12_600),
            ("تبلیغات کلیکی", "Paid ads", 8_300), ("ورود مستقیم", "Direct", 5_900), ("پیامک", "SMS", 2_300)]),
        gauge("lead_goal", "هدف سرنخ ماهانه", "Monthly lead goal", "count", 19_800, 26_000),
    ]),
    "support": (L("پیش‌خوان پشتیبانی", "Support"), "headphones", [
        num("open_tickets", "تیکت‌های باز", "Open tickets", "count", 184, 212, "down"),
        num("first_response", "زمان اولین پاسخ", "First response time", "minutes", 12.5, 15.8, "down"),
        num("resolved_today", "تیکت‌های حل‌شده امروز", "Resolved today", "count", 436, 402),
        gauge("csat", "رضایت مشتریان", "Customer satisfaction (CSAT)", "percent", 88.4, 92.0),
        line("new_tickets", "روند تیکت‌های جدید", "New tickets trend", "count", 40),
        listing("bar", "tickets_by_channel", "تیکت‌ها به تفکیک کانال", "Tickets by channel", "count", [
            ("تماس تلفنی", "Phone", 210), ("چت آنلاین", "Live chat", 165), ("ایمیل", "Email", 98),
            ("شبکه‌های اجتماعی", "Social media", 74), ("پیامک", "SMS", 41)], 2),
        listing("leaderboard", "agents", "برترین کارشناسان", "Top agents", "count", [
            ("سارا احمدی", "Sara Ahmadi", 96), ("علی رضایی", "Ali Rezaei", 88), ("مریم کریمی", "Maryam Karimi", 81),
            ("رضا محمدی", "Reza Mohammadi", 74), ("نگار حسینی", "Negar Hosseini", 67)]),
        listing("donut", "categories", "موضوع تیکت‌ها", "Ticket topics", "count", [
            ("پیگیری سفارش", "Order tracking", 240), ("مرجوعی کالا", "Returns", 120),
            ("پرداخت", "Payments", 85), ("مشکل فنی", "Technical issue", 60)]),
    ]),
    "saas": (L("پیش‌خوان اشتراک نرم‌افزار", "SaaS"), "cloud", [
        num("mrr", "درآمد تکراری ماهانه (MRR)", "Monthly recurring revenue", "toman", 8_600_000_000, 8_100_000_000),
        num("churn", "نرخ ریزش", "Churn rate", "percent", 2.3, 2.7, "down"),
        num("nps", "شاخص خالص ترویج (NPS)", "Net Promoter Score", "score", 47.0, 44.0),
        num("cac", "هزینه جذب مشتری (CAC)", "Customer acquisition cost", "toman", 12_500_000, 13_900_000, "down"),
        num("ltv", "ارزش طول عمر مشتری (LTV)", "Customer lifetime value", "toman", 168_000_000, 155_000_000),
        num("active_customers", "مشتریان فعال", "Active customers", "count", 1420, 1365),
        line("mrr_trend", "روند MRR", "MRR trend", "toman", 8_600_000_000),
        listing("bar", "signups_by_city", "ثبت‌نام‌های جدید به تفکیک شهر", "New signups by city", "count",
                by_city([64, 22, 19, 15, 12, 11]), 2),
        listing("donut", "plan_mix", "ترکیب پلن‌ها", "Plan mix", "count", [
            ("پایه", "Starter", 610), ("رشد", "Growth", 480), ("کسب‌وکار", "Business", 270), ("سازمانی", "Enterprise", 60)]),
    ]),
}

_last_tick = time.monotonic()


def tick_widget(wd):
    u, t = wd["unit"], wd["type"]
    if t == "number":
        wd["value"] = rounded(walk(wd["value"], *wd["_b"], 0.015), u)
    if t in ("number", "line"):
        s = wd["series"]
        v = wd["value"] if t == "number" else rounded(walk(s[-1]["v"], *wd["_b"], 0.03), u)
        wd["series"] = s[1:] + [{"t": iso(now()), "v": v}]
    elif t == "gauge":
        target = wd["goal"] * 0.97
        v = wd["value"] + (target - wd["value"]) * 0.02 + wd["goal"] * rnd.uniform(-0.004, 0.004)
        wd["value"] = rounded(min(max(v, 0.0), wd["goal"] * 1.1, 100.0 if u == "percent" else float("inf")), u)
    elif t in ("bar", "leaderboard", "donut"):
        key = "bars" if t == "bar" else "items"
        for it, b in zip(wd[key], wd["_ib"]):
            it["v"] = rounded(walk(it["v"], *b, 0.03), u)
        if t == "leaderboard":
            order = sorted(range(len(wd[key])), key=lambda i: -wd[key][i]["v"])
            wd[key] = [wd[key][i] for i in order]
            wd["_ib"] = [wd["_ib"][i] for i in order]


def advance(n):
    for _, _, widgets in DASHBOARDS.values():
        for wd in widgets:
            for _ in range(n):
                tick_widget(wd)


def catch_up():
    """Advance the shared state lazily by elapsed wall time; no background task."""
    global _last_tick
    n = int((time.monotonic() - _last_tick) / TICK)
    if n:
        advance(min(n, MAX_CATCHUP))
        _last_tick += n * TICK


def dashboard_json(id):
    if id not in DASHBOARDS:
        raise HTTPException(404, "dashboard not found")
    catch_up()
    title, _, widgets = DASHBOARDS[id]
    return {"id": id, "title": title, "updated_at": iso(now()),
            "widgets": [{k: v for k, v in wd.items() if not k.startswith("_")} for wd in widgets]}


def features(fa, en):
    return {"fa": fa, "en": en}


PLANS = [
    {"id": "starter", "name": L("پایه", "Starter"), "price_toman": 4_900_000, "highlighted": False,
     "features": features(
         ["۳ پیش‌خوان", "۵ کاربر", "اتصال به Excel و CSV", "قالب‌های آماده فروش و مالی",
          "۱۴ روز استفاده رایگان", "تخفیف در پرداخت سالانه"],
         ["3 dashboards", "5 users", "Excel & CSV connectors", "Sales & finance templates",
          "14-day free trial", "Discount on annual prepay"])},
    {"id": "growth", "name": L("رشد", "Growth"), "price_toman": 14_900_000, "highlighted": False,
     "features": features(
         ["۱۰ پیش‌خوان", "۱۵ کاربر", "اتصال به PostgreSQL، MySQL و ووکامرس", "همه قالب‌های آماده",
          "هشدار پیامکی شاخص‌ها", "حالت نمایش تلویزیونی", "۱۴ روز استفاده رایگان"],
         ["10 dashboards", "15 users", "PostgreSQL, MySQL & WooCommerce connectors", "All templates",
          "SMS KPI alerts", "TV / wall-screen mode", "14-day free trial"])},
    {"id": "business", "name": L("کسب‌وکار", "Business"), "price_toman": 39_000_000, "highlighted": True,
     "features": features(
         ["پیش‌خوان نامحدود", "۵۰ کاربر", "همه اتصال‌ها: درگاه پرداخت، CRM/ERP و مرکز تماس",
          "به‌روزرسانی لحظه‌ای", "دسترسی به REST API", "پشتیبانی اولویت‌دار", "۱۴ روز استفاده رایگان"],
         ["Unlimited dashboards", "50 users", "All connectors: payment gateway, CRM/ERP & call center",
          "Real-time updates", "REST API access", "Priority support", "14-day free trial"])},
    {"id": "enterprise", "name": L("سازمانی", "Enterprise"), "price_toman": None, "highlighted": False,
     "features": features(
         ["از ۹۵ میلیون تومان در ماه یا قرارداد سالانه", "کاربر نامحدود", "نصب روی سرور سازمان (On-premise)",
          "محدودیت IP و ورود یکپارچه (SSO)", "مدیر حساب اختصاصی", "تعهد سطح خدمات (SLA)"],
         ["From 95M Toman/month or annual contract", "Unlimited users", "On-premise deployment",
          "IP restriction & SSO", "Dedicated account manager", "Service-level agreement (SLA)"])},
]

CONNECTORS = [
    {"id": "excel", "name": L("اکسل", "Excel"), "category": "file"},
    {"id": "csv", "name": L("فایل CSV", "CSV file"), "category": "file"},
    {"id": "postgresql", "name": L("PostgreSQL", "PostgreSQL"), "category": "database"},
    {"id": "mysql", "name": L("MySQL", "MySQL"), "category": "database"},
    {"id": "woocommerce", "name": L("ووکامرس", "WooCommerce"), "category": "commerce"},
    {"id": "payment_gateway", "name": L("درگاه پرداخت", "Payment gateway"), "category": "payment"},
    {"id": "crm", "name": L("نرم‌افزار CRM", "CRM"), "category": "crm"},
    {"id": "erp", "name": L("نرم‌افزار ERP", "ERP"), "category": "crm"},
    {"id": "call_center", "name": L("مرکز تماس", "Call center"), "category": "communication"},
    {"id": "sms", "name": L("سامانه پیامکی", "SMS gateway"), "category": "communication"},
    {"id": "rest_api", "name": L("REST API", "REST API"), "category": "api"},
]

app = FastAPI(title="MetricBoard API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/dashboards")
async def dashboards():
    return [{"id": k, "title": t, "icon": i} for k, (t, i, _) in DASHBOARDS.items()]


@app.get("/api/dashboards/{id}")
async def dashboard(id: str):
    return dashboard_json(id)


@app.get("/api/dashboards/{id}/stream")
async def stream(id: str, request: Request):
    dashboard_json(id)  # 404 before the stream starts

    async def events():
        while not await request.is_disconnected():
            yield f"event: update\ndata: {json.dumps(dashboard_json(id), ensure_ascii=False)}\n\n"
            await asyncio.sleep(TICK)

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


@app.get("/api/plans")
async def plans():
    return PLANS


@app.get("/api/connectors")
async def connectors():
    return CONNECTORS
