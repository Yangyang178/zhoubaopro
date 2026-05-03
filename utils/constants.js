/**
 * 公共常量定义
 * 
 * 统一管理项目中使用的常量，避免重复定义
 * 在 index.js 和 history.js 等多个页面中共享使用
 */

// 岗位配置映射表
const POSITION_MAP = {
  'frontend': '前端工程师',
  'backend': '后端工程师',
  'product': '产品经理',
  'operation': '运营',
  'designer': '设计师',
  'general': '通用'
}

// 岗位列表（用于渲染选择器）
const POSITION_LIST = [
  { id: 'frontend', name: '前端工程师' },
  { id: 'backend', name: '后端工程师' },
  { id: 'product', name: '产品经理' },
  { id: 'operation', name: '运营' },
  { id: 'designer', name: '设计师' },
  { id: 'general', name: '通用' }
]

// API 配置
const API_CONFIG = {
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com/v1/chat/completions',
  DEEPSEEK_MODEL: 'deepseek-chat',
  REQUEST_TIMEOUT: 60000, // 60秒超时
}

// AI 参数配置
const AI_PARAMS = {
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 0.85,
  frequency_penalty: 0.4,
  presence_penalty: 0.5
}

// 每日生成次数限制
const USAGE_LIMIT = {
  DAILY_LIMIT: 5, // 免费用户每日限制
  MEMBER_LIMIT: Infinity, // 会员无限制
  COOLDOWN_TIME: 2000 // 防止频繁调用冷却时间(ms)
}

// 存储键名
const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  DAILY_USAGE: 'dailyUsage',
  REPORT_HISTORY: 'reportHistory'
}

module.exports = {
  POSITION_MAP,
  POSITION_LIST,
  API_CONFIG,
  AI_PARAMS,
  USAGE_LIMIT,
  STORAGE_KEYS
}
