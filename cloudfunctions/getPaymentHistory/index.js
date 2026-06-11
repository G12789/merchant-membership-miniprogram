// 云函数入口文件 - 获取支付历史记录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { shopId } = event;

  if (!shopId) {
    return {
      success: false,
      message: '缺少商户ID'
    };
  }

  try {
    // 查询支付记录
    const result = await db.collection('payment_orders')
      .where({
        shopId: shopId,
        status: 'success'  // 只返回成功的订单
      })
      .orderBy('createTime', 'desc')
      .limit(50)
      .get();

    // 格式化数据
    const history = result.data.map(order => ({
      _id: order._id,
      orderNo: order.orderNo,
      planType: order.planType,
      planName: order.planName,
      amount: (order.amount / 100).toFixed(2),  // 分转元
      status: order.status,
      createTime: order.createTime,
      payTime: order.payTime
    }));

    return {
      success: true,
      data: history
    };

  } catch (err) {
    console.error('获取支付历史失败:', err);
    return {
      success: false,
      message: '获取支付历史失败'
    };
  }
};
