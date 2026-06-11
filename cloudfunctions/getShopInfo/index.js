// 云函数入口文件 - 获取商户信息
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { shopId } = event;
  const wxContext = cloud.getWXContext();

  try {
    let shop;

    if (shopId) {
      // 通过shopId查询
      const result = await db.collection('shops').doc(shopId).get();
      shop = result.data;
    } else {
      // 通过openid查询
      const result = await db.collection('shops')
        .where({ openid: wxContext.OPENID })
        .get();
      shop = result.data[0];
    }

    if (!shop) {
      return {
        success: false,
        message: '商户不存在'
      };
    }

    // 检查并更新会员状态
    const updatedShop = await checkAndUpdateMembershipStatus(shop);

    return {
      success: true,
      data: updatedShop
    };

  } catch (err) {
    console.error('获取商户信息失败:', err);
    return {
      success: false,
      message: '获取商户信息失败'
    };
  }
};

// 检查并更新会员状态
async function checkAndUpdateMembershipStatus(shop) {
  const now = new Date();
  let needUpdate = false;
  let newStatus = shop.membershipStatus;

  if (shop.membershipStatus === 'trial') {
    if (new Date(shop.trialEndTime) < now) {
      newStatus = 'expired';
      needUpdate = true;
    }
  } else if (['monthly', 'quarterly', 'yearly'].includes(shop.membershipStatus)) {
    if (shop.membershipExpireTime && new Date(shop.membershipExpireTime) < now) {
      newStatus = 'expired';
      needUpdate = true;
    }
  }

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
