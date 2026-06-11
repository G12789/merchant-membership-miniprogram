// pages/index/index.js
const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/api.js');

Page({
  data: {
    shopInfo: null,
    isExpired: false,
    noticeType: 'trial',
    noticeText: '',
    showUpgradeBtn: false,
    stats: {
      todayMembers: 0,
      todayTransactions: 0,
      todayIncome: '0.00',
      totalMembers: 0
    },
    marketingData: {
      conversionRate: '0%',
      returnRate: '0%',
      avgConsume: '0'
    },
    recentMembers: []
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    // 每次显示时刷新数据
    if (app.globalData.shopInfo) {
      this.refreshData();
    }
  },

  // 初始化页面
  initPage() {
    const shopInfo = app.globalData.shopInfo;
    if (shopInfo) {
      this.setData({ shopInfo });
      this.updateNoticeBar();
      this.checkExpiredStatus();
      this.loadStats();
      this.loadRecentMembers();
    }
  },

  // 刷新数据
  refreshData() {
    const shopInfo = app.globalData.shopInfo;
    this.setData({ shopInfo });
    this.updateNoticeBar();
    this.checkExpiredStatus();
    this.loadStats();
    this.loadRecentMembers();
  },

  // 更新公告栏 - 柔和文案 + 颜色区分
  updateNoticeBar() {
    const shopInfo = this.data.shopInfo;
    if (!shopInfo) return;

    const { membershipStatus, trialEndTime, membershipExpireTime } = shopInfo;
    const now = new Date();
    let noticeType = 'trial';
    let noticeText = '';
    let showUpgradeBtn = false;

    if (membershipStatus === 'trial') {
      const endTime = new Date(trialEndTime);
      if (endTime > now) {
        const remainingDays = util.getRemainingDays(trialEndTime);
        // 体验期 - 根据剩余天数显示不同颜色
        if (remainingDays <= 3) {
          // 临期（≤3天）- 橙色提醒
          noticeType = 'warning';
          noticeText = `免费体验 剩余:${remainingDays}天，解锁后可继续使用`;
          showUpgradeBtn = true;
        } else {
          // 试用中 - 灰色平和
          noticeType = 'trial';
          noticeText = `免费体验 剩余:${remainingDays}天`;
          showUpgradeBtn = false;
        }
      } else {
        // 试用已过期 - 红色
        noticeType = 'expired';
        noticeText = '体验已过期，解锁后可继续使用全部功能';
        showUpgradeBtn = true;
      }
    } else if (membershipStatus === 'expired') {
      noticeType = 'expired';
      noticeText = '体验已过期，解锁后可继续使用全部功能';
      showUpgradeBtn = true;
    } else if (membershipStatus === 'permanent') {
      noticeType = 'paid';
      noticeText = '已解锁全部功能，感谢您的信任！';
      showUpgradeBtn = false;
    } else {
      // 付费会员
      const expireDate = util.formatDate(membershipExpireTime, 'YYYY-MM-DD');
      noticeType = 'paid';
      noticeText = `已解锁全部功能，有效期至${expireDate}`;
      showUpgradeBtn = false;
    }

    this.setData({ noticeType, noticeText, showUpgradeBtn });
  },

  // 检查过期状态
  checkExpiredStatus() {
    const shopInfo = this.data.shopInfo;
    const isExpired = util.isExpired(shopInfo);
    this.setData({ isExpired });
  },

  // 加载统计数据
  async loadStats() {
    try {
      const shopInfo = this.data.shopInfo;
      if (!shopInfo) return;

      // 演示模式：使用模拟数据
      if (app.globalData.isDemo || !app.globalData.cloudReady) {
        this.setData({
          stats: {
            todayMembers: 2,
            todayTransactions: 5,
            todayIncome: '128.00',
            totalMembers: 36
          },
          marketingData: {
            conversionRate: '23%',
            returnRate: '45%',
            avgConsume: '68'
          }
        });
        return;
      }

      const res = await api.statsApi.getOverview(shopInfo._id);
      if (res.success) {
        this.setData({
          stats: res.data.stats || this.data.stats,
          marketingData: res.data.marketing || this.data.marketingData
        });
      }
    } catch (err) {
      console.error('加载统计数据失败:', err);
      // 失败时使用默认数据
      if (app.globalData.isDemo) {
        this.setData({
          stats: { todayMembers: 0, todayTransactions: 0, todayIncome: '0.00', totalMembers: 0 }
        });
      }
    }
  },

  // 加载最近会员
  async loadRecentMembers() {
    try {
      const shopInfo = this.data.shopInfo;
      if (!shopInfo) return;

      // 演示模式：使用模拟数据 - 显示完整电话
      if (app.globalData.isDemo || !app.globalData.cloudReady) {
        this.setData({
          recentMembers: [
            { _id: '1', name: '张三', phone: '13888888888', balance: '256.00' },
            { _id: '2', name: '李四', phone: '13966666666', balance: '180.50' },
            { _id: '3', name: '王五', phone: '13755555555', balance: '99.00' }
          ]
        });
        return;
      }

      const res = await api.memberApi.getList(shopInfo._id, { limit: 5 });
      if (res.success) {
        const members = (res.data || []).map(item => ({
          ...item,
          balance: util.formatMoney(item.balance || 0)
        }));
        this.setData({ recentMembers: members });
      }
    } catch (err) {
      console.error('加载最近会员失败:', err);
    }
  },

  // 检查权限并执行操作
  checkPermissionAndDo(action, callback) {
    const permission = app.checkPermission(action);
    if (permission.allowed) {
      callback();
    } else if (permission.reason === 'NOT_LOGIN') {
      this.goToLogin();
    } else {
      app.showUpgradeModal();
    }
  },

  // 显示解锁提示 - 渐隐式而非弹窗
  showUnlockTip(featureName) {
    wx.showToast({
      title: `${featureName}功能已解锁，点击查看详情`,
      icon: 'none',
      duration: 2500
    });
    // 延迟跳转
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/account/account'
      });
    }, 1500);
  },

  // 添加会员
  handleAddMember() {
    this.checkPermissionAndDo('addMember', () => {
      wx.navigateTo({
        url: '/pages/members/add/add'
      });
    });
  },

  // 储值扣款
  handleTransaction() {
    this.checkPermissionAndDo('deduction', () => {
      wx.navigateTo({
        url: '/pages/transaction/transaction'
      });
    });
  },

  // 发起营销
  handleMarketing() {
    this.checkPermissionAndDo('marketing', () => {
      wx.navigateTo({
        url: '/pages/marketing/marketing'
      });
    });
  },

  // 优惠券
  handleCoupon() {
    this.checkPermissionAndDo('marketing', () => {
      wx.navigateTo({
        url: '/pages/coupon/coupon'
      });
    });
  },

  // 数据分析
  handleDataAnalysis() {
    this.checkPermissionAndDo('dataAnalysis', () => {
      wx.navigateTo({
        url: '/pages/data/data'
      });
    });
  },

  // 跳转到登录页
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 跳转到会员列表
  goToMembers() {
    wx.switchTab({
      url: '/pages/members/members'
    });
  },

  // 跳转到消息记录
  goToMessages() {
    wx.navigateTo({
      url: '/pages/messages/messages'
    });
  },

  // 跳转到设置
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 跳转到付费页面
  goToPayment() {
    wx.switchTab({
      url: '/pages/account/account'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  }
});
