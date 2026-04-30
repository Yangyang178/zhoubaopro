const cloud = require('wx-server-sdk')
const https = require('https')
const config = require('./config')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const startTime = Date.now()
  console.log('========================================')
  console.log('🚀 云函数开始执行 - DeepSeek AI 版本')
  console.log('========================================')
  console.log('收到参数:', JSON.stringify(event, null, 2))

  const { position, weeklyWork, nextPlan, problems } = event

  try {
    if (!weeklyWork || !weeklyWork.trim()) {
      throw new Error('本周工作内容不能为空')
    }

    const positionMap = {
      'frontend': '前端工程师',
      'backend': '后端工程师',
      'product': '产品经理',
      'operation': '运营',
      'designer': '设计师',
      'general': '通用'
    }

    const positionName = positionMap[position] || '通用'
    console.log('📌 处理岗位:', positionName)

    const prompt = `你是一位资深的职场写作专家，擅长将零散的工作要点整理成专业、精炼、有深度的周报。

【任务】根据以下信息生成一份高质量的周报

【基本信息】
- 岗位：${positionName}

【本周工作内容】
${weeklyWork}
${nextPlan ? `\n【下周计划】\n${nextPlan}` : ''}
${problems ? `\n【遇到的问题与困难】\n${problems}` : ''}

【输出要求】
1. 语言风格：专业、简洁、有深度，避免口语化表达
2. 内容结构：
   - 开头用一句话概括本周核心成果
   - 本周工作部分：将零散信息提炼为3-5个关键点，使用"1. xxx 2. xxx"格式
   - 如果有下周计划：体现目标导向和可执行性
   - 如果有问题困难：体现分析能力和解决思路
   - 结尾：1-2句话总结反思或展望
3. 字数控制：250-400字（精炼有力）
4. 格式规范：使用标题分段，层次清晰

【重要】直接输出周报正文，不要任何前缀说明、不要说"以下是生成的周报"等废话。`

    const apiKey = process.env.DEEPSEEK_API_KEY || config.DEEPSEEK_API_KEY

    console.log('🔑 API Key 状态:', apiKey ? '已配置' : '❌ 未配置')
    console.log('🔑 API Key 长度:', apiKey ? apiKey.length : 0)

    if (!apiKey || apiKey === 'sk-your-api-key-here' || apiKey.length < 20) {
      throw new Error(`API Key 无效或未配置。当前Key长度: ${apiKey ? apiKey.length : 0}。请在config.js中填入有效的DeepSeek API Key`)
    }

    console.log('📤 准备调用 DeepSeek API...')
    console.log('📝 Prompt 长度:', prompt.length, '字符')

    const postData = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的周报撰写专家，具有10年以上的企业管理经验，擅长将复杂的工作内容提炼为清晰、专业、有说服力的文字。你的周报总是能突出重点、体现价值、展现专业性。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1500,
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.6
    })

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'WeChat-MiniProgram/1.0'
      },
      timeout: 30000
    }

    console.log('⏳ 发送 HTTP 请求到 api.deepseek.com ...')

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = ''
        console.log(`📥 收到 HTTP 响应，状态码: ${res.statusCode}`)

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            console.log(`📊 响应数据大小: ${data.length} 字符`)
            const response = JSON.parse(data)

            if (response.choices && response.choices.length > 0) {
              const reportContent = response.choices[0].message.content.trim()
              const endTime = Date.now()
              const duration = ((endTime - startTime) / 1000).toFixed(2)
              
              console.log('✅✅✅ 周报生成成功！✅✅✅')
              console.log(`⏱️ 总耗时: ${duration}秒`)
              console.log(`📄 生成内容长度: ${reportContent.length}字符`)
              console.log('📄 内容预览:', reportContent.substring(0, 100) + '...')

              resolve({
                success: true,
                data: {
                  report: reportContent,
                  position: positionName,
                  timestamp: new Date().toISOString(),
                  duration: duration,
                  isAI: true
                }
              })
            } else if (response.error) {
              console.error('❌ DeepSeek API 返回错误:', response.error)
              reject(new Error(`DeepSeek API 错误 [${response.error.code}]: ${response.error.message}`))
            } else {
              console.error('❌ AI 返回数据格式异常:', response)
              reject(new Error('AI 返回的数据格式异常，无法解析'))
            }
          } catch (parseError) {
            console.error('❌ 解析响应失败:', parseError.message)
            console.error('❌ 原始响应数据:', data.substring(0, 200))
            reject(new Error(`解析响应失败: ${parseError.message}`))
          }
        })
      })

      req.on('error', (error) => {
        console.error('❌❌❌ 网络请求失败 ❌❌❌')
        console.error('错误详情:', error.message)
        console.error('错误代码:', error.code)
        reject(new Error(`网络连接失败: ${error.message}。可能原因：1.网络不通 2.DNS解析失败 3.API服务器不可达`))
      })

      req.on('timeout', () => {
        console.error('⏰⏰⏰ 请求超时 ⏰⏰⏰')
        req.destroy()
        reject(new Error('请求超时（30秒）。DeepSeek API 响应太慢，可能是：1.服务器繁忙 2.网络延迟 3.Prompt太长'))
      })

      req.write(postData)
      req.end()

      console.log('📤 HTTP 请求已发送，等待响应...')
    })

  } catch (error) {
    console.error('💥💥💥 云函数执行失败 💥💥💥')
    console.error('错误类型:', error.constructor.name)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)

    return {
      success: false,
      error: error.message || '未知错误发生'
    }
  }
}
