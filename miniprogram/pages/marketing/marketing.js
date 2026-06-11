// pages/marketing/marketing.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    isExpired: false
  },

  onLoad() {
    this.checkPermission();
  },

  onShow() {
    this.checkPermission();
  },

  checkPermission() {
    const shopInfo = app.globalData.shopInfo;
    const isExpired = util.isExpired(shopInfo);
    this.setData({ isExpired });

    if (isExpired) {
      // 不直接返回，允许查看页面但功能受限
    }
  },

  createActivity(e) {
    if (this.data.isExpired) {
      app.showUpgradeModal();
      return;
    }

    const type = e.currentTarget.dataset.type;
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  goToPayment() {
    wx.switchTab({
      url: '/pages/account/account'
    });
  }
});
