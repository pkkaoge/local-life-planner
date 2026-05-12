const _testerId = new URLSearchParams(location.search).get("t") || "";
const _keySuffix = _testerId ? `-t${_testerId}` : "";
const STORAGE_KEY = `douyin-local-planner-v1${_keySuffix}`;
const AUTH_STORAGE_KEY = `douyin-local-planner-auth-v1${_keySuffix}`;
const APP_CONFIG = window.PLANNER_CONFIG || {};
const API_BASE = String(APP_CONFIG.apiBase || "").replace(/\/$/, "");
const API_MODE = APP_CONFIG.apiMode || "auto";
const FALLBACK_PLANS = [
  {
    id: "pro-monthly",
    label: "月付",
    price: "¥19",
    period: "每月",
    amountCents: 1900,
    durationDays: 31,
    tag: "灵活",
    description: "适合短期接单或先试用"
  },
  {
    id: "pro-yearly",
    label: "年付",
    price: "¥99",
    period: "每年",
    amountCents: 9900,
    durationDays: 366,
    tag: "推荐",
    description: "长期使用更划算",
    recommended: true
  },
  {
    id: "pro-lifetime",
    label: "终身",
    price: "¥699",
    period: "一次付清",
    amountCents: 69900,
    durationDays: 36500,
    tag: "买断",
    description: "一次开通，长期使用",
    lifetime: true
  }
];
const PLAN_OPTIONS = normalizePlanOptions(APP_CONFIG.plans || APP_CONFIG.manualPayment?.plans);
const DEFAULT_PLAN_ID = PLAN_OPTIONS.find((plan) => plan.recommended)?.id || PLAN_OPTIONS[1]?.id || PLAN_OPTIONS[0]?.id || "pro-yearly";

const SAMPLE_POIS = [
  { name: "御禾牛肉饭 南京西路店", address: "上海市静安区南京西路1618号", lat: 31.2297, lng: 121.4594, category: "快餐简餐" },
  { name: "青柠泰餐 静安寺店", address: "上海市静安区愚园路68号", lat: 31.2239, lng: 121.4487, category: "东南亚菜" },
  { name: "花巷小馆 愚园路店", address: "上海市静安区愚园路318号", lat: 31.2254, lng: 121.4381, category: "本帮江浙菜" },
  { name: "竹叶日料 武定路店", address: "上海市静安区武定路650号", lat: 31.2358, lng: 121.4435, category: "日本料理" },
  { name: "越光米线 江宁路店", address: "上海市静安区江宁路428号", lat: 31.2365, lng: 121.4542, category: "云南菜" },
  { name: "糯也甜品 昌平路店", address: "上海市静安区昌平路560号", lat: 31.234, lng: 121.4423, category: "甜品" },
  { name: "叁两面馆 陕西北路店", address: "上海市静安区陕西北路525号", lat: 31.2361, lng: 121.4598, category: "面馆" },
  { name: "烟火烤肉 巨鹿路店", address: "上海市静安区巨鹿路758号", lat: 31.2195, lng: 121.4628, category: "烤肉" },
  { name: "拾味海鲜 淮海中路店", address: "上海市黄浦区淮海中路939号", lat: 31.2182, lng: 121.4692, category: "海鲜" },
  { name: "春山茶事 新天地店", address: "上海市黄浦区马当路245号", lat: 31.2191, lng: 121.479, category: "茶饮" },
  { name: "里弄咖啡 延平路店", address: "上海市静安区延平路135号", lat: 31.2295, lng: 121.4392, category: "咖啡" },
  { name: "南园粤点 恒隆广场店", address: "上海市静安区南京西路1266号", lat: 31.2264, lng: 121.4573, category: "粤菜" },
  { name: "满庭湘菜 万航渡路店", address: "上海市静安区万航渡路889号", lat: 31.232, lng: 121.4317, category: "湘菜" },
  { name: "谷雨轻食 常德路店", address: "上海市静安区常德路800号", lat: 31.2308, lng: 121.448, category: "轻食" },
  { name: "小满火锅 胶州路店", address: "上海市静安区胶州路273号", lat: 31.2319, lng: 121.4496, category: "火锅" },
  { name: "梨花烘焙 富民路店", address: "上海市静安区富民路88号", lat: 31.218, lng: 121.4547, category: "烘焙" },
  { name: "椒鸣川菜 茂名北路店", address: "上海市静安区茂名北路256号", lat: 31.2232, lng: 121.4609, category: "川菜" },
  { name: "良宵酒馆 铜仁路店", address: "上海市静安区铜仁路88号", lat: 31.2277, lng: 121.452, category: "酒馆" },
  { name: "岸边意面 陕西南路店", address: "上海市徐汇区陕西南路225号", lat: 31.2143, lng: 121.4586, category: "西餐" },
  { name: "月白烧鸟 长乐路店", address: "上海市黄浦区长乐路462号", lat: 31.217, lng: 121.4649, category: "烧鸟" },
  { name: "橙桥小厨 北京西路店", address: "上海市静安区北京西路1700号", lat: 31.2326, lng: 121.4563, category: "创意菜" },
  { name: "南山素食 安远路店", address: "上海市静安区安远路518号", lat: 31.2411, lng: 121.4457, category: "素食" },
  { name: "麓川酸汤鱼 石门一路店", address: "上海市静安区石门一路288号", lat: 31.2248, lng: 121.4663, category: "贵州菜" },
  { name: "雀舌茶寮 巨鹿路店", address: "上海市静安区巨鹿路568号", lat: 31.2187, lng: 121.4591, category: "茶馆" },
  { name: "一禾寿司 常熟路店", address: "上海市徐汇区常熟路98号", lat: 31.2148, lng: 121.451, category: "寿司" },
  { name: "山野咖喱 乌鲁木齐北路店", address: "上海市静安区乌鲁木齐北路210号", lat: 31.2226, lng: 121.4461, category: "咖喱" },
  { name: "热浪炸鸡 康定路店", address: "上海市静安区康定路1028号", lat: 31.2389, lng: 121.4372, category: "小吃" },
  { name: "半岛砂锅 陕西北路店", address: "上海市静安区陕西北路777号", lat: 31.2414, lng: 121.4552, category: "砂锅" },
  { name: "觅糖豆花 奉贤路店", address: "上海市静安区奉贤路178号", lat: 31.2286, lng: 121.4632, category: "甜品" },
  { name: "青麦Brunch 胶州路店", address: "上海市静安区胶州路709号", lat: 31.2382, lng: 121.4455, category: "Brunch" }
];

const DEFAULT_SETTINGS = {
  homeLabel: "达人住址",
  homeAddress: "上海市静安区南京西路",
  homeLat: 31.2296,
  homeLng: 121.4598,
  startTime: "09:30",
  defaultDuration: 45,
  bufferMinutes: 10,
  travelMode: "drive",
  mapProvider: APP_CONFIG.mapProvider || "amap",
  city: APP_CONFIG.city || "上海"
};

const ui = {
  activeView: "today",
  selectedDate: todayISO(),
  calendarMode: "day",
  searchQuery: "",
  remoteQuery: "",
  remoteSuggestions: [],
  remoteLoading: false,
  modalSearch: "",
  modalSuggestions: [],
  modalSearchLoading: false,
  modalPoiSelected: false,
  authPhone: "",
  authCode: "",
  smsPhone: "",
  smsCode: "",
  selectedPlan: DEFAULT_PLAN_ID,
  paymentOrder: null,
  modal: null,
  form: {}
};

const app = document.querySelector("#app");
const toastBox = document.querySelector("#toast");
let data = loadData();
let auth = loadAuth();
let apiAvailable = false;
let apiChecked = false;
let apiUser = null;
let userGpsLat = null;
let userGpsLng = null;
let apiError = "";
let booting = true;
let syncTimer = 0;
let toastTimer = 0;
let remoteTimer = 0;
let remoteToken = 0;
let modalSearchTimer = 0;
let modalSearchToken = 0;
let amapPromise = null;
const routeLegCache = new Map();

init();

app.addEventListener("click", handleClick);
app.addEventListener("input", handleInput);
app.addEventListener("change", handleChange);
app.addEventListener("submit", handleSubmit);

async function init() {
  if (API_MODE !== "demo") {
    try {
      await apiFetch("/api/health", { auth: false });
      apiAvailable = true;
      apiChecked = true;
      await refreshApiUser();
      if (apiUser?.subscriptionStatus === "active") {
        await loadRemoteWorkspace();
      }
    } catch (error) {
      apiChecked = true;
      apiAvailable = false;
      apiError = error.message || "服务暂不可用";
      if (API_MODE === "api") {
        booting = false;
        render();
        return;
      }
    }
  }

  booting = false;
  render();
  detectCurrentCity();
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw);
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    settings.city = settings.city || APP_CONFIG.city;
    settings.mapProvider = APP_CONFIG.mapProvider || settings.mapProvider;
    return {
      settings,
      shops: Array.isArray(parsed.shops) ? parsed.shops : []
    };
  } catch (error) {
    console.warn("Failed to parse local data", error);
    return createSeedData();
  }
}

function createSeedData() {
  const seeded = {
    settings: { ...DEFAULT_SETTINGS },
    shops: SAMPLE_POIS.slice(0, 10).map((poi, index) => ({
      id: `seed-${index + 1}`,
      ...poi,
      duration: index % 3 === 0 ? 50 : 42,
      status: index < 2 ? "filmed" : "pending",
      notes: index < 2 ? "首轮演示数据，可直接改删。" : "",
      scheduledDate: todayISO(),
      createdAt: new Date().toISOString()
    }))
  };
  const ordered = optimizeRoute(seeded.shops, seeded.settings);
  applySchedule(seeded, todayISO(), ordered);
  return seeded;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  scheduleRemoteSync();
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    credentials: "include",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error || `请求失败：${response.status}`);
  }
  return payload;
}

