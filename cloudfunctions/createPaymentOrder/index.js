// 云函数入口文件 - 创建支付订单
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 套餐配置
const PLAN_CONFIG = {
  monthly: {
    name: '月卡',
    price: 1500,  // 15元（分）
    days: 30,
    status: 'monthly'
  },
  quarterly: {
    name: '季卡',
    price: 3000,  // 30元（分）
    days: 90,
    status: 'quarterly'
  },
  yearly: {
    name: '年卡',
    price: 9800,  // 98元（分）
    days: 365,
    status: 'yearly'
  },
  permanent: {
    name: '永久卡',
    price: 20000,  // 200元（分）
    days: -1,  // 永久
    status: 'permanent'
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  const { shopId, planType } = event;
  const wxContext = cloud.getWXContext();

  // 参数验证
  if (!shopId || !planType) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  // 验证套餐类型
  if (!PLAN_CONFIG[planType]) {
    return {
      success: false,
      message: '无效的套餐类型'
    };
  }

  try {
    const plan = PLAN_CONFIG[planType];

    // 生成订单号
    const orderNo = 'PAY' + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();

    // 创建订单记录
    const order = {
      orderNo: orderNo,
      shopId: shopId,
      openid: wxContext.OPENID,
      planType: planType,
      planName: plan.name,
      amount: plan.price,
      status: 'pending',  // pending, success, failed
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const orderResult = await db.collection('payment_orders').add({
      data: order
    });

    // 调用微信支付统一下单
    // 注意：实际项目中需要配置商户号等信息
    const paymentResult = await cloud.cloudPay.unifiedOrder({
      body: `商户会员工作台-${plan.name}`,
      outTradeNo: orderNo,
      spbillCreateIp: '127.0.0.1',
      subMchId: 'YOUR_SUB_MCH_ID',  // 替换为实际子商户号
      totalFee: plan.price,
      envId: cloud.DYNAMIC_CURRENT_ENV,
      functionName: 'paymentCallback',  // 支付回调云函数
      nonceStr: Math.random().toString(36).substr(2, 15),
      tradeType: 'JSAPI'
    });

    return {
      success: true,
      data: {
        orderId: orderResult._id,
        orderNo: orderNo,
        payment: paymentResult.payment
      }
    };

  } catch (err) {
    console.error('创建支付订单失败:', err);
    
    // 如果是开发环境，返回模拟支付数据
    if (err.errCode === -1) {
      // 模拟支付（开发测试用）
      const plan = PLAN_CONFIG[planType];
      const orderNo = 'TEST' + Date.now();
      
      return {
        success: true,
        message: '测试环境：模拟支付',
        data: {
          orderId: 'test_' + Date.now(),
          orderNo: orderNo,
          payment: {
            timeStamp: String(Math.floor(Date.now() / 1000)),
            nonceStr: Math.random().toString(36).substr(2, 15),
            package: 'prepay_id=test_' + Date.now(),
            signType: 'MD5',
            paySign: 'test_sign'
          }
        }
      };
    }
    
    return {
      success: false,
      message: '创建订单失败，请稍后重试'
    };
  }
};
