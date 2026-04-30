// history.js
Page({
  data: {
    reportList: [],
    isLoading: false,
    useCloudDB: false  // 标记是否使用云数据库
  },

  onLoad() {
    // 初始化云开发
    if (wx.cloud) {
      wx.cloud.init({
        env: 'cloud1-d6gx2o3nae6823c0d',
        traceUser: true
      })
      this.setData({ useCloudDB: true })
    }
    
    this.loadHistory()
  },

  onShow() {
    this.loadHistory()
  },

  async loadHistory() {
    this.setData({ isLoading: true })

    try {
      // 优先从云数据库加载
      if (this.data.useCloudDB && wx.cloud) {
        try {
          const res = await wx.cloud.callFunction({
            name: 'dbOperation',
            data: {
              action: 'list',
              data: {
                page: 1,
                pageSize: 50
              }
            },
            timeout: 10000
          })

          if (res.result && res.result.success) {
            const cloudList = res.result.data.list || []
            
            // 处理云数据格式
            const processedReports = cloudList.map(report => ({
              id: report._id,  // 云数据库使用 _id
              content: report.content,
              position: report.position || '',
              positionName: report.positionName || '通用',
              createTime: this.formatCloudDate(report.createTime),
              timeAgo: this.formatTimeAgo(report.createTime),
              preview: this.getPreview(report.content),
              showMore: (report.content || '').length > 150,
              isFromCloud: true  // 标记来源
            }))

            console.log(`✅ 从云数据库加载 ${processedReports.length} 条记录`)

            this.setData({
              reportList: processedReports,
              isLoading: false
            })
            return
          } else {
            throw new Error(res.result?.error || '云加载失败')
          }
        } catch (cloudError) {
          console.warn('⚠️ 云数据库加载失败，降级到本地:', cloudError.message)
          // 降级到本地存储
        }
      }

      // 降级方案：从本地存储加载
      const reports = wx.getStorageSync('reportHistory') || []
      
      const positionMap = {
        'frontend': '前端工程师',
        'backend': '后端工程师',
        'product': '产品经理',
        'operation': '运营',
        'designer': '设计师',
        'general': '通用'
      }

      const processedReports = reports.map(report => ({
        ...report,
        positionName: positionMap[report.position] || '通用',
        timeAgo: this.formatTimeAgo(report.createTime),
        preview: this.getPreview(report.content),
        showMore: report.content.length > 150,
        isFromCloud: false
      }))

      console.log(`📦 从本地存储加载 ${processedReports.length} 条记录`)

      this.setData({
        reportList: processedReports,
        isLoading: false
      })
      
    } catch (error) {
      console.error('加载历史记录失败:', error)
      this.setData({ isLoading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 格式化云数据库的日期（ServerDate）
  formatCloudDate(serverDate) {
    if (!serverDate) return new Date().toISOString()
    
    // 处理不同格式的日期
    if (typeof serverDate === 'string') return serverDate
    if (serverDate instanceof Date) return serverDate.toISOString()
    if (serverDate.$date) return serverDate.$date
    
    return new Date().toISOString()
  },

  formatTimeAgo(dateInput) {
    let date
    
    try {
      if (!dateInput) return '未知时间'
      
      if (typeof dateInput === 'string') {
        date = new Date(dateInput)
      } else if (dateInput instanceof Date) {
        date = dateInput
      } else if (dateInput.$date) {
        date = new Date(dateInput.$date)
      } else {
        date = new Date()
      }
      
      if (isNaN(date.getTime())) return '未知时间'
      
      const now = new Date()
      const diff = now - date
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) return '刚刚'
      if (minutes < 60) return `${minutes}分钟前`
      if (hours < 24) return `${hours}小时前`
      if (days < 7) return `${days}天前`
      
      const month = date.getMonth() + 1
      const day = date.getDate()
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      
      return `${month}月${day}日 ${hour}:${minute}`
    } catch (error) {
      return '未知时间'
    }
  },

  getPreview(content) {
    if (!content) return ''
    if (content.length <= 150) return content
    return content.substring(0, 150) + '...'
  },

  viewDetail(e) {
    const index = e.currentTarget.dataset.index
    const report = this.data.reportList[index]
    
    wx.showModal({
      title: '📄 周报详情',
      content: report.content,
      showCancel: true,
      cancelText: '关闭',
      confirmText: '复制内容',
      success: (res) => {
        if (res.confirm) {
          this.copyReport(e)
        }
      }
    })
  },

  copyReport(e) {
    let index
    
    if (e.currentTarget.dataset.index !== undefined) {
      index = e.currentTarget.dataset.index
    } else if (e.type === 'tap') {
      index = e.currentTarget.dataset.index
    } else {
      index = e.detail.index || 0
    }

    const report = this.data.reportList[index]

    if (!report || !report.content) {
      wx.showToast({ title: '暂无内容', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: report.content,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500
        })

        wx.vibrateShort({ type: 'light' })
      }
    })
  },

  async deleteReport(e) {
    const id = e.currentTarget.dataset.id
    const index = e.currentTarget.dataset.index
    const report = this.data.reportList[index]

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条周报记录吗？删除后无法恢复。',
      confirmText: '删除',
      confirmColor: '#e53e3e',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 如果是云端数据，使用云函数删除
            if (report.isFromCloud && this.data.useCloudDB && wx.cloud) {
              try {
                const delRes = await wx.cloud.callFunction({
                  name: 'dbOperation',
                  data: {
                    action: 'delete',
                    data: { id: id }
                  },
                  timeout: 10000
                })

                if (!(delRes.result && delRes.result.success)) {
                  throw new Error(delRes.result?.error || '云删除失败')
                }

                console.log('✅ 已从云数据库删除')
              } catch (cloudDelError) {
                console.warn('⚠️ 云删除失败，仅从列表移除:', cloudDelError.message)
              }
            } else {
              // 本地数据删除
              let reports = wx.getStorageSync('reportHistory') || []
              reports = reports.filter(r => r.id !== id)
              wx.setStorageSync('reportHistory', reports)
            }

            this.loadHistory()

            wx.showToast({
              title: '已删除',
              icon: 'success',
              duration: 1500
            })

            wx.vibrateShort({ type: 'medium' })
          } catch (error) {
            console.error('删除失败:', error)
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  },

  async clearAllHistory() {
    if (this.data.reportList.length === 0) {
      wx.showToast({ title: '没有可清除的记录', icon: 'none' })
      return
    }

    wx.showModal({
      title: '⚠️ 危险操作',
      content: `确定要清空所有 ${this.data.reportList.length} 条历史记录吗？此操作不可撤销！`,
      confirmText: '确认清空',
      confirmColor: '#e53e3e',
      cancelText: '取消',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 如果有云端数据，先清空云端
            const hasCloudData = this.data.reportList.some(r => r.isFromCloud)
            
            if (hasCloudData && this.data.useCloudDB && wx.cloud) {
              try {
                const clearRes = await wx.cloud.callFunction({
                  name: 'dbOperation',
                  data: { action: 'clearAll' },
                  timeout: 30000  // 清空可能需要较长时间
                })

                if (clearRes.result && clearRes.result.success) {
                  console.log('✅ 云数据库已清空')
                } else {
                  throw new Error(clearRes.result?.error || '云清空失败')
                }
              } catch (cloudClearError) {
                console.warn('⚠️ 云清空失败:', cloudClearError.message)
                wx.showModal({
                  title: '部分成功',
                  content: '云数据库清空失败，仅清除本地显示。建议稍后重试。',
                  showCancel: false
                })
              }
            }

            // 同时清除本地缓存（兼容）
            wx.removeStorageSync('reportHistory')
            
            this.setData({ reportList: [] })

            wx.showToast({
              title: '已清空所有记录',
              icon: 'success',
              duration: 2000
            })

            wx.vibrateShort({ type: 'heavy' })
          } catch (error) {
            console.error('清空失败:', error)
            wx.showToast({ title: '清空失败', icon: 'none' })
          }
        }
      }
    })
  },

  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        wx.switchTab({ url: '/pages/index/index' })
      }
    })
  }
})
