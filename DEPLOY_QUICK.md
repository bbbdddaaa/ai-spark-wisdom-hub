# 快速部署命令速查表

## 📝 推送到 GitHub（首次）

```bash
# 1. 在 GitHub 创建新仓库后，复制仓库地址
# 2. 执行以下命令：

git remote add origin https://github.com/您的用户名/仓库名.git
git branch -M main
git push -u origin main
```

## 🚀 Vercel CLI 快速部署

```bash
# 安装 CLI（仅首次）
npm install -g vercel

# 登录
vercel login

# 部署到生产环境
vercel --prod

# 添加环境变量
vercel env add GEMINI_API_KEY
```

## 🔄 后续更新部署

```bash
# 修改代码后
git add .
git commit -m "更新描述"
git push

# Vercel 自动部署！
```

## 📋 验证清单

- [ ] Git 仓库已初始化 ✅
- [ ] 代码已提交 ✅
- [ ] Vercel 配置已创建 ✅
- [ ] 推送到 GitHub
- [ ] 连接 Vercel
- [ ] 配置环境变量
- [ ] 绑定域名
- [ ] 配置 DNS
- [ ] 访问测试

## 🌐 DNS 配置示例

### CNAME 记录（推荐）
```
类型: CNAME
主机: www
值: cname.vercel-dns.com
```

### A 记录
```
类型: A
主机: @
值: 76.76.21.21
```

## 🔗 重要链接

- Vercel: https://vercel.com
- GitHub: https://github.com
- Gemini API: https://aistudio.google.com

## ⚡ 当前项目状态

- ✅ 项目运行正常（localhost:3000）
- ✅ Git 仓库已初始化
- ✅ 代码已提交
- ✅ 配置文件已创建
- ⏳ 等待推送到 GitHub
