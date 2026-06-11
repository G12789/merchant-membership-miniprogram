// pages/login/login.js
const app = getApp();
const util = require('../../utils/util.js');

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      code: ''
    },
    showCode: false,
    codeSending: false,
    codeText: '获取验证码',
    countdown: 60,
    agreed: false,
    submitting: false
  },

  onLoad() {},

  // 输入变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 发送验证码
  async sendCode() {
    const { phone } = this.data.formData;
    
    if (!phone.trim()) {
      util.showToast('请输入手机号码');
      return;
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      util.showToast('请输入正确的手机号码');
      return;
    }

    if (this.data.codeSending) return;

    // 演示模式：直接模拟发送成功
    if (app.globalData.isDemo) {
      this.setData({ codeSending: true, codeText: '发送中...' });
      setTimeout(() => {
        this.startCountdown();
        this.setData({ showCode: true });
        util.showSuccess('演示模式：验证码为 123456');
      }, 500);
      return;
    }

    try {
      this.setData({ codeSending: true, codeText: '发送中...' });
      
      // 调用发送验证码云函数
      await wx.cloud.callFunction({
        name: 'sendSmsCode',
        data: { phone }
      });

      // 开始倒计时
      this.startCountdown();
      this.setData({ showCode: true });
      util.showSuccess('验证码已发送');
    } catch (err) {
      console.error('发送验证码失败:', err);
      util.showError('发送失败');
      this.setData({ codeSending: false, codeText: '获取验证码' });
    }
  },

  // 倒计时
  startCountdown() {
    let countdown = 60;
    this.setData({ countdown, codeText: `${countdown}s` });
    
    this.timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(this.timer);
        this.setData({ codeSending: false, codeText: '重新获取' });
      } else {
        this.setData({ codeText: `${countdown}s` });
      }
    }, 1000);
  },

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({ agreed: !this.data.agreed });
  },

  // 显示用户协议
  showAgreement() {
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=user'
    });
  },

  // 显示隐私政策
  showPrivacy() {
    wx.navigateTo({
      url: '/pages/agreement/agreement?type=privacy'
    });
  },

  // 处理登录
  async handleLogin() {
    const { formData, agreed } = this.data;
    
    if (!agreed) {
      util.showToast('请先同意用户协议');
      return;
    }
    
    if (!formData.name.trim()) {
      util.showToast('请输入店铺名称');
      return;
    }
    
    if (!formData.phone.trim()) {
      util.showToast('请输入联系电话');
      return;
    }
    
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      util.showToast('请输入正确的手机号码');
      return;
    }

    if (this.data.submitting) return;

    this.setData({ submitting: true });

    try {
      let shopInfo;
      
      // 演示模式：直接使用本地模拟数据
      if (app.globalData.isDemo) {
        console.log('🚨 演示模式登录');
        shopInfo = app.createDemoShop(formData.name.trim(), formData.phone.trim());
      } else if (app.globalData.cloudReady) {
        // 调用注册/登录云函数
        const res = await wx.cloud.callFunction({
          name: 'shopRegister',
          data: {
            name: formData.name.trim(),
            phone: formData.phone.trim()
          }
        });

        if (res.result && res.result.success) {
          shopInfo = res.result.data;
        } else {
          throw new Error(res.result?.message || '登录失败');
        }
      } else {
        // 云开发未配置，使用演示模式
        console.log('云开发未配置，使用演示模式');
        shopInfo = app.createDemoShop(formData.name.trim(), formData.phone.trim());
        app.globalData.isDemo = true;
      }
      
      // 保存到本地和全局
      wx.setStorageSync('shopInfo', shopInfo);
      app.globalData.shopInfo = shopInfo;
      
      util.showSuccess('登录成功');
      
      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
    } catch (err) {
      console.error('登录失败:', err);
      util.showError(err.message || '登录失败');
    } finally {
      this.setData({ submitting: false });
    }
  },

  // 微信一键登录
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      return;
    }

    if (!this.data.agreed) {
      util.showToast('请先同意用户协议');
      return;
    }

    // 演示模式：提示用户使用普通登录
    if (app.globalData.isDemo) {
      wx.showModal({
        title: '演示模式',
        content: '微信一键登录需要配置云开发环境。\n请使用上方的「登录/注册」按钮进行演示。',
        showCancel: false,
        confirmText: '我知道了'
      });
      return;
    }

    try {
      util.showLoading('登录中...');
      
      // 调用云函数获取手机号并登录
      const res = await wx.cloud.callFunction({
        name: 'wechatLogin',
        data: {
          cloudID: e.detail.cloudID
        }
      });

      util.hideLoading();

      if (res.result && res.result.success) {
        const shopInfo = res.result.data;
        
        // 保存到本地和全局
        wx.setStorageSync('shopInfo', shopInfo);
        app.globalData.shopInfo = shopInfo;
        
        util.showSuccess('登录成功');
        
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        throw new Error(res.result?.message || '登录失败');
      }
    } catch (err) {
      util.hideLoading();
      console.error('微信登录失败:', err);
      util.showError('登录失败');
    }
  },

  onUnload() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
});
