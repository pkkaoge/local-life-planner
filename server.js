const express = require("express");
const { Pool } = require("pg");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

// ─── Config ────────────────────────────────────────────────────────
const PORT = parseInt(process.env.DEPLOY_RUN_PORT || "5000", 10);

const ENV = {
  JWT_SECRET: process.env.JWT_SECRET || "dev-jwt-secret-change-in-prod",
  JWT_ISSUER: process.env.JWT_ISSUER || "local-life-planner",
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || "dev-admin-token-change-in-prod",
  AMAP_ROUTE_KEY: process.env.AMAP_ROUTE_KEY || "",
  SMS_PROVIDER: process.env.SMS_PROVIDER || "dev",
  SMS_WEBHOOK_URL: process.env.SMS_WEBHOOK_URL || "",
  SMS_WEBHOOK_TOKEN: process.env.SMS_WEBHOOK_TOKEN || "",
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "manual",
  ALIPAY_PAYEE_NAME: process.env.ALIPAY_PAYEE_NAME || "支付宝收款账户",
  ALIPAY_QR_URL: process.env.ALIPAY_QR_URL || "/assets/alipay-qr.jpg",
  APP_BASE_URL: process.env.APP_BASE_URL || "",
  ALLOW_DEV_SMS: process.env.ALLOW_DEV_SMS || "1",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "",
};

const PLAN_DEFS = {
  "pro-monthly": { id: "pro-monthly", label: "月付", amountCents: 1900, days: 31 },
  "pro-yearly": { id: "pro-yearly", label: "年付", amountCents: 9900, days: 366 },
  "pro-lifetime": { id: "pro-lifetime", label: "终身", amountCents: 69900, days: 36500 },
};

const DEFAULT_SETTINGS = {
  homeLabel: "达人住址",
  homeAddress: "上海市静安区南京西路",
  homeLat: 31.2296,
  homeLng: 121.4598,
  startTime: "09:30",
  defaultDuration: 45,
  bufferMinutes: 10,
  travelMode: "drive",
  mapProvider: "amap",
  city: "上海",
};

// ─── Database ──────────────────────────────────────────────────────
// Load database env vars if not already set
const { execSync } = require("child_process");
if (!process.env.PGDATABASE_URL && !process.env.DATABASE_URL) {
  try {
    const output = execSync("python3 /source/storage_skill/drizzle/load_env.py", {
      encoding: "utf-8",
      timeout: 10000,
    });
    const lines = output.trim().split("\n");
    for (const line of lines) {
      const cleanLine = line.startsWith("export ") ? line.substring(7) : line;
      const eqIndex = cleanLine.indexOf("=");
      if (eqIndex > 0) {
        const key = cleanLine.substring(0, eqIndex);
        let value = cleanLine.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!key.startsWith("#")) {
          process.env[key] = value;
        }
      }
    }
  } catch (e) {
    console.error("Failed to load database env vars:", e.message);
  }
}

const dbUrl = process.env.PGDATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({
  connectionString: dbUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: dbUrl && dbUrl.includes("sslmode=") ? { rejectUnauthorized: false } : undefined,
});

async function dbQuery(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  return res;
}

async function dbFirst(text, params = []) {
  const res = await dbQuery(text, params);
  return res.rows[0] || null;
}

// ─── Crypto helpers ────────────────────────────────────────────────
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

function hmacSign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function hmacHex(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function base64urlEncode(value) {
  return Buffer.from(value, "utf-8").toString("base64url");
}

function base64urlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf-8");
}

