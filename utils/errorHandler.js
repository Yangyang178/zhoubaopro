/**
 * 统一错误处理工具
 * 
 * 提供标准化的错误分类、处理和用户提示
 */

/**
 * 错误类型枚举
 */
const ERROR_TYPES = {
  TIMEOUT: 'TIMEOUT',
  NETWORK: 'NETWORK',
  API_ERROR: 'API_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  USAGE_LIMIT: 'USAGE_LIMIT',
  UNKNOWN: 'UNKNOWN'
}

/**
 * 错误配置映射表
 */
const ERROR_CONFIG = {
  [ERROR_TYPES.TIMEOUT]: {
    title: '⏰ 请求超时',
    content: 'AI服务响应较慢，可能是网络拥堵或服务器繁忙\n\n建议：\n1. 稍后重试（建议等待10秒）\n2. 简化输入内容后重试'
  },
  [ERROR_TYPES.NETWORK]: {
    title: '🌐 网络连接失败',
    content: '无法连接到DeepSeek服务器\n\n建议：\n1. 检查手机网络（WiFi/4G/5G）\n2. 切换网络后重试\n3. 确认"不校验合法域名"已开启（本地调试）'
  },
  [ERROR_TYPES.API_ERROR]: {
    title: '🔑 API配置异常',
    content: 'DeepSeek API Key无效或余额不足\n\n请检查：\n1. API Key是否正确\n2. 账户余额是否充足\n3. 访问 https://platform.deepseek.com 查看状态'
  },
  [ERROR_TYPES.AUTH_ERROR]: {
    title: '🔒 认证失败',
    content: '身份验证失败，请重新登录'
  },
  [ERROR_TYPES.USAGE_LIMIT]: {
    title: '⚠️ 使用次数限制',
    content: null // 由调用方自定义内容
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: '⚠️ 生成失败',
    content: null // 动态生成
  }
}

/**
 * 根据错误信息分类错误类型
 * @param {string} errorMessage - 错误消息
 * @returns {string} 错误类型
 */
function classifyError(errorMessage) {
  if (!errorMessage) return ERROR_TYPES.UNKNOWN

  const msg = errorMessage.toLowerCase()

  // 超时类错误
  if (msg.includes('timeout') || msg.includes('超时')) {
    return ERROR_TYPES.TIMEOUT
  }

  // 网络连接失败
  if (msg.includes('request:fail') || msg.includes('无法连接') || msg.includes('network')) {
    return ERROR_TYPES.NETWORK
  }

  // API 配置错误
  if (msg.includes('api错误') || msg.includes('invalid_api_key') || msg.includes('api error')) {
    return ERROR_TYPES.API_ERROR
  }

  // 认证错误
  if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('401')) {
    return ERROR_TYPES.AUTH_ERROR
  }

  // 使用次数限制
  if (msg.includes('每日生成次数') || msg.includes('usage limit')) {
    return ERROR_TYPES.USAGE_LIMIT
  }

  return ERROR_TYPES.UNKNOWN
}

/**
 * 获取错误提示信息
 * @param {Error|string} error - 错误对象或错误消息
 * @param {Object} [options] - 可选配置
 * @param {boolean} [options.showModal=true] - 是否显示弹窗
 * @param {string} [options.customContent] - 自定义错误内容
 * @returns {Object} 格式化后的错误信息 { title, content, type }
 */
function getErrorInfo(error, options = {}) {
  const errorMessage = error.message || error || '未知错误'
  const errorType = classifyError(errorMessage)
  const config = ERROR_CONFIG[errorType]

  let content = options.customContent || config.content

  // 未知错误使用原始错误信息
  if (errorType === ERROR_TYPES.UNKNOWN && !content) {
    content = `${errorMessage}\n\n可能原因：\n1. 网络连接不稳定\n2. DeepSeek服务暂时不可用\n3. API Key配置问题`
  }

  return {
    title: config.title,
    content: content,
    type: errorType,
    originalMessage: errorMessage
  }
}

/**
 * 显示错误提示（自动选择 Toast 或 Modal）
 * @param {Error|string} error - 错误对象或错误消息
 * @param {Object} [options] - 可选配置
 * @param {boolean} [options.showModal=true] - 是否显示模态框（否则显示Toast）
 * @param {Function} [options.onConfirm] - 确认回调
 * @param {string} [options.confirmText='重试'] - 确认按钮文字
 */
function showError(error, options = {}) {
  const {
    showModal = true,
    onConfirm,
    confirmText = '重试'
  } = options

  const errorInfo = getErrorInfo(error)

  console.error('=== 错误提示 ===')
  console.error(`类型: ${errorInfo.type}`)
  console.error(`标题: ${errorInfo.title}`)
  console.error(`内容: ${errorInfo.content}`)
  console.error(`原始: ${errorInfo.originalMessage}`)

  if (showModal && errorInfo.content) {
    wx.showModal({
      title: errorInfo.title,
      content: errorInfo.content,
      showCancel: true,
      cancelText: '取消',
      confirmText: confirmText,
      success: (res) => {
        if (res.confirm && onConfirm) {
          onConfirm()
        }
      }
    })
  } else {
    wx.showToast({
      title: errorInfo.title.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, ''), // 移除emoji用于toast
      icon: 'none',
      duration: 2000
    })
  }
}

/**
 * 显示成功提示
 * @param {string} message - 成功消息
 * @param {number} [duration=1500] - 显示时长(ms)
 */
function showSuccess(message, duration = 1500) {
  wx.showToast({
    title: message,
    icon: 'success',
    duration: duration
  })

  // 轻微震动反馈
  wx.vibrateShort({ type: 'light' })
}

module.exports = {
  ERROR_TYPES,
  ERROR_CONFIG,
  classifyError,
  getErrorInfo,
  showError,
  showSuccess
}
