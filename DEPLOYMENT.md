# 🚀 AI Spark 部署指南

## 📋 部署前准备

您的项目已经准备就绪！所有文件已提交到 Git，可以开始部署了。

---

## 🎯 方式一：通过 GitHub + Vercel 自动部署（推荐）

### 第一步：推送代码到 GitHub

#### 1.1 创建 GitHub 仓库
1. 访问 [github.com](https://github.com)
2. 点击右上角 **"+"** → **"New repository"**
3. 填写信息：
   - Repository name: `ai-spark-wisdom-hub`
   - Description: `AI智慧分享平台 - MVP版本`
   - 选择 **Public** 或 **Private**
4. ❌ **不要**勾选 "Initialize with README"（我们已经有代码了）
5. 点击 **"Create repository"**

#### 1.2 推送本地代码到 GitHub

在项目目录下执行：

```bash
# 添加 GitHub 仓库地址（替换成您的）
git remote add origin https://github.com/您的用户名/ai-spark-wisdom-hub.git

# 推送代码
git branch -M main
git push -u origin main
```

**提示：** 如果提示需要登录，使用 GitHub 用户名和 Personal Access Token（不是密码）

---

### 第二步：连接 Vercel

#### 2.1 注册/登录 Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 点击 **"Sign Up"**
3. 选择 **"Continue with GitHub"**（使用 GitHub 账号登录）
4. 授权 Vercel 访问您的 GitHub

#### 2.2 导入项目
1. 在 Vercel 首页，点击 **"Add New..."** → **"Project"**
2. 在列表中找到 `ai-spark-wisdom-hub` 仓库
3. 点击 **"Import"**

#### 2.3 配置项目
Vercel 会自动检测到这是 Vite 项目，配置如下：

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**环境变量配置（重要）：**
点击 **"Environment Variables"**，添加：

```
Name: GEMINI_API_KEY
Value: 您的Gemini API密钥
```

如果暂时没有 API Key，可以先留空（AI标签功能会失效，但不影响其他功能）

#### 2.4 部署
1. 点击 **"Deploy"**
2. 等待 1-2 分钟，部署完成
3. 您会看到：
   ```
   🎉 Congratulations!
   Your project is live at: https://ai-spark-wisdom-hub.vercel.app
   ```

---

### 第三步：绑定自定义域名

#### 3.1 在 Vercel 添加域名
1. 进入项目，点击 **"Settings"** → **"Domains"**
2. 输入您的域名：
   - `yourdomain.com`
   - `www.yourdomain.com`
3. 点击 **"Add"**

#### 3.2 Vercel 会显示需要的 DNS 配置

**示例（您会看到类似的）：**
```
请在您的域名服务商添加以下记录：

Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.21.21
```

#### 3.3 配置 DNS（在您的域名服务商）

**登录您购买域名的平台**（阿里云/腾讯云/Godaddy等）

找到 **"DNS 管理"** 或 **"域名解析"**，添加记录：

##### 如果域名服务商支持 CNAME（推荐）：
```
类型: CNAME
主机记录: www
记录值: cname.vercel-dns.com
TTL: 600
```

```
类型: CNAME
主机记录: @
记录值: cname.vercel-dns.com
TTL: 600
```

##### 如果只支持 A 记录：
```
类型: A
主机记录: @
记录值: 76.76.21.21
TTL: 600
```

```
类型: A
主机记录: www
记录值: 76.76.21.21
TTL: 600
```

#### 3.4 等待 DNS 生效
- 通常 5-30 分钟
- 最长可能 24 小时
- 使用 `ping yourdomain.com` 测试

#### 3.5 验证部署
访问：
- ✅ `https://yourdomain.com`
- ✅ `https://www.yourdomain.com`

应该能看到您的网站！

---

## 🎯 方式二：使用 Vercel CLI 部署

### 安装 Vercel CLI

```bash
npm install -g vercel
```

### 登录 Vercel

```bash
vercel login
```

### 部署

```bash
# 在项目目录下执行
vercel

# 按提示操作：
# - Set up and deploy? Y
# - Which scope? 选择您的账号
# - Link to existing project? N
# - Project name? ai-spark-wisdom-hub
# - Directory? ./
# - Override settings? N

# 第一次部署（预览）
vercel

# 部署到生产环境
vercel --prod
```

### 添加环境变量

```bash
vercel env add GEMINI_API_KEY
# 输入您的 API Key

# 重新部署
vercel --prod
```

---

## 📝 部署后自动更新

**好消息：** 连接 GitHub 后，以后更新非常简单：

```bash
# 1. 修改代码
# 2. 提交
git add .
git commit -m "更新功能"

# 3. 推送
git push

# 4. Vercel 自动检测并重新部署！
```

5-10秒后，网站自动更新！

---

## 🔑 获取 Gemini API Key（可选）

如果想使用 AI 智能标签功能：

1. 访问 [https://aistudio.google.com/](https://aistudio.google.com/)
2. 登录 Google 账号
3. 点击 **"Get API Key"**
4. 创建 API Key
5. 复制密钥
6. 在 Vercel 环境变量中添加

**费用：** 完全免费（个人使用额度）

---

## 🎯 当前部署状态

✅ Git 仓库已初始化  
✅ 代码已提交  
✅ Vercel 配置文件已创建  
⏳ 等待推送到 GitHub  
⏳ 等待连接 Vercel  
⏳ 等待绑定域名  

---

## 🆘 常见问题

### Q1: 推送到 GitHub 时提示需要 Token
**A:** GitHub 不再支持密码登录，需要使用 Personal Access Token：
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token → 勾选 `repo` 权限
3. 复制 Token，在推送时作为密码使用

### Q2: Vercel 构建失败
**A:** 检查：
- `package.json` 中的依赖是否完整
- Node 版本是否兼容（建议 18+）
- 环境变量是否配置正确

### Q3: 域名配置后无法访问
**A:** 
- 检查 DNS 记录是否正确
- 等待 DNS 生效（最多24小时）
- 使用 `ping yourdomain.com` 测试
- 清除浏览器缓存

### Q4: 网站可以访问，但数据刷新就没了
**A:** 这是正常的！当前版本数据存在浏览器内存中。如需持久化：
- 后续集成 Supabase（免费数据库）
- 或使用 localStorage 临时存储

---

## 📞 需要帮助？

如果遇到问题：
1. 检查 Vercel 部署日志
2. 查看浏览器控制台错误
3. 截图错误信息

---

## 🎉 恭喜！

按照以上步骤，您的 AI Spark 就能成功部署到 Vercel 并绑定您的域名了！

**下一步建议：**
- [ ] 配置 Gemini API Key
- [ ] 集成 Supabase 实现数据持久化
- [ ] 添加用户认证功能
- [ ] 优化 SEO 和分享功能

祝您部署顺利！🚀
