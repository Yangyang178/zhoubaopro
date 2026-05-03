/**
 * 数据缓存工具
 * 
 * 提供带过期时间的本地存储缓存功能
 * 减少网络请求，提升页面加载速度
 */

// 默认缓存时间配置（毫秒）
const CACHE_DURATION = {
  SHORT: 5 * 60 * 1000,      // 5分钟 - 临时数据
  MEDIUM: 30 * 60 * 1000,    // 30分钟 - 会话数据
  LONG: 2 * 60 * 60 * 1000,  // 2小时 - 相对稳定的数据
  DAY: 24 * 60 * 60 * 1000   // 24小时 - 每日数据
}

/**
 * 设置缓存数据（带过期时间）
 * @param {string} key - 缓存键名
 * @param {*} data - 要缓存的数据
 * @param {number} [duration=CACHE_DURATION.MEDIUM] - 缓存时长(ms)
 */
function setCache(key, data, duration = CACHE_DURATION.MEDIUM) {
  try {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      expires: Date.now() + duration
    }

    wx.setStorageSync(`cache_${key}`, cacheData)

    console.log(`✅ 缓存已设置: ${key}, 有效期: ${duration / 1000}秒`)
    return true
  } catch (error) {
    console.error('❌ 设置缓存失败:', error)
    return false
  }
}

/**
 * 获取缓存数据
 * @param {string} key - 缓存键名
 * @returns {*|null} 缓存的数据，如果已过期或不存在返回 null
 */
function getCache(key) {
  try {
    const cached = wx.getStorageSync(`cache_${key}`)

    if (!cached) {
      return null
    }

    // 检查是否过期
    if (Date.now() > cached.expires) {
      console.log(`⏰ 缓存已过期: ${key}`)
      removeCache(key)
      return null
    }

    console.log(`✅ 命中缓存: ${key}`)
    return cached.data
  } catch (error) {
    console.error('❌ 读取缓存失败:', error)
    return null
  }
}

/**
 * 移除指定缓存
 * @param {string} key - 缓存键名
 */
function removeCache(key) {
  try {
    wx.removeStorageSync(`cache_${key}`)
    console.log(`🗑️ 缓存已移除: ${key}`)
  } catch (error) {
    console.error('❌ 移除缓存失败:', error)
  }
}

/**
 * 清除所有缓存
 */
function clearAllCache() {
  try {
    const res = wx.getStorageInfoSync()
    const keys = res.keys || []

    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        wx.removeStorageSync(key)
      }
    })

    console.log('🧹 已清除所有缓存')
  } catch (error) {
    console.error('❌ 清除缓存失败:', error)
  }
}

/**
 * 检查缓存是否存在且未过期
 * @param {string} key - 缓存键名
 * @returns {boolean}
 */
function hasValidCache(key) {
  return getCache(key) !== null
}

/**
 * 带缓存的异步数据获取
 * 如果有有效缓存直接返回，否则执行 fetchFn 并缓存结果
 * 
 * @param {string} key - 缓存键名
 * @param {Function} fetchFn - 数据获取函数（返回 Promise）
 * @param {Object} [options] - 可选配置
 * @param {number} [options.duration] - 缓存时长
 * @param {boolean} [options.forceRefresh=false] - 是否强制刷新
 * @returns {Promise<*>} 数据
 */
async function getCachedOrFetch(key, fetchFn, options = {}) {
  const { duration, forceRefresh = false } = options

  // 强制刷新或无缓存时，重新获取
  if (forceRefresh || !hasValidCache(key)) {
    console.log(`🔄 正在获取新数据: ${key}`)
    
    try {
      const data = await fetchFn()
      
      if (data !== undefined && data !== null) {
        setCache(key, data, duration)
      }
      
      return data
    } catch (error) {
      console.error('❌ 获取数据失败:', error)
      
      // 如果获取失败但有旧缓存，返回旧缓存作为降级方案
      const oldCache = getCache(key)
      if (oldCache !== null) {
        console.log('⚠️ 使用过期的缓存数据作为降级')
        return oldCache
      }
      
      throw error
    }
  }

  // 返回缓存数据
  return getCache(key)
}

module.exports = {
  CACHE_DURATION,
  setCache,
  getCache,
  removeCache,
  clearAllCache,
  hasValidCache,
  getCachedOrFetch
}
