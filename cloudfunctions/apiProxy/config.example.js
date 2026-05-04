/**
 * apiProxy 云函数 - 配置示例文件
 * 
 * ⚠️ 重要提示：
 * 1. 复制此文件为 config.js
 * 2. 填入你的真实 API Key
 * 3. 不要将包含真实 Key 的 config.js 提交到 Git
 */

module.exports = {
  // DeepSeek API 配置
  // 获取地址: https://platform.deepseek.com/api_keys
  apiKey: '你的DeepSeek_API_Key_这里',
  
  // AI 模型配置
  model: 'deepseek-chat',  // 或 deepseek-coder
  
  // 请求参数
  temperature: 0.7,        // 创造性 (0-2, 越高越有创意)
  max_tokens: 2000,        // 最大生成 token 数
  top_p: 0.85,            // 核采样
  frequency_penalty: 0.4, // 频率惩罚
  presence_penalty: 0.5   // 存在惩罚
}
