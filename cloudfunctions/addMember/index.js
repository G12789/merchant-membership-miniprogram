// 云函数入口文件 - 添加会员
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

/**
 * 权限校验工具函数
 */
async function checkShopPermission(shopId, requiredPermission) {
  const shopResult = await db.collection('shops').doc(shopId).get();
  const shop = shopResult.data;

  if (!shop) {
    throw new Error('SHOP_NOT_FOUND');
  }

  const { membershipStatus, trialEndTime, membershipExpireTime } = shop;
  const now = new Date();
  let isExpired = false;

  if (membershipStatus === 'trial') {
    isExpired = new Date(trialEndTime) < now;
  } else if (membershipStatus === 'expired') {
    isExpired = true;
  } else if (membershipStatus === 'permanent') {
    isExpired = false;
  } else if (membershipExpireTime) {
    isExpired = new Date(membershipExpireTime) < now;
  }

  // 受限操作
  const restrictedActions = ['addMember', 'marketing', 'deduction', 'recharge', 'dataAnalysis'];
  
  if (isExpired && restrictedActions.includes(requiredPermission)) {
    throw new Error('PERMISSION_DENIED');
  }

  return shop;
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { shopId, name, phone, gender, birthday, balance, remark } = event;

  // 参数验证
  if (!shopId || !name || !phone) {
    return {
      success: false,
      message: '缺少必要参数'
    };
  }

  // 验证手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return {
      success: false,
      message: '手机号格式不正确'
    };
  }

  try {
    // 关键校验：检查权限
    await checkShopPermission(shopId, 'addMember');

    // 检查会员是否已存在
    const existingMember = await db.collection('members')
      .where({
        shopId: shopId,
        phone: phone
      })
      .get();

    if (existingMember.data.length > 0) {
      return {
        success: false,
        message: '该手机号已注册为会员'
      };
    }

    // 创建新会员
    const newMember = {
      shopId: shopId,
      name: name,
      phone: phone,
      gender: gender || 'unknown',
      birthday: birthday || null,
      balance: balance || 0,  // 余额（分）
      totalRecharge: balance || 0,  // 累计充值
      totalConsume: 0,  // 累计消费
      points: 0,  // 积分
      isVip: false,
      remark: remark || '',
      avatarUrl: '',
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };

    const result = await db.collection('members').add({
      data: newMember
    });

    // 更新商户会员统计
    await db.collection('shops').doc(shopId).update({
      data: {
        totalMembers: _.inc(1),
        updateTime: db.serverDate()
      }
    });

    return {
      success: true,
      message: '添加成功',
      data: {
        _id: result._id,
        ...newMember
      }
    };

  } catch (err) {
    console.error('添加会员失败:', err);
    
    if (err.message === 'PERMISSION_DENIED') {
      return {
        success: false,
        message: '此功能需要升级为付费会员后使用',
        code: 'PERMISSION_DENIED'
      };
    }
    
    if (err.message === 'SHOP_NOT_FOUND') {
      return {
        success: false,
        message: '商户不存在'
      };
    }

    return {
      success: false,
      message: '添加失败，请稍后重试'
    };
  }
};
