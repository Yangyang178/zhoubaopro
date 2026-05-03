// history.js
const { POSITION_MAP, STORAGE_KEYS } = require('../../utils/constants')
const { showSuccess } = require('../../utils/errorHandler')
const { getCache, setCache, CACHE_DURATION } = require('../../utils/cache')

Page({
  data: {
    reportList: [],
    isLoading: false,
    useCloudDB: false,  // 标记是否使用云数据库
    
    // 分页配置
    currentPage: 1,
    pageSize: 10,        // 每页加载数量
    hasMore: true,       // 是否还有更多数据
    isLoadingMore: false,// 是否正在加载更多
    totalCount: 0        // 总记录数
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
    
    // 重置分页状态
    this.setData({
      currentPage: 1,
      hasMore: true,
      reportList: []
    })
    
    this.loadHistory()
  },

  onShow() {
    // 仅在首次加载或从其他页面返回时刷新
    if (!this.data.reportList || this.data.reportList.length === 0) {
      this.loadHistory()
    }
  },

  async loadHistory(isLoadMore = false) {
    if (isLoadMore) {
      if (this.data.isLoadingMore || !this.data.hasMore) return
      this.setData({ isLoadingMore: true })
    } else {
      this.setData({ 
        isLoading: true,
        currentPage: 1,
        hasMore: true,
        reportList: []
      })
    }

    const page = isLoadMore ? this.data.currentPage : 1

    try {
      // 尝试从缓存获取（仅首页）
      if (!isLoadMore) {
        const cachedData = getCache('history_list')
        if (cachedData && cachedData.length > 0) {
          console.log('✅ 使用缓存的历史记录')
          this.setData({
            reportList: cachedData,
            isLoading: false,
            hasMore: cachedData.length >= this.data.pageSize
          })
          return
        }
      }

      // 优先从云数据库加载
      if (this.data.useCloudDB && wx.cloud) {
        try {
          const res = await wx.cloud.callFunction({
            name: 'dbOperation',
            data: {
              action: 'list',
              data: {
                page: page,
                pageSize: this.data.pageSize
              }
            },
            timeout: 10000
          })

          if (res.result && res.result.success) {
            const cloudList = res.result.data.list || []
            const totalCount = res.result.data.total || 0
            
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

            console.log(`✅ 从云数据库加载第${page}页，${processedReports.length} 条记录`)

            // 合并或替换数据
            const newList = isLoadMore 
              ? [...this.data.reportList, ...processedReports]
              : processedReports

            // 缓存首页数据
            if (!isLoadMore && processedReports.length > 0) {
              setCache('history_list', processedReports, CACHE_DURATION.MEDIUM)
            }

            this.setData({
              reportList: newList,
              isLoading: false,
              isLoadingMore: false,
              currentPage: page + 1,
              hasMore: newList.length < totalCount,
              totalCount: totalCount
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

      // 降级方案：从本地存储加载（支持分页）
      const allReports = wx.getStorageSync(STORAGE_KEYS.REPORT_HISTORY) || []
      const totalCount = allReports.length
      const startIndex = (page - 1) * this.data.pageSize
      const endIndex = startIndex + this.data.pageSize
      const paginatedReports = allReports.slice(startIndex, endIndex)

      const processedReports = paginatedReports.map(report => ({
        ...report,
        positionName: POSITION_MAP[report.position] || '通用',
        timeAgo: this.formatTimeAgo(report.createTime),
        preview: this.getPreview(report.content),
        showMore: report.content.length > 150,
        isFromCloud: false
      }))

      console.log(`📦 从本地存储加载第${page}页，${processedReports.length} 条记录`)

      // 合并或替换数据
      const newList = isLoadMore 
        ? [...this.data.reportList, ...processedReports]
        : processedReports

      // 缓存首页数据
      if (!isLoadMore && processedReports.length > 0) {
        setCache('history_list', processedReports, CACHE_DURATION.MEDIUM)
      }

      this.setData({
        reportList: newList,
        isLoading: false,
        isLoadingMore: false,
        currentPage: page + 1,
        hasMore: newList.length < totalCount,
        totalCount: totalCount
      })
      
    } catch (error) {
      console.error('加载历史记录失败:', error)
      this.setData({ 
        isLoading: false,
        isLoadingMore: false
      })
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  /**
   * 加载更多历史记录（上拉触发）
   */
  loadMore() {
    if (this.data.hasMore && !this.data.isLoadingMore) {
      console.log('📜 加载更多历史记录...')
      this.loadHistory(true)
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
              let reports = wx.getStorageSync(STORAGE_KEYS.REPORT_HISTORY) || []
              reports = reports.filter(r => r.id !== id)
              wx.setStorageSync(STORAGE_KEYS.REPORT_HISTORY, reports)
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
            wx.removeStorageSync(STORAGE_KEYS.REPORT_HISTORY)
            
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
