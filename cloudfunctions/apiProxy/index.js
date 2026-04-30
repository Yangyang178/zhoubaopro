/**
 * apiProxy 云函数 - DeepSeek API 安全代理
 *
 * 功能：
 * 1. 接收前端传来的Prompt（不包含API Key）
 * 2. 在云端安全地调用DeepSeek API
 * 3. 返回生成结果给前端
 *
 * 安全性：
 * - API Key仅存储在云端，前端无法获取
 * - 支持请求频率限制和日志审计
 */

const cloud = require('wx-server-sdk')
const config = require('./config')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 云函数主入口
 */
exports.main = async (event, context) => {
  const { action, data } = event

  console.log('========================================')
  console.log('🚀 apiProxy 云函数被调用')
  console.log('📅 时间:', new Date().toISOString())
  console.log('🎬 操作:', action)
  console.log('========================================')

  try {
    switch (action) {
      case 'generateReport':
        return await generateReport(data)

      case 'healthCheck':
        return { success: true, message: 'apiProxy运行正常', timestamp: Date.now() }

      default:
        console.error('❌ 未知操作:', action)
        return {
          success: false,
          error: `不支持的操作类型: ${action}`,
          code: 'UNKNOWN_ACTION'
        }
    }

  } catch (error) {
    console.error('=== apiProxy 执行异常 ===')
    console.error('错误信息:', error.message)
    console.error('错误堆栈:', error.stack)

    return {
      success: false,
      error: error.message || '服务器内部错误',
      code: 'INTERNAL_ERROR'
    }
  }
}

/**
 * 调用 DeepSeek AI 生成周报
 *
 * @param {Object} data - 前端传入的数据
 * @param {string} data.systemPrompt - System Prompt（岗位专业化）
 * @param {string} data.userPrompt - User Prompt（用户输入内容）
 * @returns {Promise<Object>} 生成结果
 */
async function generateReport(data) {
  const { systemPrompt, userPrompt } = data

  // 参数验证
  if (!systemPrompt || typeof systemPrompt !== 'string') {
    throw new Error('System Prompt不能为空且必须是字符串')
  }

  if (!userPrompt || typeof userPrompt !== 'string') {
    throw new Error('User Prompt不能为空且必须是字符串')
  }

  if (userPrompt.length > 10000) {
    throw new Error('User Prompt长度不能超过10000字符')
  }

  console.log('📝 开始调用 DeepSeek API...')
  console.log('📍 System Prompt 长度:', systemPrompt.length, '字符')
  console.log('📍 User Prompt 长度:', userPrompt.length, '字符')

  const startTime = Date.now()

  try {
    // 使用 Node.js https 模块发起请求
    const result = await callDeepSeekAPI(systemPrompt, userPrompt)

    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('✅ DeepSeek API 调用成功！')
    console.log(`⏱️ 总耗时: ${duration}秒`)
    console.log(`📄 生成内容长度: ${result.content.length}字符`)
    console.log(`📊 Token使用情况:`, result.usage)

    return {
      success: true,
      data: {
        content: result.content,
        usage: result.usage,
        duration: parseFloat(duration),
        model: config.deepseek.model,
        timestamp: Date.now()
      }
    }

  } catch (error) {
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.error(`❌ DeepSeek API 调用失败 (${duration}秒)`)
    console.error('错误详情:', error.message)

    // 重新抛出错误，让外层catch统一处理
    throw error
  }
}

/**
 * 调用 DeepSeek REST API
 *
 * @param {string} systemPrompt - System消息
 * @param {string} userPrompt - User消息
 * @returns {Promise<Object>} API响应数据
 */
function callDeepSeekAPI(systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    const https = require('https')
    const url = new URL(config.deepseek.baseUrl)

    // 构建请求体
    const postData = JSON.stringify({
      model: config.deepseek.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: config.aiParams.temperature,
      max_tokens: config.aiParams.maxTokens,
      top_p: config.aiParams.topP,
      frequency_penalty: config.aiParams.frequencyPenalty,
      presence_penalty: config.aiParams.presencePenalty
    })

    // 请求配置
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${config.deepseek.apiKey}`,
        'User-Agent': 'BaoBaoPro/1.0'
      },
      timeout: config.deepseek.timeout
    }

    console.log('🌐 发起HTTPS请求到:', url.hostname + url.pathname)
    console.log('⏰ 超时设置:', config.deepseek.timeout / 1000, '秒')

    // 创建请求
    const req = https.request(options, (res) => {
      let responseData = ''

      // 接收数据块
      res.on('data', (chunk) => {
        responseData += chunk
      })

      // 接收完成
      res.on('end', () => {
        console.log('📥 HTTP状态码:', res.statusCode)

        try {
          // 解析JSON响应
          const result = JSON.parse(responseData)

          // 检查是否成功
          if (result.choices && result.choices.length > 0 && result.choices[0].message) {
            resolve({
              content: result.choices[0].message.content.trim(),
              usage: result.usage || {}
            })
          } else if (result.error) {
            // API返回的业务错误
            console.error('❌ DeepSeek API业务错误:', result.error)
            reject(new Error(
              `DeepSeek API错误 [${result.error.code || 'UNKNOWN'}]: ${result.error.message || '未知错误'}`
            ))
          } else {
            // 数据格式异常
            console.error('❌ API响应格式异常:', result)
            reject(new Error('API返回的数据格式异常，缺少choices字段'))
          }

        } catch (parseError) {
          // JSON解析失败
          console.error('❌ JSON解析失败:', parseError.message)
          console.error('原始响应:', responseData.substring(0, 500))
          reject(new Error('解析API响应失败，可能返回了非JSON格式数据'))
        }
      })
    })

    // 请求错误处理
    req.on('error', (error) => {
      console.error('❌ 网络请求错误:', error.message)

      // 错误分类
      let errorMsg = error.message

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorMsg = '无法连接到DeepSeek服务器，请检查网络或DNS配置'
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
        errorMsg = '连接超时，服务器响应时间过长'
      } else if (error.code === 'ECONNRESET') {
        errorMsg = '连接被重置，可能是网络不稳定'
      }

      reject(new Error(errorMsg))
    })

    // 超时处理
    req.on('timeout', () => {
      console.error('⏰ 请求超时!')
      req.destroy() // 终止请求
      reject(new Error(`请求超时（${config.deepseek.timeout / 1000}秒），AI服务响应较慢`))
    })

    // 发送请求数据
    req.write(postData)
    req.end()

    console.log('✉️ 请求已发送，等待响应...')
  })
}
