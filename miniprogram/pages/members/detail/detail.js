// pages/members/detail/detail.js
const app = getApp();
const util = require('../../../utils/util.js');
const api = require('../../../utils/api.js');

Page({
  data: {
    memberId: '',
    memberInfo: null,
    loading: true,
    transactionList: [],
    transactionLoading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ memberId: options.id });
      this.loadMemberDetail(options.id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onShow() {
    // 刷新数据
    if (this.data.memberId) {
      this.loadMemberDetail(this.data.memberId);
    }
  },

  // 加载会员详情
  async loadMemberDetail(id) {
    this.setData({ loading: true });

    try {
      // 演示模式：使用模拟数据
      if (app.globalData.isDemo || !app.globalData.cloudReady) {
        const demoMembers = {
          '1': { _id: '1', name: '张三', phone: '13888888888', gender: 'male', balance: 25600, birthday: '1990-05-15', remark: '老客户，喜欢促销活动', createTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
          '2': { _id: '2', name: '李四', phone: '13966666666', gender: 'male', balance: 18050, birthday: '1985-08-20', remark: '', createTime: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
          '3': { _id: '3', name: '王芳', phone: '13755555555', gender: 'female', balance: 9900, birthday: '1992-12-01', remark: '偏好下午时段', createTime: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
          '4': { _id: '4', name: '赵六', phone: '13644444444', gender: 'male', balance: 5000, birthday: '', remark: '', createTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
          '5': { _id: '5', name: '孙七', phone: '13533333333', gender: 'female', balance: 12000, birthday: '1995-03-28', remark: '新客户', createTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
        };

        const member = demoMembers[id];
        if (member) {
          const memberInfo = {
            ...member,
            balanceText: util.formatMoney(member.balance || 0),
            genderText: this.getGenderText(member.gender),
            createTimeText: util.formatDate(member.createTime, 'YYYY-MM-DD HH:mm'),
            birthdayText: member.birthday || '未设置'
          };
          this.setData({ memberInfo, loading: false });
          
          // 加载模拟消费记录
          this.loadDemoTransactions(id);
        } else {
          throw new Error('会员不存在');
        }
        return;
      }

      // 真实API调用
      const res = await api.memberApi.getDetail(id);
      if (res.success && res.data) {
        const member = res.data;
        const memberInfo = {
          ...member,
          balanceText: util.formatMoney(member.balance || 0),
          genderText: this.getGenderText(member.gender),
          createTimeText: util.formatDate(member.createTime, 'YYYY-MM-DD HH:mm'),
          birthdayText: member.birthday || '未设置'
        };
        this.setData({ memberInfo, loading: false });
        
        // 加载消费记录
        this.loadTransactions(id);
      } else {
        throw new Error(res.message || '加载失败');
      }
    } catch (err) {
      console.error('加载会员详情失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      });
    }
  },

  // 加载模拟消费记录
  loadDemoTransactions(memberId) {
    const demoTransactions = [
      { _id: 't1', type: 'recharge', amount: 500, balance: 25600, remark: '充值', createTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
      { _id: 't2', type: 'consume', amount: -88, balance: 25100, remark: '消费', createTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
      { _id: 't3', type: 'recharge', amount: 200, balance: 25188, remark: '充值', createTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }
    ];

    const transactionList = demoTransactions.map(item => ({
      ...item,
      amountText: (item.amount > 0 ? '+' : '') + util.formatMoney(item.amount),
      balanceText: util.formatMoney(item.balance),
      typeText: item.type === 'recharge' ? '充值' : '消费',
      createTimeText: util.formatDate(item.createTime, 'MM-DD HH:mm')
    }));

    this.setData({ transactionList });
  },

  // 加载消费记录
  async loadTransactions(memberId) {
    this.setData({ transactionLoading: true });

    try {
      const res = await api.transactionApi.getByMember(memberId);
      if (res.success && res.data) {
        const transactionList = res.data.map(item => ({
          ...item,
          amountText: (item.amount > 0 ? '+' : '') + util.formatMoney(item.amount),
          balanceText: util.formatMoney(item.balance),
          typeText: item.type === 'recharge' ? '充值' : '消费',
          createTimeText: util.formatDate(item.createTime, 'MM-DD HH:mm')
        }));
        this.setData({ transactionList });
      }
    } catch (err) {
      console.error('加载消费记录失败:', err);
    } finally {
      this.setData({ transactionLoading: false });
    }
  },

  // 获取性别文字
  getGenderText(gender) {
    const genderMap = {
      'male': '男',
      'female': '女',
      'unknown': '未知'
    };
    return genderMap[gender] || '未知';
  },

  // 拨打电话
  callPhone() {
    const phone = this.data.memberInfo?.phone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone,
        fail: () => {}
      });
    }
  },

  // 发送短信
  sendSms() {
    const memberInfo = this.data.memberInfo;
    if (!memberInfo) return;

    // 检查权限
    const shopInfo = app.globalData.shopInfo;
    if (util.isExpired(shopInfo)) {
      app.showUpgradeModal();
      return;
    }

    wx.showToast({
      title: '短信功能开发中',
      icon: 'none'
    });
  },

  // 编辑会员
  editMember() {
    const memberInfo = this.data.memberInfo;
    if (!memberInfo) return;

    wx.navigateTo({
      url: `/pages/members/edit/edit?id=${memberInfo._id}`
    });
  },

  // 充值
  recharge() {
    const memberInfo = this.data.memberInfo;
    if (!memberInfo) return;

    wx.showModal({
      title: '会员充值',
      editable: true,
      placeholderText: '请输入充值金额',
      success: async (res) => {
        if (res.confirm && res.content) {
          const amount = parseFloat(res.content);
          if (isNaN(amount) || amount <= 0) {
            wx.showToast({ title: '请输入正确金额', icon: 'none' });
            return;
          }

          // 演示模式
          if (app.globalData.isDemo || !app.globalData.cloudReady) {
            const newBalance = (memberInfo.balance || 0) + amount * 100;
            this.setData({
              'memberInfo.balance': newBalance,
              'memberInfo.balanceText': util.formatMoney(newBalance)
            });
            wx.showToast({ title: '充值成功', icon: 'success' });
            return;
          }

          // 真实充值逻辑
          try {
            wx.showLoading({ title: '处理中...', mask: true });
            const res = await api.transactionApi.recharge(memberInfo._id, amount * 100);
            wx.hideLoading();
            
            if (res.success) {
              wx.showToast({ title: '充值成功', icon: 'success' });
              this.loadMemberDetail(memberInfo._id);
            } else {
              throw new Error(res.message);
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '充值失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 消费
  consume() {
    const memberInfo = this.data.memberInfo;
    if (!memberInfo) return;

    wx.showModal({
      title: '会员消费',
      editable: true,
      placeholderText: '请输入消费金额',
      success: async (res) => {
        if (res.confirm && res.content) {
          const amount = parseFloat(res.content);
          if (isNaN(amount) || amount <= 0) {
            wx.showToast({ title: '请输入正确金额', icon: 'none' });
            return;
          }

          const currentBalance = memberInfo.balance || 0;
          if (amount * 100 > currentBalance) {
            wx.showToast({ title: '余额不足', icon: 'none' });
            return;
          }

          // 演示模式
          if (app.globalData.isDemo || !app.globalData.cloudReady) {
            const newBalance = currentBalance - amount * 100;
            this.setData({
              'memberInfo.balance': newBalance,
              'memberInfo.balanceText': util.formatMoney(newBalance)
            });
            wx.showToast({ title: '消费成功', icon: 'success' });
            return;
          }

          // 真实消费逻辑
          try {
            wx.showLoading({ title: '处理中...', mask: true });
            const res = await api.transactionApi.consume(memberInfo._id, amount * 100);
            wx.hideLoading();
            
            if (res.success) {
              wx.showToast({ title: '消费成功', icon: 'success' });
              this.loadMemberDetail(memberInfo._id);
            } else {
              throw new Error(res.message);
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '消费失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 删除会员
  deleteMember() {
    const memberInfo = this.data.memberInfo;
    if (!memberInfo) return;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除会员「${memberInfo.name}」吗？此操作不可恢复。`,
      confirmColor: '#ee0a24',
      success: async (res) => {
        if (res.confirm) {
          // 演示模式
          if (app.globalData.isDemo || !app.globalData.cloudReady) {
            wx.showToast({ title: '演示模式不支持删除', icon: 'none' });
            return;
          }

          try {
            wx.showLoading({ title: '删除中...', mask: true });
            const res = await api.memberApi.delete(memberInfo._id);
            wx.hideLoading();
            
            if (res.success) {
              wx.showToast({ title: '删除成功', icon: 'success' });
              setTimeout(() => wx.navigateBack(), 1500);
            } else {
              throw new Error(res.message);
            }
          } catch (err) {
            wx.hideLoading();
            wx.showToast({ title: err.message || '删除失败', icon: 'none' });
          }
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    if (this.data.memberId) {
      this.loadMemberDetail(this.data.memberId);
    }
    wx.stopPullDownRefresh();
  }
});
