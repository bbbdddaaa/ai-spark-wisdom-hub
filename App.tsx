import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useReadContract } from 'wagmi';
import { User, Post } from './types';
import { truncateAddress, getAvatarUrl, ECONOMY_CONFIG, getTodayString, calculateLikeReward } from './constants';
import PostCard from './components/PostCard';
import PostForm from './components/PostForm';
import Toast, { ToastType } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';
import MintPanel from './components/MintPanel';
import MembershipPanel from './components/MembershipPanel';
import WeeklyRankingPanel from './components/WeeklyRankingPanel';
import { PostDetailModal } from './components/PostDetailModal';
import MintProgressBar from './components/MintProgressBar';
import * as supabaseService from './services/supabaseService';
import { CONTRACT_ADDRESSES, MINT_CONTROLLER_ABI } from './lib/web3Config';
import { useSparkBalance, useUsdtBalance, useTransferSpark } from './lib/web3Hooks';
import { formatUnits } from 'viem';
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

type Tab = 'home' | 'guide' | 'profile' | 'mint' | 'membership' | 'ranking';

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
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  // Get real mint progress data
  const { data: totalMintedUsers } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'totalMintedUsers',
  });
  
  // Get real on-chain SPARK balance
  const { data: sparkBalanceRaw, refetch: refetchSparkBalance } = useSparkBalance(address);
  const sparkBalance = sparkBalanceRaw ? Number(formatUnits(sparkBalanceRaw as bigint, 18)) : 0;
  
  // Get real on-chain USDT balance
  const { data: usdtBalanceRaw } = useUsdtBalance(address);
  const usdtBalance = usdtBalanceRaw ? Number(formatUnits(usdtBalanceRaw as bigint, 6)) : 0;
  
  // Transfer SPARK hook for likes
  const { transfer: transferSpark, isPending: isTransferring, isConfirming: isTransferConfirming, isSuccess: isTransferSuccess } = useTransferSpark();
  
  // Toast state
  const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

  const showToast = (type: ToastType, message: string) => {
    setToast({ type, message });
  };

  const hideToast = () => {
    setToast(null);
  };

  // Load posts on init
  useEffect(() => {
    loadPosts();
    
    // Subscribe only when Supabase is configured
    if (supabaseService.supabase) {
      const postsSubscription = supabaseService.subscribeToPosts((newPost) => {
        setPosts(prev => [newPost, ...prev]);
      });

      // 优化：点赞时只更新特定帖子的点赞数，不重新加载所有帖子
      const likesSubscription = supabaseService.subscribeToLikes(async (like) => {
        setPosts(prev => prev.map(post => {
          if (post.id === like.post_id) {
            return {
              ...post,
              likes: post.likes + 1,
              likedBy: [...post.likedBy, like.user_address]
            };
          }
          return post;
        }));
      });

      return () => {
        postsSubscription.unsubscribe();
        likesSubscription.unsubscribe();
      };
    }
  }, []);

  const loadPosts = async (retryCount = 0) => {
    // 防止重复加载
    if (isLoadingPosts) {
      return;
    }

    setIsLoadingPosts(true);
    try {
      const fetchedPosts = await supabaseService.fetchPosts();
      setPosts(fetchedPosts);
    } catch (error: any) {
      console.error('Failed to load posts:', error);
      
      // 自动重试机制（最多重试2次）
      if (retryCount < 2) {
        console.log(`Retrying... (attempt ${retryCount + 1}/2)`);
        setTimeout(() => {
          setIsLoadingPosts(false);
          loadPosts(retryCount + 1);
        }, 1000 * (retryCount + 1)); // 递增延迟：1s, 2s
        return;
      }
      
      // 重试失败后才显示错误
      const errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        showToast('warning', 'Loading too fast, please wait a moment...');
      } else {
        showToast('error', 'Failed to load posts. Please try again later.');
      }
    } finally {
      setIsLoadingPosts(false);
    }
  };

  useEffect(() => {
    if (isConnected && address) {
      loadUserData(address);
    } else {
      setUser({
        address: null,
        tokens: 0,
        isConnected: false,
        dailyPostCount: 0,
        dailyLikeCount: 0,
        lastResetDate: getTodayString()
      });
    }
  }, [isConnected, address]);

  const loadUserData = async (walletAddress: string) => {
    setLoading(true);
    try {
      const fetchedUser = await supabaseService.getOrCreateUser(walletAddress);
      setUser(fetchedUser);
      
      showToast('success', `🎉 钱包已连接！地址: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
    } catch (error) {
      console.error('Failed to load user data:', error);
      showToast('error', '加载失败，请刷新页面。');
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async (connectorIndex: number = 0) => {
    if (loading) return;
    
    try {
      const connector = connectors[connectorIndex];
      if (connector) {
        connect({ connector });
      } else {
        showToast('error', 'No wallet detected. Please install MetaMask or OKX Wallet.');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      showToast('error', 'Connection failed. Please ensure wallet is installed and unlocked.');
    }
  };

  const [showWalletModal, setShowWalletModal] = useState(false);

  const openWalletModal = () => {
    if (connectors.length === 0) {
      showToast('error', 'No wallet detected. Please install MetaMask or OKX Wallet.');
      return;
    }
    if (connectors.length === 1) {
      connectWallet(0);
    } else {
      setShowWalletModal(true);
    }
  };

  const selectWallet = (index: number) => {
    setShowWalletModal(false);
    connectWallet(index);
  };

  const disconnectWallet = () => {
    disconnect();
    showToast('info', 'Wallet disconnected.');
  };

  const handleCreatePost = async (data: { title: string; content: string; tags: string[] }) => {
    if (!user.isConnected || !user.address) {
      showToast('warning', 'Please connect your wallet first.');
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      const newPost = await supabaseService.createPost(
        user.address,
        data.title,
        data.content,
        data.tags,
        data.scoringResult,  // 传入前端的评分结果
        data.categorizationResult  // 传入前端的分类结果
      );
      
      setPosts(prev => [newPost, ...prev]);
      
      await supabaseService.updateUserDailyStats(user.address, {
        daily_post_count: user.dailyPostCount + 1
      });
      
      setUser(prev => ({
        ...prev,
        dailyPostCount: prev.dailyPostCount + 1
      }));
      
      const { data: updatedUser } = await supabaseService.supabase
        .from('users')
        .select('is_eligible_for_mint, has_minted, post_count')
        .eq('address', user.address)
        .single();
      
      // 🚀 调用 API 授予链上 Mint 资格（异步，不阻塞）
      if (updatedUser?.post_count === 1) {
        // 如果是第一篇帖子，触发授予资格
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3100';
        fetch(`${apiUrl}/api/grant-eligibility`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: user.address }),
        })
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              console.log('✅ 链上资格授予成功:', result.txHash);
            } else {
              console.warn('⚠️ 链上资格授予失败:', result.error);
            }
          })
          .catch(err => {
            console.error('❌ 调用授予资格 API 失败:', err);
          });
      }
      
      setIsFormOpen(false);
      
      if (updatedUser?.is_eligible_for_mint && !updatedUser?.has_minted) {
        showToast('success', '🎉 帖子已发布！你获得了 Mint 资格（前2000名）。支付 10 USDT 即可铸造 10,000 SPARK！');
      } else if (updatedUser?.has_minted) {
        showToast('success', '✨ 帖子已发布！参与每周排名 — 前10名可获得代币奖励。');
      } else {
        showToast('success', '✨ 帖子已发布！Mint 名额已满 — 参与每周排名可获得代币奖励。');
      }
    } catch (error: any) {
      console.error('Failed to publish:', error);
      
      if (error.message && error.message.includes('Validation failed')) {
        showToast('error', '❌ Content contains unsafe content. Please edit and try again.');
      } else {
        showToast('error', 'Publish failed. Please check network and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user.isConnected || !user.address) {
      showToast('info', 'Connect wallet to like posts.');
      connectWallet();
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.likedBy.includes(user.address)) {
      showToast('warning', 'You have already liked this post!');
      return;
    }

    if (post.userAddress === user.address) {
      showToast('warning', "You can't like your own post!");
      return;
    }

    if (sparkBalance < ECONOMY_CONFIG.LIKE_COST) {
      showToast('error', `点赞需要 ${ECONOMY_CONFIG.LIKE_COST} SPARK。你的链上余额不足。`);
      return;
    }

    if (loading || isTransferring || isTransferConfirming) return;

    setLoading(true);
    try {
      // 1. 先记录点赞关系到数据库
      await supabaseService.likePost(postId, user.address);
      
      // 2. 发起链上转账给作者（100 SPARK）
      transferSpark(post.userAddress, ECONOMY_CONFIG.LIKE_COST.toString());
      
      // 3. 更新本地UI
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            likes: p.likes + 1,
            likedBy: [...p.likedBy, user.address]
          };
        }
        return p;
      }));

      showToast('info', `💫 正在转账 ${ECONOMY_CONFIG.LIKE_COST} SPARK 给作者...`);
    } catch (error: any) {
      console.error('Like failed:', error);
      if (error.code === '23505') {
        showToast('warning', '你已经点赞过这篇帖子了！');
      } else {
        showToast('error', '点赞失败，请检查网络后重试。');
      }
      setLoading(false);
    }
  };
  
  // 监听转账成功
  useEffect(() => {
    if (isTransferSuccess) {
      showToast('success', `👍 点赞成功！已转账 ${ECONOMY_CONFIG.LIKE_COST} SPARK 给作者。`);
      // 刷新余额
      refetchSparkBalance();
      setLoading(false);
    }
  }, [isTransferSuccess, refetchSparkBalance]);

  const MAX_SLOTS = 2000;
  const minted = Number(totalMintedUsers || 0);
  const mintPercentage = (minted / MAX_SLOTS) * 100;

  const GuideView = () => (
    <div className="max-w-4xl mx-auto space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 pt-10">
      <section className="text-center">
        <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full mb-8 border border-indigo-100">
           <BookOpen size={16} />
           <span className="text-xs font-black uppercase tracking-widest">Official Protocol Whitepaper</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-8 tracking-tighter leading-tight">
          Turn your AI wisdom<br/><span className="text-indigo-600">into assets</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          AI tools are powerful, but <span className="text-slate-900 font-bold">only humans discover better ways to use them</span>. AI Spark rewards everyone who shares these irreplaceable insights with the community.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
           <h2 className="text-3xl font-black text-slate-900">Why AI Spark?</h2>
           <p className="text-slate-500 leading-relaxed">
             AI can generate answers, but <span className="text-slate-900 font-bold">only human wisdom finds the right questions</span>. Today, countless valuable prompts and workflows hide in private docs. We build a transparent incentive layer: Spark tokens measure contribution so great AI practices can be reused by everyone.
           </p>
           <ul className="space-y-4">
              {[
                { icon: Target, text: 'Decentralized knowledge index' },
                { icon: ShieldCheck, text: 'Wallet-based contribution proof' },
                { icon: Sparkles, text: 'AI-assisted polish and categorization' }
              ].map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-slate-700 font-bold">
                   <item.icon className="text-indigo-600" size={20} />
                   <span>{item.text}</span>
                </li>
              ))}
           </ul>
        </div>
        <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
           <div className="relative z-10">
              <p className="text-indigo-400 font-black uppercase tracking-widest text-[10px] mb-4">Current Progress</p>
              <h3 className="text-2xl font-black mb-8">V1.0 Seed Test Phase</h3>
              <div className="space-y-6">
                   <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span>Mint progress</span>
                      <span>{minted} / {MAX_SLOTS} ({mintPercentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-indigo-500 transition-all duration-500" 
                         style={{ width: `${mintPercentage}%` }}
                       ></div>
                    </div>
                 </div>
                 <p className="text-sm text-slate-400 italic">“We are looking for the first 2,000 core creators. Early participants get 2x Spark bonus.”</p>
              </div>
           </div>
           <Zap className="absolute -right-10 -bottom-10 text-white/5" size={200} fill="currentColor" />
        </div>
      </section>

      <section className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-[3rem] p-12 border border-indigo-100 relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-full mb-6 shadow-lg">
              <ShieldCheck size={20} />
              <span className="text-xs font-black uppercase tracking-widest">Powered by ERC-8004</span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Blockchain-Verified AI Agent</h2>
            <p className="text-slate-600 max-w-3xl mx-auto leading-relaxed text-lg">
              AI Spark is built on <span className="font-black text-indigo-600">ERC-8004</span>, the first official standard for decentralized AI Agent identity and reputation. This ensures every content evaluation is transparent, verifiable, and trustworthy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm">
              <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center text-indigo-600 mb-6">
                <ShieldCheck size={28} />
              </div>
              <h4 className="font-black text-xl mb-3 text-slate-900">On-Chain Identity</h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Our AI scoring agent has a unique <span className="font-bold text-indigo-600">ERC-721 NFT identity</span> registered on Ethereum. View verifiable metadata including capabilities, version, and compliance status.
              </p>
              <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl space-y-1">
                <div><span className="font-bold">Registry:</span> 0x8004ad19...D46C2898</div>
                <div><span className="font-bold">Standard:</span> ERC-8004 v1.0</div>
                <div><span className="font-bold">Status:</span> ✅ Verified</div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-rose-100 shadow-sm">
              <div className="bg-rose-50 w-14 h-14 rounded-2xl flex items-center justify-center text-rose-500 mb-6">
                <Star size={28} />
              </div>
              <h4 className="font-black text-xl mb-3 text-slate-900">Reputation Tracking</h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Agent performance is <span className="font-bold text-rose-500">permanently recorded on-chain</span> via ReputationRegistry. Every scoring task, user feedback, and quality metric builds an immutable trust score.
              </p>
              <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl space-y-1">
                <div><span className="font-bold">Tasks Completed:</span> On-chain verified</div>
                <div><span className="font-bold">Feedback Score:</span> Community-driven</div>
                <div><span className="font-bold">Audit Trail:</span> 100% transparent</div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-sm">
              <div className="bg-emerald-50 w-14 h-14 rounded-2xl flex items-center justify-center text-emerald-600 mb-6">
                <Target size={28} />
              </div>
              <h4 className="font-black text-xl mb-3 text-slate-900">Validation Proof</h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                Independent validators can <span className="font-bold text-emerald-600">audit agent outputs</span> through ValidationRegistry, creating a decentralized trust layer that no single party controls.
              </p>
              <div className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl space-y-1">
                <div><span className="font-bold">Validation:</span> Multi-party consensus</div>
                <div><span className="font-bold">Audit Access:</span> Public & open</div>
                <div><span className="font-bold">Trust Model:</span> Decentralized</div>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur rounded-[2.5rem] p-8 border border-indigo-100">
            <h3 className="text-2xl font-black text-slate-900 mb-4 flex items-center">
              <Lightbulb className="mr-3 text-indigo-600" size={24} />
              Why ERC-8004 Matters for AI Spark
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-indigo-100 p-1.5 rounded-lg mt-0.5">
                    <ShieldCheck className="text-indigo-600" size={14} />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 mb-1">Transparent Scoring</h5>
                    <p className="text-slate-600 leading-relaxed">
                      Every post evaluation by our AI agent is linked to its verified on-chain identity, eliminating black-box algorithms.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-rose-100 p-1.5 rounded-lg mt-0.5">
                    <Star className="text-rose-500" size={14} />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 mb-1">Community Trust</h5>
                    <p className="text-slate-600 leading-relaxed">
                      Agent reputation grows with successful evaluations. Poor performance is visible to all, maintaining high quality standards.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="bg-emerald-100 p-1.5 rounded-lg mt-0.5">
                    <Target className="text-emerald-600" size={14} />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 mb-1">Fair Rewards</h5>
                    <p className="text-slate-600 leading-relaxed">
                      Spark token distribution based on verified agent scores ensures creators are rewarded fairly for quality content.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="bg-purple-100 p-1.5 rounded-lg mt-0.5">
                    <Sparkles className="text-purple-600" size={14} />
                  </div>
                  <div>
                    <h5 className="font-black text-slate-900 mb-1">Future-Ready</h5>
                    <p className="text-slate-600 leading-relaxed">
                      ERC-8004 compliance allows integration with other AI agents, creating an ecosystem of verified, interoperable agents.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-bold border border-indigo-100">
                  Identity Registry: 0x8004ad19...
                </span>
                <span className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full font-bold border border-rose-100">
                  Reputation Registry: 0x8004B12F...
                </span>
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full font-bold border border-emerald-100">
                  Validation Registry: 0x8004C11C...
                </span>
              </div>
              <a 
                href="https://www.8004scan.io" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg"
              >
                <span>Explore on 8004scan</span>
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-200/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl"></div>
      </section>

      <section>
        <div className="text-center mb-16">
           <h2 className="text-3xl font-black text-slate-900">Spark Rewards</h2>
           <p className="text-slate-400 mt-2">Fair, transparent, instant</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
            <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center text-indigo-600 mb-6"><Plus size={24} /></div>
            <h4 className="font-black text-xl mb-2 text-slate-900">Mint Tokens 🆕</h4>
            <p className="text-slate-400 text-sm mb-6">Top 2000 users who post can pay 10 USDT to mint 10,000 SPARK.</p>
            <div className="text-2xl font-black text-indigo-600">+10000 S</div>
            <div className="mt-3 text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">
              🎁 Top 2000 exclusive<br/>
              💰 Pay 10 USDT<br/>
              ⚡ Get 10,000 SPARK once
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-rose-200 transition-colors">
            <div className="bg-rose-50 w-12 h-12 rounded-2xl flex items-center justify-center text-rose-500 mb-6"><Trophy size={24} /></div>
            <h4 className="font-black text-xl mb-2 text-slate-900">Weekly Ranking 🆕</h4>
            <p className="text-slate-400 text-sm mb-6">Top 10 by likes each week earn SPARK rewards.</p>
            <div className="text-2xl font-black text-rose-500">2000-10000 S</div>
            <div className="mt-3 text-xs text-slate-400 bg-slate-50 p-3 rounded-xl">
              🥇 1st: 10000 SPARK<br/>
              🥈 2nd: 9111 SPARK<br/>
              🥉 3rd: 8222 SPARK<br/>
              📊 Down to 10th: 2000 SPARK
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-amber-200 transition-colors">
            <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center text-amber-500 mb-6"><Trophy size={24} /></div>
            <h4 className="font-black text-xl mb-2 text-slate-900">Featured</h4>
            <p className="text-slate-400 text-sm mb-6">Content marked “Official Pick” or in annual collection.</p>
            <div className="text-2xl font-black text-amber-600">+100 S <span className="text-xs text-slate-300">/ time</span></div>
          </div>
        </div>
        
        <div className="mt-12 bg-gradient-to-br from-indigo-50 to-purple-50 p-10 rounded-[3rem] border border-indigo-100">
          <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center">
            <Sparkles className="mr-3 text-indigo-600" size={28} />
            Sustainable Economy Model
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="bg-white/70 backdrop-blur p-6 rounded-2xl">
              <div className="font-black text-slate-900 mb-2">💰 Like mechanism</div>
              <p className="text-slate-600 leading-relaxed">
                Liking costs 100 Spark: 90 to author, 10 as platform fee. High-value content gets real rewards.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur p-6 rounded-2xl">
              <div className="font-black text-slate-900 mb-2">🎯 How to get tokens</div>
              <p className="text-slate-600 leading-relaxed">
                Mint (top 2000), Weekly ranking (top 10), or get likes from others. No initial airdrop.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur p-6 rounded-2xl">
              <div className="font-black text-slate-900 mb-2">🔄 Token circulation</div>
              <p className="text-slate-600 leading-relaxed">
                Mint/Win → spend on likes → authors earn → more creation. Value flows to quality content.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur p-6 rounded-2xl">
              <div className="font-black text-slate-900 mb-2">🏆 Earn from quality</div>
              <p className="text-slate-600 leading-relaxed">
                Create great content → get likes (90 S each) → rank weekly (up to 10000 S) → sustainable income.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* PC nav */}
      <header className="hidden md:flex sticky top-0 z-[100] w-full h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 items-center justify-center">
        <div className="max-w-6xl w-full flex items-center justify-between px-8">
          <div className="flex items-center space-x-8">
            <div onClick={() => setActiveTab('home')} className="flex items-center space-x-2 cursor-pointer group">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                <Zap className="text-white fill-white" size={18} />
              </div>
              <span className="text-lg font-black tracking-tighter text-slate-900 uppercase">AI Spark</span>
            </div>
            
            <nav className="flex items-center space-x-1">
              <button 
                onClick={() => setActiveTab('home')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'home' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                Discover
              </button>
              <button 
                onClick={() => setActiveTab('mint')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'mint' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                🎁 Mint
              </button>
              <button 
                onClick={() => setActiveTab('membership')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'membership' ? 'bg-purple-50 text-purple-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                👑 Membership
              </button>
              <button 
                onClick={() => setActiveTab('ranking')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'ranking' ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                🏆 Ranking
              </button>
              <button 
                onClick={() => setActiveTab('guide')} 
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'guide' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                Guide
              </button>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {user.isConnected ? (
              <div onClick={() => setActiveTab('profile')} className="flex items-center space-x-3 bg-slate-50 border border-slate-100 p-1.5 pr-4 rounded-full cursor-pointer hover:border-indigo-200 transition-colors">
                <img src={getAvatarUrl(user.address!)} className="w-8 h-8 rounded-full border border-white" />
                <div>
                  <div className="text-[10px] font-black text-indigo-600 leading-none mb-1">⚡ {sparkBalance.toFixed(0)} SPARK</div>
                  <div className="text-[10px] font-mono text-slate-400 leading-none">{truncateAddress(user.address!)}</div>
                </div>
              </div>
            ) : (
              <button onClick={openWalletModal} className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-sm font-black hover:bg-indigo-600 transition-all">
                <Wallet size={16} />
                <span>Connect Wallet</span>
              </button>
            )}
            
            <button 
              onClick={() => user.isConnected ? setIsFormOpen(true) : openWalletModal()}
              disabled={loading}
              className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading && !isFormOpen ? <LoadingSpinner size={20} /> : <Plus size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden flex justify-between items-center px-6 py-4 bg-white sticky top-0 z-50 border-b border-slate-50">
         <div className="flex items-center space-x-2">
           <div className="bg-indigo-600 p-1.5 rounded-lg"><Zap size={16} className="text-white fill-white" /></div>
           <span className="text-lg font-black tracking-tighter uppercase">AI Spark</span>
         </div>
         {user.isConnected ? (
            <div onClick={() => setActiveTab('profile')} className="flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
               <Coins size={14} className="text-indigo-600" />
               <span className="text-xs font-black text-indigo-600">{sparkBalance.toFixed(0)} SPARK</span>
            </div>
         ) : (
           <button 
             onClick={openWalletModal} 
             disabled={loading}
             className="p-2 bg-slate-100 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
           >
             {loading ? <LoadingSpinner size={20} /> : <Wallet size={20} />}
           </button>
         )}
      </header>

      {/* Main content */}
      <main className={`flex-1 w-full mx-auto px-4 pb-32 pt-8 md:pt-0 ${activeTab === 'guide' ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {activeTab === 'home' && (
          <div className="space-y-12 animate-in fade-in duration-500 py-10">
            {/* Expanded Intro Section */}
            <div className="bg-white rounded-[3rem] p-10 md:p-14 border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-12">
                <div className="lg:col-span-3">
                  <div className="flex items-center space-x-2 text-indigo-600 mb-6 bg-indigo-50 w-fit px-4 py-2 rounded-full border border-indigo-100">
                    <Sparkles size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Make AI tips shine</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
                    Every AI insight<br/>deserves to be <span className="text-indigo-600 italic">“mined”</span>
                  </h2>
                  <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-xl">
                    <span className="text-slate-900 font-bold">Only humans can turn AI into real-world magic.</span> On AI Spark, share your unique insights, help others, and build digital assets. Connect wallet and start your AI creator journey.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={() => user.isConnected ? setIsFormOpen(true) : openWalletModal()}
                      className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-200 hover:scale-105 transition-all flex items-center space-x-2"
                    >
                      <Plus size={18} />
                      <span>Share a post</span>
                    </button>
                    <button onClick={() => setActiveTab('guide')} className="bg-slate-50 text-slate-600 px-8 py-4 rounded-2xl font-black border border-slate-200 hover:bg-white transition-all">
                      Reward details
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex items-start space-x-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-indigo-600"><Lightbulb size={24} /></div>
                    <div>
                      <h4 className="font-black text-slate-900">Human insights matter</h4>
                      <p className="text-sm text-slate-400 mt-1">Your unique AI discoveries that machines can't create</p>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex items-start space-x-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-rose-500"><Gem size={24} /></div>
                    <div>
                      <h4 className="font-black text-slate-900">Earn Spark</h4>
                      <p className="text-sm text-slate-400 mt-1">Mint, win rankings, or get likes on your posts</p>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex items-start space-x-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-emerald-500"><TrendingUp size={24} /></div>
                    <div>
                      <h4 className="font-black text-slate-900">Redeem</h4>
                      <p className="text-sm text-slate-400 mt-1">Tokens decide future mainnet airdrop share</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl -mr-20 -mt-20"></div>
            </div>

            {/* ERC-8004 Protocol Badge Section */}
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 rounded-[3rem] p-8 md:p-12 border border-indigo-100 shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg">
                      <ShieldCheck className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">ERC-8004 Certified</h3>
                      <p className="text-sm text-indigo-600 font-bold">Official AI Agent Protocol Standard</p>
                    </div>
                  </div>
                  <a 
                    href="https://www.8004scan.io" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-white px-5 py-2.5 rounded-xl text-sm font-black text-indigo-600 hover:shadow-md transition-all border border-indigo-100"
                  >
                    <span>View on 8004scan</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
                
                <p className="text-slate-600 leading-relaxed mb-6 max-w-3xl">
                  AI Spark integrates <span className="font-black text-indigo-600">ERC-8004</span>, the first standardized protocol for AI Agent identity, reputation, and validation on blockchain. Our AI scoring agent is officially registered and verified, ensuring transparent, trustworthy content evaluation.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/70 backdrop-blur p-5 rounded-2xl border border-indigo-100">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <ShieldCheck className="text-indigo-600" size={16} />
                      </div>
                      <h4 className="font-black text-slate-900 text-sm">Identity Registry</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Each AI agent gets a unique on-chain identity (ERC-721 NFT) with verifiable metadata and capabilities
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur p-5 rounded-2xl border border-indigo-100">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
                        <Star className="text-rose-500" size={16} />
                      </div>
                      <h4 className="font-black text-slate-900 text-sm">Reputation System</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Track agent performance with on-chain reputation scores based on task completion and user feedback
                    </p>
                  </div>

                  <div className="bg-white/70 backdrop-blur p-5 rounded-2xl border border-indigo-100">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Target className="text-emerald-600" size={16} />
                      </div>
                      <h4 className="font-black text-slate-900 text-sm">Validation Proof</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Independent validators audit and verify agent outputs, creating an immutable trust layer
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3 text-xs">
                  <span className="bg-white px-4 py-2 rounded-full font-bold text-slate-600 border border-slate-200">
                    📖 Standard: ERC-8004
                  </span>
                  <span className="bg-white px-4 py-2 rounded-full font-bold text-slate-600 border border-slate-200">
                    ⛓️ Network: Ethereum Mainnet
                  </span>
                  <span className="bg-white px-4 py-2 rounded-full font-bold text-slate-600 border border-slate-200">
                    ✅ Status: Verified
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-indigo-200/20 rounded-full blur-3xl"></div>
            </div>

            {/* Mint Progress Bar */}
            <MintProgressBar variant="compact" />
            
            {/* Compact Feed Section */}
            <div>
              <div className="flex items-center justify-between mb-8 px-4">
                 <div>
                    <h3 className="text-2xl font-black text-slate-900">Community</h3>
                    <p className="text-slate-400 text-xs mt-1 font-bold uppercase tracking-widest">AI creators worldwide</p>
                 </div>
                 <div className="flex items-center space-x-1.5 text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 text-[10px] font-black">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span>LIVE FEED</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {posts.map(post => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    onLike={handleLike}
                    onClick={() => setSelectedPost(post)}
                  />
                ))}
              </div>
              
              <div className="mt-12 text-center">
                 <button className="text-slate-400 font-black text-sm hover:text-indigo-600 transition-colors py-4 px-8 border-2 border-slate-100 rounded-2xl hover:border-indigo-100">
                    Load more
                 </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guide' && <GuideView />}

        {activeTab === 'mint' && (
          <div className="max-w-2xl mx-auto py-20">
            <MintPanel 
              onMintSuccess={async () => {
                showToast('success', '🎉 Mint success! 10,000 SPARK received.');
                if (address) {
                  const fetchedUser = await supabaseService.getOrCreateUser(address);
                  setUser(fetchedUser);
                  // Refetch on-chain balance after mint
                  refetchSparkBalance();
                }
              }}
            />
          </div>
        )}

        {activeTab === 'membership' && (
          <div className="max-w-2xl mx-auto py-20">
            <MembershipPanel 
              onPurchaseSuccess={() => {
                showToast('success', '👑 Membership purchased! Thank you.');
              }}
            />
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="max-w-4xl mx-auto py-20">
            <WeeklyRankingPanel 
              onClaimSuccess={async () => {
                showToast('success', '🎁 Reward claimed!');
                if (address) {
                  const fetchedUser = await supabaseService.getOrCreateUser(address);
                  setUser(fetchedUser);
                  // Refetch on-chain balance after claiming reward
                  refetchSparkBalance();
                }
              }}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto space-y-8 animate-in slide-in-from-bottom-4 py-20">
            {!user.isConnected ? (
              <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6"><Wallet className="text-slate-300" size={32} /></div>
                <h2 className="text-xl font-black mb-2">Connect Wallet</h2>
                <p className="text-slate-400 text-sm mb-8 px-10">Connect wallet to manage your Spark tokens and sync your shares.</p>
                <button onClick={openWalletModal} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black active:scale-95">Connect now</button>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm text-center">
                <img src={getAvatarUrl(user.address!)} className="w-24 h-24 rounded-3xl mx-auto mb-6 border-4 border-slate-50 shadow-sm" />
                <p className="font-mono text-sm text-slate-400 mb-1">{truncateAddress(user.address!)}</p>
                <h3 className="text-4xl font-black text-slate-900 mb-8">{sparkBalance.toFixed(0)} <span className="text-lg text-indigo-600">Spark</span></h3>
                
                <div className="flex flex-col space-y-3 mb-6">
                   <div className="flex justify-between p-4 bg-indigo-50 rounded-2xl items-center">
                      <span className="text-xs font-bold text-indigo-600">今日发帖数</span>
                      <span className="font-black text-indigo-600">{user.dailyPostCount} / {ECONOMY_CONFIG.DAILY_POST_LIMIT}+</span>
                   </div>
                   <div className="flex justify-between p-4 bg-purple-50 rounded-2xl items-center">
                      <span className="text-xs font-bold text-purple-600">链上 SPARK 余额</span>
                      <span className="font-black text-purple-600">{sparkBalance.toFixed(0)} SPARK</span>
                   </div>
                   <div className="flex justify-between p-4 bg-emerald-50 rounded-2xl items-center">
                      <span className="text-xs font-bold text-emerald-600">链上 USDT 余额</span>
                      <span className="font-black text-emerald-600">{usdtBalance.toFixed(2)} USDT</span>
                   </div>
                </div>
                
                {/* Quick links */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setActiveTab('membership')}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 hover:scale-105 transition-all"
                  >
                    <Gem className="text-purple-600 mb-2" size={24} />
                    <span className="text-xs font-bold text-purple-600">Membership</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('guide')}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 hover:scale-105 transition-all"
                  >
                    <BookOpen className="text-indigo-600 mb-2" size={24} />
                    <span className="text-xs font-bold text-indigo-600">Guide</span>
                  </button>
                </div>
                
                <button 
                  onClick={disconnectWallet}
                  className="flex items-center justify-center space-x-2 text-slate-400 text-xs font-bold pt-6 w-full hover:text-slate-600 transition-colors" 
                  disabled={loading}
                >
                  <LogOut size={14} /> <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile bottom navigation (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-4 py-4 pb-safe z-50">
        <div className="flex justify-between items-center h-10">
          <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'text-indigo-600' : 'text-slate-300'}><Home size={22} /></button>
          <button onClick={() => setActiveTab('mint')} className={activeTab === 'mint' ? 'text-indigo-600' : 'text-slate-300'}><Zap size={22} /></button>
          <button 
            onClick={() => user.isConnected ? setIsFormOpen(true) : openWalletModal()}
            disabled={loading}
            className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 -mt-10 border-4 border-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && !isFormOpen ? <LoadingSpinner size={24} /> : <Plus size={24} />}
          </button>
          <button onClick={() => setActiveTab('ranking')} className={activeTab === 'ranking' ? 'text-amber-600' : 'text-slate-300'}><Trophy size={22} /></button>
          <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-300'}><UserIcon size={22} /></button>
        </div>
      </nav>

      {/* Wallet selection modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowWalletModal(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-900 mb-6">Select Wallet</h3>
            <div className="space-y-3">
              {connectors.map((connector, index) => (
                <button
                  key={connector.uid}
                  onClick={() => selectWallet(index)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                      <Wallet size={20} className="text-slate-600" />
                    </div>
                    <span className="font-bold text-slate-900">{connector.name}</span>
                  </div>
                  <ChevronRight size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWalletModal(false)}
              className="w-full mt-6 text-slate-400 text-sm font-bold py-3 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isFormOpen && (
        <PostForm 
          onSubmit={handleCreatePost} 
          onClose={() => setIsFormOpen(false)}
          loading={loading}
        />
      )}
      
      {/* Toast notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      )}

      {/* Post detail modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
        />
      )}
    </div>
  );
};

export default App;
