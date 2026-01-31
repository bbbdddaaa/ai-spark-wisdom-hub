import React, { useState, useEffect } from 'react';
import { User, Post, TokenTransaction } from './types';
import { truncateAddress, getAvatarUrl, ECONOMY_CONFIG, getTodayString, calculateLikeReward } from './constants';
import PostCard from './components/PostCard';
import PostForm from './components/PostForm';
import { 
  Zap, 
  Plus, 
  Wallet, 
  Home, 
  User as UserIcon,
  LogOut,
  Coins,
  Info,
  BookOpen,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Star,
  Target,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Lightbulb,
  Gem
} from 'lucide-react';

type Tab = 'home' | 'guide' | 'profile';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [user, setUser] = useState<User>({ 
    address: null, 
    tokens: 0, 
    isConnected: false,
    dailyPostCount: 0,
    dailyLikeCount: 0,
    lastResetDate: getTodayString()
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [likeEarnedToday, setLikeEarnedToday] = useState(0); // 今日从点赞获得的代币

  useEffect(() => {
    const mockPosts: Post[] = [
      {
        id: 'p1',
        userAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        title: 'Midjourney 快速生成一致性角色的技巧',
        content: '使用 --cref 参数配合角色链接，可以极大地保持人物特征的一致性。这对我做连续绘本非常有帮助！只需要将参考图链接放在参数后面即可。',
        timestamp: Date.now() - 3600000 * 2,
        likes: 42,
        tags: ['绘画', '提示词'],
        likedBy: []
      },
      {
        id: 'p2',
        userAddress: '0x32A8e656EC7ab88b098defB751B7401B5f68123A',
        title: 'AI 让我的周报撰写时间缩短了 80%',
        content: '我建立了一个飞书机器人，每天自动收集我的 Git 提交记录并由 GPT 生成初稿。现在我只需要花 5 分钟微调即可。大大缓解了周五的压力。',
        timestamp: Date.now() - 3600000 * 8,
        likes: 128,
        tags: ['效率', '自动化'],
        likedBy: []
      }
    ];
    setPosts(mockPosts);
  }, []);

  // 检查并重置每日计数
  const checkAndResetDaily = (currentUser: User) => {
    const today = getTodayString();
    if (currentUser.lastResetDate !== today) {
      return {
        ...currentUser,
        dailyPostCount: 0,
        dailyLikeCount: 0,
        lastResetDate: today
      };
    }
    return currentUser;
  };

  const connectWallet = async () => {
    const mockAddress = '0x1A2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t';
    const newUser = {
      address: mockAddress, 
      tokens: ECONOMY_CONFIG.INITIAL_TOKENS, 
      isConnected: true,
      dailyPostCount: 0,
      dailyLikeCount: 0,
      lastResetDate: getTodayString()
    };
    setUser(newUser);
    setTransactions([{ 
      id: 't1', 
      amount: ECONOMY_CONFIG.INITIAL_TOKENS, 
      reason: '初始奖励', 
      timestamp: Date.now() 
    }]);
    setLikeEarnedToday(0);
  };

  const handleCreatePost = (data: { title: string; content: string; tags: string[] }) => {
    // 检查并重置每日计数
    const resetUser = checkAndResetDaily(user);
    
    // 计算发帖奖励
    const postReward = resetUser.dailyPostCount < ECONOMY_CONFIG.DAILY_POST_LIMIT 
      ? ECONOMY_CONFIG.POST_REWARD_BASE 
      : ECONOMY_CONFIG.POST_REWARD_REDUCED;
    
    const newPost: Post = {
      id: `p${Date.now()}`,
      userAddress: user.address || 'Anonymous',
      title: data.title,
      content: data.content,
      timestamp: Date.now(),
      likes: 0,
      tags: data.tags,
      likedBy: []
    };
    
    setPosts([newPost, ...posts]);
    setIsFormOpen(false);
    
    // 更新用户状态
    setUser({
      ...resetUser,
      tokens: resetUser.tokens + postReward,
      dailyPostCount: resetUser.dailyPostCount + 1
    });
    
    // 添加交易记录
    const rewardNote = resetUser.dailyPostCount < ECONOMY_CONFIG.DAILY_POST_LIMIT 
      ? `发布分享 (今日第${resetUser.dailyPostCount + 1}篇)`
      : `发布分享 (已超过${ECONOMY_CONFIG.DAILY_POST_LIMIT}篇限制)`;
    
    setTransactions(prev => [{
      id: `t${Date.now()}`,
      amount: postReward,
      reason: rewardNote,
      timestamp: Date.now()
    }, ...prev]);
  };

  const handleLike = (postId: string) => {
    if (!user.isConnected) {
      connectWallet();
      return;
    }

    // 检查并重置每日计数
    const resetUser = checkAndResetDaily(user);
    if (resetUser.lastResetDate !== user.lastResetDate) {
      setUser(resetUser);
      setLikeEarnedToday(0);
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // 检查是否已经点赞过
    if (post.likedBy.includes(user.address!)) {
      alert('您已经点赞过这篇文章了！');
      return;
    }

    // 检查是否给自己点赞
    if (post.userAddress === user.address) {
      alert('不能给自己的文章点赞哦！');
      return;
    }

    // 检查代币是否足够
    if (resetUser.tokens < ECONOMY_CONFIG.LIKE_COST) {
      alert(`点赞需要 ${ECONOMY_CONFIG.LIKE_COST} Spark，您的余额不足！`);
      return;
    }

    // 执行点赞
    const likeReward = calculateLikeReward(ECONOMY_CONFIG.LIKE_COST, ECONOMY_CONFIG.PLATFORM_FEE);
    const burnedTokens = ECONOMY_CONFIG.LIKE_COST - likeReward;

    // 更新帖子
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, likes: p.likes + 1, likedBy: [...p.likedBy, user.address!] }
        : p
    ));

    // 更新点赞者代币（扣除）
    setUser(prev => ({
      ...prev,
      tokens: prev.tokens - ECONOMY_CONFIG.LIKE_COST,
      dailyLikeCount: prev.dailyLikeCount + 1
    }));

    // 添加点赞者交易记录
    setTransactions(prev => [{
      id: `t${Date.now()}-like`,
      amount: -ECONOMY_CONFIG.LIKE_COST,
      reason: `点赞消耗 (作者获得 ${likeReward.toFixed(1)} S)`,
      timestamp: Date.now()
    }, ...prev]);

    // 模拟：如果作者是当前用户，直接增加收益
    // 实际应用中，这应该通过智能合约或后端处理
    if (post.userAddress === user.address) {
      // 检查今日点赞收益是否已达上限
      const newLikeEarned = likeEarnedToday + likeReward;
      if (newLikeEarned <= ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT) {
        setUser(prev => ({
          ...prev,
          tokens: prev.tokens + likeReward
        }));
        setLikeEarnedToday(newLikeEarned);
        
        setTransactions(prev => [{
          id: `t${Date.now()}-earn`,
          amount: likeReward,
          reason: `获得点赞 (今日累计 ${newLikeEarned.toFixed(1)} / ${ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT} S)`,
          timestamp: Date.now()
        }, ...prev]);
      } else {
        // 达到每日上限
        alert(`您今日从点赞获得的收益已达上限 ${ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT} Spark！`);
      }
    }

    console.log(`💰 经济流转：点赞者 -${ECONOMY_CONFIG.LIKE_COST} S | 作者 +${likeReward} S | 销毁 ${burnedTokens.toFixed(1)} S`);
  };

  const GuideView = () => (
    <div className="max-w-4xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-10">
      <section className="text-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-900/30 text-indigo-400 px-4 py-2 rounded-full mb-8 border border-indigo-800">
           <BookOpen size={16} />
           <span className="text-xs font-black uppercase tracking-widest">官方协议白皮书</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-slate-50 mb-8 tracking-tighter leading-tight">
          将你的 AI 智慧<br/><span className="text-indigo-500">资产化</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          在 AI 时代，知识不再是静态的，而是流动的能量。AI Spark 旨在奖励每一位愿意将“提示词”和“工作流”分享给社区的先驱。
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
           <h2 className="text-3xl font-black text-slate-50">为什么我们需要 AI Spark?</h2>
           <p className="text-slate-400 leading-relaxed">
             目前大量的 AI 技巧散落在各处的聊天记录或私人文档中。我们希望建立一个透明的激励层，通过 **Spark 虚拟代币** 衡量贡献度，让优质的 AI 实践能够被所有人复用。
           </p>
           <ul className="space-y-4">
              {[
                { icon: Target, text: '去中心化的知识索引' },
                { icon: ShieldCheck, text: '基于钱包地址的贡献存证' },
                { icon: Sparkles, text: 'AI 辅助的内容润色与分类' }
              ].map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-slate-300 font-bold">
                   <item.icon className="text-indigo-400" size={20} />
                   <span>{item.text}</span>
                </li>
              ))}
           </ul>
        </div>
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl border border-slate-800">
           <div className="relative z-10">
              <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mb-4">当前进度</p>
              <h3 className="text-2xl font-black mb-8">V1.0 种子测试阶段</h3>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-xs mb-2 text-slate-400"><span>社区贡献值</span><span>64%</span></div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-600 w-[64%]"></div>
                    </div>
                 </div>
                 <p className="text-sm text-slate-500 italic">“我们正在寻找前 1000 位核心创作者，早期参与者将获得双倍 Spark 加成。”</p>
              </div>
           </div>
           <Zap className="absolute -right-10 -bottom-10 text-white/5" size={200} fill="currentColor" />
        </div>
      </section>

      <section>
        <div className="text-center mb-16">
           <h2 className="text-3xl font-black text-slate-50">Spark 奖励明细</h2>
           <p className="text-slate-500 mt-2">公平、透明、即时到账</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-sm hover:border-indigo-900 transition-colors">
            <div className="bg-indigo-900/30 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-400 mb-6"><Plus size={24} /></div>
            <h4 className="font-black text-xl mb-2 text-slate-50">发布分享</h4>
            <p className="text-slate-500 text-sm mb-6">每次成功发布有效的 AI 技巧、工具评测或使用心得。</p>
            <div className="text-2xl font-black text-indigo-400">+10 S <span className="text-xs text-slate-600">/ 篇</span></div>
            <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 p-3 rounded-xl">
              💡 每日前 {ECONOMY_CONFIG.DAILY_POST_LIMIT} 篇 +{ECONOMY_CONFIG.POST_REWARD_BASE} S，之后 +{ECONOMY_CONFIG.POST_REWARD_REDUCED} S
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-sm hover:border-rose-900 transition-colors">
            <div className="bg-rose-900/30 w-12 h-12 rounded-2xl flex items-center justify-center text-rose-400 mb-6"><Star size={24} /></div>
            <h4 className="font-black text-xl mb-2 text-slate-50">获得点赞</h4>
            <p className="text-slate-500 text-sm mb-6">你的分享如果对他人有启发并获得点赞奖励。</p>
            <div className="text-2xl font-black text-rose-400">+0.9 S <span className="text-xs text-slate-600">/ 赞</span></div>
            <div className="mt-3 text-xs text-slate-500 bg-slate-800/50 p-3 rounded-xl">
              🔄 点赞者花费 1 S，作者获得 0.9 S，0.1 S 销毁<br/>
              📊 每日最多获得 {ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT} S
            </div>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-sm hover:border-amber-900 transition-colors">
            <div className="bg-amber-900/30 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-400 mb-6"><Trophy size={24} /></div>
            <h4 className="font-black text-xl mb-2 text-slate-50">精选入库</h4>
            <p className="text-slate-500 text-sm mb-6">内容被管理员标记为“官方推荐”或进入年度合集。</p>
            <div className="text-2xl font-black text-amber-500">+100 S <span className="text-xs text-slate-600">/ 次</span></div>
          </div>
        </div>
        
        {/* 新增：经济模型说明 */}
        <div className="mt-12 bg-gradient-to-br from-indigo-950 to-purple-950 p-10 rounded-[3rem] border border-indigo-900/50">
          <h3 className="text-2xl font-black text-slate-50 mb-6 flex items-center">
            <Sparkles className="mr-3 text-indigo-400" size={28} />
            全新可持续经济模型
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-slate-900/70 backdrop-blur p-6 rounded-2xl border border-slate-800">
              <div className="font-black text-slate-50 mb-2">💰 点赞消耗机制</div>
              <p className="text-slate-400 leading-relaxed">
                用户给他人点赞需要花费 1 Spark，其中 0.9 Spark 转给作者，0.1 Spark 被销毁，形成代币通缩，防止无限增发。
              </p>
            </div>
            <div className="bg-slate-900/70 backdrop-blur p-6 rounded-2xl border border-slate-800">
              <div className="font-black text-slate-50 mb-2">📈 每日限额控制</div>
              <p className="text-slate-400 leading-relaxed">
                每日前 3 篇发布获得高额奖励（10 S），之后降低至 3 S；点赞收益每日上限 50 S，鼓励持续创作。
              </p>
            </div>
            <div className="bg-slate-900/70 backdrop-blur p-6 rounded-2xl border border-slate-800">
              <div className="font-black text-slate-50 mb-2">🔄 代币闭环流转</div>
              <p className="text-slate-400 leading-relaxed">
                发布赚币 → 花币点赞 → 作者获益 → 继续创作，形成良性循环，让优质内容获得真实价值认可。
              </p>
            </div>
            <div className="bg-slate-900/70 backdrop-blur p-6 rounded-2xl border border-slate-800">
              <div className="font-black text-slate-50 mb-2">🎁 初始代币优化</div>
              <p className="text-slate-400 leading-relaxed">
                连接钱包即获得 20 Spark 启动资金，足够体验点赞和发布功能，开启你的 AI 创作之旅。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-200">
      
      {/* PC 顶部导航栏 */}
      <header className="hidden md:flex sticky top-0 z-[100] w-full h-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 items-center justify-center">
        <div className="max-w-6xl w-full flex items-center justify-between px-8">
          <div className="flex items-center space-x-8">
            <div onClick={() => setActiveTab('home')} className="flex items-center space-x-2 cursor-pointer group">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/20 group-hover:scale-110 transition-transform">
                <Zap className="text-white fill-white" size={18} />
              </div>
              <span className="text-lg font-black tracking-tighter text-slate-50 uppercase">AI Spark</span>
            </div>
            
            <nav className="flex items-center space-x-1">
              <button 
                onClick={() => setActiveTab('home')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-indigo-900/40 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                发现首页
              </button>
              <button 
                onClick={() => setActiveTab('guide')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'guide' ? 'bg-indigo-900/40 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
              >
                深度指南
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user.isConnected ? (
              <div onClick={() => setActiveTab('profile')} className="flex items-center space-x-3 bg-slate-800/50 border border-slate-700 p-1.5 pr-4 rounded-full cursor-pointer hover:border-indigo-500 transition-colors">
                <img src={getAvatarUrl(user.address!)} className="w-8 h-8 rounded-full border border-slate-700" />
                <div>
                  <div className="text-[10px] font-black text-indigo-400 leading-none mb-1">{user.tokens} SPARK</div>
                  <div className="text-[10px] font-mono text-slate-500 leading-none">{truncateAddress(user.address!)}</div>
                </div>
              </div>
            ) : (
              <button onClick={connectWallet} className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-sm font-black hover:bg-indigo-500 transition-all">
                <Wallet size={16} />
                <span>连接钱包</span>
              </button>
            )}
            
            <button 
              onClick={() => user.isConnected ? setIsFormOpen(true) : connectWallet()}
              className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-indigo-900/20"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* 移动端顶部标题栏 (Mobile Only) */}
      <header className="md:hidden flex justify-between items-center px-6 py-4 bg-slate-900 sticky top-0 z-50 border-b border-slate-800">
         <div className="flex items-center space-x-2">
           <div className="bg-indigo-600 p-1.5 rounded-lg"><Zap size={16} className="text-white fill-white" /></div>
           <span className="text-lg font-black tracking-tighter uppercase text-slate-50">AI Spark</span>
         </div>
         {user.isConnected ? (
            <div onClick={() => setActiveTab('profile')} className="flex items-center space-x-2 bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-800">
               <Coins size={14} className="text-indigo-400" />
               <span className="text-xs font-black text-indigo-400">{user.tokens}</span>
            </div>
         ) : (
           <button onClick={connectWallet} className="p-2 bg-slate-800 rounded-xl text-slate-200"><Wallet size={20} /></button>
         )}
      </header>

      {/* 内容区域 */}
      <main className={`flex-1 w-full mx-auto px-4 pb-32 pt-8 md:pt-0 ${activeTab === 'guide' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {activeTab === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-500 py-10">
            {/* Expanded Intro Section */}
            <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 border border-slate-800 shadow-2xl shadow-black/50 relative overflow-hidden">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3">
                  <div className="flex items-center space-x-2 text-indigo-400 mb-6 bg-indigo-900/30 w-fit px-4 py-2 rounded-full border border-indigo-800">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">让 AI 技巧闪光</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-50 mb-6 tracking-tight leading-[1.1]">
                    你的每一条 AI 心得<br/>都值得被<span className="text-indigo-500 italic">“挖矿”</span>
                  </h2>
                  <p className="text-slate-400 text-lg leading-relaxed mb-8 max-w-xl">
                    在 AI Spark，分享知识不仅是助人，更是为自己积累数字资产。连接钱包，开始你的 AI 创作者之旅。
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => user.isConnected ? setIsFormOpen(true) : connectWallet()}
                      className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-900/20 hover:scale-105 transition-all flex items-center space-x-2"
                    >
                      <Plus size={18} />
                      <span>立即分享发布</span>
                    </button>
                    <button onClick={() => setActiveTab('guide')} className="bg-slate-800 text-slate-300 px-8 py-4 rounded-2xl font-black border border-slate-700 hover:bg-slate-700 transition-all">
                      了解奖励明细
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                  <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700 flex items-start space-x-4">
                    <div className="bg-slate-900 p-3 rounded-2xl shadow-sm text-indigo-400"><Lightbulb size={24} /></div>
                    <div>
                      <h4 className="font-black text-slate-50">捕获灵感</h4>
                      <p className="text-sm text-slate-500 mt-1">记录任何 AI 改变你生活的瞬间</p>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700 flex items-start space-x-4">
                    <div className="bg-slate-900 p-3 rounded-2xl shadow-sm text-rose-500"><Gem size={24} /></div>
                    <div>
                      <h4 className="font-black text-slate-50">赚取 Spark</h4>
                      <p className="text-sm text-slate-500 mt-1">发布即得 10 Spark，获赞无上限</p>
                    </div>
                  </div>
                  <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700 flex items-start space-x-4">
                    <div className="bg-slate-900 p-3 rounded-2xl shadow-sm text-emerald-500"><TrendingUp size={24} /></div>
                    <div>
                      <h4 className="font-black text-slate-50">权益兑换</h4>
                      <p className="text-sm text-slate-500 mt-1">代币将决定未来主网空投份额</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
            </div>
            
            {/* Compact Feed Section */}
            <div>
              <div className="flex items-center justify-between mb-8 px-4">
                 <div>
                    <h3 className="text-2xl font-black text-slate-50">社区发现</h3>
                    <p className="text-slate-500 text-xs mt-1 font-bold uppercase tracking-widest">来自全球的 AI 创作者</p>
                 </div>
                 <div className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-900/30 text-[10px] font-black">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span>LIVE FEED</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map(post => (
                  <PostCard key={post.id} post={post} onLike={handleLike} />
                ))}
              </div>
              
              <div className="mt-12 text-center">
                 <button className="text-slate-500 font-black text-sm hover:text-indigo-400 transition-colors py-4 px-8 border-2 border-slate-800 rounded-2xl hover:border-indigo-900/50">
                    加载更多发现
                 </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guide' && <GuideView />}

        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto space-y-8 animate-in slide-in-from-bottom-4 py-20">
            {!user.isConnected ? (
              <div className="text-center py-20 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-xl">
                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6"><Wallet className="text-slate-600" size={32} /></div>
                <h2 className="text-xl font-black mb-2 text-slate-50">连接钱包</h2>
                <p className="text-slate-500 text-sm mb-8 px-10">连接钱包以管理您的 Spark 代币并同步您的分享记录。</p>
                <button onClick={connectWallet} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black active:scale-95 hover:bg-indigo-500 transition-all">现在连接</button>
              </div>
            ) : (
              <div className="bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-xl text-center">
                <img src={getAvatarUrl(user.address!)} className="w-24 h-24 rounded-3xl mx-auto mb-6 border-4 border-slate-800 shadow-sm" />
                <p className="font-mono text-sm text-slate-500 mb-1">{truncateAddress(user.address!)}</p>
                <h3 className="text-4xl font-black text-slate-50 mb-8">{user.tokens.toFixed(1)} <span className="text-lg text-indigo-400">Spark</span></h3>
                
                <div className="flex flex-col space-y-3 mb-6">
                   <div className="flex justify-between p-4 bg-indigo-900/30 rounded-2xl items-center">
                      <span className="text-xs font-bold text-indigo-400">今日发布</span>
                      <span className="font-black text-indigo-400">{user.dailyPostCount} / {ECONOMY_CONFIG.DAILY_POST_LIMIT}+</span>
                   </div>
                   <div className="flex justify-between p-4 bg-rose-900/30 rounded-2xl items-center">
                      <span className="text-xs font-bold text-rose-400">今日点赞收益</span>
                      <span className="font-black text-rose-400">{likeEarnedToday.toFixed(1)} / {ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT} S</span>
                   </div>
                   <div className="flex justify-between p-4 bg-slate-800 rounded-2xl items-center">
                      <span className="text-xs font-bold text-slate-500">总积累</span>
                      <span className="font-black text-slate-300">+{(user.tokens - ECONOMY_CONFIG.INITIAL_TOKENS).toFixed(1)} S</span>
                   </div>
                </div>
                
                {/* 交易记录 */}
                {transactions.length > 0 && (
                  <div className="mt-6 text-left">
                    <h4 className="text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">最近交易</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-xl text-xs">
                          <span className="text-slate-400">{tx.reason}</span>
                          <span className={`font-black ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(1)} S
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button onClick={() => {
                  setUser({address: null, tokens: 0, isConnected: false, dailyPostCount: 0, dailyLikeCount: 0, lastResetDate: getTodayString()});
                  setTransactions([]);
                  setLikeEarnedToday(0);
                }} className="flex items-center justify-center space-x-2 text-slate-500 text-xs font-bold pt-6 w-full hover:text-slate-300 transition-colors">
                  <LogOut size={14} /> <span>断开连接</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 移动端底部导航 (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 px-8 py-4 pb-safe z-50">
        <div className="flex justify-between items-center h-10">
          <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-indigo-400' : 'text-slate-600'}><Home size={24} /></button>
          <button onClick={() => setActiveTab('guide')} className={activeTab === 'guide' ? 'text-indigo-400' : 'text-slate-600'}><BookOpen size={24} /></button>
          <button 
            onClick={() => user.isConnected ? setIsFormOpen(true) : connectWallet()}
            className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40 -mt-10 border-4 border-slate-900"
          ><Plus size={24} /></button>
          <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-indigo-400' : 'text-slate-600'}><UserIcon size={24} /></button>
        </div>
      </nav>

      {isFormOpen && (
        <PostForm 
          onSubmit={handleCreatePost} 
          onClose={() => setIsFormOpen(false)} 
        />
      )}
    </div>
  );
};

export default App;