function signToken(claims) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ENV.JWT_ISSUER,
    iat: now,
    exp: now + 30 * 24 * 60 * 60,
    ...claims,
  };
  const unsigned = `${base64urlEncode(JSON.stringify(header))}.${base64urlEncode(JSON.stringify(payload))}`;
  const signature = hmacSign(unsigned, ENV.JWT_SECRET);
  return `${unsigned}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw httpError(401, "登录已失效");
  const expected = hmacSign(`${parts[0]}.${parts[1]}`, ENV.JWT_SECRET);
  if (expected !== parts[2]) throw httpError(401, "登录已失效");
  const payload = JSON.parse(base64urlDecode(parts[1]));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw httpError(401, "登录已过期");
  return payload;
}

// ─── Utility ───────────────────────────────────────────────────────
function normalizePhone(phone) {
  const value = String(phone || "").replace(/\D/g, "");
  return /^1\d{10}$/.test(value) ? value : "";
}

function randomDigits(length) {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => String(n % 10)).join("");
}

function createOrderNo() {
  const now = new Date();
  const stamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join("");
  return `LLP${stamp}${randomDigits(4)}`;
}

function resolvePlan(planId) {
  return PLAN_DEFS[planId] || PLAN_DEFS["pro-yearly"];
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function authCookie(token, isSecure) {
  const secure = isSecure ? " Secure;" : "";
  return `planner_session=${token}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${30 * 24 * 60 * 60}`;
}

function expiredAuthCookie(isSecure) {
  const secure = isSecure ? " Secure;" : "";
  return `planner_session=; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=0`;
}

// ─── App ───────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["content-type", "authorization"],
}));
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

// Static files
app.use(express.static(path.join(__dirname), { dotfiles: "ignore" }));

// ─── Health ────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "local-life-planner-api" });
});

// ─── Auth ──────────────────────────────────────────────────────────
app.post("/api/auth/sms-code", async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    if (!phone) throw httpError(400, "手机号格式不正确");

    const code = randomDigits(6);
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 60 * 1000);
    const codeHash = sha256(`${phone}:${code}:${ENV.JWT_SECRET}`);
    const id = crypto.randomUUID();

    await dbQuery(
      "INSERT INTO sms_codes (id, phone, code_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)",
      [id, phone, codeHash, expires.toISOString(), now.toISOString()]
    );

    if (ENV.SMS_PROVIDER === "webhook") {
      if (!ENV.SMS_WEBHOOK_URL) throw httpError(500, "短信服务未配置");
      const resp = await fetch(ENV.SMS_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(ENV.SMS_WEBHOOK_TOKEN ? { authorization: `Bearer ${ENV.SMS_WEBHOOK_TOKEN}` } : {}),
        },
        body: JSON.stringify({ phone, code, ttlSeconds: 300 }),
      });
      if (!resp.ok) throw httpError(502, "短信发送失败");
    }

    res.json({
      ok: true,
      message: "验证码已发送",
      ...(ENV.ALLOW_DEV_SMS === "1" ? { devCode: code } : {}),
    });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const phone = normalizePhone(req.body.phone);
    const code = String(req.body.code || "").trim();
    if (!phone) throw httpError(400, "手机号格式不正确");
    if (!/^\d{6}$/.test(code)) throw httpError(400, "验证码格式不正确");

    const record = await dbFirst(
      "SELECT * FROM sms_codes WHERE phone = $1 AND used_at IS NULL ORDER BY created_at DESC LIMIT 1",
      [phone]
    );
    if (!record) throw httpError(401, "验证码不存在或已使用");
    if (new Date(record.expires_at).getTime() < Date.now()) throw httpError(401, "验证码已过期");

    const expected = sha256(`${phone}:${code}:${ENV.JWT_SECRET}`);
    if (record.code_hash !== expected) throw httpError(401, "验证码不正确");

    const now = new Date().toISOString();
    let user = await dbFirst("SELECT * FROM users WHERE phone = $1", [phone]);
    if (!user) {
      const id = crypto.randomUUID();
      await dbQuery(
        "INSERT INTO users (id, phone, created_at, updated_at) VALUES ($1, $2, $3, $4)",
        [id, phone, now, now]
      );
      await dbQuery(
        "INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1, $2, $3)",
        [id, JSON.stringify(DEFAULT_SETTINGS), now]
      );
      user = { id, phone, created_at: now, updated_at: now };
    } else {
      await dbQuery("UPDATE users SET updated_at = $1 WHERE id = $2", [now, user.id]);
    }

    await dbQuery("UPDATE sms_codes SET used_at = $1 WHERE id = $2", [now, record.id]);

    const token = signToken({ sub: user.id, phone: user.phone });
    const serialized = await serializeUser(user);
    const isSecure = req.protocol === "https";
    res.setHeader("set-cookie", authCookie(token, isSecure));
    res.json({ ok: true, user: serialized });
  } catch (err) {
    next(err);
  }
});

app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("set-cookie", expiredAuthCookie(false));
  res.json({ ok: true });
});

// ─── User middleware ────────────────────────────────────────────────
async function requireUser(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "") || req.cookies.planner_session || "";
  if (!token) throw httpError(401, "未登录");
  const payload = verifyToken(token);
  const user = await dbFirst("SELECT * FROM users WHERE id = $1", [payload.sub]);
  if (!user) throw httpError(401, "用户不存在");
  return user;
}

async function serializeUser(user) {
  const subscription = await dbFirst("SELECT * FROM subscriptions WHERE user_id = $1", [user.id]);
  const active = Boolean(subscription?.status === "active" && (!subscription.paid_until || new Date(subscription.paid_until).getTime() > Date.now()));
  return {
    id: user.id,
    phone: user.phone,
    subscriptionStatus: active ? "active" : "inactive",
    paidUntil: subscription?.paid_until || "",
    plan: subscription?.plan || "",
  };
}

async function requirePaid(user) {
  const serialized = await serializeUser(user);
  if (serialized.subscriptionStatus !== "active") throw httpError(402, "需要开通会员后使用");
}

// ─── Me ────────────────────────────────────────────────────────────
app.get("/api/me", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const serialized = await serializeUser(user);
    res.json({ ok: true, user: serialized });
  } catch (err) {
    next(err);
  }
});

// ─── Settings ──────────────────────────────────────────────────────
app.get("/api/settings", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const row = await dbFirst("SELECT data FROM user_settings WHERE user_id = $1", [user.id]);
    res.json({ ok: true, settings: row ? JSON.parse(row.data) : DEFAULT_SETTINGS });
  } catch (err) {
    next(err);
  }
});

app.put("/api/settings", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const settings = { ...DEFAULT_SETTINGS, ...(req.body.settings || {}) };
    const now = new Date().toISOString();
    await dbQuery(
      `INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT(user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [user.id, JSON.stringify(settings), now]
    );
    res.json({ ok: true, settings });
  } catch (err) {
    next(err);
  }
});

