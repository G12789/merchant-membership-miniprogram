// pages/account/account.js
const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/api.js');

Page({
  data: {
    shopInfo: null,
    membershipStatus: 'trial',
    statusText: '试用中',
    statusClass: 'trial',
    expireText: '',
    isExpired: false,
    remainingDays: 12,
    trialProgress: 100,
    showPlans: true,  // 直接展示套餐
    selectedPlan: '',  // 默认不选中
    showUpgradeModal: false,  // 升级弹窗
    planPrices: {
      monthly: 8,
      quarterly: 24,
      yearly: 96
    },
    editingNotice: '',
    paymentHistory: []
  },

  onLoad() {
    this.initPage();
  },

  onShow() {
    this.refreshData();
  },

  // 初始化页面
  initPage() {
    const shopInfo = app.globalData.shopInfo;
    if (shopInfo) {
      this.setData({ shopInfo });
      this.updateStatus();
      this.loadPaymentHistory();
    }
  },

  // 刷新数据
  refreshData() {
    const shopInfo = app.globalData.shopInfo;
    if (shopInfo) {
      this.setData({ shopInfo });
      this.updateStatus();
      this.loadPaymentHistory();
    }
  },

  // 更新会员状态显示
  updateStatus() {
    const shopInfo = this.data.shopInfo;
    if (!shopInfo) return;

    const { membershipStatus, trialEndTime, membershipExpireTime } = shopInfo;
    const now = new Date();
    let statusText = '';
    let statusClass = 'trial';
    let expireText = '';
    let isExpired = false;
    let remainingDays = 0;
    let trialProgress = 0;

    if (membershipStatus === 'trial') {
      const endTime = new Date(trialEndTime);
      isExpired = endTime < now;
      
      if (isExpired) {
        statusText = '试用已过期';
        statusClass = 'expired';
        expireText = '部分功能已锁定，请升级会员';
      } else {
        statusText = '试用中';
        statusClass = 'trial';
        remainingDays = util.getRemainingDays(trialEndTime);
        // 计算进度（12天为总时长）
        trialProgress = Math.max(0, Math.min(100, (remainingDays / 12) * 100));
        expireText = `试用期至 ${util.formatDate(trialEndTime, 'YYYY-MM-DD')}`;
      }
    } else if (membershipStatus === 'expired') {
      statusText = '已过期';
      statusClass = 'expired';
      expireText = '请升级会员继续使用';
      isExpired = true;
    } else if (membershipStatus === 'permanent') {
      statusText = '永久会员';
      statusClass = 'permanent';
      expireText = '感谢您的支持！';
      isExpired = false;
    } else {
      // 付费会员（monthly, quarterly, yearly）
      const endTime = new Date(membershipExpireTime);
      isExpired = endTime < now;
      
      if (isExpired) {
        statusText = '会员已过期';
        statusClass = 'expired';
        expireText = '请续费继续使用';
      } else {
        statusText = util.getMembershipStatusText(membershipStatus);
        statusClass = 'paid';
        expireText = `有效期至 ${util.formatDate(membershipExpireTime, 'YYYY-MM-DD')}`;
        remainingDays = util.getRemainingDays(membershipExpireTime);
      }
    }

    this.setData({
      membershipStatus,
      statusText,
      statusClass,
      expireText,
      isExpired,
      remainingDays,
      trialProgress
    });
  },

  // 加载付费记录
  async loadPaymentHistory() {
    try {
      const shopInfo = this.data.shopInfo;
      if (!shopInfo) return;

      // 演示模式：使用模拟数据
      if (app.globalData.isDemo || !app.globalData.cloudReady) {
        this.setData({ paymentHistory: [] });
        return;
      }

      const res = await api.paymentApi.getHistory(shopInfo._id);
      if (res.success && res.data) {
        const history = res.data.map(item => ({
          ...item,
          planText: this.getPlanText(item.planType),
          createTimeText: util.formatDate(item.createTime, 'YYYY-MM-DD HH:mm'),
          statusText: item.status === 'success' ? '支付成功' : '处理中'
        }));
        this.setData({ paymentHistory: history });
      }
    } catch (err) {
      console.error('加载付费记录失败:', err);
    }
  },

  // 获取套餐文字
  getPlanText(planType) {
    const planTexts = {
      monthly: '月卡',
      quarterly: '季卡',
      yearly: '年卡'
    };
    return planTexts[planType] || '未知';
  },

  // 选择套餐
  selectPlan(e) {
    const plan = e.currentTarget.dataset.plan;
    this.setData({ selectedPlan: plan });
  },

  // 滚动到套餐区域 - 改为开启弹窗
  scrollToPlans() {
    this.showUpgradePopup();
  },

  // 显示升级弹窗
  showUpgradePopup() {
    this.setData({
      showUpgradeModal: true,
      selectedPlan: ''  // 重置选中状态
    });
  },

  // 隐藏升级弹窗
  hideUpgradePopup() {
    this.setData({
      showUpgradeModal: false,
      selectedPlan: ''  // 关闭时清空选中状态
    });
  },

  // 购买短信
  buySms() {
    if (app.globalData.isDemo) {
      wx.showToast({
        title: '演示模式暂不支持',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/sms/buy'
    });
  },

  // 修改头像
  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 演示模式直接更新本地
        if (app.globalData.isDemo) {
          const shopInfo = this.data.shopInfo;
          shopInfo.avatarUrl = tempFilePath;
          this.setData({ shopInfo });
          app.globalData.shopInfo = shopInfo;
          wx.setStorageSync('shopInfo', shopInfo);
          wx.showToast({ title: '头像已更新', icon: 'success' });
        }
      }
    });
  },

  // 编辑店铺名称
  editShopName() {
    const shopInfo = this.data.shopInfo;
    wx.showModal({
      title: '修改店铺名称',
      editable: true,
      placeholderText: '请输入店铺名称',
      content: shopInfo.name || '',
      success: (res) => {
        if (res.confirm && res.content) {
          shopInfo.name = res.content;
          this.setData({ shopInfo });
          app.globalData.shopInfo = shopInfo;
          wx.setStorageSync('shopInfo', shopInfo);
        }
      }
    });
  },

  // 编辑店铺电话
  editShopPhone() {
    const shopInfo = this.data.shopInfo;
    wx.showModal({
      title: '修改店铺电话',
      editable: true,
      placeholderText: '请输入手机号',
      content: shopInfo.phone || '',
      success: (res) => {
        if (res.confirm && res.content) {
          shopInfo.phone = res.content;
          this.setData({ shopInfo });
          app.globalData.shopInfo = shopInfo;
          wx.setStorageSync('shopInfo', shopInfo);
        }
      }
    });
  },

  // 上传营业执照
  uploadLicense() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        const shopInfo = this.data.shopInfo;
        shopInfo.licenseUrl = tempFilePath;
        this.setData({ shopInfo });
        app.globalData.shopInfo = shopInfo;
        wx.setStorageSync('shopInfo', shopInfo);
        wx.showToast({ title: '上传成功', icon: 'success' });
      }
    });
  },

  // 编辑位置
  editLocation() {
    wx.chooseLocation({
      success: (res) => {
        const shopInfo = this.data.shopInfo;
        shopInfo.address = res.address;
        shopInfo.latitude = res.latitude;
        shopInfo.longitude = res.longitude;
        this.setData({ shopInfo });
        app.globalData.shopInfo = shopInfo;
        wx.setStorageSync('shopInfo', shopInfo);
      }
    });
  },

  // 公告输入
  onNoticeInput(e) {
    const shopInfo = this.data.shopInfo;
    shopInfo.notice = e.detail.value;
    this.setData({ shopInfo });
  },

  // 群发短信
  sendSms() {
    if (app.globalData.isDemo) {
      wx.showToast({
        title: '演示模式暂不支持',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '/pages/sms/send'
    });
  },

  // 保存修改
  saveChanges() {
    const shopInfo = this.data.shopInfo;
    app.globalData.shopInfo = shopInfo;
    wx.setStorageSync('shopInfo', shopInfo);
    
    // 如果不是演示模式，同步到云端
    if (!app.globalData.isDemo && app.globalData.cloudReady) {
      // TODO: 调用云函数更新
    }
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 切换店铺
  switchShop() {
    wx.showToast({
      title: '暂不支持多店',
      icon: 'none'
    });
  },

  // 处理支付
  async handlePayment() {
    const { selectedPlan, planPrices, shopInfo } = this.data;
    
    if (!shopInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (!selectedPlan) {
      wx.showToast({
        title: '请选择套餐',
        icon: 'none'
      });
      return;
    }

    // 演示模式：显示提示
    if (app.globalData.isDemo || !app.globalData.cloudReady) {
      wx.showModal({
        title: '演示模式',
        content: '当前为演示模式，支付功能需要配置云开发环境后才能使用。\n\n请在微信开发者工具中开通云开发，并修改app.js中的云环境ID。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    try {
      wx.showLoading({ title: '创建订单...', mask: true });

      // 调用云函数创建支付订单
      const res = await wx.cloud.callFunction({
        name: 'createPaymentOrder',
        data: {
          shopId: shopInfo._id,
          planType: selectedPlan,
          amount: planPrices[selectedPlan]
        }
      });

      wx.hideLoading();

      if (res.result && res.result.success) {
        const { payment } = res.result.data;
        
        // 发起微信支付
        wx.requestPayment({
          ...payment,
          success: async (payRes) => {
            // 支付成功
            this.hideUpgradePopup();  // 关闭弹窗
            wx.showToast({
              title: '支付成功',
              icon: 'success'
            });
            
            // 刷新商户信息
            await app.refreshShopInfo(shopInfo._id);
            this.refreshData();
          },
          fail: (payErr) => {
            if (payErr.errMsg.indexOf('cancel') === -1) {
              wx.showToast({
                title: '支付失败',
                icon: 'error'
              });
            }
          }
        });
      } else {
        throw new Error(res.result?.message || '创建订单失败');
      }
    } catch (err) {
      wx.hideLoading();
      console.error('支付失败:', err);
      wx.showToast({
        title: err.message || '支付失败',
        icon: 'none'
      });
    }
  },

  // 跳转登录
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 跳转设置
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    });
  },

  // 跳转帮助中心
  goToHelp() {
    wx.navigateTo({
      url: '/pages/help/help'
    });
  },

  // 跳转关于我们
  goToAbout() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('shopInfo');
          // 清除全局数据
          app.globalData.shopInfo = null;
          // 更新页面
          this.setData({
            shopInfo: null,
            paymentHistory: []
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshData();
    wx.stopPullDownRefresh();
  }
});
