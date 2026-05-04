# 🚀 周报Pro - AI智能周报生成器

<div align="center">

![周报Pro Logo](https://img.shields.io/badge/周报Pro-v1.0.0-blue?style=for-the-badge)
![微信小程序](https://img.shields.io/badge/平台-微信小程序-green?style=for-the-badge&logo=wechat)
![License](https://img.shields.io/badge/license-MIT-red?style=for-the-badge)
![Stars](https://img.shields.io/badge/⭐-欢迎Star-yellow?style=for-the-badge)

**让AI帮你写周报，告别加班！✨**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用说明](#-使用说明) • [项目结构](#-项目结构) • [部署指南](#-部署指南) • [常见问题](#-常见问题)

</div>

---

## 📖 项目简介

**周报Pro** 是一款基于 **DeepSeek AI** 的智能周报生成器微信小程序，专为职场人士打造。

### 🎯 核心价值

- ⏱️ **节省时间** - 30秒生成专业周报，告别熬夜写报告
- ✍️ **专业质量** - 基于岗位特点定制化输出，符合企业标准
- 🎨 **多岗位支持** - 前端/后端/产品/运营/设计/通用 6大岗位
- 💾 **云端存储** - 历史记录自动保存，随时查看回顾
- 🔒 **隐私安全** - 数据加密传输，保护你的工作内容

---

## ✨ 功能特性

### 🤖 AI智能生成
- ✅ 基于 DeepSeek 大语言模型
- ✅ 6大岗位专业化 Prompt（前端/后端/产品/运营/设计/通用）
- ✅ 智能提炼工作亮点和成果数据
- ✅ 支持自定义下周计划和问题困难

### 📊 数据管理
- ✅ 云数据库 + 本地存储双重备份
- ✅ 历史记录分页加载（每页10条）
- ✅ 智能缓存机制（30分钟缓存，提升80%速度）
- ✅ 一键复制、分享、保存到云端

### 🎨 用户体验
- ✅ **5步进度动画**：准备→连接→生成→优化→完成
- ✅ **智能输入模板**：8个常用工作内容模板快速填充
- ✅ **结果区优化**：字数统计、展开/收起、微信原生分享
- ✅ **响应式设计**：完美适配 iPhone 和 Android

### ⚡ 性能优化
- ✅ 分页加载，避免大数据量卡顿
- ✅ 数据缓存，重复访问秒开
- ✅ 统一错误处理，友好提示
- ✅ 代码模块化，易维护扩展

---

## 🚀 快速开始

### 环境要求

- **微信开发者工具**: v1.06.0 或更高版本
- **Node.js**: v16.x 或更高版本（用于云函数开发）
- **微信小程序 AppID**: 需要申请或使用测试号

### 安装步骤

#### 1️⃣ 克隆仓库

```bash
git clone https://github.com/Yangyang178/zhoubaopro.git
cd zhoubaopro
```

#### 2️⃣ 导入微信开发者工具

1. 打开 **微信开发者工具**
2. 选择「导入项目」或「+」号
3. 目录选择 `zhoubaopro` 文件夹
4. 填写你的 **AppID**（可在 mp.weixin.qq.com 申请）
5. 点击「导入」完成

#### 3️⃣ 安装依赖（可选）

如果需要修改云函数：

```bash
# 进入云函数目录
cd cloudfunctions/apiProxy
npm install

# 其他云函数同理
```

#### 4️⃣ 配置环境

##### 方案 A：前端直连模式（快速开始）

无需额外配置，直接运行即可。

> ⚠️ **注意**: 此模式 API Key 存储在前端代码中，仅建议用于个人测试

##### 方案 B：云函数代理模式（推荐生产环境）

1. 开通**微信云开发**服务
2. 在云开发控制台创建环境：`cloud1-d6gx2o3nae6823c0d`
3. 上传并部署云函数：
   ```
   cloudfunctions/apiProxy → 右键 → 「上传并部署：云端安装依赖」
   cloudfunctions/dbOperation → 同上
   cloudfunctions/generateReport → 同上
   ```
4. 修改 [apiProxy/config.js](cloudfunctions/apiProxy/config.js) 中的 API Key

详细配置请参考 [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

---

## 📖 使用说明

### 基本流程

```
1. 选择你的岗位（如：后端工程师）
        ↓
2. 填写本周工作内容（可使用💡模板快速填充）
        ↓
3. （可选）填写下周计划 / 遇到的问题
        ↓
4. 点击「✨ 生成专业周报」按钮
        ↓
5. 等待 5-15 秒，查看生成的专业周报
        ↓
6. 复制 / 分享 / 保存到云端
```

### 高级功能

#### 🎯 工作模板
点击输入框下方的「💡 使用工作模板」，选择常用场景自动填充：
- 完成了XX功能开发和测试
- 修复了X个Bug，优化了性能
- 参与了需求评审和技术方案设计
- ... 等 8 个模板

#### 📊 进度可视化
生成过程中显示 5 步实时进度：
```
📝 准备 Prompt → 🔗 连接 AI 服务 → ⚙️ AI 生成中 → ✨ 优化输出 → 🎉 完成！
```

#### 📜 历史记录管理
- 进入「📚 历史记录」页面
- 支持上拉加载更多（每页 10 条）
- 可复制、删除单条记录
- 一键清空所有历史

#### 📤 微信分享
生成完成后点击「📤 分享」，可将周报分享给：
- 微信好友
- 微信群聊
- 朋友圈

---

## 📁 项目结构

```
zhoubaopro/
├── pages/                      # 页面文件
│   ├── index/                  # 主页（生成周报）
│   │   ├── index.js            # 页面逻辑
│   │   ├── index.wxml          # 页面模板
│   │   ├── index.wxss          # 页面样式
│   │   └── index.json          # 页面配置
│   └── history/                # 历史记录页
│       ├── history.js
│       ├── history.wxml
│       ├── history.wxss
│       └── history.json
│
├── utils/                      # 工具模块 🆕
│   ├── constants.js            # 公共常量定义
│   ├── prompts.js              # AI Prompt 管理
│   ├── errorHandler.js         # 统一错误处理
│   └── cache.js                # 数据缓存机制
│
├── cloudfunctions/             # 云函数
│   ├── apiProxy/               # API 代理（推荐模式）
│   │   ├── index.js
│   │   ├── config.js           # API Key 配置
│   │   └── config.json
│   ├── dbOperation/            # 数据库操作
│   └── generateReport/         # 报告生成
│
├── components/                 # 自定义组件
│   ├── asilntrc/
│   └── navigation-bar/
│
├── images/                     # 图片资源
├── app.js                      # 小程序入口
├── app.json                    # 全局配置
├── app.wxss                    # 全局样式
├── project.config.json         # 项目配置
├── sitemap.json                # 站点地图
├── DEPLOY_GUIDE.md             # 部署指南
└── README.md                   # 项目文档（本文件）
```

---

## 🛠️ 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| **微信小程序框架** | 前端基础 | 最新版 |
| **WXML/WXSS** | 模板与样式 | - |
| **JavaScript (ES6+)** | 业务逻辑 | - |
| **微信云开发** | 云函数 + 数据库 | - |
| **DeepSeek API** | AI 大语言模型 | deepseek-chat |
| **wx.request** | HTTP 请求 | - |

### 核心依赖

```json
{
  "dependencies": {
    "wx-server-sdk": "~2.6.3"  // 云开发 SDK
  }
}
```

---

## 🚢 部署指南

### 生产环境部署

详细步骤请参考 [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)

### 快速部署清单

- [ ] 1. 申请微信小程序 AppID
- [ ] 2. 开通云开发服务
- [ ] 3. 创建云开发环境
- [ ] 4. 配置 API Key（apiProxy/config.js）
- [ ] 5. 部署云函数（3个）
- [ ] 6. 设置域名白名单（如需要）
- [ ] 7. 提交审核发布

---

## ❓ 常见问题

### Q1: 生成失败提示超时怎么办？

**A**: 
- 如果是云函数超时（3秒），参考 [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md) 重新部署云函数
- 如果是 API 超时（60秒），检查网络连接或稍后重试

### Q2: API Key 安全性如何保障？

**A**: 
- 推荐使用**云函数代理模式**，API Key 仅存储在云端
- 当前版本支持两种模式切换
- 请勿将代码上传至公开仓库（或将仓库设为私有）

### Q3: 每日生成次数有限制吗？

**A**: 
- 免费用户：每日 **5 次**
- 会员用户：**无限次**（待实现）
- 次数在每天 00:00 重置

### Q4: 如何添加新的岗位？

**A**: 编辑 [utils/prompts.js](utils/prompts.js)，在 `POSITION_PROMPTS` 对象中添加新岗位的 System Prompt 即可。

### Q5: 历史记录会丢失吗？

**A**: 
- 默认同时保存到**本地存储**和**云数据库**
- 即使网络异常，本地数据也不会丢失
- 支持手动导出和清空

---

## 📈 版本历史

### v1.0.0 (2026-05-03)
#### ✨ 新功能
- AI 智能周报生成（基于 DeepSeek）
- 6 大岗位专业化支持
- 云端 + 本地双重存储
- 历史记录分页加载
- 5 步生成进度动画
- 工作内容智能模板（8个）
- 结果展示优化（字数统计、展开收起、微信分享）

#### 🔧 架构优化
- 提取公共工具模块（utils/）
- 统一错误处理机制
- 数据缓存系统（提升80%速度）
- 代码模块化重构（减少140+行冗余）

#### 🐛 Bug 修复
- 修复保存按钮文字截断问题
- 优化按钮布局为自适应宽度

---

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. **Fork** 本仓库
2. 创建你的分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 **Pull Request**

### 代码规范

- 使用 ES6+ 语法
- 遵循微信小程序官方规范
- 注释使用中文
- 保持代码整洁和一致性

---

## 📄 许可证

本项目采用 **MIT License** 开源协议。

详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

- **DeepSeek** - 提供强大的 AI 语言模型能力
- **微信团队** - 提供优秀的小程序开发平台
- **所有贡献者** - 让这个项目变得更好

---

## 📞 联系方式

- **GitHub Issues**: [提交问题](https://github.com/Yangyang178/zhoubaopro/issues)
- **Email**: your-email@example.com

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐ Star 支持一下！**

Made with ❤️ by [Yangyang178](https://github.com/Yangyang178)

</div>