// ─── Shops ─────────────────────────────────────────────────────────
app.get("/api/shops", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const result = await dbQuery(
      "SELECT data FROM shops WHERE user_id = $1 ORDER BY COALESCE(scheduled_date, ''), COALESCE(order_index, 999999), updated_at DESC",
      [user.id]
    );
    res.json({ ok: true, shops: result.rows.map((row) => JSON.parse(row.data)) });
  } catch (err) {
    next(err);
  }
});

app.post("/api/shops", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    await requirePaid(user);
    const shop = req.body.shop || req.body;
    const id = shop.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const normalized = { ...shop, id, updatedAt: now, createdAt: shop.createdAt || now };
    await dbQuery(
      `INSERT INTO shops (id, user_id, data, scheduled_date, status, order_index, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(user_id, id) DO UPDATE SET data = EXCLUDED.data, scheduled_date = EXCLUDED.scheduled_date,
       status = EXCLUDED.status, order_index = EXCLUDED.order_index, updated_at = EXCLUDED.updated_at`,
      [id, user.id, JSON.stringify(normalized), normalized.scheduledDate || null, normalized.status || "pending", Number(normalized.order || 0) || null, normalized.createdAt, now]
    );
    res.json({ ok: true, shop: normalized });
  } catch (err) {
    next(err);
  }
});

