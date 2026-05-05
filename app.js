// app.js - 周报Pro 主入口（纯本地模式）
App({
  onLaunch() {
    console.log('[App] 周报Pro 启动成功')
    
    // 检查是否支持云开发（可选功能）
    if (!wx.cloud) {
      console.log('[App] 当前版本不支持云开发，使用纯本地模式')
    }
  },
  
  globalData: {
    userInfo: null,
    isCloudAvailable: false  // 标记云开发是否可用
  }
})