async function refreshApiUser() {
  if (!apiAvailable) return null;
  try {
    const result = await apiFetch("/api/me");
    apiUser = result.user;
    return apiUser;
  } catch (error) {
    apiUser = null;
    if (error.message !== "未登录") console.warn(error);
    return null;
  }
}

async function loadRemoteWorkspace() {
  if (!apiAvailable) return;
  const [settingsResult, shopsResult] = await Promise.all([
    apiFetch("/api/settings"),
    apiFetch("/api/shops")
  ]);
  data = {
    settings: { ...DEFAULT_SETTINGS, ...(settingsResult.settings || {}) },
    shops: Array.isArray(shopsResult.shops) ? shopsResult.shops : []
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function scheduleRemoteSync() {
  if (!apiAvailable || apiUser?.subscriptionStatus !== "active") return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(async () => {
    try {
      await apiFetch("/api/sync", {
        method: "PUT",
        body: {
          settings: data.settings,
          shops: data.shops
        }
      });
    } catch (error) {
      console.warn("Remote sync failed", error);
    }
  }, 350);
}

function loadAuth() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return { currentPhone: "", accounts: {} };

  try {
    const parsed = JSON.parse(raw);
    return {
      currentPhone: parsed.currentPhone || "",
      accounts: parsed.accounts && typeof parsed.accounts === "object" ? parsed.accounts : {}
    };
  } catch (error) {
    console.warn("Failed to parse auth data", error);
    return { currentPhone: "", accounts: {} };
  }
}

function saveAuth() {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function currentAccount() {
  if (apiAvailable) return apiUser;
  if (!auth.currentPhone) return null;
  return auth.accounts[auth.currentPhone] || null;
}

function hasPaidAccess() {
  if (apiAvailable) return apiUser?.subscriptionStatus === "active";
  const account = currentAccount();
  if (!account) return false;
  if (account.subscriptionStatus !== "active") return false;
  if (!account.paidUntil) return true;
  return new Date(account.paidUntil).getTime() > Date.now();
}

function render() {
  if (booting) {
    app.innerHTML = renderBootScreen();
    return;
  }

  if (API_MODE === "api" && apiChecked && !apiAvailable) {
    app.innerHTML = renderApiErrorScreen();
    return;
  }

  if (API_MODE !== "demo" && !currentAccount()) {
    app.innerHTML = renderAuthScreen();
    return;
  }

  if (API_MODE !== "demo" && !hasPaidAccess()) {
    app.innerHTML = renderPaywall();
    return;
  }

  const stats = getDayStats(ui.selectedDate);
  app.innerHTML = `
    <main class="app-shell">
      ${renderHeader(stats)}
      ${renderActiveView()}
      ${renderBottomNav()}
      ${renderModal()}
    </main>
  `;
}

function renderBootScreen() {
  return `
    <main class="auth-shell">
      <section class="auth-panel">
        <p class="eyebrow">探店排期助手</p>
        <h1>正在连接服务</h1>
        <p class="auth-copy">正在检查账号、会员和云端数据。</p>
      </section>
    </main>
  `;
}

function renderApiErrorScreen() {
  return `
    <main class="auth-shell">
      <section class="auth-panel">
        <p class="eyebrow">服务不可用</p>
        <h1>后端 API 还没有连上</h1>
        <p class="auth-copy">${escapeHtml(apiError || "请检查部署域名、Worker 路由和环境变量。")}</p>
        <button class="btn green" data-action="reload-app">${icon("refresh")}重新连接</button>
      </section>
    </main>
  `;
}

function renderAuthScreen() {
  return `
    <main class="auth-shell">
      <section class="auth-panel">
        <p class="eyebrow">抖音本地生活 · 达人排期工具</p>
        <h1>先登录，再开始排店</h1>
        <p class="auth-copy">手机号注册/登录后开通会员，即可使用店铺搜索、自动排期、日历管理和导航。</p>
        <div class="form-grid">
          <div class="field">
            <label>手机号</label>
            <input data-field="auth-phone" inputmode="tel" maxlength="11" value="${attr(ui.authPhone)}" placeholder="请输入手机号" />
          </div>
          <div class="auth-code-row">
            <div class="field">
              <label>验证码</label>
              <input data-field="auth-code" inputmode="numeric" maxlength="6" value="${attr(ui.authCode)}" placeholder="短信验证码" />
            </div>
            <button class="btn secondary" data-action="send-code">获取验证码</button>
          </div>
          <button class="btn green" data-action="login-register">${icon("check")}登录 / 注册</button>
        </div>
        <p class="settings-note">${apiAvailable ? "验证码由后端短信服务发送。" : "当前未连接正式后端，使用本机演示验证码。"}</p>
      </section>
    </main>
  `;
}

function normalizePlanOptions(configPlans) {
  const source = Array.isArray(configPlans) && configPlans.length ? configPlans : FALLBACK_PLANS;
  return source.map((plan, index) => ({
    id: plan.id || `plan-${index}`,
    label: plan.label || "会员",
    price: plan.price || formatMoney(Number(plan.amountCents || 0)),
    period: plan.period || "",
    amountCents: Number(plan.amountCents || 0),
    durationDays: Number(plan.durationDays || plan.days || 31),
    tag: plan.tag || "",
    description: plan.description || "",
    recommended: Boolean(plan.recommended),
    lifetime: Boolean(plan.lifetime || plan.id === "pro-lifetime")
  }));
}

function getPlan(planId = ui.selectedPlan) {
  return PLAN_OPTIONS.find((plan) => plan.id === planId) || PLAN_OPTIONS[0];
}

function paidUntilForPlan(plan) {
  if (plan?.lifetime) return "";
  const paidUntil = new Date();
  paidUntil.setDate(paidUntil.getDate() + Number(plan?.durationDays || 31));
  return paidUntil.toISOString();
}

function renderPlanSelector() {
  return `
    <div class="plan-options" role="radiogroup" aria-label="选择会员套餐">
      ${PLAN_OPTIONS.map((plan) => {
        const selected = plan.id === ui.selectedPlan;
        return `
          <button type="button" class="plan-option ${selected ? "active" : ""}" data-action="select-plan" data-plan-id="${attr(plan.id)}" role="radio" aria-checked="${selected}">
            <span class="plan-option-top">
              <span class="plan-label">${escapeHtml(plan.label)}</span>
              ${plan.tag ? `<em>${escapeHtml(plan.tag)}</em>` : ""}
            </span>
            <strong>${escapeHtml(plan.price || formatMoney(plan.amountCents))}</strong>
            <span class="plan-period">${escapeHtml(plan.period || "")}</span>
            ${plan.description ? `<small>${escapeHtml(plan.description)}</small>` : ""}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderPaywall() {
  const account = currentAccount();
  const order = ui.paymentOrder;
  const manualConfig = APP_CONFIG.manualPayment || {};
  return `
    <main class="auth-shell">
      <section class="auth-panel">
        <p class="eyebrow">账号 ${escapeHtml(account?.phone || "")}</p>
        <h1>开通后使用完整排期</h1>
        <div class="plan-box">
          <div>
            <h2>探店排期 Pro</h2>
            <p>真实店铺联想、自动路径排期、日/周/月日历、拍摄状态管理和地图导航。</p>
          </div>
        </div>
        ${order ? "" : renderPlanSelector()}
        <div class="pay-features">
          <span>${icon("check")}手机号账号权限</span>
          <span>${icon("check")}按住址自动规划路线</span>
          <span>${icon("check")}日程与店铺库长期保存</span>
        </div>
        ${order ? renderManualPaymentOrder(order, manualConfig) : `<button class="btn green" data-action="activate-subscription">${icon("check")}生成支付宝转账订单</button>`}
        ${apiAvailable ? `<button class="btn secondary" data-action="refresh-subscription">${icon("refresh")}刷新会员状态</button>` : ""}
        <button class="btn secondary" data-action="logout">换手机号登录</button>
        <p class="settings-note">${apiAvailable ? "转账后由你人工核对订单号并开通会员，用户刷新会员状态后即可使用。" : "当前未连接正式后端，订单和开通是本机演示流程。"}</p>
      </section>
    </main>
  `;
}

function renderManualPaymentOrder(order, manualConfig) {
  const plan = getPlan(order.plan || ui.selectedPlan);
  const amountCents = Number(order.amountCents || plan.amountCents || manualConfig.amountCents || 9900);
  const qrImage = order.alipayQrImage || manualConfig.alipayQrImage || "";
  const payeeName = order.payeeName || manualConfig.payeeName || "支付宝收款账户";
  return `
    <div class="manual-pay">
      <div class="manual-pay-head">
        <div>
          <p class="eyebrow">支付宝转账订单</p>
          <h2>${formatMoney(amountCents)}</h2>
          <p class="settings-note">套餐：${escapeHtml(order.planLabel || plan.label)} ${escapeHtml(plan.period || "")}</p>
        </div>
        <span class="status-chip pending">${order.status === "submitted" ? "待确认" : "待付款"}</span>
      </div>
      <div class="order-code">
        <span>${escapeHtml(order.orderNo || order.orderId || "")}</span>
        <button class="btn secondary small" data-action="copy-order-no">${icon("copy")}复制订单号</button>
      </div>
      <p class="settings-note">转账备注请粘贴订单号。你确认到账后，这个账号会开通会员。</p>
      <div class="qr-box">
        ${qrImage ? `<img src="${attr(qrImage)}" alt="支付宝收款码" />` : `<div class="qr-placeholder">请在配置里填入支付宝收款码图片</div>`}
      </div>
      <p class="settings-note">收款方：${escapeHtml(payeeName)}</p>
      <div class="button-row">
        <button class="btn green" data-action="copy-order-no">${icon("copy")}复制备注</button>
        <button class="btn secondary" data-action="mark-manual-paid">${icon("check")}我已付款</button>
      </div>
    </div>
  `;
}

function renderHeader(stats) {
  return `
    <header class="app-header">
      <div class="header-main">
        <div>
          <p class="eyebrow">${escapeHtml(data.settings.homeLabel || "达人住址")} · ${escapeHtml(data.settings.city || "全国")}</p>
          <h1>探店排期助手</h1>
        </div>
        <span class="date-chip">${escapeHtml(formatCNDate(ui.selectedDate))}</span>
      </div>
      <div class="stat-grid">
        <div class="stat"><strong>${stats.total}</strong><span>今日店铺</span></div>
        <div class="stat"><strong>${stats.done}</strong><span>已拍摄</span></div>
        <div class="stat"><strong>${formatDuration(stats.travelMinutes)}</strong><span>路上预估</span></div>
        <div class="stat"><strong>${stats.endTime || "--:--"}</strong><span>预计收工</span></div>
      </div>
    </header>
  `;
}

function renderActiveView() {
  if (ui.activeView === "calendar") return renderCalendarView();
  if (ui.activeView === "shops") return renderShopsView();
  if (ui.activeView === "settings") return renderSettingsView();
  return renderTodayView();
}

function renderTodayView() {
  return `
    <section>
      ${renderDateToolbar()}
      ${renderRouteStrip(ui.selectedDate)}
      <div class="section">
        <div class="section-title">
          <h2>拍摄顺序</h2>
          <button class="btn secondary small" data-action="open-add">${icon("plus")}添加店铺</button>
        </div>
        ${renderVisitList(ui.selectedDate)}
      </div>
    </section>
  `;
}

function renderDateToolbar() {
  return `
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn secondary icon-only" title="前一天" data-action="shift-date" data-days="-1">${icon("chevron-left")}</button>
        <button class="btn secondary small" data-action="today">今天</button>
        <button class="btn secondary icon-only" title="后一天" data-action="shift-date" data-days="1">${icon("chevron-right")}</button>
      </div>
      <div class="toolbar-right">
        <button class="btn green small" data-action="auto-schedule">${icon("route")}自动排期</button>
      </div>
    </div>
  `;
}

function renderRouteStrip(dateIso) {
  const shops = getDayShops(dateIso);
  const stats = getDayStats(dateIso);
  const names = shops.map((shop) => shop.name).join(" -> ");
  const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  return `
    <div class="route-strip">
      <div class="route-line">
        <div>
          <h2>${shops.length ? "今日路径" : "还没有排期"}</h2>
          <p>${shops.length ? escapeHtml(names) : "添加店铺后点击自动排期，会按住址和店铺位置生成顺路顺序。"}</p>
        </div>
        <span class="mini-chip">${formatDistance(stats.distanceKm)}</span>
      </div>
      <div class="progress" aria-label="完成进度"><span style="width:${progress}%"></span></div>
    </div>
  `;
}

function renderVisitList(dateIso) {
  const shops = getDayShops(dateIso);
  if (!shops.length) {
    return `
      <div class="empty">
        <div>
          <strong>当天还没有店铺</strong>
          <p>去“店铺”里搜索并添加，或者把未排期店铺一键排进当前日期。</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="visit-list">
      ${shops.map((shop, index) => renderVisitCard(shop, index, shops.length)).join("")}
    </div>
  `;
}

function renderVisitCard(shop, index, total) {
  const done = shop.status === "filmed";
  return `
    <article class="visit-card ${done ? "done" : ""}">
      <div class="time-block">
        <strong>${escapeHtml(shop.startTime || "--:--")}</strong>
        <span>${escapeHtml(shop.endTime || "--:--")}</span>
        <span>#${index + 1}</span>
      </div>
      <div class="visit-main">
        <div class="visit-head">
          <div class="visit-title">
            <h3>${escapeHtml(shop.name)}</h3>
            <p class="meta">${escapeHtml(shop.category || "店铺")} · 拍摄 ${Number(shop.duration || data.settings.defaultDuration)} 分钟</p>
          </div>
          <span class="status-chip ${done ? "done" : "pending"}">${done ? "已拍摄" : "待拍摄"}</span>
        </div>
        <p class="address">${escapeHtml(shop.address || "未填写地址")}</p>
        <div class="timeline-leg">
          从上一站约 ${formatDuration(shop.travelMinutes || 0)} · ${formatDistance(shop.distanceKm || 0)} · ${shop.routeSource === "amap" ? "高德算路" : "估算"}
        </div>
        ${shop.notes ? `<p class="note">${escapeHtml(shop.notes)}</p>` : ""}
        <div class="visit-actions">
          <button class="btn green small" data-action="navigate" data-id="${attr(shop.id)}">${icon("map")}导航</button>
          <button class="btn secondary small" data-action="${done ? "mark-pending" : "mark-filmed"}" data-id="${attr(shop.id)}">${icon(done ? "undo" : "check")}${done ? "撤销" : "已拍摄"}</button>
          <button class="btn secondary icon-only small" title="上移" data-action="move-shop" data-dir="-1" data-id="${attr(shop.id)}" ${index === 0 ? "disabled" : ""}>${icon("arrow-up")}</button>
          <button class="btn secondary icon-only small" title="下移" data-action="move-shop" data-dir="1" data-id="${attr(shop.id)}" ${index === total - 1 ? "disabled" : ""}>${icon("arrow-down")}</button>
          <button class="btn secondary icon-only small" title="编辑" data-action="edit-shop" data-id="${attr(shop.id)}">${icon("edit")}</button>
          <button class="btn secondary icon-only small" title="删除" data-action="delete-shop" data-id="${attr(shop.id)}">${icon("trash")}</button>
        </div>
      </div>
    </article>
  `;
}

function renderCalendarView() {
  return `
    <section>
      ${renderDateToolbar()}
      <div class="segmented" role="tablist" aria-label="日历视图">
        ${["day", "week", "month"].map((mode) => `
          <button class="${ui.calendarMode === mode ? "active" : ""}" data-action="calendar-mode" data-mode="${mode}">
            ${mode === "day" ? "日" : mode === "week" ? "周" : "月"}
          </button>
        `).join("")}
      </div>
      <div class="section">
        ${ui.calendarMode === "day" ? renderDayCalendar() : ui.calendarMode === "week" ? renderWeekCalendar() : renderMonthCalendar()}
      </div>
    </section>
  `;
}

function renderDayCalendar() {
  return `
    <div class="section-title">
      <h2>${escapeHtml(formatCNDate(ui.selectedDate))}</h2>
      <span class="mini-chip">${getDayStats(ui.selectedDate).total} 家</span>
    </div>
    ${renderVisitList(ui.selectedDate)}
  `;
}

function renderWeekCalendar() {
  const start = startOfWeek(toDate(ui.selectedDate));
  const days = Array.from({ length: 7 }, (_, index) => toISODate(addDays(start, index)));
  return `
    <div class="week-grid">
      ${days.map((dateIso) => {
        const stats = getDayStats(dateIso);
        return `
          <button class="week-day ${dateIso === ui.selectedDate ? "active" : ""}" data-action="select-date" data-date="${dateIso}">
            <span class="weekday">${escapeHtml(weekdayName(dateIso))}</span>
            <span class="daynum">${toDate(dateIso).getDate()}</span>
            <span class="count">${stats.done}/${stats.total}</span>
          </button>
        `;
      }).join("")}
    </div>
    <div class="section">
      <div class="section-title"><h2>${escapeHtml(formatCNDate(ui.selectedDate))}</h2><span class="mini-chip">周视图</span></div>
      ${renderVisitList(ui.selectedDate)}
    </div>
  `;
}

function renderMonthCalendar() {
  const current = toDate(ui.selectedDate);
  const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => toISODate(addDays(gridStart, index)));
  const labels = ["一", "二", "三", "四", "五", "六", "日"];

  return `
    <div class="month-grid">
      ${labels.map((label) => `<div class="month-head">${label}</div>`).join("")}
      ${days.map((dateIso) => {
        const date = toDate(dateIso);
        const dayShops = getDayShops(dateIso);
        const outside = date.getMonth() !== current.getMonth();
        const isToday = dateIso === toISODate(new Date());
        return `
          <div class="month-day ${outside ? "outside" : ""} ${dateIso === ui.selectedDate ? "active" : ""} ${isToday ? "today" : ""}" data-action="select-date" data-date="${dateIso}">
            <div class="month-day-header">
              <strong>${date.getDate()}</strong>
            </div>
            <div class="month-day-shops">
              ${dayShops.slice(0, 2).map((shop) => `
                <span class="month-shop-tag ${shop.status === "filmed" ? "done" : ""}">${escapeHtml(shop.name.length > 4 ? shop.name.slice(0, 4) + ".." : shop.name)}</span>
              `).join("")}
              ${dayShops.length > 2 ? `<span class="month-shop-more">+${dayShops.length - 2}</span>` : ""}
            </div>
          </div>
        `;
      }).join("")}
    </div>
    <div class="section">
      <div class="section-title">
        <h2>${escapeHtml(formatCNDate(ui.selectedDate))}</h2>
        <span class="mini-chip">月视图</span>
      </div>
      ${renderVisitList(ui.selectedDate)}
    </div>
    <button class="fab" data-action="fab-add-shop" title="添加店铺">${icon("plus")}</button>
  `;
}

function renderShopsView() {
  const shouldSearch = ui.searchQuery.trim().length > 0;
  const suggestions = shouldSearch ? getSuggestions(ui.searchQuery) : [];
  const unscheduled = data.shops.filter((shop) => !shop.scheduledDate).length;
  return `
    <section>
      <div class="search-box">
        <div class="search-input">
          ${icon("search")}
          <input data-field="shop-search" value="${attr(ui.searchQuery)}" placeholder="输入店铺名，搜索店铺位置" autocomplete="off" />
        </div>
        <div class="button-row">
          <button class="btn green small" data-action="open-add">${icon("plus")}手动添加</button>
          <button class="btn secondary small" data-action="auto-schedule">${icon("route")}未排期排到当前日期</button>
          <span class="mini-chip">未排期 ${unscheduled}</span>
        </div>
      </div>

      ${shouldSearch ? `<div class="section">
        <div class="section-title">
          <h2>搜索结果</h2>
          <span class="mini-chip">${ui.remoteLoading ? "搜索中" : `${suggestions.length} 条`}</span>
        </div>
        ${renderSuggestions(suggestions)}
      </div>` : ""}

      <div class="section">
        <div class="section-title">
          <h2>店铺库</h2>
          <span class="mini-chip">${data.shops.length} 家</span>
        </div>
        <div class="shop-list">
          ${data.shops.length ? data.shops.map(renderShopCard).join("") : `<div class="empty"><div><strong>还没有店铺</strong><p>先搜索或手动添加一家店铺。</p></div></div>`}
        </div>
      </div>
    </section>
  `;
}

function renderSuggestions(suggestions) {
  if (!suggestions.length) {
    return `
      <div class="empty">
        <div>
          <strong>没有匹配结果</strong>
          <p>换个关键词试试，或确认高德 Key 已在系统配置里启用。</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="suggestion-list">
      ${suggestions.map((item, index) => {
        const added = isAdded(item);
        return `
          <article class="suggestion-card ${added ? "added" : ""}">
            <div class="suggestion-head">
              <div class="suggestion-title">
                <h3>${escapeHtml(item.name)}</h3>
                <p class="address">${escapeHtml(item.address || item.district || "暂无详细地址")}</p>
              </div>
              <span class="source-label">${escapeHtml(item.source || "演示库")}</span>
            </div>
            <div class="button-row">
              <span class="mini-chip">${escapeHtml(item.category || "商户")}</span>
              <span class="mini-chip">${formatDistance(distanceKm(homePoint(data.settings), item))}</span>
              <button class="btn small ${added ? "secondary" : "green"}" data-action="use-suggestion" data-index="${index}" ${added ? "disabled" : ""}>${icon("plus")}${added ? "已添加" : "添加"}</button>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderShopCard(shop) {
  const scheduled = shop.scheduledDate ? `${formatShortDate(shop.scheduledDate)} ${shop.startTime || ""}` : "未排期";
  const done = shop.status === "filmed";
  return `
    <article class="shop-card">
      <div class="shop-head">
        <div class="shop-title">
          <h3>${escapeHtml(shop.name)}</h3>
          <p class="meta">${escapeHtml(shop.category || "店铺")} · ${escapeHtml(scheduled)}</p>
        </div>
        <span class="status-chip ${done ? "done" : "pending"}">${done ? "已拍摄" : "待拍摄"}</span>
      </div>
      <p class="address">${escapeHtml(shop.address || "未填写地址")}</p>
      ${shop.notes ? `<p class="note">${escapeHtml(shop.notes)}</p>` : ""}
      <div class="shop-actions">
        <button class="btn green small" data-action="navigate" data-id="${attr(shop.id)}">${icon("map")}导航</button>
        <button class="btn secondary small" data-action="schedule-shop" data-id="${attr(shop.id)}">${icon("calendar")}排到当前日期</button>
        <button class="btn secondary small" data-action="edit-shop" data-id="${attr(shop.id)}">${icon("edit")}编辑</button>
        <button class="btn secondary small" data-action="delete-shop" data-id="${attr(shop.id)}">${icon("trash")}删除</button>
      </div>
    </article>
  `;
}

function renderSettingsView() {
  const settings = data.settings;
  const account = currentAccount();
  return `
    <section>
      <div class="section-title">
        <h2>设置</h2>
      </div>

      <div class="settings-card">
        <h3>达人住址</h3>
        <div class="form-grid">
          <div class="field">
            <label>住址名称</label>
            <input data-setting="homeLabel" value="${attr(settings.homeLabel)}" />
          </div>
          <div class="field">
            <label>详细地址</label>
            <input data-setting="homeAddress" value="${attr(settings.homeAddress)}" />
          </div>
          <div class="button-row">
            <button class="btn secondary" data-action="locate-home">${icon("target")}使用手机当前位置</button>
            <button class="btn secondary" data-action="geocode-home-address">${icon("map")}按地址更新位置</button>
          </div>
        </div>
      </div>

      <div class="settings-card section">
        <h3>排期参数</h3>
        <div class="two-col">
          <div class="field">
            <label>出发时间</label>
            <input type="time" data-setting="startTime" value="${attr(settings.startTime)}" />
          </div>
          <div class="field">
            <label>默认拍摄分钟</label>
            <input type="number" min="10" max="240" data-setting="defaultDuration" value="${attr(settings.defaultDuration)}" />
          </div>
        </div>
        <div class="two-col">
          <div class="field">
            <label>每家缓冲分钟</label>
            <input type="number" min="0" max="90" data-setting="bufferMinutes" value="${attr(settings.bufferMinutes)}" />
          </div>
          <div class="field">
            <label>交通方式</label>
            <select data-setting="travelMode">
              ${option("drive", "驾车", settings.travelMode)}
              ${option("ride", "骑行", settings.travelMode)}
              ${option("walk", "步行", settings.travelMode)}
            </select>
          </div>
        </div>
        <button class="btn green" data-action="recalculate-day">${icon("route")}按当前参数重算当天</button>
      </div>

      <div class="settings-card section">
        <h3>账号权限</h3>
        <p class="settings-note">${account ? `${escapeHtml(account.phone || "")} · ${account.subscriptionStatus === "active" ? "已开通会员" : "未开通"}` : (API_MODE === "demo" ? "演示模式 · 无需登录" : "")}</p>
        ${account ? `<div class="button-row"><button class="btn secondary" data-action="logout">${icon("undo")}退出登录</button></div>` : ""}
      </div>
    </section>
  `;
}

function renderBottomNav() {
  const items = [
    ["today", "今日", "home"],
    ["calendar", "日历", "calendar"],
    ["shops", "店铺", "store"],
    ["settings", "设置", "settings"]
  ];

  return `
    <nav class="bottom-nav" aria-label="主导航">
      ${items.map(([view, label, iconName]) => `
        <button class="nav-item ${ui.activeView === view ? "active" : ""}" data-action="set-view" data-view="${view}">
          ${icon(iconName)}
          <span>${label}</span>
        </button>
      `).join("")}
    </nav>
  `;
}

function renderModal() {
  if (ui.modal !== "shop") return "";
  const form = ui.form;
  const isEdit = Boolean(form.id);
  const locationReady = hasCoordinates(form);
  const showPoi = ui.modalSearch.trim().length >= 2 && ui.modalSuggestions.length > 0 && !ui.modalPoiSelected;
  const poiList = showPoi ? ui.modalSuggestions : [];
  return `
    <div class="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="${isEdit ? "编辑店铺" : "添加店铺"}">
        <div class="modal-head">
          <h2>${isEdit ? "编辑店铺" : "添加店铺"}</h2>
          <button class="btn secondary icon-only" data-action="close-modal" title="关闭">${icon("x")}</button>
        </div>
        <form id="shop-form" class="form-grid">
          <div class="field" style="position:relative">
            <label>店铺名称</label>
            <input name="name" required value="${attr(form.name || "")}" placeholder="输入店铺名搜索，如：某某烤肉 静安寺店" data-field="modal-shop-name" autocomplete="off" />
            ${showPoi ? `<div class="poi-dropdown">
              <div class="poi-dropdown-header">${ui.modalSearchLoading ? "搜索中..." : `${poiList.length} 条结果`}</div>
              ${poiList.map((poi, i) => `
                <div class="poi-item" data-action="select-poi" data-index="${i}">
                  <div class="poi-name">${escapeHtml(poi.name)}</div>
                  <div class="poi-addr">${escapeHtml(poi.address || "")}</div>
                </div>
              `).join("")}
              ${!ui.modalSearchLoading && !poiList.length ? '<div class="poi-empty">无匹配结果</div>' : ""}
            </div>` : ""}
          </div>
          <div class="field">
            <label>地址</label>
            <input name="address" required value="${attr(form.address || "")}" placeholder="店铺详细地址" />
          </div>
          <div class="button-row">
            <button type="button" class="btn secondary small" data-action="geocode-form-address">${icon("target")}识别店铺位置</button>
            <span class="mini-chip">${locationReady ? "位置已识别" : "未识别位置"}</span>
          </div>
          <input name="lat" type="hidden" value="${attr(form.lat || "")}" />
          <input name="lng" type="hidden" value="${attr(form.lng || "")}" />
          <div class="two-col">
            <div class="field">
              <label>分类</label>
              <input name="category" value="${attr(form.category || "")}" />
            </div>
            <div class="field">
              <label>拍摄分钟</label>
              <input name="duration" type="number" min="10" max="240" value="${attr(form.duration || data.settings.defaultDuration)}" />
            </div>
          </div>
          <div class="two-col">
            <div class="field">
              <label>排期日期</label>
              <input name="scheduledDate" type="date" value="${attr(form.scheduledDate || ui.selectedDate)}" />
            </div>
            <div class="field">
              <label>状态</label>
              <select name="status">
                ${option("pending", "待拍摄", form.status || "pending")}
                ${option("filmed", "已拍摄", form.status || "pending")}
              </select>
            </div>
          </div>
          <div class="field">
            <label>联系电话</label>
            <input name="phone" value="${attr(form.phone || "")}" />
          </div>
          <div class="field">
            <label>备注</label>
            <textarea name="notes" placeholder="达人脚本、团购信息、到店要求等">${escapeHtml(form.notes || "")}</textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn secondary" data-action="close-modal">取消</button>
            <button type="submit" class="btn green">${isEdit ? "保存修改" : "添加店铺"}</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

async function handleClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "send-code") {
    await sendSmsCode();
    return;
  }

  if (action === "login-register") {
    await loginOrRegister();
    return;
  }

  if (action === "select-plan") {
    ui.selectedPlan = button.dataset.planId || DEFAULT_PLAN_ID;
    render();
    return;
  }

  if (action === "activate-subscription") {
    await activateSubscription();
    return;
  }

  if (action === "copy-order-no") {
    await copyOrderNo();
    return;
  }

  if (action === "mark-manual-paid") {
    await markManualPaid();
    return;
  }

  if (action === "logout") {
    await logout();
    render();
    return;
  }

  if (action === "reload-app") {
    window.location.reload();
    return;
  }

  if (action === "refresh-subscription") {
    await refreshApiUser();
    if (apiUser?.subscriptionStatus === "active") {
      await loadRemoteWorkspace();
    }
    render();
    return;
  }

  if (action === "set-view") {
    ui.activeView = button.dataset.view;
    render();
    return;
  }

  if (action === "shift-date") {
    ui.selectedDate = toISODate(addDays(toDate(ui.selectedDate), Number(button.dataset.days)));
    render();
    return;
  }

  if (action === "today") {
    ui.selectedDate = todayISO();
    render();
    return;
  }

  if (action === "calendar-mode") {
    ui.calendarMode = button.dataset.mode;
    render();
    return;
  }

  if (action === "fab-add-shop") {
    openShopModal();
    render();
    return;
  }

  if (action === "select-date") {
    ui.selectedDate = button.dataset.date;
    render();
    return;
  }

  if (action === "auto-schedule") {
    toast("正在获取高德路线并自动排期");
    const count = await autoScheduleDate(ui.selectedDate);
    saveData();
    render();
    toast(count ? `已把 ${count} 家店铺排入 ${formatCNDate(ui.selectedDate)}` : "没有可排期的店铺");
    return;
  }

  if (action === "open-add") {
    openShopModal();
    render();
    return;
  }

  if (action === "use-suggestion") {
    const suggestion = getSuggestions(ui.searchQuery)[Number(button.dataset.index)];
    if (suggestion) {
      openShopModal(suggestion);
      render();
    }
    return;
  }

  if (action === "edit-shop") {
    const shop = findShop(button.dataset.id);
    if (shop) {
      openShopModal(shop);
      render();
    }
    return;
  }

  if (action === "delete-shop") {
    await deleteShop(button.dataset.id);
    return;
  }

  if (action === "select-poi") {
    const poi = ui.modalSuggestions[Number(button.dataset.index)];
    if (poi) {
      ui.form.name = poi.name;
      ui.form.address = poi.address || "";
      ui.form.lat = poi.lat ?? "";
      ui.form.lng = poi.lng ?? "";
      ui.form.category = poi.category || "";
      ui.modalSearch = poi.name;
      ui.modalSuggestions = [];
      ui.modalPoiSelected = true;
      render();
      toast("已填入店铺信息");
    }
    return;
  }

  if (action === "close-modal") {
    ui.modal = null;
    ui.form = {};
    ui.modalSearch = "";
    ui.modalSuggestions = [];
    ui.modalPoiSelected = false;
    render();
    return;
  }

  if (action === "mark-filmed" || action === "mark-pending") {
    const shop = findShop(button.dataset.id);
    if (shop) {
      shop.status = action === "mark-filmed" ? "filmed" : "pending";
      shop.filmedAt = action === "mark-filmed" ? new Date().toISOString() : "";
      saveData();
      render();
    }
    return;
  }

  if (action === "move-shop") {
    await moveShop(button.dataset.id, Number(button.dataset.dir));
    return;
  }

  if (action === "navigate") {
    const shop = findShop(button.dataset.id);
    if (shop) openNavigation(shop);
    return;
  }

  if (action === "schedule-shop") {
    const shop = findShop(button.dataset.id);
    if (shop) {
      const oldDate = shop.scheduledDate;
      shop.scheduledDate = ui.selectedDate;
      shop.order = nextOrder(ui.selectedDate);
      await recalculateScheduleForDate(ui.selectedDate);
      if (oldDate && oldDate !== ui.selectedDate) await recalculateScheduleForDate(oldDate);
      saveData();
      render();
      toast(`已排到 ${formatCNDate(ui.selectedDate)}`);
    }
    return;
  }

  if (action === "recalculate-day") {
    toast("正在更新当天真实路线时间");
    await recalculateScheduleForDate(ui.selectedDate);
    saveData();
    render();
    toast("已按当前参数重算当天时间");
    return;
  }

  if (action === "locate-home") {
    locateHome();
    return;
  }

  if (action === "geocode-home-address") {
    geocodeHomeAddress();
    return;
  }

  if (action === "geocode-form-address") {
    geocodeCurrentForm();
    return;
  }

  if (action === "export-json") {
    exportJson();
    return;
  }

  if (action === "import-json") {
    document.querySelector("#import-file")?.click();
    return;
  }

}

function handleInput(event) {
  const target = event.target;

  if (target.dataset.field === "auth-phone") {
    ui.authPhone = target.value.replace(/\D/g, "").slice(0, 11);
    target.value = ui.authPhone;
    return;
  }

  if (target.dataset.field === "auth-code") {
    ui.authCode = target.value.replace(/\D/g, "").slice(0, 6);
    target.value = ui.authCode;
    return;
  }

  if (target.dataset.field === "shop-search") {
    const cursor = target.selectionStart ?? target.value.length;
    ui.searchQuery = target.value;
    ui.remoteSuggestions = [];
    ui.remoteQuery = "";
    render();
    focusSearch(cursor);
    scheduleRemoteSearch(ui.searchQuery);
    return;
  }

  if (target.dataset.field === "modal-shop-name") {
    const cursor = target.selectionStart ?? target.value.length;
    ui.form.name = target.value;
    ui.modalSearch = target.value;
    ui.modalSuggestions = [];
    ui.modalPoiSelected = false;
    scheduleModalSearch(ui.modalSearch);
    render();
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-field="modal-shop-name"]');
      if (el) { el.focus(); el.setSelectionRange(cursor, cursor); }
    });
    return;
  }

  if (target.closest("#shop-form") && target.name) {
    ui.form[target.name] = target.value;
    return;
  }

  if (target.dataset.setting) {
    updateSetting(target.dataset.setting, target.value);
  }
}

function handleChange(event) {
  const target = event.target;

  if (target.closest("#shop-form") && target.name) {
    ui.form[target.name] = target.value;
    return;
  }

  if (target.dataset.setting) {
    updateSetting(target.dataset.setting, target.value);
    return;
  }

  if (target.id === "import-file" && target.files?.[0]) {
    importJson(target.files[0]);
  }
}

function handleSubmit(event) {
  if (event.target.id !== "shop-form") return;
  event.preventDefault();
  saveShopForm();
}

function updateSetting(key, value) {
  const numericKeys = new Set(["homeLat", "homeLng", "defaultDuration", "bufferMinutes"]);
  data.settings[key] = numericKeys.has(key) ? Number(value) : value;
  saveData();
}

async function sendSmsCode() {
  const phone = ui.authPhone.trim();
  if (!/^1\d{10}$/.test(phone)) {
    toast("请输入正确的手机号");
    return;
  }

  if (apiAvailable) {
    try {
      const result = await apiFetch("/api/auth/sms-code", {
        method: "POST",
        body: { phone },
        auth: false
      });
      if (result.devCode) {
        ui.smsCode = result.devCode;
        ui.smsPhone = phone;
        toast(`测试验证码：${result.devCode}`);
      } else {
        toast("验证码已发送");
      }
    } catch (error) {
      toast(error.message || "验证码发送失败");
    }
    return;
  }

  ui.smsPhone = phone;
  ui.smsCode = String(Math.floor(100000 + Math.random() * 900000));
  toast(`演示验证码：${ui.smsCode}`);
}

async function loginOrRegister() {
  const phone = ui.authPhone.trim();
  const code = ui.authCode.trim();
  if (!/^1\d{10}$/.test(phone)) {
    toast("请输入正确的手机号");
    return;
  }

  if (apiAvailable) {
    try {
      const result = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { phone, code },
        auth: false
      });
      apiUser = result.user;
      ui.authCode = "";
      if (apiUser?.subscriptionStatus === "active") {
        await loadRemoteWorkspace();
      }
      render();
    } catch (error) {
      toast(error.message || "登录失败");
    }
    return;
  }

  if (!code) {
    toast("请输入短信验证码");
    return;
  }
  if (!ui.smsCode) {
    toast("请先获取验证码");
    return;
  }
  if (phone !== ui.smsPhone || code !== ui.smsCode) {
    toast("验证码不正确");
    return;
  }

  auth.accounts[phone] = auth.accounts[phone] || {
    phone,
    createdAt: new Date().toISOString(),
    subscriptionStatus: "inactive",
    paidUntil: ""
  };
  auth.currentPhone = phone;
  ui.authCode = "";
  ui.smsCode = "";
  saveAuth();
  render();
}

async function activateSubscription() {
  const account = currentAccount();
  if (!account) return;
  const plan = getPlan(ui.selectedPlan);

  if (apiAvailable) {
    try {
      const result = await apiFetch("/api/billing/checkout", { method: "POST", body: { plan: plan.id } });
      if (result.paymentMethod === "manual_alipay" || result.provider === "manual") {
        ui.paymentOrder = {
          orderId: result.orderId,
          orderNo: result.orderNo,
          plan: result.plan || plan.id,
          planLabel: result.planLabel || plan.label,
          amountCents: result.amountCents || plan.amountCents,
          payeeName: result.payeeName,
          alipayQrImage: result.alipayQrImage,
          status: "pending"
        };
        render();
        return;
      }
      if (result.paymentUrl) {
        window.open(result.paymentUrl, "_blank", "noopener,noreferrer");
        toast("已打开支付页面，支付后返回刷新会员状态");
      } else {
        toast(result.message || "订单已创建，请等待后台确认会员");
      }
    } catch (error) {
      toast(error.message || "创建支付订单失败");
    }
    return;
  }

  if (!APP_CONFIG.allowDemoPayment) {
    toast("当前未连接支付服务");
    return;
  }

  ui.paymentOrder = {
    orderNo: createLocalOrderNo(),
    plan: plan.id,
    planLabel: plan.label,
    amountCents: plan.amountCents || APP_CONFIG.manualPayment?.amountCents || 9900,
    payeeName: APP_CONFIG.manualPayment?.payeeName || "",
    alipayQrImage: APP_CONFIG.manualPayment?.alipayQrImage || "",
    status: "pending"
  };
  render();
}

async function copyOrderNo() {
  const orderNo = ui.paymentOrder?.orderNo || ui.paymentOrder?.orderId || "";
  if (!orderNo) return;
  try {
    await navigator.clipboard.writeText(orderNo);
    toast("订单号已复制");
  } catch {
    toast(`订单号：${orderNo}`);
  }
}

async function markManualPaid() {
  if (!ui.paymentOrder) return;
  if (apiAvailable) {
    try {
      const orderNo = encodeURIComponent(ui.paymentOrder.orderNo || ui.paymentOrder.orderId);
      const result = await apiFetch(`/api/billing/orders/${orderNo}/submit`, { method: "POST", body: {} });
      ui.paymentOrder.status = result.status || "submitted";
      render();
      toast(result.message || "已提交，等待人工确认");
    } catch (error) {
      toast(error.message || "提交失败");
    }
    return;
  }

  const account = currentAccount();
  if (!account) return;
  const plan = getPlan(ui.paymentOrder.plan || ui.selectedPlan);
  account.subscriptionStatus = "active";
  account.paidAt = new Date().toISOString();
  account.paidUntil = paidUntilForPlan(plan);
  account.plan = plan.id;
  ui.paymentOrder = null;
  saveAuth();
  render();
  toast("演示模式已开通会员");
}

async function logout() {
  if (apiAvailable) {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.warn(error);
    }
    apiUser = null;
    data = loadData();
    return;
  }

  auth.currentPhone = "";
  saveAuth();
}

function openShopModal(source = {}) {
  const existing = source.id ? findShop(source.id) : null;
  const shop = existing || source;
  ui.modal = "shop";
  ui.form = {
    id: existing ? existing.id : "",
    name: shop.name || "",
    address: shop.address || "",
    lat: shop.lat ?? "",
    lng: shop.lng ?? "",
    category: shop.category || "",
    duration: shop.duration || data.settings.defaultDuration,
    scheduledDate: shop.scheduledDate || ui.selectedDate,
    status: shop.status || "pending",
    phone: shop.phone || "",
    notes: shop.notes || ""
  };
}

async function saveShopForm() {
  if (!hasCoordinates(ui.form) && ui.form.address) {
    const point = await geocodeAddressValue(ui.form.address);
    if (point) {
      ui.form.lat = point.lat;
      ui.form.lng = point.lng;
    }
  }

  const payload = normalizeShopForm(ui.form);
  if (!payload) return;

  const existing = payload.id ? findShop(payload.id) : null;
  const oldDate = existing?.scheduledDate;

  if (existing) {
    Object.assign(existing, payload, { updatedAt: new Date().toISOString() });
    if (!existing.scheduledDate) clearSchedule(existing);
  } else {
    const created = {
      ...payload,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    data.shops.push(created);
  }

  const saved = existing || data.shops[data.shops.length - 1];

  // 先关闭弹窗、保存数据、显示成功，让用户立刻得到反馈
  ui.modal = null;
  ui.form = {};
  saveData();
  render();
  toast(existing ? "店铺已更新" : "店铺已添加");

  // 异步重算排期（不阻塞用户操作）
  (async () => {
    try {
      if (saved.scheduledDate) {
        if (!saved.order || oldDate !== saved.scheduledDate) saved.order = nextOrder(saved.scheduledDate);
        await recalculateScheduleForDate(saved.scheduledDate);
      }
      if (oldDate && oldDate !== saved.scheduledDate) await recalculateScheduleForDate(oldDate);
      saveData();
      render();
    } catch (e) {
      console.warn("后台重算排期失败", e);
    }
  })();
}

function normalizeShopForm(form) {
  const name = String(form.name || "").trim();
  const address = String(form.address || "").trim();
  const lat = Number(form.lat);
  const lng = Number(form.lng);
  const duration = Math.max(10, Number(form.duration || data.settings.defaultDuration));

  if (!name) {
    toast("请填写店铺名称");
    return null;
  }
  if (!address) {
    toast("请填写店铺地址");
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    toast("请先识别店铺位置，或从搜索结果添加");
    return null;
  }

  return {
    id: form.id || "",
    name,
    address,
    lat,
    lng,
    category: String(form.category || "").trim(),
    duration,
    scheduledDate: form.scheduledDate || "",
    status: form.status === "filmed" ? "filmed" : "pending",
    phone: String(form.phone || "").trim(),
    notes: String(form.notes || "").trim()
  };
}

async function deleteShop(id) {
  const shop = findShop(id);
  if (!shop) return;
  if (!confirm(`确定删除“${shop.name}”吗？`)) return;
  const oldDate = shop.scheduledDate;
  data.shops = data.shops.filter((item) => item.id !== id);
  if (oldDate) await recalculateScheduleForDate(oldDate);
  saveData();
  render();
  toast("店铺已删除");
}

async function moveShop(id, direction) {
  const shop = findShop(id);
  if (!shop?.scheduledDate) return;
  const shops = getDayShops(shop.scheduledDate);
  const index = shops.findIndex((item) => item.id === id);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= shops.length) return;
  [shops[index], shops[targetIndex]] = [shops[targetIndex], shops[index]];
  await applyScheduleAsync(data, shop.scheduledDate, shops);
  saveData();
  render();
}

async function autoScheduleDate(dateIso) {
  const candidates = data.shops.filter((shop) => {
    if (!hasCoordinates(shop)) return false;
    if (shop.scheduledDate === dateIso) return true;
    return !shop.scheduledDate && shop.status !== "filmed";
  });
  if (!candidates.length) return 0;
  const ordered = await optimizeRouteAsync(candidates, data.settings);
  await applyScheduleAsync(data, dateIso, ordered);
  return ordered.length;
}

async function recalculateScheduleForDate(dateIso) {
  const shops = getDayShops(dateIso).filter(hasCoordinates);
  await applyScheduleAsync(data, dateIso, shops);
}

function applySchedule(targetData, dateIso, orderedShops) {
  let cursor = toMinutes(targetData.settings.startTime || DEFAULT_SETTINGS.startTime);
  let previous = homePoint(targetData.settings);
  const buffer = Number(targetData.settings.bufferMinutes || 0);

  orderedShops.forEach((shop, index) => {
    const leg = estimateLeg(previous, shop, targetData.settings.travelMode);
    const start = cursor + leg.minutes;
    const duration = Number(shop.duration || targetData.settings.defaultDuration || DEFAULT_SETTINGS.defaultDuration);
    const end = start + duration;

    shop.scheduledDate = dateIso;
    shop.order = index + 1;
    shop.travelMinutes = leg.minutes;
    shop.distanceKm = leg.km;
    shop.routeSource = "estimate";
    shop.startTime = minutesToTime(start);
    shop.endTime = minutesToTime(end);

    cursor = end + buffer;
    previous = shop;
  });
}

async function applyScheduleAsync(targetData, dateIso, orderedShops) {
  let cursor = toMinutes(targetData.settings.startTime || DEFAULT_SETTINGS.startTime);
  let previous = homePoint(targetData.settings);
  const buffer = Number(targetData.settings.bufferMinutes || 0);

  for (let index = 0; index < orderedShops.length; index += 1) {
    const shop = orderedShops[index];
    const leg = await getRouteLeg(previous, shop, targetData.settings.travelMode);
    const start = cursor + leg.minutes;
    const duration = Number(shop.duration || targetData.settings.defaultDuration || DEFAULT_SETTINGS.defaultDuration);
    const end = start + duration;

    shop.scheduledDate = dateIso;
    shop.order = index + 1;
    shop.travelMinutes = leg.minutes;
    shop.distanceKm = leg.km;
    shop.routeSource = leg.source;
    shop.startTime = minutesToTime(start);
    shop.endTime = minutesToTime(end);

    cursor = end + buffer;
    previous = shop;
  }
}

async function optimizeRouteAsync(shops, settings) {
  const remaining = [...shops];
  const route = [];
  let previous = homePoint(settings);

  while (remaining.length) {
    const legs = await Promise.all(remaining.map((shop) => getRouteLeg(previous, shop, settings.travelMode)));
    let bestIndex = 0;
    let bestScore = Infinity;
    legs.forEach((leg, index) => {
      if (leg.minutes < bestScore) {
        bestScore = leg.minutes;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    route.push(next);
    previous = next;
  }

  return route;
}

async function getRouteLeg(from, to, mode = "drive") {
  const fallback = estimateLeg(from, to, mode);
  if (!hasCoordinates(from) || !hasCoordinates(to) || window.location.protocol === "file:") {
    return { ...fallback, source: "estimate" };
  }

  const normalizedMode = mode === "walk" ? "walk" : mode === "ride" ? "ride" : "drive";
  const origin = `${Number(from.lng).toFixed(6)},${Number(from.lat).toFixed(6)}`;
  const destination = `${Number(to.lng).toFixed(6)},${Number(to.lat).toFixed(6)}`;
  const cacheKey = `${normalizedMode}:${origin}:${destination}`;
  if (routeLegCache.has(cacheKey)) return routeLegCache.get(cacheKey);

  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9000);
    const response = await fetch(`${API_BASE}/api/amap/route?mode=${encodeURIComponent(normalizedMode)}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`, {
      signal: controller.signal
    });
    window.clearTimeout(timer);
    if (!response.ok) throw new Error(`Route request failed: ${response.status}`);
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Route response failed");

    const km = Number(payload.distanceMeters || 0) / 1000;
    const minutes = Math.max(1, Math.round(Number(payload.durationSeconds || 0) / 60));
    const leg = {
      km: Number.isFinite(km) && km > 0 ? km : fallback.km,
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : fallback.minutes,
      source: "amap"
    };
    routeLegCache.set(cacheKey, leg);
    return leg;
  } catch (error) {
    console.warn("Route fallback", error);
    const leg = { ...fallback, source: "estimate" };
    routeLegCache.set(cacheKey, leg);
    return leg;
  }
}

function optimizeRoute(shops, settings) {
  const remaining = [...shops];
  const route = [];
  let previous = homePoint(settings);

  while (remaining.length) {
    let bestIndex = 0;
    let bestScore = Infinity;
    remaining.forEach((shop, index) => {
      const score = estimateLeg(previous, shop, settings.travelMode).minutes;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    route.push(next);
    previous = next;
  }

  let improved = true;
  let guard = 0;
  while (improved && guard < 8) {
    improved = false;
    guard += 1;
    for (let i = 0; i < route.length - 1; i += 1) {
      for (let k = i + 1; k < route.length; k += 1) {
        const candidate = [
          ...route.slice(0, i),
          ...route.slice(i, k + 1).reverse(),
          ...route.slice(k + 1)
        ];
        if (routeCost(candidate, settings) + 0.1 < routeCost(route, settings)) {
          route.splice(0, route.length, ...candidate);
          improved = true;
        }
      }
    }
  }

  return route;
}

function routeCost(route, settings) {
  let previous = homePoint(settings);
  return route.reduce((sum, shop) => {
    const leg = estimateLeg(previous, shop, settings.travelMode);
    previous = shop;
    return sum + leg.minutes;
  }, 0);
}

function estimateLeg(from, to, mode = "drive") {
  const km = distanceKm(from, to);
  const profiles = {
    drive: { speed: 24, base: 6 },
    ride: { speed: 15, base: 2 },
    walk: { speed: 4.5, base: 0 }
  };
  const profile = profiles[mode] || profiles.drive;
  const minutes = Math.max(3, Math.round((km / profile.speed) * 60 + profile.base + km * 1.4));
  return { km, minutes };
}

function distanceKm(from, to) {
  const lat1 = Number(from.lat);
  const lng1 = Number(from.lng);
  const lat2 = Number(to.lat);
  const lng2 = Number(to.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return 0;

  const radius = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLng = deg2rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function deg2rad(value) {
  return (value * Math.PI) / 180;
}

function homePoint(settings) {
  return {
    name: settings.homeLabel || "达人住址",
    address: settings.homeAddress,
    lat: Number(settings.homeLat),
    lng: Number(settings.homeLng)
  };
}

function getDayShops(dateIso) {
  return data.shops
    .filter((shop) => shop.scheduledDate === dateIso)
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999));
}

function getDayStats(dateIso) {
  const shops = getDayShops(dateIso);
  const done = shops.filter((shop) => shop.status === "filmed").length;
  const travelMinutes = shops.reduce((sum, shop) => sum + Number(shop.travelMinutes || 0), 0);
  const distance = shops.reduce((sum, shop) => sum + Number(shop.distanceKm || 0), 0);
  return {
    total: shops.length,
    done,
    travelMinutes,
    distanceKm: distance,
    endTime: shops.at(-1)?.endTime || ""
  };
}

function nextOrder(dateIso) {
  const orders = getDayShops(dateIso).map((shop) => Number(shop.order || 0));
  return orders.length ? Math.max(...orders) + 1 : 1;
}

function clearSchedule(shop) {
  delete shop.order;
  delete shop.startTime;
  delete shop.endTime;
  delete shop.travelMinutes;
  delete shop.distanceKm;
}

function hasCoordinates(shop) {
  return Number.isFinite(Number(shop.lat)) && Number.isFinite(Number(shop.lng));
}

function getSuggestions(query) {
  const normalized = normalize(query);
  const home = homePoint(data.settings);
  const local = SAMPLE_POIS
    .filter((poi) => {
      if (!normalized) return true;
      return normalize(`${poi.name} ${poi.address} ${poi.category}`).includes(normalized);
    })
    .map((poi) => ({
      ...poi,
      source: "演示库",
      distance: distanceKm(home, poi)
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, normalized ? 8 : 6);

  const remote = ui.remoteQuery === query ? ui.remoteSuggestions : [];
  const merged = [];
  [...remote, ...local].forEach((item) => {
    const key = normalize(`${item.name}${item.address || ""}`);
    if (!merged.some((existing) => normalize(`${existing.name}${existing.address || ""}`) === key)) {
      merged.push(item);
    }
  });
  return merged.slice(0, 10);
}

function isAdded(item) {
  const key = normalize(`${item.name}${item.address || ""}`);
  return data.shops.some((shop) => normalize(`${shop.name}${shop.address || ""}`) === key);
}

function amapKey() {
  return String(APP_CONFIG.amapKey || APP_CONFIG.AMAP_KEY || data.settings.amapKey || "").trim();
}

function amapSecurityCode() {
  return String(APP_CONFIG.amapSecurityCode || APP_CONFIG.AMAP_SECURITY_CODE || data.settings.amapSecurityCode || "").trim();
}

function configuredCity() {
  return data.settings.city || APP_CONFIG.city || "全国";
}

function scheduleRemoteSearch(query) {
  clearTimeout(remoteTimer);
  const key = amapKey();
  if (!key || query.trim().length < 2) return;

  ui.remoteLoading = true;
  render();
  focusSearch(query.length);

  remoteTimer = window.setTimeout(async () => {
    const token = ++remoteToken;
    try {
      const AMap = await ensureAmap();
      const autocomplete = new AMap.AutoComplete({
        city: configuredCity(),
        citylimit: false
      });
      autocomplete.search(query, (status, result) => {
        if (token !== remoteToken) return;
        ui.remoteLoading = false;
        ui.remoteQuery = query;
        ui.remoteSuggestions = status === "complete" && Array.isArray(result.tips)
          ? result.tips
              .filter((tip) => tip.name && tip.location)
              .map((tip) => ({
                name: tip.name,
                address: `${tip.district || ""}${tip.address || ""}`,
                lat: Number(tip.location.lat),
                lng: Number(tip.location.lng),
                category: tip.type || "商户",
                source: "高德"
              }))
              .slice(0, 8)
          : [];
        render();
        focusSearch(query.length);
      });
    } catch (error) {
      ui.remoteLoading = false;
      ui.remoteSuggestions = [];
      ui.remoteQuery = query;
      render();
      focusSearch(query.length);
      toast("高德搜索暂不可用，已使用本地演示库");
      console.warn(error);
    }
  }, 350);
}

function scheduleModalSearch(query) {
  clearTimeout(modalSearchTimer);
  const key = amapKey();
  if (query.trim().length < 2) {
    if (query.trim().length > 0) {
      ui.modalSuggestions = SAMPLE_POIS
        .filter((poi) => normalize(`${poi.name} ${poi.address} ${poi.category}`).includes(normalize(query)))
        .slice(0, 5)
        .map((poi) => ({ ...poi, source: "演示库" }));
    } else {
      ui.modalSuggestions = [];
    }
    ui.modalSearchLoading = false;
    return;
  }

  if (!key) {
    ui.modalSuggestions = SAMPLE_POIS
      .filter((poi) => normalize(`${poi.name} ${poi.address} ${poi.category}`).includes(normalize(query)))
      .slice(0, 5)
      .map((poi) => ({ ...poi, source: "演示库" }));
    ui.modalSearchLoading = false;
    return;
  }

  ui.modalSearchLoading = true;

  modalSearchTimer = window.setTimeout(async () => {
    const token = ++modalSearchToken;
    try {
      const AMap = await ensureAmap();
      const locLat = userGpsLat || data.settings.homeLat;
      const locLng = userGpsLng || data.settings.homeLng;
      const hasLoc = Number.isFinite(locLat) && Number.isFinite(locLng);

      // 优先使用 PlaceSearch（按距离排序，精准定位附近店铺）
      if (hasLoc) {
        const placeSearch = new AMap.PlaceSearch({
          city: configuredCity(),
          citylimit: false,
          pageSize: 6,
          extensions: "all"
        });
        placeSearch.searchNearBy(query, new AMap.LngLat(locLng, locLat), 5000, (status, result) => {
          if (token !== modalSearchToken) return;
          if (status === "complete" && result.poiList && Array.isArray(result.poiList.pois) && result.poiList.pois.length > 0) {
            ui.modalSearchLoading = false;
            ui.modalSuggestions = result.poiList.pois.map((poi) => ({
              name: poi.name,
              address: `${poi.pname || ""}${poi.cityname || ""}${poi.adname || ""}${poi.address || ""}`,
              lat: Number(poi.location.lat),
              lng: Number(poi.location.lng),
              category: poi.type ? poi.type.split(";")[0] : "商户",
              distance: poi.distance,
              source: "高德"
            })).slice(0, 6);
            render();
            requestAnimationFrame(() => {
              const el = document.querySelector('[data-field="modal-shop-name"]');
              if (el) el.focus();
            });
            return;
          }
          // PlaceSearch 无结果，降级到 AutoComplete
          doAutoCompleteSearch(AMap, query, token);
        });
      } else {
        // 无定位，直接用 AutoComplete
        doAutoCompleteSearch(AMap, query, token);
      }
    } catch {
      ui.modalSearchLoading = false;
      ui.modalSuggestions = SAMPLE_POIS
        .filter((poi) => normalize(`${poi.name} ${poi.address} ${poi.category}`).includes(normalize(query)))
        .slice(0, 5)
        .map((poi) => ({ ...poi, source: "演示库" }));
      render();
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-field="modal-shop-name"]');
        if (el) el.focus();
      });
    }
  }, 350);
}

function doAutoCompleteSearch(AMap, query, token) {
  const acOpts = { city: configuredCity(), citylimit: false };
  const locLat = userGpsLat || data.settings.homeLat;
  const locLng = userGpsLng || data.settings.homeLng;
  if (Number.isFinite(locLat) && Number.isFinite(locLng)) {
    acOpts.location = new AMap.LngLat(locLng, locLat);
  }
  const autocomplete = new AMap.AutoComplete(acOpts);
  autocomplete.search(query, (status, result) => {
    if (token !== modalSearchToken) return;
    ui.modalSearchLoading = false;
    ui.modalSuggestions = status === "complete" && Array.isArray(result.tips)
      ? result.tips
          .filter((tip) => tip.name && tip.location)
          .map((tip) => ({
            name: tip.name,
            address: `${tip.district || ""}${tip.address || ""}`,
            lat: Number(tip.location.lat),
            lng: Number(tip.location.lng),
            category: tip.type || "商户",
            source: "高德"
          }))
          .slice(0, 6)
      : [];
    render();
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-field="modal-shop-name"]');
      if (el) el.focus();
    });
  });
}

function focusSearch(cursor) {
  if (ui.activeView !== "shops") return;
  window.requestAnimationFrame(() => {
    const input = document.querySelector('[data-field="shop-search"]');
    if (!input) return;
    input.focus();
    const position = Math.min(cursor ?? input.value.length, input.value.length);
    input.setSelectionRange(position, position);
  });
}

function ensureAmap() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapPromise) return amapPromise;

  const key = amapKey();
  if (!key) return Promise.reject(new Error("Missing AMap key"));

  const securityCode = amapSecurityCode();
  if (securityCode) {
    window._AMapSecurityConfig = { securityJsCode: securityCode };
  }

  amapPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.AutoComplete,AMap.PlaceSearch,AMap.Geocoder`;
    script.async = true;
    script.onload = () => window.AMap ? resolve(window.AMap) : reject(new Error("AMap failed to load"));
    script.onerror = () => reject(new Error("AMap script failed"));
    document.head.appendChild(script);
  });

  return amapPromise;
}

async function geocodeCurrentForm() {
  if (!ui.form.address) {
    toast("先填写店铺地址");
    return;
  }
  const point = await geocodeAddressValue(ui.form.address);
  if (point) {
    ui.form.lat = point.lat;
    ui.form.lng = point.lng;
    render();
    toast("店铺位置已识别");
  }
}

async function geocodeHomeAddress() {
  if (!data.settings.homeAddress) {
    toast("先填写达人住址");
    return;
  }
  const point = await geocodeAddressValue(data.settings.homeAddress);
  if (point) {
    data.settings.homeLat = point.lat;
    data.settings.homeLng = point.lng;
    saveData();
    render();
    toast("达人住址位置已更新");
  }
}

async function geocodeAddressValue(address) {
  try {
    const AMap = await ensureAmap();
    const geocoder = new AMap.Geocoder({ city: configuredCity() });
    return await new Promise((resolve) => {
      geocoder.getLocation(address, (status, result) => {
        if (status === "complete" && result.geocodes?.[0]?.location) {
          const location = result.geocodes[0].location;
          resolve({
            lat: Number(Number(location.lat).toFixed(6)),
            lng: Number(Number(location.lng).toFixed(6))
          });
        } else {
          toast("没有解析到位置，请换更完整的地址");
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.warn(error);
    toast("需要先配置高德 Key");
    return null;
  }
}

async function reverseGeocode(lat, lng) {
  try {
    const AMap = await ensureAmap();
    const geocoder = new AMap.Geocoder({});
    return await new Promise((resolve) => {
      geocoder.getAddress([lng, lat], (status, result) => {
        if (status === "complete" && result.regeocode) {
          const city = result.regeocode.addressComponent?.city || result.regeocode.addressComponent?.province;
          if (city && city !== data.settings.city) {
            data.settings.city = city;
            saveData();
          }
          resolve(result.regeocode.formattedAddress);
        } else {
          resolve(null);
        }
      });
    });
  } catch {
    return null;
  }
}

function locateHome() {
  if (!navigator.geolocation) {
    toast("当前浏览器不支持定位");
    return;
  }
  toast("正在定位...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = Number(position.coords.latitude.toFixed(6));
      const lng = Number(position.coords.longitude.toFixed(6));
      userGpsLat = lat;
      userGpsLng = lng;
      data.settings.homeLat = lat;
      data.settings.homeLng = lng;
      data.settings.homeLabel = "当前位置";
      const address = await reverseGeocode(data.settings.homeLat, data.settings.homeLng);
      data.settings.homeAddress = address || `${data.settings.homeLat}, ${data.settings.homeLng}`;
      saveData();
      render();
      toast(address ? "已更新达人住址" : "已更新坐标，地址需手动补充");
    },
    () => toast("定位失败，请确认浏览器定位权限"),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

async function detectCurrentCity() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = Number(position.coords.latitude.toFixed(6));
      const lng = Number(position.coords.longitude.toFixed(6));
      userGpsLat = lat;
      userGpsLng = lng;
      try {
        const AMap = await ensureAmap();
        const geocoder = new AMap.Geocoder({});
        const city = await new Promise((resolve) => {
          geocoder.getAddress([lng, lat], (status, result) => {
            if (status === "complete" && result.regeocode?.addressComponent?.city) {
              resolve(result.regeocode.addressComponent.city);
            } else if (status === "complete" && result.regeocode?.addressComponent?.province) {
              resolve(result.regeocode.addressComponent.province);
            } else {
              resolve(null);
            }
          });
        });
        if (city && city !== data.settings.city) {
          data.settings.city = city;
          saveData();
          render();
        }
      } catch {
        // silently ignore
      }
    },
    () => { /* silently ignore */ },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

function openNavigation(shop) {
  const lat = Number(shop.lat);
  const lng = Number(shop.lng);
  const name = encodeURIComponent(shop.name);
  const address = encodeURIComponent(shop.address || shop.name);
  const provider = APP_CONFIG.mapProvider || data.settings.mapProvider || "amap";
  const mode = data.settings.travelMode === "walk" ? "walk" : data.settings.travelMode === "ride" ? "ride" : "car";

  let url = `https://uri.amap.com/navigation?to=${lng},${lat},${name}&mode=${mode}&policy=1&src=local-life-planner&coordinate=gaode&callnative=1`;
  if (provider === "baidu") {
    url = `https://api.map.baidu.com/marker?location=${lat},${lng}&title=${name}&content=${address}&output=html&src=local-life-planner`;
  }
  if (provider === "apple") {
    url = `https://maps.apple.com/?daddr=${lat},${lng}&q=${name}`;
  }
  if (provider === "google") {
    const travelMode = data.settings.travelMode === "walk" ? "walking" : data.settings.travelMode === "ride" ? "bicycling" : "driving";
    url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${travelMode}`;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function exportJson() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `探店排期备份-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result));
      if (!imported.settings || !Array.isArray(imported.shops)) throw new Error("Invalid file");
      data = {
        settings: { ...DEFAULT_SETTINGS, ...imported.settings },
        shops: imported.shops
      };
      saveData();
      render();
      toast("备份已导入");
    } catch (error) {
      console.warn(error);
      toast("导入失败，文件格式不正确");
    }
  };
  reader.readAsText(file);
}

function findShop(id) {
  return data.shops.find((shop) => shop.id === id);
}

function generateId() {
  return `shop-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function option(value, label, selected) {
  return `<option value="${attr(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function attr(value = "") {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function todayISO() {
  return toISODate(new Date());
}

function toDate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeek(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function weekdayName(dateIso) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][toDate(dateIso).getDay()];
}

function formatCNDate(dateIso) {
  const date = toDate(dateIso);
  return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdayName(dateIso)}`;
}

function formatShortDate(dateIso) {
  const date = toDate(dateIso);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function toMinutes(time) {
  const [hours, minutes] = String(time || "09:30").split(":").map(Number);
  return (Number.isFinite(hours) ? hours : 9) * 60 + (Number.isFinite(minutes) ? minutes : 30);
}

function minutesToTime(total) {
  const minutes = ((Math.round(total) % 1440) + 1440) % 1440;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  const value = Math.round(Number(minutes) || 0);
  if (value < 60) return `${value}分`;
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  return mins ? `${hours}小时${mins}分` : `${hours}小时`;
}

function formatDistance(km) {
  const value = Number(km) || 0;
  if (value < 1) return `${Math.round(value * 1000)}m`;
  return `${value.toFixed(1)}km`;
}

function formatMoney(amountCents) {
  return `¥${(Number(amountCents || 0) / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function createLocalOrderNo() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  return `LLP${stamp}${Math.floor(1000 + Math.random() * 9000)}`;
}

function toast(message) {
  clearTimeout(toastTimer);
  toastBox.textContent = message;
  toastBox.classList.add("show");
  toastTimer = window.setTimeout(() => toastBox.classList.remove("show"), 2400);
}

function icon(name) {
  const paths = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
    store: '<path d="M4 10h16l-1.4-6H5.4L4 10Z"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/><path d="M4 10c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2c0 1.2 1 2 2 2s2-.8 2-2"/>',
    settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.2 2.2 0 0 1-3.12 3.12l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21.5a2.2 2.2 0 0 1-4.4 0v-.1a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.2 2.2 0 0 1-3.12-3.12l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.66-1.1H2.8a2.2 2.2 0 0 1 0-4.4h.14A1.8 1.8 0 0 0 4.6 8a1.8 1.8 0 0 0-.36-1.98l-.04-.04A2.2 2.2 0 0 1 7.32 2.86l.04.04A1.8 1.8 0 0 0 9.34 3.26a1.8 1.8 0 0 0 1.1-1.66V1.5a2.2 2.2 0 0 1 4.4 0v.1a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.2 2.2 0 0 1 3.12 3.12l-.04.04A1.8 1.8 0 0 0 19.4 8a1.8 1.8 0 0 0 1.66 1.1h.14a2.2 2.2 0 0 1 0 4.4h-.14A1.8 1.8 0 0 0 19.4 15Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    route: '<path d="M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M8.6 14.5 15.4 9.5"/>',
    map: '<path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z"/><path d="M9 3v15M15 6v15"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 1 1 0 12h-2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/><path d="M10 11v6M14 11v6"/>',
    "arrow-up": '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
    "arrow-down": '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2"/><path d="M3 12A9 9 0 0 1 18.5 5.8"/><path d="M18 2v4h-4M6 22v-4h4"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><rect x="3" y="3" width="12" height="12" rx="2"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };

  return `
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        ${paths[name] || paths.home}
      </svg>
    </span>
  `;
}
