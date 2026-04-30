# TabBar 图标说明

## 📁 图标位置
```
images/tab/
├── generate.png           ← "生成"页面的普通图标
├── generate-active.png    ← "生成"页面的选中图标（高亮）
├── history.png            ← "历史"页面的普通图标
└── history-active.png     ← "历史"页面的选中图标（高亮）
```

## 🎨 图标要求

### **尺寸规格**
- **推荐尺寸**：81 x 81 像素（@3x）或 54 x 54 像素（@2x）
- **最小尺寸**：40 x 40 像素
- **最大尺寸**：不超过 500KB

### **格式要求**
- ✅ 格式：**PNG**（必须透明背景）
- ❌ 不支持：JPG、SVG、GIF、WebP
- 背景：**必须透明**

### **设计建议**
1. **风格统一**：所有图标使用相同的设计语言
2. **简洁明了**：使用简单的线条或填充图形
3. **颜色方案**：
   - 普通状态：灰色 (#718096)
   - 选中状态：主题色 (#667eea) 或纯白
4. **图标内容**：
   - `generate.png`：✨ 星星/魔法棒/闪电等（表示"生成"）
   - `history.png`：📋 文件夹/时钟/列表等（表示"历史"）

## 🔧 快速获取图标的方式

### 方式一：在线图标库（推荐）
1. 访问 [iconfont.cn](https://www.iconfont.cn/)
2. 搜索关键词："生成"、"历史"、"时间"、"文档"
3. 选择喜欢的图标，下载 PNG 格式
4. 调整大小为 81x81 像素
5. 放入 `images/tab/` 目录

### 方式二：AI 生成
使用 AI 工具（如 Midjourney、DALL-E、通义万相）生成：
```
Prompt: "Minimalist line icon, magic wand, transparent background, 
        simple design, flat style, suitable for mobile app tab bar, 
        purple color theme"
```

### 方式三：手动绘制
使用工具：
- **Figma** / **Sketch**（专业设计）
- **Canva**（在线设计，简单易用）
- **即时设计**（国产免费工具）

## 🎯 推荐图标示例

### generate（生成）图标创意：
- ✨ 魔法棒/仙女棒
- ⚡ 闪电符号
- 🚀 火箭
- 💫 闪烁的星星
- ✏️ 带笔的文档

### history（历史）图标创意：
- 📋 剪贴板/清单
- 🕐 时钟/沙漏
- 📂 文件夹
- 📜 卷轴/文档
- 🔄 循环箭头

## ⚠️ 注意事项

1. **图标大小要一致**：4个图标尺寸必须相同
2. **视觉重量平衡**：复杂度和粗细度要协调
3. **测试显示效果**：在真机上查看实际效果
4. **避免版权问题**：使用开源或有授权的图标

## 📝 配置检查

确保 `app.json` 中的路径正确：
```json
"tabBar": {
  "list": [
    {
      "pagePath": "pages/index/index",
      "iconPath": "images/tab/generate.png",          ← 检查这个
      "selectedIconPath": "images/tab/generate-active.png"  ← 和这个
    },
    ...
  ]
}
```

## ❓ 如果暂时没有图标？

**临时解决方案**：
1. 可以先注释掉 tabBar 配置（小程序仍可正常运行）
2. 通过页面内的按钮导航到历史页面
3. 后续补充图标即可

或者使用我提供的**临时占位符图片**（需要自行准备）。

---

**准备好图标后放入此目录，重启开发者工具即可看到效果！** 🎨
