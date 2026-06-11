/**
 * API请求封装
 */

// 云函数调用封装
const callCloud = async (name, data = {}) => {
  try {
    wx.showLoading({ title: '加载中...', mask: true });
    const res = await wx.cloud.callFunction({ name, data });
    wx.hideLoading();
    
    if (res.result && res.result.success) {
      return res.result;
    } else {
      const errMsg = res.result?.message || '请求失败';
      throw new Error(errMsg);
    }
  } catch (err) {
    wx.hideLoading();
    console.error(`调用云函数${name}失败:`, err);
    throw err;
  }
};

// 静默调用（不显示loading）
const callCloudSilent = async (name, data = {}) => {
  try {
    const res = await wx.cloud.callFunction({ name, data });
    if (res.result && res.result.success) {
      return res.result;
    } else {
      throw new Error(res.result?.message || '请求失败');
    }
  } catch (err) {
    console.error(`静默调用云函数${name}失败:`, err);
    throw err;
  }
};

// 商户相关API
const shopApi = {
  // 商户注册
  register: (data) => callCloud('shopRegister', data),
  
  // 获取商户信息
  getInfo: (shopId) => callCloud('getShopInfo', { shopId }),
  
  // 更新商户信息
  update: (shopId, data) => callCloud('updateShopInfo', { shopId, ...data }),
  
  // 检查权限
  checkPermission: (shopId, action) => callCloud('checkPermission', { shopId, action })
};

// 会员相关API
const memberApi = {
  // 获取会员列表
  getList: (shopId, params = {}) => callCloud('getMemberList', { shopId, ...params }),
  
  // 添加会员
  add: (shopId, data) => callCloud('addMember', { shopId, ...data }),
  
  // 获取会员详情
  getDetail: (shopId, memberId) => callCloud('getMemberDetail', { shopId, memberId }),
  
  // 更新会员信息
  update: (shopId, memberId, data) => callCloud('updateMember', { shopId, memberId, ...data }),
  
  // 删除会员
  delete: (shopId, memberId) => callCloud('deleteMember', { shopId, memberId })
};

// 交易相关API
const transactionApi = {
  // 获取交易记录
  getList: (shopId, params = {}) => callCloud('getTransactionList', { shopId, ...params }),
  
  // 储值
  recharge: (shopId, memberId, amount) => callCloud('memberRecharge', { shopId, memberId, amount }),
  
  // 扣款
  deduct: (shopId, memberId, amount, remark) => callCloud('memberDeduct', { shopId, memberId, amount, remark })
};

// 支付相关API
const paymentApi = {
  // 创建支付订单
  createOrder: (shopId, planType) => callCloud('createPaymentOrder', { shopId, planType }),
  
  // 获取支付记录
  getHistory: (shopId) => callCloud('getPaymentHistory', { shopId })
};

// 数据统计API
const statsApi = {
  // 获取统计概览
  getOverview: (shopId) => callCloudSilent('getStatsOverview', { shopId }),
  
  // 获取详细统计
  getDetail: (shopId, type, startDate, endDate) => callCloud('getStatsDetail', { shopId, type, startDate, endDate })
};

module.exports = {
  callCloud,
  callCloudSilent,
  shopApi,
  memberApi,
  transactionApi,
  paymentApi,
  statsApi
};
