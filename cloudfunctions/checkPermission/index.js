// 云函数入口文件 - 全局权限校验
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 全局权限校验工具函数
 * 
 * 权限规则（关键！）：
 * - trial/付费状态：所有功能可用
 * - expired状态（试用结束未付费）：
 *   ✅ 可查看：会员列表、历史数据、消息记录
 *   ❌ 限制功能：新增会员、发起营销、储值扣款、详细数据分析
 */

// 受限操作列表
const RESTRICTED_ACTIONS = [
  'addMember',      // 新增会员
  'marketing',      // 发起营销
  'deduction',      // 储值扣款
  'recharge',       // 会员充值
  'dataAnalysis',   // 详细数据分析
  'sendCoupon',     // 发送优惠券
  'createCoupon'    // 创建优惠券
];

// 始终允许的操作（过期后仍可用）
const ALWAYS_ALLOWED_ACTIONS = [
  'viewMembers',      // 查看会员列表
  'viewHistory',      // 查看历史数据
  'viewMessages',     // 查看消息记录
  'viewTransactions', // 查看交易记录
  'viewCoupons'       // 查看优惠券
];

// 检查商户权限
async function checkShopPermission(shopId, requiredPermission) {
  // 获取商户信息
  const shopResult = await db.collection('shops').doc(shopId).get();
  const shop = shopResult.data;

  if (!shop) {
    return {
      allowed: false,
      reason: 'SHOP_NOT_FOUND',
      message: '商户不存在'
    };
  }

  const { membershipStatus, trialEndTime, membershipExpireTime } = shop;
  const now = new Date();
  
  // 检查是否过期
  let isExpired = false;

  if (membershipStatus === 'trial') {
    isExpired = new Date(trialEndTime) < now;
  } else if (membershipStatus === 'expired') {
    isExpired = true;
  } else if (membershipStatus === 'permanent') {
    isExpired = false;
  } else if (['monthly', 'quarterly', 'yearly'].includes(membershipStatus)) {
    if (membershipExpireTime) {
      isExpired = new Date(membershipExpireTime) < now;
    }
  }

  // 如果没有过期，所有操作都允许
  if (!isExpired) {
    return {
      allowed: true,
      membershipStatus,
      isExpired: false
    };
  }

  // 已过期，检查是否是受限操作
  if (RESTRICTED_ACTIONS.includes(requiredPermission)) {
    return {
      allowed: false,
      reason: 'PERMISSION_DENIED',
      message: '此功能需要升级为付费会员后使用',
      membershipStatus: 'expired',
      isExpired: true
    };
  }

  // 允许的操作（查看类）
  return {
    allowed: true,
    membershipStatus: 'expired',
    isExpired: true,
    message: '可查看，但部分功能受限'
  };
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { shopId, action } = event;

  if (!shopId) {
    return {
      success: false,
      allowed: false,
      message: '缺少商户ID'
    };
  }

  if (!action) {
    return {
      success: false,
      allowed: false,
      message: '缺少操作类型'
    };
  }

  try {
    const result = await checkShopPermission(shopId, action);
    return {
      success: true,
      ...result
    };
  } catch (err) {
    console.error('权限校验失败:', err);
    return {
      success: false,
      allowed: false,
      message: '权限校验失败'
    };
  }
};

// 导出工具函数供其他云函数使用
exports.checkShopPermission = checkShopPermission;
exports.RESTRICTED_ACTIONS = RESTRICTED_ACTIONS;
exports.ALWAYS_ALLOWED_ACTIONS = ALWAYS_ALLOWED_ACTIONS;
