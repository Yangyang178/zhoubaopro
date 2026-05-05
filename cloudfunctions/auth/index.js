const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

/**
 * 用户认证云函数
 * 
 * 支持的操作：
 * - quickLogin: 微信一键登录（静默登录，无需授权）
 * - login: 微信登录（需用户授权获取头像昵称）
 * - getUserInfo: 获取用户详细信息
 * - updateUserInfo: 更新用户资料
 * - checkMembership: 检查会员状态
 * - getUsageStats: 获取使用统计
 */

exports.main = async (event, context) => {
  const { action, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  console.log('[auth] action:', action)
  console.log('[auth] openid:', openid)

  try {
    switch (action) {
      case 'quickLogin':
        return await handleQuickLogin(openid, data)
      
      case 'login':
        return await handleLogin(openid, data)
      
      case 'getUserInfo':
        return await getUserInfo(openid)
      
      case 'updateUserInfo':
        return await updateUserInfo(openid, data)
      
      case 'checkMembership':
        return await checkMembership(openid)
      
      case 'getUsageStats':
        return await getUsageStats(openid)
      
      default:
        return {
          success: false,
          error: `未知操作: ${action}`
        }
    }
  } catch (error) {
    console.error('[auth] Error:', error)
    return {
      success: false,
      error: error.message || '服务器错误'
    }
  }
}

/**
 * 处理微信一键登录（静默登录）
 * 无需用户授权，直接通过 openid 完成登录/注册
 */
async function handleQuickLogin(openid, data) {
  // 查询用户是否存在
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length > 0) {
    // 用户已存在，更新最后登录时间
    const existingUser = userRes.data[0]
    
    await db.collection('users').doc(existingUser._id).update({
      data: {
        lastLoginTime: new Date(),
        loginCount: _.inc(1)
      }
    })
    
    // 返回完整用户信息
    const updatedUser = await db.collection('users').doc(existingUser._id).get()
    
    return {
      success: true,
      data: {
        isNewUser: false,
        user: updatedUser.data
      },
      message: '登录成功'
    }
  } else {
    // 新用户，自动注册（使用默认信息）
    const newUser = {
      openid,
      userInfo: {
        nickname: '微信用户',
        avatarUrl: ''
      },
      role: 'user',
      membership: {
        type: 'free',
        expireTime: null,
        autoRenew: false
      },
      usage: {
        dailyCount: 0,
        totalCount: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      },
      stats: {
        totalReports: 0,
        timeSaved: 0,
        favoritePosition: '',
        achievements: []
      },
      createTime: new Date(),
      lastLoginTime: new Date(),
      loginCount: 1
    }
    
    const addRes = await db.collection('users').add({ data: newUser })
    
    newUser._id = addRes._id
    
    return {
      success: true,
      data: {
        isNewUser: true,
        user: newUser
      },
      message: '注册成功'
    }
  }
}

/**
 * 处理用户登录（需授权版本）
 * 如果用户不存在则自动注册
 */
async function handleLogin(openid, data) {
  const { userInfo } = data || {}
  
  // 查询用户是否存在
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length > 0) {
    // 用户已存在，更新最后登录时间
    const existingUser = userRes.data[0]
    
    await db.collection('users').doc(existingUser._id).update({
      data: {
        lastLoginTime: new Date(),
        loginCount: _.inc(1),
        ...(userInfo ? { userInfo } : {})
      }
    })
    
    // 返回完整用户信息
    const updatedUser = await db.collection('users').doc(existingUser._id).get()
    
    return {
      success: true,
      data: {
        isNewUser: false,
        user: updatedUser.data
      },
      message: '登录成功'
    }
  } else {
    // 新用户，自动注册
    const newUser = {
      openid,
      userInfo: userInfo || {},
      role: 'user', // user / member / admin
      membership: {
        type: 'free', // free / pro / team
        expireTime: null,
        autoRenew: false
      },
      usage: {
        dailyCount: 0,
        totalCount: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
      },
      stats: {
        totalReports: 0,
        timeSaved: 0, // 分钟
        favoritePosition: '',
        achievements: []
      },
      createTime: new Date(),
      lastLoginTime: new Date(),
      loginCount: 1
    }
    
    const addRes = await db.collection('users').add({ data: newUser })
    
    newUser._id = addRes._id
    
    return {
      success: true,
      data: {
        isNewUser: true,
        user: newUser
      },
      message: '注册成功'
    }
  }
}

