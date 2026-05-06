/**
 * 数据统计与分析工具库
 * 
 * 功能模块：
 * 1. 个人数据中心（使用数据记录与统计）
 * 2. 统计维度分析（时间/内容/行为/价值）
 * 3. 成就徽章系统（解锁条件检测）
 * 4. 月度/年度报告生成
 */

/**
 * 统计维度枚举
 */
const STATS_DIMENSIONS = {
  // 时间维度
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  
  // 内容维度
  BY_POSITION: 'byPosition',
  BY_LENGTH: 'byLength',
  BY_TEMPLATE: 'byTemplate',
  
  // 行为维度
  PEAK_HOURS: 'peakHours',
  AVERAGE_TIME: 'averageTime',
  REPEAT_RATE: 'repeatRate',
  
  // 价值维度
  TIME_SAVED: 'timeSaved',
  REPORTS_GENERATED: 'reportsGenerated',
  EFFICIENCY_SCORE: 'efficiencyScore'
}

/**
 * 成就徽章定义
 */
const ACHIEVEMENTS = {
  // 🏆 成就类
  FIRST_USE: {
    id: 'first_use',
    name: '🌟 初次生成',
    desc: '完成第一次周报生成',
    icon: '🌟',
    category: 'achievement',
    condition: (stats) => stats.totalReports >= 1,
    reward: '解锁基础功能'
  },
  
  STREAK_7: {
    id: 'streak_7',
    name: '🔥 连续打卡7天',
    desc: '连续7天生成周报',
    icon: '🔥',
    category: 'achievement',
    condition: (stats) => stats.currentStreak >= 7,
    reward: '获得"坚持达人"称号'
  },
  
  STREAK_30: {
    id: 'streak_30',
    name: '💪 坚持一个月',
    desc: '连续30天生成周报',
    icon: '💪',
    category: 'achievement',
    condition: (stats) => stats.currentStreak >= 30,
    reward: '获得月度坚持徽章'
  },
  
  HUNDRED_REPORTS: {
    id: 'hundred_reports',
    name: '💯 百人斩',
    desc: '累计生成100份周报',
    icon: '💯',
    category: 'achievement',
    condition: (stats) => stats.totalReports >= 100,
    reward: '解锁高级模板'
  },
  
  POSITION_MASTER: {
    id: 'position_master',
    name: '🎓 岗位大师',
    desc: '使用过6个及以上不同岗位',
    icon: '🎓',
    category: 'achievement',
    condition: (stats) => stats.uniquePositions >= 6,
    reward: '解锁自定义岗位功能'
  },
  
  SPEED_DEMON: {
    id: 'speed_demon',
    name: '⚡ 效率超人',
    desc: '单日生成10份以上周报',
    icon: '⚡',
    category: 'achievement',
    condition: (stats) => stats.maxDailyReports >= 10,
    reward: '获得效率加速器'
  },

  // 📈 数据类
  KNOWLEDGE_COLLECTOR: {
    id: 'knowledge_collector',
    name: '📚 知识库达人',
    desc: '收藏50条常用语料',
    icon: '📚',
    category: 'data',
    condition: (stats) => stats.savedPhrases >= 50,
    reward: '解锁语料库高级搜索'
  },
  
  PRECISION_SHOOTER: {
    id: 'precision_shooter',
    name: '🎯 精准射手',
    desc: '字数控制在目标±10%以内',
    icon: '🎯',
    category: 'data',
    condition: (stats) => stats.precisionRate >= 0.8,
    reward: '获得精准控制能力'
  },
  
  EARLY_BIRD: {
    id: 'early_bird',
    name: '🕐 守时先锋',
    desc: '每周五前完成周报',
    icon: '🕐',
    category: 'data',
    condition: (stats) => stats.onTimeRate >= 0.8,
    reward: '获得时间管理大师'
  },

  // 🎨 个性类
  TEMPLATE_DESIGNER: {
    id: 'template_designer',
    name: '🎨 模板设计师',
    desc: '创建并保存3个以上自定义模板',
    icon: '🎨',
    category: 'personal',
    condition: (stats) => stats.customTemplates >= 3,
    reward: '解锁模板市场'
  },
  
  LEARNER: {
    id: 'learner',
    name: '📖 学习者',
    desc: '阅读帮助文档和教程',
    icon: '📖',
    category: 'personal',
    condition: (stats) => docsReadCount >= 5,
    reward: '获得学习积分'
  },
  
  SOCIAL_BUTTERFLY: {
    id: 'social_butterfly',
    name: '💌 社交达人',
    desc: '分享给3位以上好友',
    icon: '💌',
    category: 'personal',
    condition: (stats) => stats.shareCount >= 3,
    reward: '获得社交影响力'
  }
}

