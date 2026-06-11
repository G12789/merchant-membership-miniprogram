// pages/members/add/add.js
const app = getApp();
const util = require('../../../utils/util.js');
const api = require('../../../utils/api.js');

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      gender: 'unknown',
      birthday: '',
      initialBalance: '',
      remark: ''
    },
    submitting: false
  },

  onLoad() {
    // 检查权限
    this.checkPermission();
  },

  // 检查权限
  checkPermission() {
    const permission = app.checkPermission('addMember');
    if (!permission.allowed) {
      wx.showModal({
        title: '功能受限',
        content: '此功能需要升级为付费会员后使用',
        confirmText: '去升级',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/account/account'
            });
          } else {
            wx.navigateBack();
          }
        }
      });
    }
  },

  // 输入变化
  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({
      [`formData.${field}`]: value
    });
  },

  // 选择性别
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'formData.gender': gender
    });
  },

  // 生日选择
  onBirthdayChange(e) {
    this.setData({
      'formData.birthday': e.detail.value
    });
  },

  // 表单验证
  validateForm() {
    const { name, phone } = this.data.formData;
    
    if (!name.trim()) {
      util.showToast('请输入会员姓名');
      return false;
    }
    
    if (!phone.trim()) {
      util.showToast('请输入手机号码');
      return false;
    }
    
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      util.showToast('请输入正确的手机号码');
      return false;
    }
    
    return true;
  },

  // 提交表单
  async handleSubmit() {
    if (!this.validateForm()) return;
    if (this.data.submitting) return;

    this.setData({ submitting: true });

    try {
      const shopInfo = app.globalData.shopInfo;
      if (!shopInfo) {
        throw new Error('请先登录');
      }

      const { formData } = this.data;
      const res = await api.memberApi.add(shopInfo._id, {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        gender: formData.gender,
        birthday: formData.birthday || null,
        balance: formData.initialBalance ? util.toFen(formData.initialBalance) : 0,
        remark: formData.remark.trim()
      });

      if (res.success) {
        util.showSuccess('添加成功');
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      } else {
        throw new Error(res.message || '添加失败');
      }
    } catch (err) {
      console.error('添加会员失败:', err);
      util.showError(err.message || '添加失败');
    } finally {
      this.setData({ submitting: false });
    }
  }
});
