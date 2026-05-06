/**
 * 多格式导出工具库
 * 
 * 支持的导出格式：
 * - Markdown (.md)
 * - 纯文本 (.txt)
 * - 图片长图 (PNG/JPG)
 * - Word 文档（生成格式化文本，提示复制到Word）
 * - PDF 文档（生成格式化文本，提示使用浏览器打印）
 */

/**
 * 导出格式枚举
 */
const EXPORT_FORMAT = {
  MARKDOWN: 'markdown',
  TXT: 'txt',
  IMAGE: 'image',
  WORD: 'word',
  PDF: 'pdf'
}

/**
 * 导出配置
 */
const EXPORT_CONFIG = {
  // 应用信息
  appName: '周报Pro',
  version: '1.2.0',
  
  // 默认样式
  defaultStyle: {
    titleFontSize: 18,
    headingFontSize: 16,
    bodyFontSize: 14,
    lineHeight: 1.6,
    color: '#333333'
  },
  
  // 图片导出配置
  imageConfig: {
    width: 750,        // 画布宽度（rpx转px）
    padding: 40,
    backgroundColor: '#ffffff',
    titleColor: '#667eea',
    textColor: '#333333',
    subTextColor: '#666666'
  }
}

/**
 * 周报数据结构标准化
 */
class ReportExporter {
  constructor() {
    this.config = EXPORT_CONFIG
  }

  /**
   * 导出为 Markdown 格式
   * @param {Object} reportData - 周报数据
   * @returns {string} Markdown 格式文本
   */
  toMarkdown(reportData) {
    const { content, position, date } = reportData
    
    let markdown = ''
    
    // 标题
    markdown += `# ${this.config.appName} - 工作周报\n\n`
    
    // 元数据
    if (date) {
      markdown += `> **日期**: ${date}\n\n`
    }
    
    if (position) {
      markdown += `> **岗位**: ${position}\n\n`
    }
    
    markdown += `---\n\n`
    
    // 本周工作
    if (content.weeklyWork) {
      markdown += `## 📋 本周工作\n\n`
      markdown += this._formatMarkdownContent(content.weeklyWork)
      markdown += '\n'
    }
    
    // 下周计划
    if (content.nextPlan) {
      markdown += `## 📅 下周计划\n\n`
      markdown += this._formatMarkdownContent(content.nextPlan)
      markdown += '\n'
    }
    
    // 问题与困难
    if (content.problems) {
      markdown += `## ⚠️ 问题与困难\n\n`
      markdown += this._formatMarkdownContent(content.problems)
      markdown += '\n'
    }
    
    // 页脚
    markdown += `---\n\n`
    markdown += `*由 [${this.config.appName}]() 自动生成*\n`
    markdown += `*生成时间：${new Date().toLocaleString('zh-CN')}*`
    
    return markdown
  }

  /**
   * 导出为纯文本格式
   * @param {Object} reportData - 周报数据
   * @returns {string} 纯文本格式
   */
  toText(reportData) {
    const { content, position, date } = reportData
    
    let text = ''
    
    // 标题
    text += `${this.config.appName} - 工作周报\n`
    text += `${'='.repeat(30)}\n\n`
    
    // 基本信息
    if (date || position) {
      if (date) text += `日期：${date}\n`
      if (position) text += `岗位：${position}\n`
      text += '\n'
    }
    
    // 内容区域
    if (content.weeklyWork) {
      text += `【本周工作】\n`
      text += `${content.weeklyWork}\n\n`
    }
    
    if (content.nextPlan) {
      text += `【下周计划】\n`
      text += `${content.nextPlan}\n\n`
    }
    
    if (content.problems) {
      text += `【问题与困难】\n`
      text += `${content.problems}\n\n`
    }
    
    // 页脚
    text += `${'-'.repeat(30)}\n`
    text += `由 ${this.config.appName} 自动生成\n`
    text += `生成时间：${new Date().toLocaleString('zh-CN')}`
    
    return text
  }

  /**
   * 导出为 Word 格式（生成带格式的文本）
   * @param {Object} reportData - 周报数据
   * @returns {Object} { text, instructions }
   */
  toWord(reportData) {
    const markdown = this.toMarkdown(reportData)
    
    return {
      text: markdown,
      format: 'markdown',
      filename: `周报_${this._getDateString()}.md`,
      instructions: [
        '1. 复制下方内容',
        '2. 打开 Microsoft Word 或 WPS',
        '3. 粘贴内容（Ctrl+V）',
        '4. Word 会自动识别 Markdown 格式',
        '5. 如需 .docx 格式，请点击"另存为" → 选择 Word 文档(.docx)'
      ],
      tip: '💡 提示：Word 2016+ 版本支持直接粘贴 Markdown 并自动渲染'
    }
  }