/**
 * 默认统计数据结构
 */
const DEFAULT_STATS = {
  // 核心数据
  totalReports: 0,           // 总生成次数
  todayReports: 0,          // 今日生成次数
  weekReports: 0,            // 本周生成次数
  monthReports: 0,           // 本月生成次数
  
  // 时间相关
  lastReportTime: null,      // 最后生成时间
  currentStreak: 0,          // 当前连续天数
  maxStreak: 0,              // 最长连续天数
  firstUseDate: null,        // 首次使用日期
  
  // 内容相关
  uniquePositions: 0,        // 使用过的不同岗位数
  totalWordsGenerated: 0,     // 总生成字数
  avgWordCount: 0,           // 平均每份字数
  favoritePosition: '',       // 最常用的岗位
  
  // 效率相关
  totalTimeSaved: 0,         // 累计节省时间（分钟）
  avgGenerationTime: 0,       // 平均生成耗时（秒）
  maxDailyReports: 0,         // 单日最大生成数
  
  // 质量相关
  onTimeRate: 0.8,           // 准时提交率
  precisionRate: 0,          // 字数精准率
  
  // 社交相关
  shareCount: 0,             // 分享次数
  savedPhrases: 0,           // 收藏语料数
  customTemplates: 0,         // 自定义模板数
  
  // 历史记录（用于趋势图）
  dailyHistory: [],           // 近30天每日数据 [{date, count}]
  positionDistribution: {},   // 岗位分布 {positionName: count}
  hourlyActivity: {}          // 每小时活跃度 {hour: count}
}

class StatisticsManager {
  constructor() {
    this.statsKey = 'userStatistics'
    this.historyKey = 'reportHistory'
  }

  /**
   * 初始化统计系统
   */
  init() {
    let stats = wx.getStorageSync(this.statsKey)
    
    if (!stats || !stats.totalReports) {
      stats = { ...DEFAULT_STATS }
      this._saveStats(stats)
    }
    
    return stats
  }

  /**
   * 记录一次周报生成事件
   */
  async recordReport(positionId, wordCount, generationTime) {
    const stats = this.getStats()
    
    // 更新核心数据
    stats.totalReports++
    stats.todayReports++
    stats.weekReports++
    stats.monthReports++
    stats.totalWordsGenerated += wordCount
    
    // 更新时间相关
    const now = new Date()
    stats.lastReportTime = now.toISOString()
    
    if (!stats.firstUseDate) {
      stats.firstUseDate = now.toISOString()
    }
    
    // 计算连续天数
    this._updateStreak(stats)
    
    // 更新岗位统计
    this._updatePositionStats(stats, positionId)
    
    // 更新效率统计
    this._updateEfficiencyStats(stats, wordCount, generationTime)
    
    // 记录历史数据（用于趋势图）
    this._recordDailyHistory(stats)
    
    // 记录每小时活动
    this._recordHourlyActivity(stats)
    
    // 计算累计节省时间（假设手动写需要30分钟，AI只需1分钟）
    stats.totalTimeSaved += 29 // 分钟
    
    // 保存更新后的统计数据
    this._saveStats(stats)
    
    // 检查新成就
    return this._checkNewAchievements(stats)
  }

  /**
   * 获取当前统计数据
   */
  getStats() {
    let stats = wx.getStorageSync(this.statsKey)
    if (!stats) {
      stats = this.init()
    }
    return stats
  }

  /**
   * 获取格式化的统计数据（用于UI展示）
   */
  getFormattedStats() {
    const stats = this.getStats()
    
    return {
      // 核心指标卡片
      cards: [
        {
          title: '总生成数',
          value: stats.totalReports,
          unit: '份',
          icon: '📊',
          color: '#667eea',
          trend: this._getTrend(stats.totalReports, 'up')
        },
        {
          title: '节省时间',
          value: this._formatTime(stats.totalTimeSaved),
          unit: '',
          icon: '⏰',
          color: '#48bb78',
          trend: this._getTrend(stats.totalTimeSaved, 'up')
        },
        {
          title: '使用岗位',
          value: stats.uniquePositions,
          unit: '个',
          icon: '💼',
          color: '#ed8936',
          trend: null
        },
        {
          title: '连续打卡',
          value: stats.currentStreak,
          unit: '天',
          icon: '🔥',
          color: '#f56565',
          trend: stats.currentStreak > 7 ? 'up' : null
        }
      ],
      
      // 岗位分布
      positionDistribution: this._formatPositionDistribution(stats.positionDistribution),
      
      // 高峰时段
      peakHours: this._findPeakHours(stats.hourlyActivity),
      
      // 本周趋势
      weeklyTrend: this._getWeeklyTrend(stats.dailyHistory),
      
      // 成就列表
      achievements: this._getAllAchievements(stats),
      
      // 效率评分
      efficiencyScore: this._calculateEfficiencyScore(stats),
      
      // 月度概览
      monthlyOverview: this._generateMonthlyOverview(stats)
    }
  }

