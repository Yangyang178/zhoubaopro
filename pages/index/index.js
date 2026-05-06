// index.js
const app = getApp()

// 引入公共模块
const { POSITION_LIST, API_CONFIG, AI_PARAMS, USAGE_LIMIT, STORAGE_KEYS } = require('../../utils/constants')
const { getPositionPrompt, buildUserPrompt } = require('../../utils/prompts')
const { showError, showSuccess } = require('../../utils/errorHandler')
const { exporter, EXPORT_FORMAT } = require('../../utils/export')
const { statisticsManager } = require('../../utils/statistics')

Page({
  data: {
    positions: POSITION_LIST, // 使用公共常量
    selectedPosition: '',
    weeklyWork: '',
    nextPlan: '',
    problems: '',
    isGenerating: false,
    showResult: false,
    generatedReport: '',
    historyCount: 0,
    
    // 生成进度状态
    generatingStep: 0,        // 当前步骤 (0-4)
    generatingSteps: [         // 步骤定义
      { icon: '📝', text: '准备 Prompt', status: 'pending' },
      { icon: '🔗', text: '连接 AI 服务', status: 'pending' },
      { icon: '⚙️', text: 'AI 生成中', status: 'pending' },
      { icon: '✨', text: '优化输出', status: 'pending' },
      { icon: '🎉', text: '完成！', status: 'pending' }
    ],
    
    // 结果展示区状态
    showFullContent: false,  // 是否展开全部内容
    
    // 用户信息
    userInfo: {
      avatarUrl: '',
      nickname: '',
      bio: ''
    },
    
    // 防止频繁调用的标记
    canGetUserProfile: true,
    getUserProfileCooldown: USAGE_LIMIT.COOLDOWN_TIME, // 使用公共常量

    // 撤销功能相关
    showUndoToast: false,        // 是否显示撤销提示
    undoCountdown: 3,            // 撤销倒计时（秒）
    lastClearedField: '',        // 最后清除的字段名
    lastClearedContent: '',      // 清除前的内容
    undoTimer: null,              // 倒计时定时器

    // 导出功能相关
    showExportModal: false,      // 是否显示导出选择器
    generatedReportContent: null, // 当前生成的周报内容（用于导出）

    // DeepSeek API 配置（前端直连模式）
    // ⚠️ 安全提示：API Key 存储在前端代码中，仅用于个人测试或内部使用
    // ⚠️ 生产环境建议使用云函数代理模式（apiProxy）以保护 API Key
    apiKey: 'sk-95d6993d5f7d49bd8c5c6d94288e6300',

    // 每日生成次数限制
    dailyLimit: USAGE_LIMIT.DAILY_LIMIT, // 使用公共常量
    usedCount: 0,
    remainingCount: 5,
    isMember: false,

    // 工作内容模板
    workTemplates: [
      '完成了登录模块开发，实现了用户注册、登录、密码找回功能',
      '修复了3个bug，优化了页面加载速度，提升了用户体验',
      '参与了产品需求评审，输出了技术方案设计文档',
      '完成了XX功能的开发和测试，已上线并稳定运行',
      '搭建了XX组件库，提升了团队开发效率30%',
      '优化了数据库查询性能，接口响应时间降低50%',
      '完成了移动端适配，支持iOS和Android双平台',
      '编写了单元测试，测试覆盖率达到80%'
    ],
    
    // 显示模板选择器
    showTemplatePicker: false,
  },

  onLoad() {
    // 初始化云开发（如果支持）
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d6gx2o3nae6823c0d',
        traceUser: true
      })
    }

    // 加载本地存储的用户信息
    this.loadUserInfo()
    this.updateHistoryCount()
    // 初始化每日生成次数
    this.initDailyUsage()
  },

  onShow() {
    this.updateHistoryCount()
    // 每次显示页面时刷新使用次数
    this.initDailyUsage()
  },

  loadUserInfo() {
    try {
      const savedUserInfo = wx.getStorageSync('userInfo')
      if (savedUserInfo && savedUserInfo.avatarUrl) {
        this.setData({ userInfo: savedUserInfo })
        console.log('✅ 已加载本地用户信息:', savedUserInfo.nickname)
      } else {
        console.log('ℹ️ 暂无本地用户信息，显示默认状态')
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  initDailyUsage() {
    try {
      const today = this.getTodayString()
      const usageData = wx.getStorageSync('dailyUsage') || {}

      // 如果是新的一天，重置计数
      if (usageData.date !== today) {
        const newUsageData = {
          date: today,
          count: 0,
          limit: this.data.dailyLimit
        }
        wx.setStorageSync('dailyUsage', newUsageData)
        this.setData({
          usedCount: 0,
          remainingCount: this.data.dailyLimit
        })
        console.log('📅 新的一天，已重置生成次数')
      } else {
        // 同一天，读取当前使用次数
        const usedCount = usageData.count || 0
        const remainingCount = Math.max(0, this.data.dailyLimit - usedCount)
        this.setData({
          usedCount,
          remainingCount
        })
        console.log(`📊 今日已使用 ${usedCount}/${this.data.dailyLimit} 次`)
      }
    } catch (error) {
      console.error('初始化每日使用记录失败:', error)
    }
  },

  getTodayString() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  checkAndRecordUsage() {
    return new Promise((resolve, reject) => {
      try {
        if (this.data.isMember) {
          // 会员无限制
          console.log('👑 会员用户，无生成次数限制')
          resolve(true)
          return
        }

        const today = this.getTodayString()
        const usageData = wx.getStorageSync('dailyUsage') || {}

        // 检查是否超过限制
        if (usageData.count >= this.data.dailyLimit) {
          wx.showModal({
            title: '今日生成次数已用完',
            content: `非会员每天可免费生成${this.data.dailyLimit}次周报\n\n💡 成为会员即可享受无限次生成`,
            confirmText: '了解会员',
            cancelText: '知道了',
            success: (res) => {
              if (res.confirm) {
                // TODO: 跳转到会员页面
                console.log('用户想了解会员')
              }
            }
          })
          reject(new Error('每日生成次数已达上限'))
          return
        }

        // 记录使用次数
        const newCount = (usageData.count || 0) + 1
        const newUsageData = {
          date: today,
          count: newCount,
          limit: this.data.dailyLimit
        }

        wx.setStorageSync('dailyUsage', newUsageData)

        const remainingCount = Math.max(0, this.data.dailyLimit - newCount)
        this.setData({
          usedCount: newCount,
          remainingCount
        })

        console.log(`✅ 记录第 ${newCount} 次生成，剩余 ${remainingCount} 次`)
        resolve(true)

      } catch (error) {
        console.error('检查/记录使用次数失败:', error)
        reject(error)
      }
    })
  },

  getUserProfile() {
    const that = this
    
    // 防止频繁调用
    if (!this.data.canGetUserProfile) {
      wx.showToast({
        title: '操作太频繁，请稍后再试',
        icon: 'none',
        duration: 1500
      })
      return
    }
    
    // 设置冷却期
    this.setData({ canGetUserProfile: false })
    setTimeout(() => {
      that.setData({ canGetUserProfile: true })
    }, this.data.getUserProfileCooldown)
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo
        
        console.log('👤 获取用户信息成功:')
        console.log('  昵称:', userInfo.nickName)
        console.log('  头像:', userInfo.avatarUrl)
        
        // 保存到本地存储
        wx.setStorageSync('userInfo', {
          avatarUrl: userInfo.avatarUrl,
          nickname: userInfo.nickName,
          bio: 'AI智能周报助手，让工作汇报更轻松',
          updateTime: new Date().toISOString()
        })
        
        that.setData({
          userInfo: {
            avatarUrl: userInfo.avatarUrl,
            nickname: userInfo.nickName,
            bio: 'AI智能周报助手，让工作汇报更轻松'
          }
        })
        
        wx.showToast({
          title: '登录成功 ✨',
          icon: 'success',
          duration: 1500
        })
        
        wx.vibrateShort({ type: 'light' })
      },
      fail: (error) => {
        console.error('获取用户信息失败:', error.errMsg)
        
        // 只在明确拒绝时提示，不提示频率限制错误
        if (error.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要授权',
            content: '需要您的授权才能显示头像和昵称。是否重新授权？',
            confirmText: '去授权',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 延迟后重试，避免立即再次触发频率限制
                setTimeout(() => {
                  that.getUserProfile()
                }, 1000)
              }
            }
          })
        }
        // 其他错误静默处理，不弹窗打扰用户
      }
    })
  },

  async updateHistoryCount() {
    try {
      if (!wx.cloud) {
        console.log('⚠️ 云开发未初始化，使用本地存储')
        const reports = wx.getStorageSync('reportHistory') || []
        this.setData({ historyCount: reports.length })
        return
      }

      const res = await wx.cloud.callFunction({
        name: 'dbOperation',
        data: {
          action: 'getCount'
        },
        timeout: 10000
      })

      if (res.result && res.result.success) {
        this.setData({
          historyCount: res.result.data.count
        })
      } else {
        throw new Error(res.result?.error || '获取数量失败')
      }
    } catch (error) {
      console.error('获取历史数量失败:', error)
      // 降级到本地存储
      const reports = wx.getStorageSync('reportHistory') || []
      this.setData({ historyCount: reports.length })
    }
  },

  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  /**
   * 跳转到个人中心
   */
  goToProfile() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  /**
   * 回到首页（刷新页面）
   */
  goToHome() {
    // 如果已经在首页，则滚动到顶部
    wx.pageScrollTo({
      scrollTop: 0,
      duration: 300
    })
  },

  selectPosition(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      selectedPosition: this.data.selectedPosition === id ? '' : id
    });
  },

  onWorkInput(e) {
    this.setData({
      weeklyWork: e.detail.value
    });
  },

  onPlanInput(e) {
    this.setData({
      nextPlan: e.detail.value
    });
  },

  /**
   * 清除本周工作内容（带撤销功能）
   */
  clearWeeklyWork() {
    const contentToClear = this.data.weeklyWork
    
    wx.showModal({
      title: '确认清除',
      content: '确定要清除"本周工作"的所有内容吗？',
      confirmText: '清除',
      confirmColor: '#e53e3e',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 保存清除前的内容（用于撤销）
          this.setData({ 
            weeklyWork: '',
            lastClearedField: 'weeklyWork',
            lastClearedContent: contentToClear
          })
          
          this.startUndoCountdown()
        }
      }
    })
  },

  /**
   * 清除下周计划内容（带撤销功能）
   */
  clearNextPlan() {
    const contentToClear = this.data.nextPlan
    
    wx.showModal({
      title: '确认清除',
      content: '确定要清除"下周计划"的所有内容吗？',
      confirmText: '清除',
      confirmColor: '#e53e3e',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 保存清除前的内容（用于撤销）
          this.setData({ 
            nextPlan: '',
            lastClearedField: 'nextPlan',
            lastClearedContent: contentToClear
          })
          
          this.startUndoCountdown()
        }
      }
    })
  },

  /**
   * 清除问题与困难内容（带撤销功能）
   */
  clearProblems() {
    const contentToClear = this.data.problems
    
    wx.showModal({
      title: '确认清除',
      content: '确定要清除"问题与困难"的所有内容吗？',
      confirmText: '清除',
      confirmColor: '#e53e3e',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 保存清除前的内容（用于撤销）
          this.setData({ 
            problems: '',
            lastClearedField: 'problems',
            lastClearedContent: contentToClear
          })
          
          this.startUndoCountdown()
        }
      }
    })
  },

  /**
   * 开始撤销倒计时
   */
  startUndoCountdown() {
    // 清除之前的定时器
    if (this.data.undoTimer) {
      clearInterval(this.data.undoTimer)
    }
    
    // 显示撤销提示
    this.setData({
      showUndoToast: true,
      undoCountdown: 3
    })
    
    // 启动倒计时
    const timer = setInterval(() => {
      let countdown = this.data.undoCountdown - 1
      
      if (countdown <= 0) {
        // 倒计时结束，隐藏提示
        clearInterval(timer)
        this.setData({
          showUndoToast: false,
          undoCountdown: 3,
          undoTimer: null,
          lastClearedField: '',
          lastClearedContent: ''
        })
      } else {
        // 更新倒计时显示
        this.setData({ undoCountdown: countdown })
      }
    }, 1000)
    
    // 保存定时器引用
    this.setData({ undoTimer: timer })
  },

  /**
   * 撤销清除操作
   */
  undoClear() {
    const { lastClearedField, lastClearedContent } = this.data
    
    if (!lastClearedField || !lastClearedContent) {
      return
    }
    
    // 清除定时器
    if (this.data.undoTimer) {
      clearInterval(this.data.undoTimer)
    }
    
    // 恢复数据
    const updateData = {
      [lastClearedField]: lastClearedContent,
      showUndoToast: false,
      undoCountdown: 3,
      undoTimer: null,
      lastClearedField: '',
      lastClearedContent: ''
    }
    
    this.setData(updateData)
    
    wx.showToast({
      title: '已撤销 ✓',
      icon: 'success',
      duration: 1500
    })
  },

  onProblemInput(e) {
    this.setData({
      problems: e.detail.value
    });
  },

  /**
   * 切换模板选择器显示状态
   */
  toggleTemplatePicker() {
    this.setData({
      showTemplatePicker: !this.data.showTemplatePicker
    })
  },

  /**
   * 选择工作模板
   */
  selectTemplate(e) {
    const index = e.currentTarget.dataset.index
    const template = this.data.workTemplates[index]
    
    if (template) {
      // 追加到现有内容（如果有）
      const currentWork = this.data.weeklyWork
      const newWork = currentWork 
        ? currentWork + '\n' + template 
        : template
      
      this.setData({
        weeklyWork: newWork,
        showTemplatePicker: false
      })

      wx.showToast({
        title: '已添加模板',
        icon: 'success',
        duration: 1000
      })

      wx.vibrateShort({ type: 'light' })
    }
  },

  /**
   * 更新生成进度
   * @param {number} step - 步骤索引 (0-4)
   */
  updateGeneratingStep(step) {
    const steps = this.data.generatingSteps.map((s, index) => ({
      ...s,
      status: index < step ? 'completed' : index === step ? 'active' : 'pending'
    }))

    this.setData({
      generatingStep: step,
      generatingSteps: steps
    })
  },

  /**
   * 切换内容展开/收起
   */
  toggleContent() {
    this.setData({
      showFullContent: !this.data.showFullContent
    })
    
    wx.vibrateShort({ type: 'light' })
  },

  /**
   * 分享给朋友
   */
  onShareAppMessage() {
    if (this.data.generatedReport) {
      return {
        title: '📄 我的AI周报 - 报报pro',
        path: '/pages/index/index',
        content: this.data.generatedReport.substring(0, 100) + '...'
      }
    }
    
    return {
      title: '🚀 AI智能周报生成器 - 报报pro',
      path: '/pages/index/index'
    }
  },

  async generateReport() {
    if (!this.data.weeklyWork.trim()) {
      wx.showToast({
        title: '请填写本周工作',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 检查每日生成次数限制
    try {
      await this.checkAndRecordUsage()
    } catch (error) {
      console.log('⛔ 生成次数限制:', error.message)
      return
    }

    this.setData({ isGenerating: true });
    
    // 初始化进度状态
    this.updateGeneratingStep(0)  // 步骤 0: 准备 Prompt

    console.log('========================================')
    console.log('🚀 开始调用 DeepSeek AI (通过云函数代理)')
    console.log('========================================')

    try {
      const { POSITION_MAP } = require('../../utils/constants')
      const positionName = POSITION_MAP[this.data.selectedPosition] || '通用'

      // 使用公共模块获取岗位专业化 System Prompt
      const systemPrompt = getPositionPrompt(this.data.selectedPosition)

      console.log('🎯 使用岗位专属Prompt:', this.data.selectedPosition)

      // 使用公共模块构建 User Prompt
      const prompt = buildUserPrompt({
        positionName: positionName,
        weeklyWork: this.data.weeklyWork,
        nextPlan: this.data.nextPlan,
        problems: this.data.problems
      })

      console.log('📝 Prompt 构建完成')
      
      // 步骤 1: 连接 AI 服务
      this.updateGeneratingStep(1)

      console.log('📍 岗位:', positionName)
      console.log('📊 工作内容长度:', this.data.weeklyWork.length, '字符')

      const startTime = Date.now()

      // 直接调用 DeepSeek API（前端直连模式）
      console.log('📤 直接调用 DeepSeek API (前端直连模式)')
      console.log('⚠️ 注意：API Key在前端代码中，请勿将代码公开分享')

      // 步骤 2: AI 生成中
      this.updateGeneratingStep(2)

      const reportContent = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://api.deepseek.com/v1/chat/completions',
          method: 'POST',
          timeout: 60000, // 60秒超时（AI生成需要较长时间）
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.data.apiKey}`
          },
          data: {
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 0.85,
            frequency_penalty: 0.4,
            presence_penalty: 0.5
          },
          success: (res) => {
            const endTime = Date.now()
            const duration = ((endTime - startTime) / 1000).toFixed(2)

            console.log(`✅ API 请求成功！耗时: ${duration}秒`)
            console.log('📥 HTTP 状态码:', res.statusCode)

            if (res.statusCode === 200 && res.data && res.data.choices && res.data.choices.length > 0) {
              const content = res.data.choices[0].message.content.trim()

              console.log('🎉 周报生成成功！')
              console.log(`📄 内容长度: ${content.length}字符`)
              console.log('📄 预览:', content.substring(0, 80) + '...')

              resolve(content)
            } else if (res.data && res.data.error) {
              console.error('❌ DeepSeek API 错误:', res.data.error)
              reject(new Error(`DeepSeek API错误 [${res.data.error.code}]: ${res.data.error.message}`))
            } else {
              console.error('❌ 返回数据异常:', res.data)
              reject(new Error('API返回的数据格式异常'))
            }
          },
          fail: (error) => {
            const endTime = Date.now()
            const duration = ((endTime - startTime) / 1000).toFixed(2)

            console.error(`❌ 请求失败 (${duration}秒)`)

            let errorMsg = error.errMsg || '网络请求失败'

            if (errorMsg.includes('timeout')) {
              errorMsg = '请求超时（60秒），AI服务响应较慢，请稍后重试'
            } else if (errorMsg.includes('request:fail')) {
              errorMsg = '无法连接到DeepSeek服务器，请检查网络连接'
            }

            reject(new Error(errorMsg))
          }
        })
      })

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      console.log(`⏱️ 总耗时: ${duration}秒`)

      // 步骤 3: 优化输出
      this.updateGeneratingStep(3)
      
      // 短暂延迟让用户看到完成状态
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 步骤 4: 完成
      this.updateGeneratingStep(4)

      this.setData({
        generatedReport: reportContent,
        showResult: true,
        isGenerating: false
      });

      wx.showToast({
        title: '生成成功 ✨',
        icon: 'success',
        duration: 2000
      });

      wx.vibrateShort({
        type: 'medium'
      })

      // 记录本次生成到统计系统
      try {
        const wordCount = reportContent.length
        const generationTime = parseFloat(((endTime - startTime) / 1000).toFixed(2))
        const positionId = this.data.selectedPosition

        statisticsManager.recordReport(positionId, wordCount, generationTime)

        console.log('📊 统计数据已记录:', {
          positionId,
          wordCount,
          generationTime
        })
      } catch (statsError) {
        console.warn('⚠️ 记录统计数据失败（不影响主流程）:', statsError)
      }

      console.log('========================================')
      console.log('✅ 全部流程完成！用户可以看到结果了')
      console.log('========================================')

    } catch (error) {
      console.error('=== 生成过程出错 ===')
      console.error('错误信息:', error.message)

      this.setData({ isGenerating: false })

      let errorTitle = '⚠️ 生成失败'
      let errorContent = ''

      if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorTitle = '⏰ 请求超时'
        errorContent = 'AI服务响应较慢，可能是网络拥堵或服务器繁忙\n\n建议：\n1. 稍后重试（建议等待10秒）\n2. 简化输入内容后重试'
      } else if (error.message.includes('request:fail') || error.message.includes('无法连接')) {
        errorTitle = '🌐 网络连接失败'
        errorContent = '无法连接到DeepSeek服务器\n\n建议：\n1. 检查手机网络（WiFi/4G/5G）\n2. 切换网络后重试\n3. 确认"不校验合法域名"已开启（本地调试）'
      } else if (error.message.includes('每日生成次数')) {
        return // 这个错误已经在 checkAndRecordUsage 中处理了
      } else if (error.message.includes('API错误') || error.message.includes('invalid_api_key')) {
        errorTitle = '🔑 API配置异常'
        errorContent = 'DeepSeek API Key无效或余额不足\n\n请检查：\n1. API Key是否正确\n2. 账户余额是否充足\n3. 访问 https://platform.deepseek.com 查看状态'
      } else {
        errorContent = `${error.message}\n\n可能原因：\n1. 网络连接不稳定\n2. DeepSeek服务暂时不可用\n3. API Key配置问题`
      }

      wx.showModal({
        title: errorTitle,
        content: errorContent,
        showCancel: true,
        cancelText: '取消',
        confirmText: '重试',
        success: (res) => {
          if (res.confirm) {
            setTimeout(() => {
              this.generateReport()
            }, 500)
          }
        }
      })
    }
  },

  copyReport() {
    if (!this.data.generatedReport) {
      wx.showToast({
        title: '暂无内容可复制',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: this.data.generatedReport,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500
        })

        wx.vibrateShort({
          type: 'light'
        })
      }
    })
  },

  async saveReport() {
    if (!this.data.generatedReport) {
      wx.showToast({
        title: '暂无内容可保存',
        icon: 'none'
      })
      return
    }

    try {
      const { POSITION_MAP } = require('../../utils/constants')
      const positionName = POSITION_MAP[this.data.selectedPosition] || '通用'

      // 优先使用云数据库保存
      if (wx.cloud) {
        try {
          const res = await wx.cloud.callFunction({
            name: 'dbOperation',
            data: {
              action: 'add',
              data: {
                content: this.data.generatedReport,
                position: this.data.selectedPosition,
                positionName: positionName
              }
            },
            timeout: 10000
          })

          if (res.result && res.result.success) {
            console.log('✅ 已保存到云数据库')
            
            this.updateHistoryCount()

            wx.showToast({
              title: '已保存到云端 ✅',
              icon: 'success',
              duration: 1500
            })

            wx.vibrateShort({ type: 'light' })
            return
          } else {
            throw new Error(res.result?.error || '云保存失败')
          }
        } catch (cloudError) {
          console.warn('⚠️ 云保存失败，降级到本地存储:', cloudError.message)
          // 降级到本地存储
        }
      }

      // 降级方案：保存到本地存储（兼容模式）
      const reports = wx.getStorageSync('reportHistory') || []
      const newReport = {
        id: Date.now(),
        content: this.data.generatedReport,
        position: this.data.selectedPosition,
        createTime: new Date().toISOString()
      }
      reports.unshift(newReport)
      wx.setStorageSync('reportHistory', reports)

      this.updateHistoryCount()

      wx.showToast({
        title: '已保存到本地',
        icon: 'success',
        duration: 1500
      })

      wx.vibrateShort({ type: 'light' })
      
    } catch (error) {
      console.error('保存失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none',
        duration: 2000
      })
    }
  },

  clearAll() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有输入内容和生成结果吗？此操作不可撤销。',
      confirmText: '确认清除',
      confirmColor: '#e53e3e',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            selectedPosition: '',
            weeklyWork: '',
            nextPlan: '',
            problems: '',
            showResult: false,
            generatedReport: ''
          })

          wx.vibrateShort({
            type: 'medium'
          })

          wx.showToast({
            title: '已清除',
            icon: 'success',
            duration: 1500
          })
        }
      }
    })
  },

  // ==================== 导出功能方法 ====================

  /**
   * 显示导出格式选择器
   */
  showExportMenu() {
    if (!this.data.generatedReport) {
      wx.showToast({
        title: '请先生成周报',
        icon: 'none',
        duration: 2000
      })
      return
    }

    this.setData({ showExportModal: true })
    
    // 保存当前周报内容到 data 中
    this.setData({
      generatedReportContent: this.data.generatedReport
    })

    // 震动反馈
    wx.vibrateShort({
      type: 'light'
    })
  },

  /**
   * 隐藏导出选择器
   */
  hideExportMenu() {
    this.setData({ showExportModal: false })
  },

  /**
   * 阻止模态层滚动穿透
   */
  preventModalTouchMove() {
    return false
  },

  /**
   * 导出为 Markdown 格式
   */
  async exportAsMarkdown() {
    try {
      wx.showLoading({ title: '生成中...' })
      
      const reportData = this._getReportDataForExport()
      const markdown = exporter.toMarkdown(reportData)
      
      // 复制到剪贴板
      await exporter.copyToClipboard(markdown)
      
      wx.hideLoading()
      
      // 隐藏选择器
      this.hideExportMenu()
      
      // 显示成功提示和操作指引
      wx.showModal({
        title: '✅ Markdown 已复制',
        content: '内容已复制到剪贴板，可直接粘贴到：\n\n• GitHub/Gitee Issues\n• Notion / 飞书文档\n• Typora 等编辑器\n\n是否保存为文件？',
        confirmText: '保存文件',
        cancelText: '知道了',
        success: async (res) => {
          if (res.confirm) {
            await this._saveExportedFile(markdown, `周报_${this._getDateString()}.md`, 'text/markdown')
          }
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('导出 Markdown 失败:', error)
      exporter.showError('导出失败，请重试')
    }
  },

  /**
   * 导出为纯文本格式
   */
  async exportAsText() {
    try {
      wx.showLoading({ title: '生成中...' })
      
      const reportData = this._getReportDataForExport()
      const text = exporter.toText(reportData)
      
      // 复制到剪贴板
      await exporter.copyToClipboard(text)
      
      wx.hideLoading()
      this.hideExportMenu()
      
      wx.showModal({
        title: '✅ 文本已复制',
        content: '内容已复制到剪贴板，可直接粘贴到任意文本编辑器。\n\n是否保存为 .txt 文件？',
        confirmText: '保存文件',
        cancelText: '知道了',
        success: async (res) => {
          if (res.confirm) {
            await this._saveExportedFile(text, `周报_${this._getDateString()}.txt`, 'text/plain')
          }
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('导出文本失败:', error)
      exporter.showError('导出失败，请重试')
    }
  },

  /**
   * 导出为 Word 文档（生成带格式的文本）
   */
  async exportAsWord() {
    try {
      wx.showLoading({ title: '准备中...' })
      
      const reportData = this._getReportDataForExport()
      const wordData = exporter.toWord(reportData)
      
      wx.hideLoading()
      this.hideExportMenu()
      
      // 显示操作指引
      let message = '【Markdown 格式已生成】\n\n'
      wordData.instructions.forEach((inst, index) => {
        message += `${index + 1}. ${inst}\n`
      })
      message += `\n${wordData.tip}`
      
      // 先复制到剪贴板
      await exporter.copyToClipboard(wordData.text)
      
      wx.showModal({
        title: '📘 Word 导出指南',
        content: message,
        confirmText: '已复制，去Word粘贴',
        cancelText: '查看详情',
        showCancel: true,
        success: (res) => {
          if (!res.confirm) {
            // 用户想查看详情，显示完整内容预览
            this._showExportPreview(wordData.text, 'markdown', wordData.filename)
          }
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('导出 Word 失败:', error)
      exporter.showError('导出失败，请重试')
    }
  },

  /**
   * 导出为 PDF 文档（生成 HTML 用于打印）
   */
  async exportAsPDF() {
    try {
      wx.showLoading({ title: '生成HTML...' })
      
      const reportData = this._getReportDataForExport()
      const pdfData = exporter.toPDF(reportData)
      
      wx.hideLoading()
      this.hideExportMenu()
      
      let message = '【HTML 已生成，可用于转PDF】\n\n'
      pdfData.instructions.forEach((inst, index) => {
        message += `${index + 1}. ${inst}\n`
      })
      message += `\n${pdfData.tip}`
      
      wx.showModal({
        title: '📕 PDF 导出指南',
        content: message,
        confirmText: '保存 HTML 文件',
        cancelText: '了解详情',
        success: async (res) => {
          if (res.confirm) {
            await this._saveExportedFile(pdfData.html, pdfData.filename, 'text/html')
          } else {
            this._showExportPreview(pdfData.html.substring(0, 500), 'html', pdfData.filename)
          }
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('导出 PDF 失败:', error)
      exporter.showError('导出失败，请重试')
    }
  },

  /**
   * 导出为图片长图（Canvas 绘制）
   */
  async exportAsImage() {
    try {
      wx.showLoading({ title: '生成图片...', mask: true })
      
      const reportData = this._getReportDataForExport()
      
      // 使用 Canvas 绘制图片
      await this._drawReportImage(reportData)
      
      wx.hideLoading()
      this.hideExportMenu()
      
      wx.showModal({
        title: '🖼️ 图片已生成',
        content: '图片已保存到相册，可以：\n\n• 发送到微信群/朋友圈\n• 作为附件发送\n• 插入到文档中',
        confirmText: '打开相册查看',
        cancelText: '太好了',
        success: (res) => {
          if (res.confirm) {
            // 打开相册（小程序限制，只能提示用户）
            wx.showToast({
              title: '请在相册中查看',
              icon: 'none',
              duration: 2000
            })
          }
        }
      })
      
    } catch (error) {
      wx.hideLoading()
      console.error('导出图片失败:', error)
      
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        wx.showModal({
          title: '需要相册权限',
          content: '保存图片需要相册权限，请在设置中开启后重试。',
          showCancel: false,
          confirmText: '我知道了'
        })
      } else {
        exporter.showError('导出失败，请重试')
      }
    }
  },

  // ==================== 导出辅助方法 ====================

  /**
   * 获取用于导出的周报数据
   * @private
   */
  _getReportDataForExport() {
    const positionObj = POSITION_LIST.find(p => p.id === this.data.selectedPosition)
    
    return {
      content: {
        weeklyWork: this.data.weeklyWork || '',
        nextPlan: this.data.nextPlan || '',
        problems: this.data.problems || ''
      },
      position: positionObj ? positionObj.name : '',
      date: new Date().toLocaleDateString('zh-CN'),
      generatedContent: this.data.generatedReport || ''
    }
  },

  /**
   * 获取日期字符串
   * @private
   */
  _getDateString() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
  },

  /**
   * 保存导出的文件到本地
   * @private
   */
  async _saveExportedFile(content, filename, type) {
    try {
      const result = await exporter.saveToLocal(content, filename, type)
      
      wx.showToast({
        title: '文件已保存',
        icon: 'success',
        duration: 2000
      })
      
      console.log('文件保存成功:', result.filePath)
      
    } catch (error) {
      console.error('保存文件失败:', error)
      wx.showModal({
        title: '保存失败',
        content: '无法保存文件到本地，但内容已复制到剪贴板，您可以手动粘贴保存。',
        showCancel: false,
        confirmText: '我知道了'
      })
    }
  },

  /**
   * 显示导出内容预览（前500字符）
   * @private
   */
  _showExportPreview(content, format, filename) {
    const preview = content.length > 500 ? content.substring(0, 500) + '\n...（内容过长，已截断）' : content
    
    wx.showModal({
      title: `${filename} 内容预览`,
      content: preview,
      confirmText: '复制完整内容',
      cancelText: '关闭',
      showCancel: true,
      success: async (res) => {
        if (res.confirm) {
          await exporter.copyToClipboard(content)
          wx.showToast({
            title: '已复制完整内容',
            icon: 'success',
            duration: 1500
          })
        }
      }
    })
  },

  /**
   * 使用 Canvas 绘制周报图片
   * @private
   */
  _drawReportImage(reportData) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery()
      query.select('#reportCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          reject(new Error('Canvas 节点未找到'))
          return
        }
        
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        const dpr = wx.getSystemInfoSync().pixelRatio
        const width = 750  // 设计稿宽度
        const height = 1000 // 预估高度
        
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)
        
        // 设置画布背景
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        
        // 绘制标题区域背景
        const gradient = ctx.createLinearGradient(0, 0, width, 160)
        gradient.addColorStop(0, '#667eea')
        gradient.addColorStop(1, '#764ba2')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, width, 160)
        
        // 绘制标题文字
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('📋 工作周报', width / 2, 70)
        
        ctx.font = '24px sans-serif'
        ctx.fillText(`${reportData.date} | ${reportData.position}`, width / 2, 120)
        
        // 绘制内容区域
        let currentY = 190
        const leftPadding = 40
        const rightPadding = 40
        const maxWidth = width - leftPadding - rightPadding
        
        // 本周工作
        if (reportData.content.weeklyWork) {
          currentY = this._drawSection(ctx, '📋 本周工作', reportData.content.weeklyWork, currentY, leftPadding, maxWidth)
        }
        
        // 下周计划
        if (reportData.content.nextPlan) {
          currentY += 30
          currentY = this._drawSection(ctx, '📅 下周计划', reportData.content.nextPlan, currentY, leftPadding, maxWidth)
        }
        
        // 问题与困难
        if (reportData.content.problems) {
          currentY += 30
          currentY = this._drawSection(ctx, '⚠️ 问题与困难', reportData.content.problems, currentY, leftPadding, maxWidth)
        }
        
        // 绘制页脚
        currentY += 50
        ctx.fillStyle = '#999999'
        ctx.font = '20px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(`由 周报Pro 自动生成 | ${new Date().toLocaleString('zh-CN')}`, width / 2, currentY)
        
        // 更新实际高度并重新绘制（如果需要）
        const actualHeight = currentY + 40
        if (actualHeight > height) {
          canvas.height = actualHeight * dpr
          // 这里简化处理，实际可能需要重新绘制
        }
        
        // 生成临时图片
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: (result) => {
              // 保存到相册
              wx.saveImageToPhotosAlbum({
                filePath: result.tempFilePath,
                success: () => resolve(),
                fail: (err) => reject(err)
              })
            },
            fail: (err) => reject(err)
          })
        }, 300)
      })
    })
  },

  /**
   * 绘制内容区块
   * @private
   */
  _drawSection(ctx, title, content, startY, leftPadding, maxWidth) {
    // 标题
    ctx.fillStyle = '#667eea'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(title, leftPadding, startY + 28)
    
    // 分隔线
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(leftPadding, startY + 42)
    ctx.moveTo(leftPadding + maxWidth, startY + 42)
    ctx.stroke()
    
    // 内容（自动换行）
    ctx.fillStyle = '#333333'
    ctx.font = '24px sans-serif'
    
    const lines = this._wrapText(ctx, content, maxWidth)
    let currentY = startY + 75
    
    lines.forEach(line => {
      ctx.fillText(line, leftPadding, currentY)
      currentY += 38
    })
    
    return currentY
  },

  /**
   * 文本自动换行处理
   * @private
   */
  _wrapText(ctx, text, maxWidth) {
    const lines = []
    let currentLine = ''
    
    for (let char of text) {
      const testLine = currentLine + char
      const metrics = ctx.measureText(testLine)
      
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    return lines
  }
})
