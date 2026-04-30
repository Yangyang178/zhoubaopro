/**
 * API代理配置文件
 * 安全地存储API密钥和参数（仅在云端执行，前端无法访问）
 */

module.exports = {
  // DeepSeek API 配置
  deepseek: {
    apiKey: 'sk-95d6993d5f7d49bd8c5c6d94288e6300',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    timeout: 60000
  },

  // AI生成参数优化配置
  aiParams: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.85,
    frequencyPenalty: 0.4,
    presencePenalty: 0.5
  }
}