  /**
   * 生成月度报告
   */
  generateMonthlyReport(year, month) {
    const stats = this.getStats()
    const monthData = this._filterByMonth(stats.dailyHistory, year, month)
    
    if (monthData.length === 0) {
      return {
        success: false,
        message: '该月暂无数据'
      }
    }
    
    const totalReports = monthData.reduce((sum, day) => sum + day.count, 0)
    const activeDays = monthData.length
    const avgPerDay = (totalReports / activeDays).toFixed(1)
    
    // 找出最勤奋的一天
    const mostProductiveDay = monthData.reduce((max, day) => 
      day.count > max.count ? day : max, monthData[0])
    
    // 最常用岗位
    const topPosition = Object.entries(stats.positionDistribution)
      .sort((a, b) => b[1] - a[1])[0]
    
    return {
      success: true,
      data: {
        period: `${year}年${month}月`,
        
        overview: {
          totalReports,
          activeDays,
          avgPerDay,
          uniquePositions: stats.uniquePositions,
          timeSaved: this._formatTime(
            Math.min(totalReports * 29, stats.totalTimeSaved)
          )
        },
        
        highlights: {
          mostProductiveDay: mostProductiveDay,
          topPosition: topPosition ? topPosition[0] : '未知',
          avgGenerationTime: `${stats.avgGenerationTime.toFixed(1)}秒`
        },
        
        growth: {
          comparedToLastMonth: this._compareWithLastMonth(totalRecords),
          efficiencyRanking: this._calculateEfficiencyRanking(stats)
        },
        
        newBadges: this._getNewBadgesThisMonth(stats),
        
        suggestions: this._generateSuggestions(stats)
      }
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 保存统计数据到本地
   * @private
   */
  _saveStats(stats) {
    try {
      wx.setStorageSync(this.statsKey, stats)
    } catch (error) {
      console.error('保存统计数据失败:', error)
    }
  }

  /**
   * 更新连续打卡天数
   * @private
   */
  _updateStreak(stats) {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const lastReport = stats.lastReportTime ? 
      new Date(stats.lastReportTime).toDateString() : null
    
    if (lastReport === today) {
      // 今天已生成过，不增加
      return
    } else if (lastReport === yesterday || !lastReport) {
      // 昨天生成了或首次，连续+1
      stats.currentStreak++
      if (stats.currentStreak > stats.maxStreak) {
        stats.maxStreak = stats.currentStreak
      }
    } else {
      // 中断了，重置为1
      stats.currentStreak = 1
    }
  }

  /**
   * 更新岗位统计
   * @private
   */
  _updatePositionStats(stats, positionId) {
    // 获取岗位名称
    const POSITION_LIST = require('./constants').POSITION_LIST
    const position = POSITION_LIST.find(p => p.id === positionId)
    const positionName = position ? position.name : '未知'
    
    // 更新岗位分布
    if (!stats.positionDistribution[positionName]) {
      stats.positionDistribution[positionName] = 0
      stats.uniquePositions++
    }
    stats.positionDistribution[positionName]++
    
    // 更新最常用岗位
    const entries = Object.entries(stats.positionDistribution)
    if (entries.length > 0) {
      const sorted = entries.sort((a, b) => b[1] - a[1])
      stats.favoritePosition = sorted[0][0]
    }
    
    // 更新单日最大值
    if (stats.todayReports > stats.maxDailyReports) {
      stats.maxDailyReports = stats.todayReports
    }
  }

  /**
   * 更新效率统计
   * @private
   */
  _updateEfficiencyStats(stats, wordCount, generationTime) {
    // 更新平均字数
    if (stats.totalReports > 0) {
      stats.avgWordCount = Math.round(
        (stats.avgWordCount * (stats.totalReports - 1) + wordCount) / stats.totalReports
      )
    } else {
      stats.avgWordCount = wordCount
    }
    
    // 更新平均耗时
    if (generationTime && generationTime > 0) {
      if (stats.avgGenerationTime > 0) {
        stats.avgGenerationTime = (
          (stats.avgGenerationTime * (stats.totalReports - 1) + generationTime) / 
          stats.totalReports
        )
      } else {
        stats.avgGenerationTime = generationTime
      }
    }
  }

  /**
   * 记录每日历史数据
   * @private
   */
  _recordDailyHistory(stats) {
    const today = new Date().toISOString().split('T')[0]
    
    // 查找今天是否已有记录
    const existingIndex = stats.dailyHistory.findIndex(item => item.date === today)
    
    if (existingIndex >= 0) {
      // 更新今天的计数
      stats.dailyHistory[existingIndex].count++
    } else {
      // 添加新的日期记录
      stats.dailyHistory.push({
        date: today,
        count: 1
      })
      
      // 只保留最近90天的数据
      if (stats.dailyHistory.length > 90) {
        stats.dailyHistory = stats.dailyHistory.slice(-90)
      }
    }
  }

  /**
   * 记录每小时活动
   * @private
   */
  _recordHourlyActivity(stats) {
    const hour = new Date().getHours()
    
    if (!stats.hourlyActivity[hour]) {
      stats.hourlyActivity[hour] = 0
    }
    stats.hourlyActivity[hour]++
  }

  /**
   * 检查新成就
   * @private
   */
  _checkNewAchievements(stats) {
    const newBadges = []
    
    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
      // 检查是否已获得
      const alreadyUnlocked = stats.unlockedAchievements && 
        stats.unlockedAchievements.includes(key)
      
      if (!alreadyUnlocked && achievement.condition(stats)) {
        newBadges.push(achievement)
        
        // 记录解锁时间
        if (!stats.unlockedAchievements) {
          stats.unlockedAchievements = []
        }
        stats.unlockedAchievements.push(key)
        
        this._saveStats(stats)
      }
    }
    
    return newBadges
  }

  /**
   * 获取所有成就状态
   * @private
   */
  _getAllAchievements(stats) {
    const unlocked = stats.unlockedAchievements || []
    
    return Object.values(ACHIEVEMENTS).map(achievement => ({
      ...achievement,
      unlocked: unlocked.includes(achievement.id),
      unlockTime: stats.achievementUnlockTimes?.[achievement.id]
    }))
  }

  /**
   * 格式化时间显示
   * @private
   */
  _formatTime(minutes) {
    if (minutes < 60) {
      return `${minutes}分钟`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}小时${mins}分`
    } else {
      const days = Math.floor(minutes / 1440)
      const hours = Math.floor((minutes % 1440) / 60)
      return `${days}天${hours}小时`
    }
  }

  /**
   * 格式化岗位分布数据
   * @private
   */
  _formatPositionDistribution(distribution) {
    if (!distribution || Object.keys(distribution).length === 0) {
      return []
    }
    
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)
    
    return Object.entries(distribution)
      .map(([name, count]) => ({
        name,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * 找出高峰时段
   * @private
   */
  _findPeakHours(hourlyActivity) {
    if (!hourlyActivity || Object.keys(hourlyActivity).length === 0) {
      return []
    }
    
    const sorted = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        label: `${hour}:00-${parseInt(hour)+1}:00`
      }))
      .sort((a, b) => b.count - a.count)
    
    // 返回前3个高峰时段
    return sorted.slice(0, 3)
  }

  /**
   * 获取本周趋势数据
   * @private
   */
  _getWeeklyTrend(dailyHistory) {
    if (!dailyHistory || dailyHistory.length === 0) {
      return Array(7).fill(0)
    }
    
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const today = new Date().getDay()
    
    // 获取最近7天的数据
    const trend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayData = dailyHistory.find(item => item.date === dateStr)
      trend.push({
        day: days[date.getDay()],
        date: dateStr,
        count: dayData ? dayData.count : 0
      })
    }
    
    return trend
  }

  /**
   * 计算效率评分 (0-100)
   * @private
   */
  _calculateEfficiencyScore(stats) {
    let score = 50 // 基础分
    
    // 频率得分 (最高20分)
    if (stats.weekReports >= 1) score += 15
    else if (stats.todayReports >= 1) score += 10
    
    // 连续性得分 (最高20分)
    score += Math.min(20, stats.currentStreak * 2)
    
    // 多样性得分 (最高15分)
    score += Math.min(15, stats.uniquePositions * 3)
    
    // 效率得分 (最高25分)
    if (stats.avgGenerationTime < 5) score += 20
    else if (stats.avgGenerationTime < 10) score += 15
    else if (stats.avgGenerationTime < 20) score += 10
    
    // 准时性得分 (最高20分)
    score += Math.round(stats.onTimeRate * 20)
    
    return Math.min(100, Math.max(0, score))
  }

  /**
   * 生成月度概览
   * @private
   */
  _generateMonthlyOverview(stats) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // 过滤本月数据
    const monthData = stats.dailyHistory.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= monthStart
    })
    
    return {
      totalReports: monthData.reduce((sum, d) => sum + d.count, 0),
      activeDays: monthData.length,
      avgDaily: monthData.length > 0 ?
        (monthData.reduce((sum, d) => sum + d.count, 0) / monthData.length).toFixed(1) : 0
    }
  }

  /**
   * 获取趋势方向
   * @private
   */
  _getTrend(value, defaultDirection) {
    // 简化处理，实际应该对比历史数据
    if (value <= 1) return null
    if (value <= 5) return 'new'
    if (value <= 20) return 'up'
    return 'hot'
  }

  /**
   * 按月份过滤历史数据
   * @private
   */
  _filterByMonth(history, year, month) {
    return history.filter(item => {
      const d = new Date(item.date)
      return d.getFullYear() === year && (d.getMonth() + 1) === month
    })
  }

  /**
   * 与上月对比
   * @private
   */
  _compareWithLastMonth(currentTotal) {
    // 简化实现，实际应读取上月数据
    return {
      change: '+12%',
      direction: 'up',
      description: '比上月增长12%，继续保持！'
    }
  }

  /**
   * 计算效率排名百分比
   * @private
   */
  _calculateEfficiencyRanking(stats) {
    const score = this._calculateEfficiencyScore(stats)
    
    // 模拟排名（实际需要云端对比）
    if (score >= 80) return { rank: 'Top 10%', level: 'excellent' }
    if (score >= 60) return { rank: 'Top 30%', level: 'good' }
    if (score >= 40) return { rank: 'Top 50%', level: 'average' }
    return { rank: 'Top 70%', level: 'improving' }
  }

  /**
   * 获取本月新获得的徽章
   * @private
   */
  _getNewBadgesThisMonth(stats) {
    // 简化实现
    const recentBadges = (stats.unlockedAchievements || [])
      .slice(-3)
      .map(id => ACHIEVEMENTS[id])
      .filter(Boolean)
    
    return recentBadges
  }

  /**
   * 生成个性化建议
   * @private
   */
  _generateSuggestions(stats) {
    const suggestions = []
    
    // 基于使用频率
    if (stats.currentStreak < 3) {
      suggestions.push({
        type: 'habit',
        icon: '🔥',
        text: '建议养成每周固定时间写周报的习惯'
      })
    }
    
    // 基于岗位多样性
    if (stats.uniquePositions <= 2) {
      suggestions.push({
        type: 'explore',
        icon: '💼',
        text: `可以尝试"${this._suggestNewPosition(stats)}"岗位的周报`
      })
    }
    
    // 基于效率
    if (stats.avgGenerationTime > 15) {
      suggestions.push({
        type: 'efficiency',
        icon: '⚡',
        text: '尝试使用工作模板功能，可提升生成速度'
      })
    }
    
    // 基于准时性
    if (stats.onTimeRate < 0.6) {
      suggestions.push({
        type: 'time',
        icon: '🕐',
        text: '建议在周四或周五前完成周报，避免周末加班'
      })
    }
    
    return suggestions.slice(0, 3) // 最多返回3条建议
  }

  /**
   * 推荐新岗位
   * @private
   */
  _suggestNewPosition(stats) {
    const usedPositions = Object.keys(stats.positionDistribution || {})
    const ALL_POSITIONS = ['产品经理', '运营', '设计师', '测试工程师', '项目经理']
    
    for (const pos of ALL_POSITIONS) {
      if (!usedPositions.includes(pos)) {
        return pos
      }
    }
    
    return '新领域探索'
  }
}

// 导出单例实例
const statisticsManager = new StatisticsManager()

module.exports = {
  statisticsManager,
  STATS_DIMENSIONS,
  ACHIEVEMENTS,
  DEFAULT_STATS
}
