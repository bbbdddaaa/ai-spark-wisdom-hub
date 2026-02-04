import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { User, Post, TokenTransaction } from './types';
import { truncateAddress, getAvatarUrl, ECONOMY_CONFIG, getTodayString, calculateLikeReward } from './constants';
import PostCard from './components/PostCard';
import PostForm from './components/PostForm';
import Toast, { ToastType } from './components/Toast';
import LoadingSpinner from './components/LoadingSpinner';
import MintPanel from './components/MintPanel';
import MembershipPanel from './components/MembershipPanel';
import WeeklyRankingPanel from './components/WeeklyRankingPanel';
import * as supabaseService from './services/supabaseService';
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
  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [likeEarnedToday, setLikeEarnedToday] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
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
    
    const postsSubscription = supabaseService.subscribeToPosts((newPost) => {
      setPosts(prev => [newPost, ...prev]);
    });

    const likesSubscription = supabaseService.subscribeToLikes(async () => {
      await loadPosts();
    });

    return () => {
      postsSubscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, []);

  const loadPosts = async () => {
    try {
      const fetchedPosts = await supabaseService.fetchPosts();
      setPosts(fetchedPosts);
    } catch (error) {
      console.error('Failed to load posts:', error);
      alert('Failed to load posts. Please refresh the page.');
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
      setTransactions([]);
      setLikeEarnedToday(0);
    }
  }, [isConnected, address]);

  const loadUserData = async (walletAddress: string) => {
    setLoading(true);
    try {
      const fetchedUser = await supabaseService.getOrCreateUser(walletAddress);
      setUser(fetchedUser);
      
      const fetchedTransactions = await supabaseService.fetchUserTransactions(walletAddress);
      setTransactions(fetchedTransactions);
      
      const { data: userData } = await supabaseService.supabase
        .from('users')
        .select('like_earned_today')
        .eq('address', walletAddress)
        .single();
      
      if (userData) {
        setLikeEarnedToday(Number(userData.like_earned_today));
      }
      
      showToast('success', `🎉 Wallet connected! Address: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
    } catch (error) {
      console.error('Failed to load user data:', error);
      showToast('error', 'Load failed. Please refresh the page.');
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
        data.tags
      );
      
      setPosts(prev => [newPost, ...prev]);
      
      await supabaseService.updateUserDailyStats(user.address, {
        daily_post_count: user.dailyPostCount + 1
      });
      
      setUser(prev => ({
        ...prev,
        dailyPostCount: prev.dailyPostCount + 1
      }));
      
      const updatedTransactions = await supabaseService.fetchUserTransactions(user.address);
      setTransactions(updatedTransactions);
      
      const { data: updatedUser } = await supabaseService.supabase
        .from('users')
        .select('is_eligible_for_mint, has_minted, post_count')
        .eq('address', user.address)
        .single();
      
      setIsFormOpen(false);
      
      if (updatedUser?.is_eligible_for_mint && !updatedUser?.has_minted) {
        showToast('success', '🎉 Post published! You got Mint eligibility (top 2000). Pay 10 USDT to mint 10,000 SPARK!');
      } else if (updatedUser?.has_minted) {
        showToast('success', '✨ Post published! Join weekly ranking — top 10 earn token rewards.');
      } else {
        showToast('success', '✨ Post published! Mint slots full — join weekly ranking for token rewards.');
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

    if (user.tokens < ECONOMY_CONFIG.LIKE_COST) {
      showToast('error', `Like costs ${ECONOMY_CONFIG.LIKE_COST} Spark. Insufficient balance.`);
      return;
    }

    if (loading) return;

    setLoading(true);
    try {
      await supabaseService.likePost(postId, user.address);
      
      const likeReward = calculateLikeReward(ECONOMY_CONFIG.LIKE_COST, ECONOMY_CONFIG.PLATFORM_FEE);
      const burnedTokens = ECONOMY_CONFIG.LIKE_COST - likeReward;

      await supabaseService.updateUserTokens(
        user.address,
        -ECONOMY_CONFIG.LIKE_COST,
        `Like spent (author +${likeReward.toFixed(1)} S)`
      );

      setUser(prev => ({
        ...prev,
        tokens: prev.tokens - ECONOMY_CONFIG.LIKE_COST,
        dailyLikeCount: prev.dailyLikeCount + 1
      }));

      const { data: authorData } = await supabaseService.supabase
        .from('users')
        .select('like_earned_today')
        .eq('address', post.userAddress)
        .single();

      if (authorData) {
        const authorLikeEarned = Number(authorData.like_earned_today);
        const newAuthorLikeEarned = authorLikeEarned + likeReward;

        if (newAuthorLikeEarned <= ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT) {
          await supabaseService.updateUserTokens(
            post.userAddress,
            likeReward,
            `Like received (today ${newAuthorLikeEarned.toFixed(1)} / ${ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT} S)`
          );

          await supabaseService.updateUserDailyStats(post.userAddress, {
            like_earned_today: newAuthorLikeEarned
          });

          if (post.userAddress === user.address) {
            setUser(prev => ({
              ...prev,
              tokens: prev.tokens + likeReward
            }));
            setLikeEarnedToday(newAuthorLikeEarned);
          }
        } else {
          if (post.userAddress === user.address) {
            alert(`Your daily like-earn limit reached: ${ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT} Spark.`);
          }
        }
      }

      await loadPosts();
      const updatedTransactions = await supabaseService.fetchUserTransactions(user.address);
      setTransactions(updatedTransactions);

      showToast('success', `👍 Liked! Spent ${ECONOMY_CONFIG.LIKE_COST} Spark`);
    } catch (error: any) {
      console.error('Like failed:', error);
      if (error.code === '23505') {
        showToast('warning', 'You have already liked this post!');
      } else {
        showToast('error', 'Like failed. Please check network and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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
          In the AI era, knowledge is no longer static but flowing energy. AI Spark rewards everyone who shares prompts and workflows with the community.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
           <h2 className="text-3xl font-black text-slate-900">Why AI Spark?</h2>
           <p className="text-slate-500 leading-relaxed">
             Today, many AI tips are scattered across chat logs and private docs. We build a transparent incentive layer: Spark tokens measure contribution so great AI practices can be reused by everyone.
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
                    <div className="flex justify-between text-xs mb-2"><span>Community contribution</span><span>64%</span></div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-500 w-[64%]"></div>
                    </div>
                 </div>
                 <p className="text-sm text-slate-400 italic">“We are looking for the first 1,000 core creators. Early participants get 2x Spark bonus.”</p>
              </div>
           </div>
           <Zap className="absolute -right-10 -bottom-10 text-white/5" size={200} fill="currentColor" />
        </div>
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
              <div className="font-black text-slate-900 mb-2">💰 Like cost</div>
              <p className="text-slate-600 leading-relaxed">
                Liking costs 1 Spark: 0.9 to author, 0.1 burned. Deflationary, no unlimited mint.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur p-6 rounded-2xl">
              <div className="font-black text-slate-900 mb-2">📈 Daily caps</div>
              <p className="text-slate-600 leading-relaxed">
                First 3 posts/day get higher reward (10 S), then 3 S. Like earnings cap at 50 S/day.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur p-6 rounded-2xl">
              <div className="font-black text-slate-900 mb-2">🔄 Token flow</div>
              <p className="text-slate-600 leading-relaxed">
                Post → earn → spend on likes → author earns → more creation. Value flows to good content.
              </p>
            </div>
            <div className="bg-white/70 backdrop-blur p-6 rounded-2xl">
              <div className="font-black text-slate-900 mb-2">🎁 Initial tokens</div>
              <p className="text-slate-600 leading-relaxed">
                Connect wallet to get 20 Spark to try likes and posts.
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
                  <div className="text-[10px] font-black text-indigo-600 leading-none mb-1">{user.tokens} SPARK</div>
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
               <span className="text-xs font-black text-indigo-600">{user.tokens}</span>
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
                    On AI Spark, sharing knowledge helps others and builds your digital assets. Connect wallet and start your AI creator journey.
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
                      <h4 className="font-black text-slate-900">Capture ideas</h4>
                      <p className="text-sm text-slate-400 mt-1">Record any moment AI changed your life</p>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 flex items-start space-x-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-rose-500"><Gem size={24} /></div>
                    <div>
                      <h4 className="font-black text-slate-900">Earn Spark</h4>
                      <p className="text-sm text-slate-400 mt-1">Post to earn 10 Spark, unlimited likes</p>
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
                  <PostCard key={post.id} post={post} onLike={handleLike} />
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
                <h3 className="text-4xl font-black text-slate-900 mb-8">{user.tokens.toFixed(1)} <span className="text-lg text-indigo-600">Spark</span></h3>
                
                <div className="flex flex-col space-y-3 mb-6">
                   <div className="flex justify-between p-4 bg-indigo-50 rounded-2xl items-center">
                      <span className="text-xs font-bold text-indigo-600">Posts today</span>
                      <span className="font-black text-indigo-600">{user.dailyPostCount} / {ECONOMY_CONFIG.DAILY_POST_LIMIT}+</span>
                   </div>
                   <div className="flex justify-between p-4 bg-rose-50 rounded-2xl items-center">
                      <span className="text-xs font-bold text-rose-500">Like earnings today</span>
                      <span className="font-black text-rose-500">{likeEarnedToday.toFixed(1)} / {ECONOMY_CONFIG.DAILY_LIKE_EARN_LIMIT} S</span>
                   </div>
                   <div className="flex justify-between p-4 bg-slate-50 rounded-2xl items-center">
                      <span className="text-xs font-bold text-slate-500">Total balance</span>
                      <span className="font-black">{user.tokens.toFixed(1)} S</span>
                   </div>
                </div>
                
                {/* Transactions */}
                {transactions.length > 0 && (
                  <div className="mt-6 text-left">
                    <h4 className="text-xs font-black text-slate-400 mb-3 uppercase tracking-widest">Recent transactions</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs">
                          <span className="text-slate-600">{tx.reason}</span>
                          <span className={`font-black ${tx.amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(1)} S
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Quick links */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => setActiveTab('membership')}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100 hover:scale-105 transition-all"
                  >
                    <Gem className="text-purple-600 mb-2" size={24} />
                    <span className="text-xs font-bold text-purple-600">会员中心</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('guide')}
                    className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 hover:scale-105 transition-all"
                  >
                    <BookOpen className="text-indigo-600 mb-2" size={24} />
                    <span className="text-xs font-bold text-indigo-600">深度指南</span>
                  </button>
                </div>
                
                <button 
                  onClick={disconnectWallet}
                  className="flex items-center justify-center space-x-2 text-slate-400 text-xs font-bold pt-6 w-full hover:text-slate-600 transition-colors" 
                  disabled={loading}
                >
                  <LogOut size={14} /> <span>断开连接</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 移动端底部导航 (Mobile Only) */}
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

      {/* 钱包选择弹窗 */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowWalletModal(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-slate-900 mb-6">选择钱包</h3>
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
              取消
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
      
      {/* Toast 通知 */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default App;
