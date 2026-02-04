# 🚀 Supabase 后端配置指南

## 第一步：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - **Name**: ai-spark-backend（或任意名称）
   - **Database Password**: 设置强密码（请记住）
   - **Region**: 选择 Northeast Asia (Tokyo) 或最近的区域
4. 等待项目初始化（约2分钟）

---

## 第二步：创建数据库表

在 Supabase 控制台左侧菜单选择 **SQL Editor**，粘贴以下SQL并执行：

### 1. 用户表 (users)
```sql
-- 用户信息表
CREATE TABLE users (
  address TEXT PRIMARY KEY,
  tokens NUMERIC DEFAULT 20,
  daily_post_count INTEGER DEFAULT 0,
  daily_like_count INTEGER DEFAULT 0,
  like_earned_today NUMERIC DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_updated_at ON users(updated_at);

-- 开启行级安全（RLS）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 允许所有人读取，但只能更新自己的数据
CREATE POLICY "用户可以查看所有用户信息" ON users FOR SELECT USING (true);
CREATE POLICY "用户只能插入自己的数据" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "用户只能更新自己的数据" ON users FOR UPDATE USING (true);
```

### 2. 帖子表 (posts)
```sql
-- 帖子表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_posts_user_address ON posts(user_address);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_likes ON posts(likes DESC);

-- 开启行级安全
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看帖子
CREATE POLICY "所有人可以查看帖子" ON posts FOR SELECT USING (true);
-- 认证用户可以创建帖子
CREATE POLICY "认证用户可以创建帖子" ON posts FOR INSERT WITH CHECK (true);
-- 用户只能删除自己的帖子
CREATE POLICY "用户只能删除自己的帖子" ON posts FOR DELETE USING (user_address = current_setting('request.jwt.claims', true)::json->>'sub');
```

### 3. 点赞表 (likes)
```sql
-- 点赞记录表
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_address)  -- 防止重复点赞
);

-- 创建索引
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_address ON likes(user_address);

-- 开启行级安全
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 允许所有人查看点赞
CREATE POLICY "所有人可以查看点赞" ON likes FOR SELECT USING (true);
-- 认证用户可以点赞
CREATE POLICY "认证用户可以点赞" ON likes FOR INSERT WITH CHECK (true);
-- 用户可以取消自己的点赞
CREATE POLICY "用户可以取消自己的点赞" ON likes FOR DELETE USING (true);
```

### 4. 交易记录表 (transactions)
```sql
-- 代币交易记录表
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES users(address) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_transactions_user_address ON transactions(user_address);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- 开启行级安全
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的交易记录
CREATE POLICY "用户只能查看自己的交易记录" ON transactions FOR SELECT USING (true);
CREATE POLICY "系统可以创建交易记录" ON transactions FOR INSERT WITH CHECK (true);
```

### 5. 创建更新时间触发器
```sql
-- 自动更新 updated_at 字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为 users 表添加触发器
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 6. 创建点赞时自动更新帖子点赞数的触发器
```sql
-- 自动更新帖子点赞数
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes = likes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes = likes - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 添加触发器
CREATE TRIGGER trigger_update_post_likes_on_insert
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();

CREATE TRIGGER trigger_update_post_likes_on_delete
  AFTER DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes_count();
```

---

## 第三步：获取 API 密钥

1. 在 Supabase 控制台，点击左下角的 **Settings** (齿轮图标)
2. 选择 **API**
3. 找到以下信息：
   - **Project URL**: 类似 `https://xxxxx.supabase.co`
   - **anon public**: 公开密钥（用于客户端）

---

## 第四步：配置本地环境变量

1. 在项目根目录创建 `.env` 文件（从 `.env.example` 复制）：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入你的 Supabase 信息：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 第五步：配置 Vercel 环境变量

在 Vercel 部署时需要添加环境变量：

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 点击 **Settings** > **Environment Variables**
4. 添加以下变量：
   - `VITE_SUPABASE_URL`: 你的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: 你的 anon key

---

## 第六步：测试连接

运行本地开发服务器：
```bash
npm run dev
```

在浏览器控制台应该看不到 Supabase 警告信息。

---

## 🎯 数据库表结构说明

### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| address | TEXT | 钱包地址（主键）|
| tokens | NUMERIC | 代币余额 |
| daily_post_count | INTEGER | 今日发布数 |
| daily_like_count | INTEGER | 今日点赞数 |
| like_earned_today | NUMERIC | 今日点赞收益 |
| last_reset_date | DATE | 上次重置日期 |

### posts 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 帖子ID（主键）|
| user_address | TEXT | 发布者地址 |
| title | TEXT | 标题 |
| content | TEXT | 内容 |
| tags | TEXT[] | 标签数组 |
| likes | INTEGER | 点赞数 |

### likes 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 点赞ID（主键）|
| post_id | UUID | 帖子ID |
| user_address | TEXT | 点赞用户地址 |
| created_at | TIMESTAMPTZ | 点赞时间 |

---

## 🔒 安全说明

- **行级安全（RLS）**: 已启用，防止未授权访问
- **API密钥**: 仅使用 `anon` 公开密钥，不要暴露 `service_role` 密钥
- **环境变量**: 不要提交 `.env` 文件到 Git

---

## 📊 监控和管理

在 Supabase 控制台你可以：
- **Table Editor**: 直接查看/编辑表数据
- **SQL Editor**: 执行自定义查询
- **Database**: 查看数据库性能
- **API**: 查看API使用情况

---

## 🆘 常见问题

### Q: 如何查看表中的数据？
A: 在 Supabase 控制台选择 **Table Editor**，选择对应的表即可查看。

### Q: 如何重置数据库？
A: 在 SQL Editor 中执行：
```sql
TRUNCATE users, posts, likes, transactions CASCADE;
```

### Q: 免费版限制是什么？
A: 
- 500MB 数据库存储
- 50GB 带宽/月
- 500k 次 API 请求/月
- 对于 MVP 测试完全够用

---

## ✅ 完成！

现在你的后端已经配置完成，应用将自动使用 Supabase 进行数据持久化！
