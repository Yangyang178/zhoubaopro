const app = getApp()
const { statisticsManager } = require('../../utils/statistics')

Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    isLoading: true,

    // 用户统计数据（本地存储）
    stats: {
      totalReports: 0,
      timeSaved: 0,
      favoritePosition: '',
      achievements: []
    },

    // 格式化后的统计数据（用于UI展示）
    formattedStats: {
      efficiencyScore: 0,
      cards: [],
      weeklyTrend: [],
      positionDistribution: [],
      peakHours: [],
      achievements: []
    },

    // 会员状态
    membership: {
      isMember: false,
      type: 'free',
      remainingDays: 0,
      typeText: '免费版',
      typeColor: '#909399'
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
      { icon: '🎨', title: '个性化设置', desc: '自定义模板和风格', page: '/pages/settings/settings', show: false },
      { icon: '📝', title: '我的模板', desc: '管理自定义模板', page: '', show: false },
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
   * 检查登录状态（纯本地）
   */
  checkLoginStatus() {
    this.setData({ isLoading: true })
    
    const userInfo = wx.getStorageSync('userInfo')
    
    if (userInfo && userInfo.openid) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo,
        isLoading: false
      })
      
      this.loadUserData()
    } else {
      this.setData({
        isLoggedIn: false,
        isLoading: false
      })
    }
  },

  /**
   * 微信一键登录（纯本地模式）
   * 不依赖云函数，直接在本地创建用户
   */
  async handleLogin() {
    wx.showLoading({ title: '登录中...' })
    
    try {
      // 模拟登录延迟
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const localUser = {
        openid: 'local_' + Date.now(),
        nickname: '微信用户',
        avatarUrl: '',
        _id: 'local_' + Date.now(),
        loginTime: new Date().toISOString()
      }

      wx.setStorageSync('userInfo', localUser)
      
      this.setData({
        isLoggedIn: true,
        userInfo: localUser,
        stats: {
          totalReports: 0,
          timeSaved: 0,
          favoritePosition: '',
          achievements: []
        },
        membership: {
          isMember: false,
          type: 'free',
          remainingDays: 0,
          typeText: '免费版',
          typeColor: '#909399'
        },
        usage: {
          dailyCount: 0,
          totalCount: 0,
          remainingCount: 5,
          dailyLimit: 5
        }
      })

      wx.hideLoading()
      wx.showToast({
        title: '登录成功 👋',
        icon: 'success'
      })

      setTimeout(() => {
        wx.showModal({
          title: '🎉 欢迎使用周报Pro',
          content: '你已进入本地模式。\n\n✅ 所有数据保存在手机本地\n✅ 可设置头像和昵称\n✅ 数据不会丢失\n\n💡 提示：点击头像可设置昵称和头像哦~',
          confirmText: '去设置',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) {
              console.log('用户想去设置')
            }
          }
        })
      }, 1500)
      
    } catch (error) {
      wx.hideLoading()
      console.error('登录失败:', error)
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 选择头像
   */
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        
        wx.showModal({
          title: '确认头像',
          content: '是否使用这张图片作为头像？',
          confirmText: '使用',
          cancelText: '重新选择',
          success: (modalRes) => {
            if (modalRes.confirm) {
              this.saveAvatarToLocal(tempFilePath)
            } else if (modalRes.cancel) {
              this.chooseAvatar()
            }
          }
        })
      },
      fail: (err) => {
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({
            title: '选择头像失败',
            icon: 'none'
          })
        }
      }
    })
  },

  /**
   * 保存头像到本地文件系统
   */
  saveAvatarToLocal(tempFilePath) {
    wx.showLoading({ title: '保存中...' })
    
    const fs = wx.getFileSystemManager()
    const avatarPath = `${wx.env.USER_DATA_PATH}/avatar_${Date.now()}.jpg`
    
    fs.saveFile({
      tempFilePath: tempFilePath,
      filePath: avatarPath,
      success: () => {
        this.setData({
          'userInfo.avatarUrl': avatarPath
        })
        
        const cachedInfo = wx.getStorageSync('userInfo') || {}
        wx.setStorageSync('userInfo', {
          ...cachedInfo,
          avatarUrl: avatarPath
        })
        
        wx.hideLoading()
        wx.showToast({
          title: '头像更新成功 ✨',
          icon: 'success'
        })
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('保存头像失败:', err)
        
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 编辑昵称（纯本地）
   */
  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: this.data.userInfo.nickname === '微信用户' ? '' : this.data.userInfo.nickname,
      confirmText: '保存',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const newNickname = res.content.trim()
          
          if (newNickname.length > 20) {
            wx.showToast({
              title: '昵称不能超过20个字符',
              icon: 'none'
            })
            return
          }
          
          const forbiddenWords = ['admin', '管理员', '官方', '客服']
          if (forbiddenWords.some(word => newNickname.toLowerCase().includes(word))) {
            wx.showToast({
              title: '该昵称不可用',
              icon: 'none'
            })
            return
          }
          
          this.setData({
            'userInfo.nickname': newNickname
          })
          
          const cachedInfo = wx.getStorageSync('userInfo') || {}
          wx.setStorageSync('userInfo', {
            ...cachedInfo,
            nickname: newNickname
          })
          
          wx.showToast({
            title: '昵称更新成功 ✨',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 加载用户数据（纯本地）
   */
  loadUserData() {
    try {
      const cachedInfo = wx.getStorageSync('userInfo')
      const stats = wx.getStorageSync('userStats') || {}
      const usage = wx.getStorageSync('userUsage') || {}

      if (cachedInfo) {
        this.setData({
          userInfo: cachedInfo
        })
      }

      if (Object.keys(stats).length > 0) {
        this.setData({ stats })
      }

      if (Object.keys(usage).length > 0) {
        this.setData({ usage })
      }

      // 加载格式化的统计数据
      this.loadFormattedStats()

    } catch (error) {
      console.log('[loadUserData] 加载本地数据失败，使用默认值')
    }
  },

  /**
   * 加载并格式化统计数据显示
   */
  loadFormattedStats() {
    try {
      const formattedStats = statisticsManager.getFormattedStats()
      this.setData({ formattedStats })
    } catch (error) {
      console.error('[loadFormattedStats] 加载统计数据失败:', error)
    }
  },

  /**
   * 保存用户统计数据到本地
   */
  saveStatsToLocalStorage(statsData) {
    try {
      wx.setStorageSync('userStats', statsData)
      this.setData({ stats: statsData })
    } catch (error) {
      console.error('保存统计数据失败:', error)
    }
  },

  /**
   * 更新使用次数（供其他页面调用）
   */
  incrementUsageCount() {
    const newUsage = {
      ...this.data.usage,
      dailyCount: this.data.usage.dailyCount + 1,
      totalCount: this.data.usage.totalCount + 1,
      remainingCount: Math.max(0, this.data.usage.remainingCount - 1)
    }
    
    this.setData({ usage: newUsage })
    wx.setStorageSync('userUsage', newUsage)
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
      content: '常见问题：\n\nQ: 如何升级会员？\nA: 点击"会员中心"即可开通\n\nQ: 数据会丢失吗？\nA: 本地模式数据保存在手机，清除缓存会丢失\n\nQ: 如何联系客服？\nA: GitHub Issues 反馈问题',
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
          wx.removeStorageSync('userInfo')
          wx.removeStorageSync('userStats')
          wx.removeStorageSync('userUsage')

          this.setData({
            isLoggedIn: false,
            userInfo: null,
            stats: {
              totalReports: 0,
              timeSaved: 0,
              favoritePosition: '',
              achievements: []
            },
            membership: {
              isMember: false,
              type: 'free',
              remainingDays: 0,
              typeText: '免费版',
              typeColor: '#909399'
            },
            usage: {
              dailyCount: 0,
              totalCount: 0,
              remainingCount: 5,
              dailyLimit: 5
            },
            formattedStats: {
              efficiencyScore: 0,
              cards: [],
              weeklyTrend: [],
              positionDistribution: [],
              peakHours: [],
              achievements: []
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
   * 生成月度报告
   */
  async generateMonthlyReport() {
    wx.showLoading({ title: '正在生成月报...' })

    try {
      const now = new Date()
      const monthlyReport = statisticsManager.generateMonthlyReport(now.getFullYear(), now.getMonth() + 1)

      wx.hideLoading()

      if (!monthlyReport.success) {
        wx.showToast({
          title: monthlyReport.message || '暂无数据',
          icon: 'none',
          duration: 2000
        })
        return
      }

      const { data } = monthlyReport

      // 显示月度报告弹窗
      wx.showModal({
        title: `📊 ${data.period} 月度报告`,
        content: `本月表现：${data.overview.activeDays}天活跃\n\n📈 核心数据:\n• 累计生成 ${data.overview.totalReports} 份周报\n• 节省约 ${data.overview.timeSaved}\n• 使用 ${data.overview.uniquePositions} 个岗位模板\n• 日均 ${data.overview.avgPerDay} 份\n\n💡 最勤奋的一天：${data.highlights.mostProductiveDay.date}`,
        showCancel: true,
        confirmText: '分享报告',
        cancelText: '关闭',
        success: (res) => {
          if (res.confirm) {
            this.shareMonthlyReport(data)
          }
        }
      })

    } catch (error) {
      wx.hideLoading()
      console.error('[generateMonthlyReport] 生成月度报告失败:', error)

      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none',
        duration: 2000
      })
    }
  },

  /**
   * 分享月度报告
   */
  shareMonthlyReport(data) {
    const shareContent = `
【周报Pro - 我的月度报告】
${data.period}

📈 本月数据:
✅ 活跃天数 ${data.overview.activeDays} 天
✅ 生成周报 ${data.overview.totalReports} 份
⏱️ 节省时间 ${data.overview.timeSaved}
💼 使用岗位 ${data.overview.uniquePositions} 个
📊 日均产出 ${data.overview.avgPerDay} 份

🏆 最常用岗位: ${data.highlights.topPosition}
⚡ 平均耗时: ${data.highlights.avgGenerationTime}

—— 来自周报Pro AI智能助手
    `.trim()

    wx.setClipboardData({
      data: shareContent,
      success: () => {
        wx.showToast({
          title: '报告已复制到剪贴板 ✨',
          icon: 'success'
        })
      }
    })
  }
})
