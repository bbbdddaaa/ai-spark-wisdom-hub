import { useAccount } from 'wagmi';
import { Crown, Sparkles, Zap, Star, TrendingUp, Shield, Rocket, Award, Target, MessageCircle } from 'lucide-react';

interface MembershipPanelProps {
  onClose?: () => void;
}

export default function MembershipPanel({ onClose }: MembershipPanelProps) {
  const { address, isConnected } = useAccount();

  const benefits = [
    {
      icon: <Sparkles className="text-purple-600" size={24} />,
      title: 'Dedicated AI Assistant',
      description: 'Personal AI writing assistant to help you create better content',
      tag: 'Exclusive'
    },
    {
      icon: <Zap className="text-amber-600" size={24} />,
      title: '3x Reward Boost',
      description: 'Earn 3x SPARK tokens for posts and likes',
      tag: 'Premium'
    },
    {
      icon: <Star className="text-pink-600" size={24} />,
      title: 'Unlimited Posts',
      description: 'Break free from daily post limits',
      tag: 'VIP'
    },
    {
      icon: <TrendingUp className="text-green-600" size={24} />,
      title: 'Exclusive Ranking',
      description: 'Compete in members-only weekly leaderboard',
      tag: 'New'
    },
    {
      icon: <Shield className="text-blue-600" size={24} />,
      title: 'Priority Review',
      description: 'Fast-track content approval and publishing',
      tag: 'Fast'
    },
    {
      icon: <Award className="text-indigo-600" size={24} />,
      title: 'Member Badge',
      description: 'Display exclusive badge on your profile',
      tag: 'Cool'
    },
    {
      icon: <Rocket className="text-red-600" size={24} />,
      title: 'Early Access',
      description: 'Be the first to try new features',
      tag: 'Beta'
    },
    {
      icon: <MessageCircle className="text-cyan-600" size={24} />,
      title: 'VIP Community',
      description: 'Join exclusive member chat and network',
      tag: 'Social'
    },
    {
      icon: <Target className="text-orange-600" size={24} />,
      title: 'Featured Content',
      description: 'Higher chance to be featured on homepage',
      tag: 'Boost'
    }
  ];

  return (
    <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 p-8 rounded-3xl border border-purple-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-2xl animate-pulse">
              <Crown className="text-white" size={28} />
            </div>
            <div className="absolute -top-1 -right-1 bg-amber-400 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full">
              SOON
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              VIP Membership
            </h3>
            <p className="text-sm text-slate-500">Unlock all premium benefits</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-2xl leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* Coming Soon Banner */}
      <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 p-8 rounded-2xl mb-8 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative text-center text-white">
          <Rocket className="mx-auto mb-4 animate-bounce" size={48} />
          <h4 className="text-3xl font-black mb-2">🎉 Membership Coming Soon!</h4>
          <p className="text-lg opacity-90 mb-4">We're building the ultimate membership experience</p>
          <div className="inline-block bg-white/20 backdrop-blur-sm px-6 py-2 rounded-full">
            <p className="text-sm font-bold">Expected Launch: March 2026</p>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="mb-8">
        <h4 className="text-xl font-black text-slate-900 mb-4 flex items-center">
          <Sparkles className="text-purple-600 mr-2" size={24} />
          Exclusive Benefits Preview
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white p-5 rounded-2xl border-2 border-slate-100 hover:border-purple-300 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start space-x-3">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
                  {benefit.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-bold text-slate-900">{benefit.title}</h5>
                    <span className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {benefit.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Preview */}
      <div className="bg-white p-6 rounded-2xl border-2 border-purple-200 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 mb-1">Expected Price</p>
            <p className="text-4xl font-black text-slate-900">
              <span className="text-purple-600">10</span>
              <span className="text-2xl text-slate-400 font-normal ml-1">USDT</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">per month</p>
            <p className="text-xs text-green-600 font-bold mt-2">
              🎁 50% OFF for early supporters
            </p>
          </div>
          <div className="text-right">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 px-4 py-3 rounded-xl mb-2">
              <p className="text-3xl font-black text-purple-600">3X</p>
              <p className="text-[10px] text-purple-700 font-bold">Reward Boost</p>
            </div>
            <p className="text-xs text-slate-500">Worth 30+ USDT/mo</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-2">
        <p className="text-sm text-slate-600">
          💡 Membership features in development
        </p>
        <p className="text-xs text-slate-400">
          {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Wallet not connected'}
        </p>
      </div>
    </div>
  );
}
