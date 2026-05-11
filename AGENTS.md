# 探店排期助手 - 项目文档

## 项目概览

探店排期助手是一个手机优先的本地生活达人探店任务管理应用。用户可以管理店铺、自动规划顺路路径、生成日程排期。

- 用户端入口：`index.html`
- 后台确认端入口：`admin.html`
- 后端 API：`server.js`（Node.js + Express + PostgreSQL）

## 技术栈

- 前端：纯 HTML/CSS/JS 静态页面（无构建步骤）
- 后端：Node.js + Express
- 数据库：PostgreSQL（通过 Supabase/平台托管）
- 认证：JWT（HS256），手机号 + 短信验证码登录
- 支付：支付宝手动转账模式

## 目录结构

```
├── index.html              # 用户端入口
├── admin.html              # 后台订单确认入口
├── manifest.json           # PWA manifest
├── server.js               # Node.js API 服务器（核心后端）
├── package.json            # 项目依赖
├── .coze                   # Coze 平台构建/运行配置
├── src/
│   ├── app.js              # 前端主逻辑
│   ├── config.js           # 前端配置（API地址、高德Key等）
│   └── styles.css          # 全局样式
├── assets/
│   └── alipay-qr.jpg       # 支付宝收款码
└── src/storage/database/   # 数据库 schema（Drizzle ORM 生成）
    └── shared/
        ├── schema.ts       # Drizzle 表定义
        └── relations.ts    # 表关系定义
```

## 构建与运行

```bash
pnpm install          # 安装依赖
pnpm run dev          # 启动开发服务器（端口 5000）
pnpm run start        # 启动生产服务器
```

## API 接口清单

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /api/health | 健康检查 | 无 |
| POST | /api/auth/sms-code | 发送短信验证码 | 无 |
| POST | /api/auth/login | 手机号登录/注册 | 无 |
| POST | /api/auth/logout | 退出登录 | 无 |
| GET | /api/me | 获取当前用户信息 | JWT |
| GET | /api/settings | 获取用户设置 | JWT |
| PUT | /api/settings | 更新用户设置 | JWT |
| GET | /api/shops | 获取店铺列表 | JWT |
| POST | /api/shops | 新增/更新店铺 | JWT+会员 |
| PUT | /api/shops/:id | 更新指定店铺 | JWT+会员 |
| DELETE | /api/shops/:id | 删除店铺 | JWT+会员 |
| PUT | /api/sync | 全量同步设置+店铺 | JWT+会员 |
| GET | /api/amap/route | 高德算路代理 | JWT |
| POST | /api/billing/checkout | 创建支付订单 | JWT |
| GET | /api/billing/orders | 查询用户订单 | JWT |
| POST | /api/billing/orders/:orderNo/submit | 提交付款确认 | JWT |
| GET | /api/admin/orders | 管理员查询订单 | AdminToken |
| POST | /api/admin/activate | 管理员确认开通 | AdminToken |
| POST | /api/billing/webhook/stripe | Stripe回调 | 无 |

## 数据库表

- `users` - 用户表
- `sms_codes` - 短信验证码
- `subscriptions` - 会员订阅
- `user_settings` - 用户设置
- `shops` - 店铺数据
- `payment_orders` - 支付订单

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| JWT_SECRET | JWT签名密钥 | dev-jwt-secret-change-in-prod |
| ADMIN_TOKEN | 管理员Token | dev-admin-token-change-in-prod |
| AMAP_ROUTE_KEY | 高德算路Key | 空 |
| PAYMENT_PROVIDER | 支付方式 | manual |
| ALIPAY_PAYEE_NAME | 支付宝收款名 | 支付宝收款账户 |
| SMS_PROVIDER | 短信服务 | dev（开发模式） |

## 注意事项

- 数据库连接通过 `python3 /source/storage_skill/drizzle/load_env.py` 加载环境变量
- 生产环境务必修改 JWT_SECRET 和 ADMIN_TOKEN
- SMS_PROVIDER=dev 模式下验证码在响应中返回（devCode 字段）
- 会员套餐：月付19元、年付99元、终身699元
