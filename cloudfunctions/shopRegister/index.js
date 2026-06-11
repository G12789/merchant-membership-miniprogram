// 云函数入口文件 - 商户注册/登录
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { name, phone } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // 参数验证
  if (!name || !phone) {
    return {
      success: false,
      message: '店铺名称和手机号不能为空'
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
    const shopsCollection = db.collection('shops');

    // 先查询是否已存在该商户（通过openid或手机号）
    const existingShop = await shopsCollection
      .where(db.command.or([
        { openid: openid },
        { phone: phone }
      ]))
      .get();

    if (existingShop.data.length > 0) {
      // 已存在，返回商户信息（登录）
      const shop = existingShop.data[0];
      
      // 检查并更新会员状态
      const updatedShop = await checkAndUpdateMembershipStatus(shop);
      
      return {
        success: true,
        message: '登录成功',
        data: updatedShop
      };
    }

    // 不存在，创建新商户（注册）
    const now = new Date();
    // 计算试用期结束时间（12天后）
    const trialEndTime = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);

    const newShop = {
      openid: openid,
      name: name,
      phone: phone,
      avatarUrl: '',
      createTime: db.serverDate(),
      updateTime: db.serverDate(),
      // 会员状态相关字段
      membershipStatus: 'trial',  // trial（试用中）
      trialEndTime: trialEndTime,  // 试用截止时间
      membershipExpireTime: null,  // 会员到期时间（订阅制）
      // 统计字段
      totalMembers: 0,
      totalTransactions: 0
    };

    const result = await shopsCollection.add({
      data: newShop
    });

    // 返回完整的商户信息
    const createdShop = {
      _id: result._id,
      ...newShop,
      createTime: now,
      updateTime: now
    };

    return {
      success: true,
      message: '注册成功，已开通12天免费体验',
      data: createdShop
    };

  } catch (err) {
    console.error('商户注册失败:', err);
    return {
      success: false,
      message: '注册失败，请稍后重试'
    };
  }
};

// 检查并更新会员状态
async function checkAndUpdateMembershipStatus(shop) {
  const now = new Date();
  let needUpdate = false;
  let newStatus = shop.membershipStatus;

  // 检查试用期是否过期
  if (shop.membershipStatus === 'trial') {
    if (new Date(shop.trialEndTime) < now) {
      newStatus = 'expired';
      needUpdate = true;
    }
  }
  // 检查订阅会员是否过期
  else if (['monthly', 'quarterly', 'yearly'].includes(shop.membershipStatus)) {
    if (shop.membershipExpireTime && new Date(shop.membershipExpireTime) < now) {
      newStatus = 'expired';
      needUpdate = true;
    }
  }

  // 需要更新状态
  if (needUpdate) {
    await db.collection('shops').doc(shop._id).update({
      data: {
        membershipStatus: newStatus,
        updateTime: db.serverDate()
      }
    });
    shop.membershipStatus = newStatus;
  }

  return shop;
}
