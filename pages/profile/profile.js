const app = getApp()

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    isLoading: true,
    
    // 用户统计数据
    stats: {
      totalReports: 0,
      timeSaved: 0,
      favoritePosition: '',
      achievements: []
    },
    
    // 会员状态
    membership: {
      isMember: false,
      type: 'free',
      remainingDays: 0
    },
    
    // 使用统计
    usage: {
      dailyCount: 0,
      totalCount: 0,
      remainingCount: 5,
      dailyLimit: 5
    },

    // 功能列表
    featureList: [
      { icon: '📊', title: '数据统计', desc: '查看使用数据', page: '/pages/stats/stats', show: true },
      { icon: '🎨', title: '个性化设置', desc: '自定义模板和风格', page: '/pages/settings/settings', show: false }, // TODO: 待实现
      { icon: '📝', title: '我的模板', desc: '管理自定义模板', page: '', show: false }, // TODO: 待实现
      { icon: '💳', title: '会员中心', desc: '开通/管理会员', page: '', show: true, action: 'openMember' },
      { icon: '❓', title: '帮助与反馈', desc: '常见问题和意见反馈', page: '', show: true, action: 'showHelp' }
    ]
  },

  onLoad() {
    this.checkLoginStatus()
  },

  onShow() {
    if (this.data.isLoggedIn) {
      this.loadUserData()
    }
  },

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    this.setData({ isLoading: true })
    
    const userInfo = wx.getStorageSync('userInfo')
    
    if (userInfo && userInfo.openid) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        isLoading: false
      })
      
      await this.loadUserData()
    } else {
      this.setData({
        isLoggedIn: false,
        isLoading: false
      })
    }
  },

  /**
   * 微信登录
   */
  async handleLogin() {
    wx.showLoading({ title: '登录中...' })
    
    try {
      // 1. 获取用户信息（头像、昵称）
      const userProfile = await this.getUserProfile()
      if (!userProfile) {
        wx.hideLoading()
        return
      }

      // 2. 调用云函数登录
      const res = await wx.cloud.callFunction({
        name: 'auth',
        data: {
          action: 'login',
          data: {
            userInfo: userProfile
          }
        }
      })

      wx.hideLoading()

      if (res.result && res.result.success) {
        const { isNewUser, user } = res.result.data
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', {
          openid: user.openid,
          ...user.userInfo,
          _id: user._id
        })

        this.setData({
          isLoggedIn: true,
          userInfo: {
            openid: user.openid,
            ...user.userInfo,
            _id: user._id
          },
          stats: user.stats || {},
          membership: this.calculateMembership(user.membership),
          usage: {
            dailyCount: user.usage?.dailyCount || 0,
            totalCount: user.usage?.totalCount || 0,
            remainingCount: 5 - (user.usage?.dailyCount || 0),
            dailyLimit: 5
          }
        })

        wx.showToast({
          title: isNewUser ? '注册成功 ✨' : '登录成功 👋',
          icon: 'success'
        })

        // 新用户提示
        if (isNewUser) {
          setTimeout(() => {
            wx.showModal({
              title: '🎉 欢迎使用周报Pro',
              content: '你已获得免费版权限，每日可生成5次周报。升级Pro会员可享受无限次生成！',
              confirmText: '了解会员',
              cancelText: '稍后再说',
              success: (res) => {
                if (res.confirm) {
                  this.navigateToMember()
                }
              }
            })
          }, 1500)
        }
      } else {
        throw new Error(res.result?.error || '登录失败')
      }
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 获取用户资料
   */
  getUserProfile() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: (err) => {
          console.error('获取用户信息失败:', err)
          
          // 用户拒绝授权
          wx.showModal({
            title: '提示',
            content: '需要授权才能使用完整功能',
            confirmText: '重新授权',
            cancelText: '暂不登录',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.handleLogin()
              } else {
                resolve(null)
              }
            }
          })
          
          resolve(null)
        }
      })
    })
  },

  /**
   * 加载用户数据
   */
  async loadUserData() {
    try {
      // 并行请求多个接口
      const [infoRes, usageRes] = await Promise.all([
        wx.cloud.callFunction({
          name: 'auth',
          data: { action: 'getUserInfo' }
        }),
        wx.cloud.callFunction({
          name: 'auth',
          data: { action: 'getUsageStats' }
        })
      ])

      if (infoRes.result?.success) {
        const userData = infoRes.result.data
        
        this.setData({
          userInfo: {
            ...this.data.userInfo,
            ...userData.userInfo
          },
          stats: userData.stats || {},
          membership: userData.membershipStatus || {}
        })

        // 更新本地缓存
        const cachedInfo = wx.getStorageSync('userInfo') || {}
        wx.setStorageSync('userInfo', {
          ...cachedInfo,
          ...userData.userInfo
        })
      }

      if (usageRes.result?.success) {
        const usageData = usageRes.result.data
        
        this.setData({
          usage: {
            ...this.data.usage,
            ...usageData
          }
        })
      }
    } catch (error) {
      console.error('加载用户数据失败:', error)
    }
  },

  /**
   * 计算会员状态
   */
  calculateMembership(membership) {
    if (!membership || membership.type === 'free') {
      return {
        isMember: false,
        type: 'free',
        remainingDays: 0,
        typeText: '免费版',
        typeColor: '#909399'
      }
    }

    if (membership.type === 'pro') {
      return {
        isMember: true,
        type: 'pro',
        remainingDays: membership.remainingDays || 0,
        typeText: membership.isActive ? `Pro会员 (${membership.remainingDays}天)` : 'Pro会员已过期',
        typeColor: membership.isActive ? '#f5a623' : '#909399'
      }
    }

    return {
      isMember: false,
      type: membership.type,
      remainingDays: 0,
      typeText: '未知状态',
      typeColor: '#909399'
    }
  },

  /**
   * 跳转到功能页面
   */
  navigateToFeature(e) {
    const { page, action, show } = e.currentTarget.dataset
    
    if (!show) {
      wx.showToast({
        title: '功能开发中，敬请期待 🚀',
        icon: 'none'
      })
      return
    }

    if (action === 'openMember') {
      this.navigateToMember()
      return
    }

    if (action === 'showHelp') {
      this.showHelp()
      return
    }

    if (page) {
      wx.navigateTo({ url: page })
    }
  },

  /**
   * 跳转到会员中心
   */
  navigateToMember() {
    wx.showModal({
      title: '💎 Pro 会员特权',
      content: '升级 Pro 会员，享受：\n\n✅ 每日无限次生成\n✅ 全部岗位 + 自定义岗位\n✅ 云端无限存储\n✅ 高级 Prompt 模板\n✅ 多格式导出 Word/PDF\n✅ 优先排队（高峰期）\n\n月卡 ¥9.9 | 年卡 ¥99',
      confirmText: '立即开通',
      cancelText: '再想想',
      success: (res) => {
        if (res.confirm) {
          // TODO: 接入支付系统
          wx.showToast({
            title: '支付功能开发中 💳',
            icon: 'none'
          })
        }
      }
    })
  },

  /**
   * 显示帮助信息
   */
  showHelp() {
    wx.showModal({
      title: '❓ 帮助与反馈',
      content: '常见问题：\n\nQ: 如何升级会员？\nA: 点击"会员中心"即可开通\n\nQ: 忘记了怎么办？\nA: 数据保存在云端，重新登录即可\n\nQ: 如何联系客服？\nA: GitHub Issues 反馈问题',
      showCancel: false,
      confirmText: '我知道了'
    })
  },

  /**
   * 退出登录
   */
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需要重新登录才能使用完整功能',
      confirmText: '确认退出',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync('userInfo')
          
          this.setData({
            isLoggedIn: false,
            userInfo: null,
            stats: {},
            membership: {
              isMember: false,
              type: 'free',
              remainingDays: 0
            },
            usage: {
              dailyCount: 0,
              totalCount: 0,
              remainingCount: 5,
              dailyLimit: 5
            }
          })

          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 分享
  onShareAppMessage() {
    return {
      title: '🚀 周报Pro - AI智能周报生成器',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png'
    }
  }*/
})
