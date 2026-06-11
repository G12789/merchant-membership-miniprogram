# 商户会员工作台 - 开发日志

> **核心原则**：商家数据必须与账号永久绑定，每次登录后数据完整恢复
> **数据存储**：所有业务数据存入云数据库，本地存储仅作为访问缓存

---

## 日期：2026-01-21

### 一、数据库Schema设计

#### 1. shops 集合（商户表）

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| _id | String | 唯一ID（自动创建） | ✅ |
| openid | String | 微信openid | ✅ |
| name | String | 商户名称（如"奶茶店"） | ✅ |
| phone | String | 商户电话（注册时获取） | ✅ |
| avatarUrl | String | 店铺头像 | ❌ |
| address | String | 店铺地址 | ❌ |
| notice | String | 店铺公告 | ❌ |
| trialEndTime | Date | 试用期截止时间（注册时=当前时间+12天） | ✅ |
| membershipStatus | String | 状态：`trial`/`monthly`/`quarterly`/`yearly`/`expired` | ✅ |
| membershipExpireTime | Date | 会员到期时间（付费后计算） | ❌ |
| smsBalance | Number | 短信余额（购买后更新） | ❌ |
| totalMembers | Number | 会员总数 | ✅ |
| totalTransactions | Number | 交易总数 | ✅ |
| createTime | Date | 创建时间 | ✅ |
| updateTime | Date | 更新时间 | ✅ |

**索引**：
- `openid`（唯一索引）
- `phone`（唯一索引）
- `membershipStatus + trialEndTime`（复合索引）

---

#### 2. members 集合（会员表）

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| _id | String | 唯一ID | ✅ |
| shopId | String | 关联商户ID（**关键！**） | ✅ |
| name | String | 会员姓名 | ✅ |
| phone | String | 会员电话（**完整显示！**） | ✅ |
| gender | String | 性别：male/female/unknown | ❌ |
| birthday | String | 生日 | ❌ |
| balance | Number | 储值余额（分） | ✅ |
| totalRecharge | Number | 累计充值（分） | ✅ |
| totalConsume | Number | 累计消费（分） | ✅ |
| points | Number | 积分 | ❌ |
| remark | String | 备注 | ❌ |
| createTime | Date | 加入时间 | ✅ |
| updateTime | Date | 更新时间 | ✅ |

**索引**：
- `shopId`（普通索引）
- `shopId + phone`（复合唯一索引）
- `shopId + createTime`（复合索引）

**示例数据**：
```json
{
  "_id": "m123",
  "shopId": "s456",
  "name": "张三",
  "phone": "13812345678",
  "balance": 8500,
  "totalRecharge": 10000,
  "totalConsume": 1500,
  "createTime": "2026-01-20T10:00:00Z"
}
```

---

#### 3. transactions 集合（交易记录表）

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| _id | String | 唯一ID | ✅ |
| shopId | String | 关联商户ID | ✅ |
| memberId | String | 关联会员ID | ✅ |
| type | String | 类型：recharge/consume/deduct | ✅ |
| amount | Number | 金额（分） | ✅ |
| balanceBefore | Number | 交易前余额 | ✅ |
| balanceAfter | Number | 交易后余额 | ✅ |
| remark | String | 备注 | ❌ |
| createTime | Date | 创建时间 | ✅ |

---

#### 4. payment_orders 集合（支付订单表）

| 字段 | 类型 | 说明 | 必填 |
|------|------|------|------|
| _id | String | 唯一ID | ✅ |
| orderNo | String | 订单号（唯一） | ✅ |
| shopId | String | 商户ID | ✅ |
| planType | String | 套餐类型：monthly/quarterly/yearly | ✅ |
| amount | Number | 金额（分） | ✅ |
| status | String | 状态：pending/success/failed | ✅ |
| createTime | Date | 创建时间 | ✅ |
| payTime | Date | 支付时间 | ❌ |

---

### 二、云函数API清单

#### 用户认证模块

