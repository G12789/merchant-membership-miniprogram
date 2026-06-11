/**
 * 工具函数模块
 */

// 格式化日期
const formatDate = (date, format = 'YYYY-MM-DD') => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

// 计算剩余天数
const getRemainingDays = (endTime) => {
  if (!endTime) return 0;
  const now = new Date();
  const end = new Date(endTime);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// 获取会员状态文本
const getMembershipStatusText = (status) => {
  const statusMap = {
    'trial': '试用中',
    'monthly': '月卡会员',
    'quarterly': '季卡会员',
    'yearly': '年卡会员',
    'permanent': '永久会员',
    'expired': '已过期'
  };
  return statusMap[status] || '未知';
};

// 获取会员状态颜色
const getMembershipStatusColor = (status) => {
  const colorMap = {
    'trial': '#1890ff',
    'monthly': '#52c41a',
    'quarterly': '#52c41a',
    'yearly': '#52c41a',
    'permanent': '#722ed1',
    'expired': '#f5222d'
  };
  return colorMap[status] || '#999';
};

// 检查是否过期
const isExpired = (shopInfo) => {
  if (!shopInfo) return true;
  
  const { membershipStatus, trialEndTime, membershipExpireTime } = shopInfo;
  const now = new Date();
  
  if (membershipStatus === 'trial') {
    return new Date(trialEndTime) < now;
  } else if (membershipStatus === 'expired') {
    return true;
  } else if (membershipStatus === 'permanent') {
    return false;
  } else if (membershipExpireTime) {
    return new Date(membershipExpireTime) < now;
  }
  
  return true;
};

// 防抖函数
const debounce = (func, wait = 500) => {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
};

// 节流函数
const throttle = (func, limit = 1000) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// 显示加载中
const showLoading = (title = '加载中...') => {
  wx.showLoading({
    title,
    mask: true
  });
};

// 隐藏加载
const hideLoading = () => {
  wx.hideLoading();
};

// 显示成功提示
const showSuccess = (title) => {
  wx.showToast({
    title,
    icon: 'success',
    duration: 2000
  });
};

// 显示错误提示
const showError = (title) => {
  wx.showToast({
    title,
    icon: 'error',
    duration: 2000
  });
};

// 显示普通提示
const showToast = (title) => {
  wx.showToast({
    title,
    icon: 'none',
    duration: 2000
  });
};

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// 金额格式化（分转元）
const formatMoney = (amount) => {
  if (typeof amount !== 'number') return '0.00';
  return (amount / 100).toFixed(2);
};

// 金额转换（元转分）
const toFen = (yuan) => {
  return Math.round(parseFloat(yuan) * 100);
};

// 手机号脱敏
const maskPhone = (phone) => {
  if (!phone || phone.length !== 11) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

module.exports = {
  formatDate,
  getRemainingDays,
  getMembershipStatusText,
  getMembershipStatusColor,
  isExpired,
  debounce,
  throttle,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showToast,
  generateId,
  formatMoney,
  toFen,
  maskPhone
};
