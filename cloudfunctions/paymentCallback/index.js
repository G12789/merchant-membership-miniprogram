// 云函数入口文件 - 支付回调处理
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 套餐配置
const PLAN_CONFIG = {
  monthly: { days: 30, status: 'monthly' },
  quarterly: { days: 90, status: 'quarterly' },
  yearly: { days: 365, status: 'yearly' },
  permanent: { days: -1, status: 'permanent' }
};

// 云函数入口函数（支付回调）
exports.main = async (event, context) => {
  const { outTradeNo, resultCode, returnCode } = event;

  console.log('支付回调:', event);

  // 验证支付结果
  if (returnCode !== 'SUCCESS' || resultCode !== 'SUCCESS') {
    console.error('支付失败:', event);
    return { errcode: 0 };
  }

  try {
    // 查询订单
    const orderResult = await db.collection('payment_orders')
      .where({ orderNo: outTradeNo })
      .get();

    if (orderResult.data.length === 0) {
      console.error('订单不存在:', outTradeNo);
      return { errcode: 0 };
    }

    const order = orderResult.data[0];

    // 检查订单状态，避免重复处理
    if (order.status === 'success') {
      console.log('订单已处理:', outTradeNo);
      return { errcode: 0 };
    }

    const plan = PLAN_CONFIG[order.planType];
    const now = new Date();

    // 计算会员到期时间
    let membershipExpireTime = null;
    if (plan.days > 0) {
      membershipExpireTime = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);
    }

    // 更新订单状态
    await db.collection('payment_orders').doc(order._id).update({
      data: {
        status: 'success',
        payTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    });

    // 更新商户会员状态
    await db.collection('shops').doc(order.shopId).update({
      data: {
        membershipStatus: plan.status,
        membershipExpireTime: membershipExpireTime,
        updateTime: db.serverDate()
      }
    });

    console.log('支付回调处理成功:', outTradeNo);
    return { errcode: 0 };

  } catch (err) {
    console.error('支付回调处理失败:', err);
    return { errcode: -1 };
  }
};
