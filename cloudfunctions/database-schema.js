/**
 * 云数据库集合结构说明
 * 
 * 在微信开发者工具的云开发控制台中创建以下集合：
 * 
 * ===========================================
 * 1. shops（商户表） - 核心表
 * ===========================================
 * {
 *   _id: String,              // 主键，自动生成
 *   openid: String,           // 微信openid
 *   name: String,             // 商户名称
 *   phone: String,            // 联系方式
 *   avatarUrl: String,        // 店铺头像
 *   createTime: Date,         // 注册时间（自动记录）
 *   updateTime: Date,         // 更新时间
 *   
 *   // 会员状态相关字段（关键！）
 *   membershipStatus: String, // 必填：trial/monthly/quarterly/yearly/permanent/expired
 *   trialEndTime: Date,       // 必填：试用截止时间（注册时自动计算：createTime + 12天）
 *   membershipExpireTime: Date, // 会员到期时间（订阅制有效，永久制填null）
 *   
 *   // 统计字段
 *   totalMembers: Number,     // 会员总数
 *   totalTransactions: Number // 交易总数
 * }
 * 
 * 索引建议：
 * - openid（唯一索引）
 * - phone（唯一索引）
 * - membershipStatus + trialEndTime（复合索引，用于到期提醒查询）
 * 
 * ===========================================
 * 2. members（会员表）
 * ===========================================
 * {
 *   _id: String,
 *   shopId: String,           // 关联商户ID（必填！）
 *   name: String,             // 会员姓名
 *   phone: String,            // 手机号
 *   gender: String,           // 性别：male/female/unknown
 *   birthday: String,         // 生日
 *   avatarUrl: String,        // 头像
 *   balance: Number,          // 余额（分）
 *   totalRecharge: Number,    // 累计充值（分）
 *   totalConsume: Number,     // 累计消费（分）
 *   points: Number,           // 积分
 *   isVip: Boolean,           // 是否VIP
 *   remark: String,           // 备注
 *   createTime: Date,
 *   updateTime: Date
 * }
 * 
 * 索引建议：
 * - shopId（普通索引）
 * - shopId + phone（复合唯一索引）
 * - shopId + createTime（复合索引，用于排序）
 * 
 * ===========================================
 * 3. transactions（交易记录表）
 * ===========================================
 * {
 *   _id: String,
 *   shopId: String,           // 关联商户ID
 *   memberId: String,         // 关联会员ID
 *   type: String,             // 类型：recharge/consume/deduct
 *   amount: Number,           // 金额（分）
 *   balanceBefore: Number,    // 交易前余额
 *   balanceAfter: Number,     // 交易后余额
 *   remark: String,           // 备注
 *   operatorId: String,       // 操作员ID
 *   createTime: Date
 * }
 * 
 * ===========================================
 * 4. payment_orders（支付订单表）
 * ===========================================
 * {
 *   _id: String,
 *   orderNo: String,          // 订单号（唯一）
 *   shopId: String,           // 商户ID
 *   openid: String,           // 支付者openid
 *   planType: String,         // 套餐类型：monthly/quarterly/yearly/permanent
 *   planName: String,         // 套餐名称
 *   amount: Number,           // 金额（分）
 *   status: String,           // 状态：pending/success/failed
 *   createTime: Date,
 *   updateTime: Date,
 *   payTime: Date             // 支付时间
 * }
 * 
 * ===========================================
 * 5. coupons（优惠券表）
 * ===========================================
 * {
 *   _id: String,
 *   shopId: String,           // 关联商户ID
 *   name: String,             // 优惠券名称
 *   type: String,             // 类型：discount/cash/gift
 *   value: Number,            // 面值/折扣
 *   minAmount: Number,        // 最低消费
 *   totalCount: Number,       // 发放总量
 *   usedCount: Number,        // 已使用数量
 *   startTime: Date,          // 生效时间
 *   endTime: Date,            // 失效时间
 *   status: String,           // 状态：active/inactive/expired
 *   createTime: Date
 * }
 * 
 * ===========================================
 * 6. messages（消息记录表）
 * ===========================================
 * {
 *   _id: String,
 *   shopId: String,           // 关联商户ID
 *   type: String,             // 类型：system/marketing/notification
 *   title: String,            // 标题
 *   content: String,          // 内容
 *   isRead: Boolean,          // 是否已读
 *   createTime: Date
 * }
 * 
 * ===========================================
 * 7. reminder_logs（提醒日志表）
 * ===========================================
 * {
 *   _id: String,
 *   shopId: String,
 *   shopName: String,
 *   reminderType: String,     // 提醒类型：trial_expiry
 *   daysRemaining: Number,    // 剩余天数
 *   createTime: Date
 * }
 * 
 * ===========================================
 * 权限配置
 * ===========================================
 * 所有集合的权限规则建议设置为：
 * {
 *   "read": true,
 *   "write": "doc._openid == auth.openid"
 * }
 * 
 * 或使用云函数操作数据库（推荐，更安全）
 */