/**
 * 获取用户信息
 */
async function getUserInfo(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    return {
      success: false,
      error: '用户不存在'
    }
  }
  
  const user = userRes.data[0]
  
  // 隐藏敏感字段
  delete user.openid
  
  // 计算会员状态
  const membershipStatus = calculateMembershipStatus(user.membership)
  
  return {
    success: true,
    data: {
      ...user,
      membershipStatus
    }
  }
}

/**
 * 更新用户信息
 */
async function updateUserInfo(openid, data) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    return {
      success: false,
      error: '用户不存在'
    }
  }
  
  const userId = userRes.data[0]._id
  
  // 允许更新的字段
  const allowedFields = ['userInfo', 'stats']
  const updateData = {}
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field]
    }
  }
  
  if (Object.keys(updateData).length === 0) {
    return {
      success: false,
      error: '没有可更新的字段'
    }
  }
  
  updateData.updateTime = new Date()
  
  await db.collection('users').doc(userId).update({ data: updateData })
  
  return {
    success: true,
    message: '更新成功'
  }
}

/**
 * 检查会员状态
 */
async function checkMembership(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    return {
      success: true,
      data: {
        isMember: false,
        type: 'free',
        remainingDays: 0
      }
    }
  }
  
  const user = userRes.data[0]
  const status = calculateMembershipStatus(user.membership)
  
  return {
    success: true,
    data: status
  }
}

/**
 * 获取使用统计
 */
async function getUsageStats(openid) {
  const userRes = await db.collection('users').where({ openid }).get()
  
  if (userRes.data.length === 0) {
    return {
      success: false,
      error: '用户不存在'
    }
  }
  
  const user = userRes.data[0]
  const today = new Date().toISOString().split('T')[0]
  
  // 重置每日计数（如果是新的一天）
  if (user.usage.lastResetDate !== today) {
    await db.collection('users').doc(user._id).update({
      data: {
        'usage.dailyCount': 0,
        'usage.lastResetDate': today
      }
    })
    
    user.usage.dailyCount = 0
  }
  
  // 计算剩余次数
  const isMember = calculateMembershipStatus(user.membership).isMember
  const dailyLimit = isMember ? Infinity : 5
  const remainingCount = isMember ? Infinity : Math.max(0, dailyCount - user.usage.dailyCount)
  
  return {
    success: true,
    data: {
      dailyCount: user.usage.dailyCount,
      totalCount: user.usage.totalCount,
      dailyLimit,
      remainingCount,
      isMember,
      lastResetDate: user.usage.lastResetDate,
      stats: user.stats
    }
  }
}

/**
 * 计算会员状态
 */
function calculateMembershipStatus(membership) {
  if (!membership || membership.type === 'free') {
    return {
      isMember: false,
      type: 'free',
      remainingDays: 0,
      isActive: false
    }
  }
  
  if (membership.type === 'pro' && membership.expireTime) {
    const now = new Date()
    const expireTime = new Date(membership.expireTime)
    const remainingMs = expireTime - now
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
    
    return {
      isMember: remainingDays > 0,
      type: 'pro',
      remainingDays: Math.max(0, remainingDays),
      isActive: remainingDays > 0,
      expireTime: membership.expireTime
    }
  }
  
  return {
    isMember: false,
    type: membership.type,
    remainingDays: 0,
    isActive: false
  }
}
