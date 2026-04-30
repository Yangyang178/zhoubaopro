// index.js
const app = getApp()

Page({
  data: {
    positions: [
      { id: 'frontend', name: '前端工程师' },
      { id: 'backend', name: '后端工程师' },
      { id: 'product', name: '产品经理' },
      { id: 'operation', name: '运营' },
      { id: 'designer', name: '设计师' },
      { id: 'general', name: '通用' }
    ],
    selectedPosition: '',
    weeklyWork: '',
    nextPlan: '',
    problems: '',
    isGenerating: false,
    showResult: false,
    generatedReport: '',
    historyCount: 0,
    
    // 用户信息
    userInfo: {
      avatarUrl: '',
      nickname: '',
      bio: ''
    },
    
    // 防止频繁调用的标记
    canGetUserProfile: true,
    getUserProfileCooldown: 2000, // 2秒冷却时间

    // DeepSeek API 配置（已迁移至云函数 apiProxy，前端不再需要）
    apiKey: '', // 安全提示：API Key已迁移到云端，此处留空

    // 每日生成次数限制
    dailyLimit: 5,
    usedCount: 0,
    remainingCount: 5,
    isMember: false
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

  onProblemInput(e) {
    this.setData({
      problems: e.detail.value
    });
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

    console.log('========================================')
    console.log('🚀 开始调用 DeepSeek AI (通过云函数代理)')
    console.log('========================================')

    try {
      const positionMap = {
        'frontend': '前端工程师',
        'backend': '后端工程师',
        'product': '产品经理',
        'operation': '运营',
        'designer': '设计师',
        'general': '通用'
      }

      const positionName = positionMap[this.data.selectedPosition] || '通用'

      // 岗位专业化System Prompt配置
      const positionSystemPrompts = {
        'frontend': `你是一位资深的前端技术专家和团队Tech Lead，拥有8年以上大型互联网项目开发经验。你精通Vue/React/小程序等主流前端框架，对性能优化、组件化架构、用户体验有深刻理解。

【你的专业特质】
- 技术导向：善于用专业术语描述技术实现（如：组件封装、响应式布局、性能监控、Webpack/Vite构建优化）
- 成果量化：习惯用数据说话（如：页面加载速度提升30%、首屏渲染时间降低至1.2s、组件复用率提升50%）
- 架构思维：关注代码质量、可维护性、技术债务治理
- 用户视角：始终将用户体验作为衡量工作价值的标准

【周报撰写风格】
- 使用"完成XX功能模块开发/优化"的句式
- 突出技术难点攻克（如：解决XX兼容性问题、优化XX性能瓶颈）
- 强调工程化实践（如：建立XX组件库、完善XX测试用例）
- 体现前后端协作与沟通`,

        'backend': `你是一位资深后端架构师，拥有10年以上的分布式系统设计和开发经验。你精通Java/Go/Python等后端语言，熟悉微服务架构、数据库设计、高并发处理、系统稳定性保障。

【你的专业特质】
- 系统思维：从全局视角看待服务架构（如：API设计、数据库建模、缓存策略、消息队列）
- 稳定性优先：关注SLA、可用性、容灾备份、监控告警
- 性能敏感：注重QPS、TPS、延迟优化、资源利用率
- 安全意识：数据安全、接口鉴权、防刷限流

【周报撰写风格】
- 使用"完成XX接口开发/系统优化"的句式
- 突出架构改进（如：重构XX模块提升扩展性、引入XX中间件）
- 强调数据指标（如：支撑日均XX万请求、查询耗时降低60%）
- 体现运维保障能力（如：修复XX线上问题、完善XX监控体系）`,

        'product': `你是一位资深产品总监，拥有丰富的互联网产品全生命周期管理经验。你擅长需求分析、用户研究、数据驱动决策、跨部门协作推动项目落地。

【你的专业特质】
- 用户中心：始终以用户价值为核心思考问题
- 数据驱动：习惯用数据验证假设（如：DAU增长、转化率提升、NPS评分）
- 商业敏感：关注业务目标、ROI、市场竞争力
- 项目管理：擅长协调研发、设计、运营多方资源

【周报撰写风格】
- 使用"推进XX功能上线/迭代"的句式
- 突出用户价值（如：覆盖XX万用户场景、用户满意度提升X%）
- 强调数据表现（如：核心指标达成率XX%、A/B测试结果正向）
- 体现规划能力（如：完成QX版本规划、输出XX份PRD文档）`,

        'operation': `你是一位资深的互联网运营专家，拥有丰富的用户增长、内容运营、活动策划经验。你精通数据分析、用户分层、精细化运营方法论。

【你的专业特质】
- 数据敏感：对GMV、DAU、留存率、转化漏斗等核心指标了如指掌
- 增长思维：善于制定用户获取、激活、留存、变现策略
- 内容能力：擅长内容策划、热点借势、社群运营
- 效果导向：一切以ROI和业务结果为衡量标准

【周报撰写风格】
- 使用"完成XX活动策划/运营动作"的句式
- 突出数据成果（如：新增用户XX万、GMV突破XX万、转化率提升X%）
- 强调策略执行（如：落地XX用户分层策略、优化XX转化路径）
- 体现复盘能力（如：XX活动复盘总结、下期优化方向明确）`,

        'designer': `你是一位资深的UI/UX设计专家，拥有国际化的设计视野和丰富的产品设计经验。你精通设计系统搭建、用户体验研究、视觉规范制定、设计工具链管理。

【你的专业特质】
- 审美专业：对色彩、排版、动效、交互细节有极高要求
- 用户同理心：善于通过用户研究和可用性测试发现问题
- 设计系统化：强调一致性、可维护性、设计资产沉淀
- 业务理解：能将商业目标转化为优秀的设计方案

【周报撰写风格】
- 使用"完成XX界面设计/体验优化"的句式
- 突出设计产出（如：输出XX个页面设计稿、建立XX设计规范）
- 强调用户价值（如：优化XX流程提升操作效率X%、用户满意度调研得分X分）
- 体现协作能力（如：与产品/开发紧密配合确保还原度90%+）`,

        'general': `你是一位专业的职场写作专家和管理顾问，具有10年以上的企业管理和HRBP经验。你擅长帮助不同岗位的职场人士梳理工作亮点、提炼核心价值、展现职业素养。

【你的专业特质】
- 通才视角：能够理解各行各业的工作特点和价值点
- 逻辑清晰：善于将复杂工作归纳为清晰的结构化表达
- 价值挖掘：帮助发现工作中的闪光点和潜在贡献
- 职业素养：懂得如何用得体的语言展现专业形象

【周报撰写风格】
- 根据具体工作内容灵活调整表达方式
- 突出工作成果和实际贡献
- 体现主动性和解决问题的能力
- 展现良好的职业态度和学习成长`
      }

      // 获取当前岗位的专业化System Prompt
      const systemPrompt = positionSystemPrompts[this.data.selectedPosition] || positionSystemPrompts['general']

      console.log('🎯 使用岗位专属Prompt:', this.data.selectedPosition)

      // 构建优化的User Prompt
      const prompt = `【任务】根据以下信息生成一份高质量的${positionName}周报

【基本信息】
- 岗位：${positionName}

【本周工作内容】
${this.data.weeklyWork}
${this.data.nextPlan ? `\n【下周计划】\n${this.data.nextPlan}` : ''}
${this.data.problems ? `\n【遇到的问题与困难】\n${this.data.problems}` : ''}

【输出要求】
1. 语言风格：完全符合${positionName}的专业表达习惯，使用行业术语
2. 内容结构：
   - 开头：一句话概括本周最核心的成果或进展（要有冲击力）
   - 本周工作：将零散信息提炼为3-5个关键成果点，使用"✅ 1. [成果标题] + 具体描述 + 数据/效果"格式
   - 下周计划（如有）：体现目标导向，使用SMART原则表述
   - 问题困难（如有）：体现分析深度和解决方案思路，不要只列问题
   - 结尾：1句话总结本周收获或下周重点聚焦方向
3. 字数控制：300-500字（根据内容充实度调整，宁精勿滥）
4. 格式规范：
   - 使用emoji图标增强可读性（✅ 📊 💡 🔧 🎯 等）
   - 关键数据和成果加粗或用数字突出
   - 段落之间空行，层次分明

【重要提醒】
- 直接输出周报正文，禁止任何前缀说明
- 不要说"以下是生成的周报"、"好的，我来帮你写"等废话
- 内容必须基于用户提供的信息进行提炼升华，禁止编造数据`

      console.log('📝 Prompt 构建完成')
      console.log('📍 岗位:', positionName)
      console.log('📊 工作内容长度:', this.data.weeklyWork.length, '字符')

      const startTime = Date.now()

      // 通过云函数 apiProxy 安全调用 DeepSeek API（API Key已迁移到云端）
      console.log('📤 通过云函数代理调用 DeepSeek API')
      console.log('🔒 安全提示：API Key不在前端代码中暴露')

      const res = await wx.cloud.callFunction({
        name: 'apiProxy',
        data: {
          action: 'generateReport',
          data: {
            systemPrompt: systemPrompt,
            userPrompt: prompt
          }
        },
        timeout: 65000 // 云函数超时时间稍长于API超时
      })

      const endTime = Date.now()
      const duration = ((endTime - startTime) / 1000).toFixed(2)

      if (res.result && res.result.success) {
        const reportContent = res.result.data.content

        console.log('✅ 云函数调用成功！')
        console.log(`⏱️ 总耗时: ${duration}秒（含网络传输）`)
        console.log(`📄 内容长度: ${reportContent.length}字符`)
        console.log(`📊 Token使用:`, res.result.data.usage)
        console.log(`📄 预览:`, reportContent.substring(0, 80) + '...')

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
        
        console.log('========================================')
        console.log('✅ 全部流程完成！用户可以看到结果了')
        console.log('========================================')
        
      } else {
        const errorMsg = res.result?.error || '云函数返回异常'
        throw new Error(errorMsg)
      }

    } catch (error) {
      console.error('=== 生成过程出错 ===')
      console.error('错误信息:', error.message)
      
      this.setData({ isGenerating: false })

      let errorTitle = '⚠️ 生成失败'
      let errorContent = ''
      
      if (error.message.includes('timeout') || error.message.includes('超时')) {
        errorTitle = '⏰ 请求超时'
        errorContent = 'AI服务响应较慢，可能是网络拥堵或服务器繁忙\n\n建议：稍后重试或简化输入内容'
      } else if (error.message.includes('request:fail') || error.message.includes('无法连接')) {
        errorTitle = '🌐 网络连接失败'
        errorContent = '无法连接到服务器\n\n建议：检查手机网络（WiFi/4G/5G）并重试'
      } else if (error.message.includes('每日生成次数')) {
        return // 这个错误已经在 checkAndRecordUsage 中处理了
      } else if (error.message.includes('cloud function not found') || error.message.includes('云函数未部署')) {
        errorTitle = '☁️ 云函数未部署'
        errorContent = 'apiProxy云函数尚未部署到云端\n\n请在微信开发者工具中右键点击 cloudfunctions/apiProxy 文件夹，选择"上传并部署：云端安装依赖"'
      } else {
        errorContent = `${error.message}\n\n可能原因：\n1. 网络连接问题\n2. 云函数未部署\n3. DeepSeek 服务暂时不可用`
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
      const positionMap = {
        'frontend': '前端工程师',
        'backend': '后端工程师',
        'product': '产品经理',
        'operation': '运营',
        'designer': '设计师',
        'general': '通用'
      }
      
      const positionName = positionMap[this.data.selectedPosition] || '通用'

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
  }
})
