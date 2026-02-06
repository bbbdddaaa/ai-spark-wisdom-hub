# Supabase Edge Functions 部署指南

## 📋 功能说明

本项目使用 Supabase Edge Functions 实现区块链自动化：

### 1. **grant-mint-eligibility** - 自动授予 Mint 资格
- **功能：** 监测 AI 评分 ≥60 的帖子，自动授予用户 mint 资格
- **触发：** 每小时自动执行 / 手动触发
- **作用：** 用户发布优质内容后自动获得 mint 权限

### 2. **set-weekly-rewards** - 设置周排名奖励
- **功能：** 计算上周排名前10名，设置区块链奖励
- **触发：** 每周一自动执行 / 手动触发
- **作用：** 用户可以领取周排名奖励

---

## 🚀 部署步骤

### 第一步：安装 Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# npm
npm install -g supabase

# 验证安装
supabase --version
```

### 第二步：登录 Supabase

```bash
supabase login
```

浏览器会打开，登录你的 Supabase 账号。

### 第三步：关联项目

```bash
# 查看你的项目列表
supabase projects list

# 关联到项目
supabase link --project-ref your-project-ref
```

### 第四步：配置环境变量（重要！）

```bash
# 配置私钥（不要加 0x 前缀）
supabase secrets set PRIVATE_KEY=你的私钥

# 配置 Supabase 连接
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=你的service-role-key

# 配置 RPC URL
supabase secrets set BASE_RPC_URL=https://mainnet.base.org

# 查看已配置的环境变量
supabase secrets list
```

### 第五步：部署 Edge Functions

```bash
# 部署授予资格函数
supabase functions deploy grant-mint-eligibility

# 部署周排名奖励函数
supabase functions deploy set-weekly-rewards
```

---

## ⚙️ 配置定时触发

### 方法 1：使用 Supabase Cron（推荐）

在 Supabase Dashboard 中设置 Cron Jobs：

**授予 Mint 资格（每小时）：**
```sql
SELECT cron.schedule(
  'grant-mint-eligibility-hourly',
  '0 * * * *', -- 每小时执行
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/grant-mint-eligibility',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )
  $$
);
```

**设置周排名奖励（每周一早上 9 点）：**
```sql
SELECT cron.schedule(
  'set-weekly-rewards-monday',
  '0 9 * * 1', -- 每周一 9:00
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/set-weekly-rewards',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )
  $$
);
```

### 方法 2：手动触发

使用 curl 命令：

```bash
# 授予 Mint 资格
curl -X POST \
  'https://your-project.supabase.co/functions/v1/grant-mint-eligibility' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'

# 设置周排名奖励
curl -X POST \
  'https://your-project.supabase.co/functions/v1/set-weekly-rewards' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

---

## 📊 监控和日志

### 查看函数日志

```bash
# 实时查看授予资格函数的日志
supabase functions logs grant-mint-eligibility --follow

# 查看周排名函数的日志
supabase functions logs set-weekly-rewards --follow
```

### 在 Supabase Dashboard 查看

1. 打开 Supabase Dashboard
2. 进入 Edge Functions
3. 点击函数名称
4. 查看 Logs 标签

---

## 🔒 安全性

✅ **私钥安全存储在 Supabase Secrets 中**  
✅ **不会暴露在前端代码中**  
✅ **只有 Edge Functions 可以访问**  

---

## 🧪 测试

### 本地测试（可选）

```bash
# 启动本地 Supabase
supabase start

# 本地运行函数
supabase functions serve grant-mint-eligibility

# 测试调用
curl -X POST 'http://localhost:54321/functions/v1/grant-mint-eligibility' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

---

## 📝 数据库准备

确保你的 Supabase 数据库有这些字段：

### posts 表
```sql
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS mint_eligibility_granted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mint_eligibility_granted_at TIMESTAMPTZ;
```

### weekly_rewards 表
```sql
CREATE TABLE IF NOT EXISTS weekly_rewards (
  id BIGSERIAL PRIMARY KEY,
  week_id BIGINT NOT NULL,
  user_wallet TEXT NOT NULL,
  rank INTEGER NOT NULL,
  amount TEXT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  transaction_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_id, user_wallet)
);
```

### 排名查询函数
```sql
CREATE OR REPLACE FUNCTION get_weekly_ranking(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  user_wallet TEXT,
  likes_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_wallet,
    COUNT(l.id) as likes_count
  FROM posts p
  LEFT JOIN likes l ON l.post_id = p.id
  WHERE p.created_at >= start_date 
    AND p.created_at <= end_date
    AND p.user_wallet IS NOT NULL
  GROUP BY p.user_wallet
  ORDER BY likes_count DESC;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ 部署完成检查清单

- [ ] Supabase CLI 已安装
- [ ] 已登录 Supabase
- [ ] 已关联项目
- [ ] 环境变量已配置（PRIVATE_KEY, SUPABASE_URL 等）
- [ ] Edge Functions 已部署
- [ ] Cron Jobs 已设置
- [ ] 数据库表结构已更新
- [ ] 测试函数是否正常工作

---

## 🆘 常见问题

### Q: 函数部署失败？
A: 检查是否安装了最新版本的 Supabase CLI，确保已正确关联项目。

### Q: 私钥配置错误？
A: 私钥不要加 `0x` 前缀，使用 `supabase secrets set` 命令配置。

### Q: 函数调用失败？
A: 检查 Supabase Dashboard 的 Logs，查看具体错误信息。

### Q: 定时任务不执行？
A: 确认 Cron Jobs 已正确配置，检查 Supabase Dashboard 的 Database > Cron Jobs。

---

## 📞 需要帮助？

查看完整日志：
```bash
supabase functions logs grant-mint-eligibility --follow
```

---

🎉 **部署完成后，系统将自动化运行，无需手动干预！**
