// pages/members/members.js
const app = getApp();
const util = require('../../utils/util.js');
const api = require('../../utils/api.js');

Page({
  data: {
    searchKeyword: '',
    filterStatus: 'all',  // 筛选状态: all, active, recent
    memberList: [],
    totalCount: 0,
    todayCount: 0,
    totalBalance: '0.00',
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    pageSize: 20,
    isExpired: false
  },

  onLoad() {
    this.checkExpiredStatus();
  },

  onShow() {
    this.loadMembers(true);
    this.loadStats();
  },

  // 检查过期状态
  checkExpiredStatus() {
    const shopInfo = app.globalData.shopInfo;
    const isExpired = util.isExpired(shopInfo);
    this.setData({ isExpired });
  },

  // 加载会员列表
  async loadMembers(refresh = false) {
    const shopInfo = app.globalData.shopInfo;
    if (!shopInfo) return;

    if (refresh) {
      this.setData({ page: 1, hasMore: true, memberList: [] });
    }

    if (this.data.loading || (!refresh && !this.data.hasMore)) return;

    this.setData({ loading: true });

    try {
      // 演示模式：使用模拟数据
      if (app.globalData.isDemo || !app.globalData.cloudReady) {
        const demoMembers = [
          { _id: '1', name: '张三', phone: '13888888888', gender: 'male', balance: 25600, createTime: new Date().toISOString() },
          { _id: '2', name: '李四', phone: '13966666666', gender: 'male', balance: 18050, createTime: new Date().toISOString() },
          { _id: '3', name: '王芳', phone: '13755555555', gender: 'female', balance: 9900, createTime: new Date().toISOString() },
          { _id: '4', name: '赵六', phone: '13644444444', gender: 'male', balance: 5000, createTime: new Date().toISOString() },
          { _id: '5', name: '孙七', phone: '13533333333', gender: 'female', balance: 12000, createTime: new Date().toISOString() }
        ];
        const memberList = demoMembers.map(item => ({
          ...item,
          createTimeText: util.formatDate(item.createTime, 'YYYY-MM-DD'),
          balance: util.formatMoney(item.balance || 0)
        }));
        this.setData({ memberList, hasMore: false, loading: false, loadingMore: false });
        return;
      }

      const res = await api.memberApi.getList(shopInfo._id, {
        keyword: this.data.searchKeyword,
        page: this.data.page,
        pageSize: this.data.pageSize
      });

      if (res.success) {
        const newList = (res.data || []).map(item => ({
          ...item,
          createTimeText: util.formatDate(item.createTime, 'YYYY-MM-DD'),
          balance: util.formatMoney(item.balance || 0)
        }));

        const memberList = refresh ? newList : [...this.data.memberList, ...newList];
        const hasMore = newList.length >= this.data.pageSize;

        this.setData({
          memberList,
          hasMore,
          page: this.data.page + 1
        });
      }
    } catch (err) {
      console.error('加载会员列表失败:', err);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false, loadingMore: false });
    }
  },

  // 加载统计数据
  async loadStats() {
    const shopInfo = app.globalData.shopInfo;
    if (!shopInfo) return;

    // 演示模式
    if (app.globalData.isDemo || !app.globalData.cloudReady) {
      this.setData({
        totalCount: 5,
        todayCount: 1,
        totalBalance: '700.50'
      });
      return;
    }

    try {
      const res = await api.statsApi.getOverview(shopInfo._id);
      if (res.success && res.data) {
        this.setData({
          totalCount: res.data.stats?.totalMembers || 0,
          todayCount: res.data.stats?.todayMembers || 0,
          totalBalance: res.data.stats?.totalBalance || '0.00'
        });
      }
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  },

  // 搜索输入
  onSearchInput: util.debounce(function(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.loadMembers(true);
  }, 500),

  // 清除搜索
  clearSearch() {
    this.setData({ searchKeyword: '' });
    this.loadMembers(true);
  },

  // 设置筛选状态
  setFilter(e) {
    const status = e.currentTarget.dataset.status;
    if (status === this.data.filterStatus) return;
    this.setData({ filterStatus: status });
    this.loadMembers(true);
  },

  // 加载更多
  loadMore() {
    if (this.data.loadingMore) return;
    this.setData({ loadingMore: true });
    this.loadMembers();
  },

  // 跳转到会员详情
  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/members/detail/detail?id=${id}`
    });
  },

  // 处理添加会员
  handleAddMember() {
    if (this.data.isExpired) {
      app.showUpgradeModal();
      return;
    }
    this.goToAddMember();
  },

  // 跳转添加会员
  goToAddMember() {
    wx.navigateTo({
      url: '/pages/members/add/add'
    });
  },

  // 跳转付费页面
  goToPayment() {
    wx.switchTab({
      url: '/pages/account/account'
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMembers(true);
    this.loadStats();
    wx.stopPullDownRefresh();
  },

  // 触底加载更多
  onReachBottom() {
    this.loadMore();
  }
});
