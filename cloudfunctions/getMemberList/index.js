// 云函数入口文件 - 获取会员列表
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const { shopId, keyword, page = 1, pageSize = 20 } = event;

  if (!shopId) {
    return {
      success: false,
      message: '缺少商户ID'
    };
  }

  try {
    // 构建查询条件
    let whereCondition = { shopId: shopId };

    // 支持关键字搜索（姓名或手机号）
    if (keyword && keyword.trim()) {
      const searchKeyword = keyword.trim();
      whereCondition = db.command.and([
        { shopId: shopId },
        db.command.or([
          { name: db.RegExp({ regexp: searchKeyword, options: 'i' }) },
          { phone: db.RegExp({ regexp: searchKeyword, options: 'i' }) }
        ])
      ]);
    }

    // 计算跳过条数
    const skip = (page - 1) * pageSize;

    // 查询会员列表
    const result = await db.collection('members')
      .where(whereCondition)
      .orderBy('createTime', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      success: true,
      data: result.data,
      page: page,
      pageSize: pageSize
    };

  } catch (err) {
    console.error('获取会员列表失败:', err);
    return {
      success: false,
      message: '获取会员列表失败'
    };
  }
};
