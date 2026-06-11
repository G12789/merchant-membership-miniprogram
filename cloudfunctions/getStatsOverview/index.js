// 云函数入口文件 - 获取统计概览
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

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
    // 获取今日起止时间
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // 获取会员总数
    const totalMembersResult = await db.collection('members')
      .where({ shopId: shopId })
      .count();

    // 获取今日新增会员数
    const todayMembersResult = await db.collection('members')
      .where({
        shopId: shopId,
        createTime: _.gte(todayStart).and(_.lt(todayEnd))
      })
      .count();

    // 获取今日交易数据
    const todayTransactions = await db.collection('transactions')
      .where({
        shopId: shopId,
        createTime: _.gte(todayStart).and(_.lt(todayEnd))
      })
      .get();

    // 计算今日收入
    let todayIncome = 0;
    let todayTransactionCount = 0;
    todayTransactions.data.forEach(t => {
      if (t.type === 'recharge' || t.type === 'consume') {
        todayIncome += t.amount || 0;
      }
      todayTransactionCount++;
    });

    // 获取会员总余额
    const membersWithBalance = await db.collection('members')
      .where({ shopId: shopId })
      .field({ balance: true })
      .get();

    let totalBalance = 0;
    membersWithBalance.data.forEach(m => {
      totalBalance += m.balance || 0;
    });

    // 简单营销数据（可后续扩展）
    const marketing = {
      conversionRate: '0%',
      returnRate: '0%',
      avgConsume: '0'
    };

    // 计算回头率（7天内有交易的会员占比）
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentActiveMembers = await db.collection('transactions')
      .where({
        shopId: shopId,
        createTime: _.gte(weekAgo)
      })
      .get();

    const uniqueActiveMembers = [...new Set(recentActiveMembers.data.map(t => t.memberId))];
    const totalMembers = totalMembersResult.total;
    if (totalMembers > 0) {
      const returnRate = Math.round((uniqueActiveMembers.length / totalMembers) * 100);
      marketing.returnRate = returnRate + '%';
    }

    return {
      success: true,
      data: {
        stats: {
          totalMembers: totalMembers,
          todayMembers: todayMembersResult.total,
          todayTransactions: todayTransactionCount,
          todayIncome: (todayIncome / 100).toFixed(2),
          totalBalance: (totalBalance / 100).toFixed(2)
        },
        marketing: marketing
      }
    };

  } catch (err) {
    console.error('获取统计概览失败:', err);
    return {
      success: false,
      message: '获取统计数据失败'
    };
  }
};