| API | 云函数 | 功能 | 数据库操作 |
|-----|--------|------|-----------|
| POST /login | `shopRegister` | 微信登录 + 注册 | INSERT/SELECT shops |
| GET /shop | `getShopInfo` | 获取商户信息 | SELECT shops |
| PUT /shop | `updateShopInfo` | 更新店铺配置 | UPDATE shops |

**关键代码 - shopRegister**：
```javascript
// 注册新商户
const newShop = {
  openid: openid,
  name: name,
  phone: phone,
  membershipStatus: 'trial',
  trialEndTime: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
  createTime: db.serverDate()
};
await db.collection('shops').add({ data: newShop });
```

---

#### 会员数据模块

| API | 云函数 | 功能 | 数据库操作 |
|-----|--------|------|-----------|
| GET /members | `getMemberList` | 获取会员列表 | SELECT members WHERE shopId |
| POST /members | `addMember` | 添加会员 | INSERT members |
| GET /members/:id | `getMemberDetail` | 会员详情 | SELECT members |
| PUT /members/:id | `updateMember` | 更新会员 | UPDATE members |
| DELETE /members/:id | `deleteMember` | 删除会员 | DELETE members |

**关键代码 - addMember**：
```javascript
const newMember = {
  shopId: shopId,        // 关键：关联商户ID
  name: name,
  phone: phone,          // 完整手机号，不做脱敏
  balance: balance || 0,
  createTime: db.serverDate()
};
await db.collection('members').add({ data: newMember });
```

---

#### 支付模块

| API | 云函数 | 功能 | 数据库操作 |
|-----|--------|------|-----------|
| POST /payment | `createPaymentOrder` | 创建支付订单 | INSERT payment_orders |
| POST /payment/callback | `paymentCallback` | 支付回调 | UPDATE shops, payment_orders |

**关键代码 - paymentCallback**：
```javascript
// 支付成功后更新商户会员状态
await db.collection('shops').doc(shopId).update({
  data: {
    membershipStatus: planType,
    membershipExpireTime: calculateExpireTime(planType),
    updateTime: db.serverDate()
  }
});
```

---

### 三、本地存储使用说明

**使用范围**：仅作为访问缓存，加速页面加载

| 存储键 | 用途 | 数据来源 |
|--------|------|---------|
| shopInfo | 商户信息缓存 | 云数据库 shops 集合 |

**同步策略**：
1. 每次打开小程序时，从云端拉取最新数据
2. 本地缓存仅在网络异常时使用
3. 修改操作必须先写入云端，成功后再更新本地缓存

```javascript
// 正确做法：先写云端，再更新本地
const res = await wx.cloud.callFunction({ name: 'updateShopInfo', data });
if (res.result.success) {
  wx.setStorageSync('shopInfo', res.result.data);  // 缓存更新
}
```

---

### 四、数据持久化验证清单

| 测试场景 | 预期结果 | 验证方法 |
|----------|----------|----------|
| 注册后数据保存 | 退出重登后数据完整恢复 | 用测试账号验证 |
| 付费后数据保留 | 付费状态永久保存 | 试用期结束→付费→重登 |
| 会员信息完整性 | 电话完整显示13812345678 | 添加会员→查看详情 |
| 多设备登录一致性 | 不同设备数据相同 | 两个设备登录对比 |

---

### 五、版本更新记录

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0.0 | 2026-01-21 | 初始版本，包含完整数据持久化架构 |
| v1.0.1 | 2026-01-21 | 添加updateShopInfo云函数 |
| v1.0.2 | 2026-01-21 | UI优化：2x2网格布局、Emoji图标 |

---

## 核心设计原则

1. **所有数据通过shopId关联** - 会员、交易、订单都与商户ID绑定
2. **禁止临时存储** - 业务数据必须存入云数据库
3. **付费状态独立存储** - 不影响会员信息可见性
4. **完整数据展示** - 会员电话完整显示，不做脱敏处理

---

> **验收标准**：商户注册后退出小程序，重新打开时所有数据（店铺信息、会员列表、付费状态）100%恢复
