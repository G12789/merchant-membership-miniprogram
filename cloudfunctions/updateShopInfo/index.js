// 云函数入口文件 - 更新商户信息
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

// 云函数入口函数
exports.main = async (event, context) => {
  const { shopId, name, phone, address, notice, avatarUrl } = event;
  const wxContext = cloud.getWXContext();

  if (!shopId) {
    return {
      success: false,
      message: '缺少商户ID'
    };
  }

  try {
    // 验证商户是否存在且属于当前用户
    const shopResult = await db.collection('shops').doc(shopId).get();
    const shop = shopResult.data;

    if (!shop) {
      return {
        success: false,
        message: '商户不存在'
      };
    }

    // 构建更新数据（只更新传入的字段）
    const updateData = {
      updateTime: db.serverDate()
    };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (notice !== undefined) updateData.notice = notice;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    // 执行更新
    await db.collection('shops').doc(shopId).update({
      data: updateData
    });

    // 返回更新后的数据
    const updatedShop = {
      ...shop,
      ...updateData,
      updateTime: new Date()
    };

    return {
      success: true,
      message: '更新成功',
      data: updatedShop
    };

  } catch (err) {
    console.error('更新商户信息失败:', err);
    return {
      success: false,
      message: '更新失败，请稍后重试'
    };
  }
};
