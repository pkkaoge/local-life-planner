# 探店排期助手

本地生活达人探店任务管理应用。管理店铺、自动规划顺路路径、生成日程排期。

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器（端口 5000）
pnpm run dev
```

## 环境变量

复制 `.env.example` 为 `.env` 并按需修改：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| JWT_SECRET | JWT签名密钥 | dev-jwt-secret-change-in-prod |
| ADMIN_TOKEN | 管理员Token | dev-admin-token-change-in-prod |
| AMAP_ROUTE_KEY | 高德算路Key | 空 |
| PAYMENT_PROVIDER | 支付方式 | manual |
| SMS_PROVIDER | 短信服务 | dev |
| DATABASE_URL | PostgreSQL连接串 | 空 |

## 项目结构

```
├── index.html          # 用户端入口
├── admin.html          # 后台订单确认入口
├── server.js           # Node.js API 服务器
├── package.json        # 项目依赖
├── .env.example        # 环境变量模板
├── src/
│   ├── app.js          # 前端主逻辑
│   ├── config.js       # 前端配置
│   └── styles.css      # 全局样式
└── assets/
    └── alipay-qr.jpg   # 支付宝收款码
```

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| POST | /api/auth/sms-code | 发送验证码 |
| POST | /api/auth/login | 手机号登录 |
| GET | /api/me | 当前用户信息 |
| GET/PUT | /api/settings | 用户设置 |
| GET/POST | /api/shops | 店铺列表/新增 |
| PUT/DELETE | /api/shops/:id | 更新/删除店铺 |
| GET | /api/amap/route | 高德算路代理 |
| POST | /api/billing/checkout | 创建支付订单 |
| GET | /api/admin/orders | 管理员查询订单 |

## 数据库

使用 PostgreSQL，Schema 见 `server.js` 中的 CREATE TABLE 语句。

## 运行模式

- `apiMode: "demo"` — 跳过登录，本地数据，适合测试
- `apiMode: "auto"` — 尝试连接后端，失败则降级本地
- `apiMode: "api"` — 必须连接后端