app.put("/api/shops/:id", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    await requirePaid(user);
    const shopId = decodeURIComponent(req.params.id);
    const shop = req.body.shop || req.body;
    const id = shopId || shop.id || crypto.randomUUID();
    const now = new Date().toISOString();
    const normalized = { ...shop, id, updatedAt: now, createdAt: shop.createdAt || now };
    await dbQuery(
      `INSERT INTO shops (id, user_id, data, scheduled_date, status, order_index, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT(user_id, id) DO UPDATE SET data = EXCLUDED.data, scheduled_date = EXCLUDED.scheduled_date,
       status = EXCLUDED.status, order_index = EXCLUDED.order_index, updated_at = EXCLUDED.updated_at`,
      [id, user.id, JSON.stringify(normalized), normalized.scheduledDate || null, normalized.status || "pending", Number(normalized.order || 0) || null, normalized.createdAt, now]
    );
    res.json({ ok: true, shop: normalized });
  } catch (err) {
    next(err);
  }
});

app.delete("/api/shops/:id", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    await requirePaid(user);
    const shopId = decodeURIComponent(req.params.id);
    await dbQuery("DELETE FROM shops WHERE user_id = $1 AND id = $2", [user.id, shopId]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── Sync ──────────────────────────────────────────────────────────
app.put("/api/sync", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    await requirePaid(user);
    const settings = { ...DEFAULT_SETTINGS, ...(req.body.settings || {}) };
    const shops = Array.isArray(req.body.shops) ? req.body.shops : [];
    const now = new Date().toISOString();

    await dbQuery(
      `INSERT INTO user_settings (user_id, data, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT(user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
      [user.id, JSON.stringify(settings), now]
    );

    await dbQuery("DELETE FROM shops WHERE user_id = $1", [user.id]);

    for (const shop of shops) {
      const id = shop.id || crypto.randomUUID();
      const normalized = { ...shop, id, updatedAt: now, createdAt: shop.createdAt || now };
      await dbQuery(
        "INSERT INTO shops (id, user_id, data, scheduled_date, status, order_index, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [id, user.id, JSON.stringify(normalized), normalized.scheduledDate || null, normalized.status || "pending", Number(normalized.order || 0) || null, normalized.createdAt, now]
      );
    }

    res.json({ ok: true, settings, shops });
  } catch (err) {
    next(err);
  }
});

// ─── Amap Route ────────────────────────────────────────────────────
app.get("/api/amap/route", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const mode = req.query.mode || "drive";
    const origin = req.query.origin;
    const destination = req.query.destination;
    if (!origin || !destination) throw httpError(400, "origin and destination are required");
    if (!ENV.AMAP_ROUTE_KEY) throw httpError(500, "AMAP_ROUTE_KEY 未配置");

    const base = mode === "walk"
      ? "https://restapi.amap.com/v3/direction/walking"
      : mode === "ride"
        ? "https://restapi.amap.com/v4/direction/bicycling"
        : "https://restapi.amap.com/v3/direction/driving";

    const params = new URLSearchParams({ origin, destination, key: ENV.AMAP_ROUTE_KEY, output: "json" });
    if (mode === "drive") {
      params.set("extensions", "base");
      params.set("strategy", "10");
    }

    const response = await fetch(`${base}?${params.toString()}`);
    const payload = await response.json();

    let pathData;
    if (mode === "ride") {
      if (String(payload.errcode) !== "0") throw httpError(502, payload.errmsg || "高德骑行算路失败");
      pathData = payload.data?.paths?.[0];
      if (!pathData) throw httpError(502, "高德骑行无路线");
    } else {
      if (payload.status !== "1") throw httpError(502, payload.info || "高德算路失败");
      pathData = payload.route?.paths?.[0];
      if (!pathData) throw httpError(502, "高德无路线");
    }

    res.json({
      ok: true,
      provider: "amap",
      mode,
      distanceMeters: Number(pathData.distance || 0),
      durationSeconds: Number(pathData.duration || 0),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Billing ───────────────────────────────────────────────────────
app.post("/api/billing/checkout", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const provider = ENV.PAYMENT_PROVIDER;
    const planMeta = resolvePlan(req.body.plan);
    const plan = planMeta.id;
    const amountCents = planMeta.amountCents;
    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const orderNo = createOrderNo();

    await dbQuery(
      "INSERT INTO payment_orders (id, order_no, user_id, status, provider, amount_cents, plan, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [orderId, orderNo, user.id, "pending", provider, amountCents, plan, now, now]
    );

    if (provider === "stripe") {
      if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID || !ENV.APP_BASE_URL) {
        throw httpError(500, "Stripe 未配置完整");
      }
      const params = new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": process.env.STRIPE_PRICE_ID,
        "line_items[0][quantity]": "1",
        success_url: `${ENV.APP_BASE_URL}/?paid=success`,
        cancel_url: `${ENV.APP_BASE_URL}/?paid=cancel`,
        client_reference_id: orderNo,
        "metadata[user_id]": user.id,
        "metadata[order_id]": orderId,
        "metadata[order_no]": orderNo,
        "metadata[plan]": plan,
      });
      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: params,
      });
      const session = await stripeResponse.json();
      if (!stripeResponse.ok) throw httpError(502, session.error?.message || "Stripe 下单失败");
      await dbQuery("UPDATE payment_orders SET provider_ref = $1, updated_at = $2 WHERE id = $3", [session.id, new Date().toISOString(), orderId]);
      return res.json({ ok: true, orderId, orderNo, amountCents, plan, planLabel: planMeta.label, provider, paymentUrl: session.url });
    }

    const paymentUrl = "";
    res.json({
      ok: true,
      orderId,
      orderNo,
      amountCents,
      plan,
      planLabel: planMeta.label,
      provider,
      paymentUrl,
      paymentMethod: "manual_alipay",
      payeeName: ENV.ALIPAY_PAYEE_NAME,
      alipayQrImage: ENV.ALIPAY_QR_URL,
      message: "订单已创建，请转账后提交等待确认",
    });
  } catch (err) {
    next(err);
  }
});

app.get("/api/billing/orders", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const result = await dbQuery(
      "SELECT * FROM payment_orders WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 50",
      [user.id]
    );
    res.json({ ok: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
});

app.post("/api/billing/orders/:orderNo/submit", async (req, res, next) => {
  try {
    const user = await requireUser(req);
    const orderNo = req.params.orderNo;
    const order = await dbFirst(
      "SELECT * FROM payment_orders WHERE user_id = $1 AND order_no = $2",
      [user.id, orderNo]
    );
    if (!order) throw httpError(404, "订单不存在");
    if (order.status === "paid") {
      return res.json({ ok: true, status: "paid" });
    }
    const now = new Date().toISOString();
    await dbQuery("UPDATE payment_orders SET status = $1, updated_at = $2 WHERE id = $3", ["submitted", now, order.id]);
    res.json({ ok: true, status: "submitted", message: "已提交付款确认，等待人工审核" });
  } catch (err) {
    next(err);
  }
});

// ─── Admin ─────────────────────────────────────────────────────────
app.get("/api/admin/orders", async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!ENV.ADMIN_TOKEN || token !== ENV.ADMIN_TOKEN) throw httpError(403, "无权限");
    const status = req.query.status || "submitted";
    const result = await dbQuery(
      "SELECT payment_orders.*, users.phone FROM payment_orders JOIN users ON users.id = payment_orders.user_id WHERE payment_orders.status = $1 ORDER BY payment_orders.updated_at DESC LIMIT 100",
      [status]
    );
    res.json({ ok: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
});

app.post("/api/admin/activate", async (req, res, next) => {
  try {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!ENV.ADMIN_TOKEN || token !== ENV.ADMIN_TOKEN) throw httpError(403, "无权限");

    const orderNo = String(req.body.orderNo || "").trim();
    let user, order;
    if (orderNo) {
      order = await dbFirst("SELECT * FROM payment_orders WHERE order_no = $1", [orderNo]);
      if (!order) throw httpError(404, "订单不存在");
      user = await dbFirst("SELECT * FROM users WHERE id = $1", [order.user_id]);
    } else {
      const phone = normalizePhone(req.body.phone);
      if (!phone) throw httpError(400, "手机号或订单号必填");
      user = await dbFirst("SELECT * FROM users WHERE phone = $1", [phone]);
    }
    if (!user) throw httpError(404, "用户不存在");

    const planMeta = resolvePlan(req.body.plan || order?.plan);
    await activateSubscription(user.id, planMeta.id, req.body.days || planMeta.days, "manual_alipay", orderNo || req.body.providerRef || "");
    if (order) {
      await dbQuery("UPDATE payment_orders SET status = $1, updated_at = $2 WHERE id = $3", ["paid", new Date().toISOString(), order.id]);
    }
    res.json({ ok: true, phone: user.phone, orderNo: orderNo || "" });
  } catch (err) {
    next(err);
  }
});

// ─── Stripe Webhook ────────────────────────────────────────────────
app.post("/api/billing/webhook/stripe", async (req, res, next) => {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw httpError(500, "STRIPE_WEBHOOK_SECRET 未配置");
    const event = req.body;
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object || {};
      const userId = session.metadata?.user_id;
      const orderId = session.metadata?.order_id;
      const orderNo = session.metadata?.order_no || session.client_reference_id;
      if (userId) {
        let planId = session.metadata?.plan;
        if (!planId && (orderId || orderNo)) {
          const order = orderId
            ? await dbFirst("SELECT plan FROM payment_orders WHERE id = $1", [orderId])
            : await dbFirst("SELECT plan FROM payment_orders WHERE order_no = $1", [orderNo]);
          planId = order?.plan;
        }
        const planMeta = resolvePlan(planId);
        await activateSubscription(userId, planMeta.id, planMeta.days, "stripe", session.id || "");
        if (orderId || orderNo) {
          if (orderId) {
            await dbQuery("UPDATE payment_orders SET status = $1, provider_ref = $2, updated_at = $3 WHERE id = $4", ["paid", session.id || "", new Date().toISOString(), orderId]);
          } else {
            await dbQuery("UPDATE payment_orders SET status = $1, provider_ref = $2, updated_at = $3 WHERE order_no = $4", ["paid", session.id || "", new Date().toISOString(), orderNo]);
          }
        }
      }
    }
    res.send("ok");
  } catch (err) {
    next(err);
  }
});

// ─── Subscription helper ───────────────────────────────────────────
async function activateSubscription(userId, plan, days, provider, providerRef) {
  const paidUntil = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  await dbQuery(
    `INSERT INTO subscriptions (user_id, status, plan, paid_until, provider, provider_ref, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT(user_id) DO UPDATE SET status = EXCLUDED.status, plan = EXCLUDED.plan,
     paid_until = EXCLUDED.paid_until, provider = EXCLUDED.provider, provider_ref = EXCLUDED.provider_ref, updated_at = EXCLUDED.updated_at`,
    [userId, "active", plan, paidUntil, provider, providerRef, now]
  );
}

// ─── Error handler ─────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  console.error(`[API Error] ${status}: ${err.message}`);
  res.status(status).json({ ok: false, error: err.message || "Internal error" });
});

// ─── Start ─────────────────────────────────────────────────────────
async function start() {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log("[DB] Connected to PostgreSQL");
    client.release();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Server] Local Life Planner running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("[DB] Failed to connect to PostgreSQL:", err.message);
    process.exit(1);
  }
}

start();
