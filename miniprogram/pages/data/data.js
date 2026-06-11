// pages/data/data.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    isExpired: false,
    stats: {
      totalMembers: 0,
      monthNewMembers: 0,
      totalIncome: '0.00',
      avgConsume: '0.00'
    }
  },

  onLoad() {
    this.checkPermission();
  },

  onShow() {
    this.checkPermission();
    if (!this.data.isExpired) {
      this.loadStats();
    }
  },

  checkPermission() {
    const shopInfo = app.globalData.shopInfo;
    const isExpired = util.isExpired(shopInfo);
    this.setData({ isExpired });
  },

  async loadStats() {
    // 加载统计数据
    try {
      const shopInfo = app.globalData.shopInfo;
      if (!shopInfo) return;
      
      // 这里可以调用详细统计API
      // const res = await api.statsApi.getDetail(shopInfo._id);
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  },

  goToPayment() {
    wx.switchTab({
      url: '/pages/account/account'
    });
  }
});