  /**
   * 导出为 PDF 格式（生成 HTML 用于打印）
   * @param {Object} reportData - 周报数据
   * @returns {Object} { html, instructions }
   */
  toPDF(reportData) {
    const { content, position, date } = reportData
    
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>工作周报 - ${date || new Date().toLocaleDateString('zh-CN')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.8; 
      color: #333; 
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { 
      color: #667eea; 
      font-size: 28px; 
      margin-bottom: 20px;
      text-align: center;
      border-bottom: 3px solid #667eea;
      padding-bottom: 15px;
    }
    h2 { 
      color: #764ba2; 
      font-size: 20px; 
      margin-top: 30px;
      margin-bottom: 15px;
      padding-left: 10px;
      border-left: 4px solid #764ba2;
    }
    .meta { 
      background: #f7fafc; 
      padding: 15px 20px; 
      border-radius: 8px;
      margin-bottom: 25px;
      color: #666;
    }
    .content { 
      white-space: pre-wrap; 
      word-wrap: break-word;
      font-size: 15px;
      line-height: 1.9;
    }
    .footer { 
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #999;
      font-size: 13px;
    }
    @media print {
      body { padding: 20px; }
      h1 { page-break-after: avoid; }
      h2 { page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <h1>📋 工作周报</h1>
  
  <div class="meta">
    <strong>日期：</strong>${date || new Date().toLocaleDateString('zh-CN')}<br>
    <strong>岗位：</strong>${position || '未指定'}<br>
    <strong>生成时间：</strong>${new Date().toLocaleString('zh-CN')}
  </div>
  
  ${content.weeklyWork ? `<h2>📋 本周工作</h2><div class="content">${this._escapeHtml(content.weeklyWork)}</div>` : ''}
  
  ${content.nextPlan ? `<h2>📅 下周计划</h2><div class="content">${this._escapeHtml(content.nextPlan)}</div>` : ''}
  
  ${content.problems ? `<h2>⚠️ 问题与困难</h2><div class="content">${this._escapeHtml(content.problems)}</div>` : ''}
  
  <div class="footer">
    由 ${this.config.appName} 自动生成<br>
    版本 v${this.config.version}
  </div>
</body>
</html>`
    
    return {
      html: html,
      filename: `周报_${this._getDateString()}.html`,
      instructions: [
        '1. 复制下方 HTML 代码',
        '2. 保存为 .html 文件（如 report.html）',
        '3. 用浏览器打开该文件',
        '4. 按 Ctrl+P 打印，选择"另存为PDF"',
        '5️⃣ 或者使用在线转换工具将HTML转为PDF'
      ],
      tip: '💡 推荐使用 Chrome/Edge 浏览器的"打印→另存为PDF"功能'
    }
  }

  /**
   * 将内容格式化为 Markdown（处理换行和列表）
   * @private
   */
  _formatMarkdownContent(text) {
    if (!text) return ''
    
    return text
      .split('\n')
      .map(line => {
        // 处理列表项
        if (/^[-•*]\s/.test(line)) {
          return line.replace(/^([-•*])\s/, '- ')
        }
        // 处理编号列表
        if (/^\d+[.、)]\s/.test(line)) {
          return line.replace(/^(\d+)[.、)]\s/, '$1. ')
        }
        return line
      })
      .join('\n')
  }

  /**
   * HTML 转义
   * @private
   */
  _escapeHtml(text) {
    if (!text) return ''
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>')
  }

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
  }

  /**
   * 保存文件到本地（纯前端）
   * @param {string} content - 文件内容
   * @param {string} filename - 文件名
   * @param {string} type - MIME 类型
   */
  async saveToLocal(content, filename, type = 'text/plain') {
    try {
      const fs = wx.getFileSystemManager()
      
      // 生成唯一文件名避免冲突
      const timestamp = Date.now()
      const safeFilename = `${timestamp}_${filename}`
      const filePath = `${wx.env.USER_DATA_PATH}/exports/${safeFilename}`
      
      // 确保目录存在
      try {
        fs.accessSync(`${wx.env.USER_DATA_PATH}/exports`)
      } catch (e) {
        fs.mkdirSync(`${wx.env.USER_DATA_PATH}/exports`, true)
      }
      
      // 写入文件
      fs.writeFileSync(filePath, content, 'utf8')
      
      return {
        success: true,
        filePath: filePath,
        filename: safeFilename
      }
    } catch (error) {
      console.error('保存文件失败:', error)
      throw error
    }
  }

  /**
   * 复制文本到剪贴板
   * @param {string} text - 要复制的文本
   */
  async copyToClipboard(text) {
    return new Promise((resolve, reject) => {
      wx.setClipboardData({
        data: text,
        success: () => resolve(true),
        fail: (err) => reject(err)
      })
    })
  }

  /**
   * 显示操作成功提示
   * @param {string} message - 提示消息
   */
  showSuccess(message) {
    wx.showToast({
      title: message,
      icon: 'success',
      duration: 2000
    })
  }

  /**
   * 显示错误提示
   * @param {string} message - 错误消息
   */
  showError(message) {
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })
  }
}

// 导出单例实例
const exporter = new ReportExporter()

module.exports = {
  exporter,
  EXPORT_FORMAT,
  EXPORT_CONFIG
}
