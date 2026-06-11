// app.js
// ============================================
// 演示模式开关：设为 true 时使用本地模拟数据，无需云开发
// 正式上线时请设为 false 并配置云环境ID
// ============================================
const DEMO_MODE = true;  // 演示模式
const CLOUD_ENV_ID = 'your-env-id';  // 云环境ID，正式上线时替换

App({
  onLaunch: function () {
    // 云开发环境配置
    this.globalData = {
      shopInfo: null,
      userInfo: null,
      cloudReady: false,  // 云开发是否就绪
      isDemo: DEMO_MODE   // 演示模式
    };

    // 演示模式下不初始化云开发
    if (DEMO_MODE) {
      console.log('🚨 当前为演示模式，使用本地模拟数据');
      return;
    }

    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      this.globalData.isDemo = true;
    } else {
      try {
        wx.cloud.init({
          env: CLOUD_ENV_ID,
          traceUser: true
        });
        this.globalData.cloudReady = true;
      } catch (err) {
        console.error('云开发初始化失败:', err);
        this.globalData.isDemo = true;
      }
    }
    
    // 检查登录状态
    this.checkLoginStatus();
  },
  
  // 检查登录状态
  checkLoginStatus: function() {
    const shopInfo = wx.getStorageSync('shopInfo');
    if (shopInfo) {
      this.globalData.shopInfo = shopInfo;
      // 只有云开发就绪才刷新
      if (this.globalData.cloudReady && shopInfo._id) {
        this.refreshShopInfo(shopInfo._id);
      }
    }
  },
  
  // 刷新商户信息
  refreshShopInfo: async function(shopId) {
    // 如果是演示模式，不调用云函数
    if (this.globalData.isDemo || !this.globalData.cloudReady) {
      return;
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'getShopInfo',
        data: { shopId }
      });
      if (res.result && res.result.success) {
        this.globalData.shopInfo = res.result.data;
        wx.setStorageSync('shopInfo', res.result.data);
      }
    } catch (err) {
      console.error('刷新商户信息失败:', err);
    }
  },

  // 创建演示商户数据
  createDemoShop: function(name, phone) {
    const now = new Date();
    // 免费体验期：12天
    const trialEndTime = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000);
    return {
      _id: 'demo_' + Date.now(),
      name: name,
      phone: phone,
      membershipStatus: 'trial',
      trialEndTime: trialEndTime.toISOString(),
      membershipExpireTime: null,
      createTime: now.toISOString(),
      totalMembers: 0,
      totalTransactions: 0,
      smsBalance: 0
    };
  },
  
  // 全局权限检查
  checkPermission: function(action) {
    const shopInfo = this.globalData.shopInfo;
    if (!shopInfo) {
      return { allowed: false, reason: 'NOT_LOGIN' };
    }
    
    const { membershipStatus, trialEndTime, membershipExpireTime } = shopInfo;
    const now = new Date();
    
    // 检查是否过期
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
    
    // 受限操作列表
    const restrictedActions = ['addMember', 'marketing', 'deduction', 'dataAnalysis'];
    
    if (isExpired && restrictedActions.includes(action)) {
      return { allowed: false, reason: 'EXPIRED' };
    }
    
    return { allowed: true };
  },
  
  // 显示解锁提示 - 柔和文案
  showUpgradeModal: function() {
    wx.showModal({
      title: '解锁更多功能',
      content: '此功能可让您的会员管理更高效。立即解锁？',
      confirmText: '查看详情',
      confirmColor: '#1890ff',
      cancelText: '稍后再说',
      success: (res) => {
        if (res.confirm) {
          wx.switchTab({
            url: '/pages/account/account'
          });
        }
      }
    });
  },
  
  // 计算剩余天数
  getRemainingDays: function() {
    const shopInfo = this.globalData.shopInfo;
    if (!shopInfo) return 0;
    
    let endTime;
    if (shopInfo.membershipStatus === 'trial') {
      endTime = new Date(shopInfo.trialEndTime);
    } else if (shopInfo.membershipStatus === 'permanent') {
      return -1; // 永久
    } else if (shopInfo.membershipExpireTime) {
      endTime = new Date(shopInfo.membershipExpireTime);
    } else {
      return 0;
    }
    
    const now = new Date();
    const diff = endTime - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  },
  
  globalData: {
    shopInfo: null,
    userInfo: null
  }
});
