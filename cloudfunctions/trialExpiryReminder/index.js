// 云函数入口文件 - 试用期到期提醒
// 触发器：每天凌晨0点执行
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 提醒时间点配置（剩余天数）
const REMINDER_DAYS = [7, 3, 1];

// 模板消息ID（需在微信公众平台配置）
const TEMPLATE_ID = 'YOUR_TEMPLATE_ID';  // 替换为实际模板ID

/**
 * 云函数入口函数
 * 定时任务：每天凌晨0点扫描即将到期的试用商户，发送提醒
 */
exports.main = async (event, context) => {
  console.log('开始执行试用期到期提醒任务...');

  const now = new Date();
  const results = {
    scanned: 0,
    reminded: 0,
    expired: 0,
    errors: []
  };

  try {
    // 遍历提醒时间点
    for (const days of REMINDER_DAYS) {
      // 计算目标日期范围（当天）
      const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const targetDateStart = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        targetDate.getDate()
      );
      const targetDateEnd = new Date(targetDateStart.getTime() + 24 * 60 * 60 * 1000);

      // 查询试用期将在指定天数后到期的商户
      const shopsToRemind = await db.collection('shops')
        .where({
          membershipStatus: 'trial',
          trialEndTime: _.gte(targetDateStart).and(_.lt(targetDateEnd))
        })
        .get();

      results.scanned += shopsToRemind.data.length;

      // 发送提醒
      for (const shop of shopsToRemind.data) {
        try {
          await sendReminderMessage(shop, days);
          results.reminded++;
          
          // 记录提醒日志
          await db.collection('reminder_logs').add({
            data: {
              shopId: shop._id,
              shopName: shop.name,
              reminderType: 'trial_expiry',
              daysRemaining: days,
              createTime: db.serverDate()
            }
          });
        } catch (err) {
          console.error(`发送提醒失败 - 商户${shop._id}:`, err);
          results.errors.push({
            shopId: shop._id,
            error: err.message
          });
        }
      }
    }

    // 处理已过期但未更新状态的商户
    const expiredShops = await db.collection('shops')
      .where({
        membershipStatus: 'trial',
        trialEndTime: _.lt(now)
      })
      .get();

    for (const shop of expiredShops.data) {
      try {
        // 更新为过期状态
        await db.collection('shops').doc(shop._id).update({
          data: {
            membershipStatus: 'expired',
            updateTime: db.serverDate()
          }
        });
        results.expired++;
      } catch (err) {
        console.error(`更新过期状态失败 - 商户${shop._id}:`, err);
      }
    }

    console.log('试用期到期提醒任务完成:', results);
    
    return {
      success: true,
      results: results
    };

  } catch (err) {
    console.error('试用期提醒任务执行失败:', err);
    return {
      success: false,
      message: err.message,
      results: results
    };
  }
};

/**
 * 发送提醒消息
 * @param {Object} shop 商户信息
 * @param {Number} daysRemaining 剩余天数
 */
async function sendReminderMessage(shop, daysRemaining) {
  // 构建消息内容
  let title = '';
  let content = '';
  
  if (daysRemaining === 7) {
    title = '体验期即将到期提醒';
    content = `您的免费体验还剙7天，到期后新增会员、营销等功能将受限。立即升级，享受持续服务！`;
  } else if (daysRemaining === 3) {
    title = '体验期到期倒计时';
    content = `您的免费体验仅3天！升级年卡仅需¥96/年，平均每月8元。`;
  } else if (daysRemaining === 1) {
    title = '紧急：体验期明天到期';
    content = `明天体验期结束后，添加会员、发起营销等功能将被锁定。立即升级保持业务连续！`;
  }

  // 发送订阅消息（需要用户订阅）
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: shop.openid,
      templateId: TEMPLATE_ID,
      page: '/pages/account/account',  // 跳转到付费页面
      data: {
        thing1: { value: title },
        thing2: { value: content },
        time3: { value: formatDate(shop.trialEndTime) }
      }
    });
    console.log(`提醒消息已发送 - 商户${shop._id}, 剩余${daysRemaining}天`);
  } catch (err) {
    // 如果订阅消息发送失败，记录到消息表供用户在小程序内查看
    await db.collection('messages').add({
      data: {
        shopId: shop._id,
        type: 'system',
        title: title,
        content: content,
        isRead: false,
        createTime: db.serverDate()
      }
    });
    console.log(`小程序内消息已创建 - 商户${shop._id}`);
  }
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
