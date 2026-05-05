# 🚀 云函数快速部署指南

## ⚠️ 当前问题

如果你看到错误 `errCode: -501000 | FunctionName parameter could not be found`，说明 **auth 云函数还未部署到云端**。

---

## 📋 部署步骤（3分钟搞定）

### 方法一：微信开发者工具部署（推荐）

#### 步骤 1：打开项目
1. 打开 **微信开发者工具**
2. 打开 `周报pro` 项目
3. 确保已登录微信开发者账号

#### 步骤 2：找到云函数文件夹
在左侧文件树中，找到：
```
cloudfunctions/
├── auth/          ← 需要部署这个
├── apiProxy/
├── dbOperation/
└── generateReport/
```

#### 步骤 3：上传并部署
1. **右键点击** `auth` 文件夹
2. 选择 **「上传并部署：云端安装依赖」**
3. 等待部署完成（约 10-30 秒）
4. 控制台会显示 **"上传成功"**

#### 步骤 4：验证部署
1. 点击工具栏的 **「云开发」按钮**
2. 进入 **「云函数」** 标签页
3. 查看列表中是否有 `auth` 函数
4. 状态显示为 **「已部署」** 即可 ✅

---

### 方法二：命令行部署（进阶）

```bash
# 1. 安装 tcb-tools（如果未安装）
npm install -g @cloudbase/cli

# 2. 登录腾讯云
tcb login

# 3. 部署 auth 云函数
tcb fn deploy auth -e your-env-id

# 4. （可选）部署所有云函数
cd cloudfunctions
for dir in */; do
  tcb fn deploy "${dir%/}" -e your-env-id
done
```

> **注意**：将 `your-env-id` 替换为你的云环境ID（可在 project.config.json 中查看）

---

## 🔧 部署后测试

### 测试一键登录功能

1. 在微信开发者工具中点击 **「编译」** 刷新页面
2. 进入 **「个人中心」** 页面
3. 点击 **「💚 微信一键登录」** 按钮
4. 应该显示 **「登录成功 👋」** 或 **「注册成功 ✨」** ✅

### 常见问题排查

#### ❌ 问题 1：仍然报错 `-501000`

**解决方案**：
- 确认选择的是 **「上传并部署：云端安装依赖」**（不是「上传并部署：所有文件」）
- 检查网络连接
- 尝试重新部署

#### ❌ 问题 2：登录超时

**解决方案**：
- 检查云开发环境是否已开通
- 确认云函数内存配置（建议 128MB 足够）
- 查看 **云开发控制台 → 云函数 → 日志** 排查

#### ❌ 问题 3：权限错误

**解决方案**：
- 确认 `project.config.json` 中有正确的 `appid`
- 检查云开发环境权限设置
- 确认当前登录账号有该小程序的开发者权限

---

## 📊 云函数说明

### auth 云函数功能

| Action | 功能 | 说明 |
|--------|------|------|
| `quickLogin` | 微信一键登录 | 静默登录，无需授权 |
| `login` | 微信登录（需授权） | 获取头像昵称 |
| `getUserInfo` | 获取用户信息 | 返回用户详细数据 |
| `updateUserInfo` | 更新用户资料 | 修改头像昵称等 |
| `checkMembership` | 检查会员状态 | 判断是否为Pro会员 |
| `getUsageStats` | 获取使用统计 | 今日/总生成次数 |

### 数据库集合：users

登录成功后会自动创建/更新 `users` 集合：

```javascript
{
  _id: "自动生成的ID",
  openid: "用户的微信openid",
  userInfo: {
    nickname: "微信用户",
    avatarUrl: ""
  },
  membership: {
    type: "free",  // free / pro / team
    expireTime: null,
    autoRenew: false
  },
  usage: {
    dailyCount: 0,
    totalCount: 0,
    lastResetDate: "2026-05-04"
  },
  stats: {
    totalReports: 0,
    timeSaved: 0,
    favoritePosition: "",
    achievements: []
  },
  createTime: Date,
  lastLoginTime: Date,
  loginCount: 1
}
```

---

## 🎯 下一步操作

部署完成后，你可以：

1. ✅ 使用 **微信一键登录** 功能
2. ✅ 查看个人中心的 **数据统计**
3. ✅ 测试 **使用次数限制**（免费版每日5次）
4. 🔄 继续开发其他功能（参考 [ROADMAP_v2.md](./ROADMAP_v2.md)）

---

## 💡 提示

- **首次部署**需要等待较长时间（安装依赖），后续部署会很快
- **免费版云开发**有限制：云函数调用次数 20万次/月（足够个人使用）
- 建议 **定期备份** 云数据库数据
- 生产环境建议开启 **安全规则** 保护数据库

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 [微信官方文档](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html)
2. 检查 **云开发控制台 → 运营监控 → 日志**
3. 在 GitHub 提交 Issue

---

**最后更新时间**：2026-05-04  
**适用版本**：周报Pro v1.0.0+
