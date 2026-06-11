# 商户会员工作台 · Merchant Membership Mini-Program

一个面向中小商户的**会员管理微信小程序**：会员建档、会员卡（月/季/年/永久）、交易与支付记录、数据统计、营销提醒等，后端基于**微信云开发（云函数 + 云数据库）**。

A WeChat **Mini-Program for merchant membership management**: member profiles, membership cards (monthly/quarterly/yearly/permanent), transactions & payment records, statistics dashboard, and marketing reminders. Backed by **WeChat Cloud Development** (cloud functions + cloud DB).

## 功能 / Features
- 👥 会员管理：建档、列表、搜索、生日提醒
- 💳 会员卡套餐：月卡 / 季卡 / 年卡 / 永久卡 + 试用
- 💰 微信支付下单与回调、交易历史
- 🏪 店铺注册与信息管理、权限校验
- 📊 数据概览统计
- ⏰ 试用到期提醒（定时云函数）

## 技术 / Stack
- 微信小程序（原生）
- 微信云开发：`cloudfunctions/`（云函数）+ 云数据库
- `wx-server-sdk`

## 运行 / Getting Started
1. 用微信开发者工具导入本项目
2. 在 `project.config.json` 填入**你自己的** AppID
3. 开通云开发环境，上传部署 `cloudfunctions/` 下各云函数
4. 微信支付相关配置（商户号 / 密钥）请在云开发环境变量中设置，**不要硬编码进代码**

> `project.private.config.json` 与 `node_modules/` 已被 `.gitignore` 排除。

## License
MIT
