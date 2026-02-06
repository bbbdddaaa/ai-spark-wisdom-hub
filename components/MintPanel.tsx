import { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { base } from 'wagmi/chains';
import { Zap, Coins, Users, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import * as supabaseService from '../services/supabaseService';
import MintProgressBar from './MintProgressBar';
import {
  CONTRACT_ADDRESSES,
  MINT_CONTROLLER_ABI,
  SPARK_TOKEN_ABI,
  MINT_COST_ETH,
  MINT_REWARD_SPARK,
} from '../lib/web3Config';

interface MintPanelProps {
  onMintSuccess?: () => void;
  onClose?: () => void;
}

export default function MintPanel({ onMintSuccess, onClose }: MintPanelProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isEligible, setIsEligible] = useState(false);
  const [hasMinted, setHasMinted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: remainingSlots } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'remainingSlots',
  });

  const { data: totalMintedUsers } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'totalMintedUsers',
  });

  const { data: ethBalance } = useBalance({
    address: address,
  });

  const { data: sparkBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.SPARK_TOKEN as `0x${string}`,
    abi: SPARK_TOKEN_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // 检查链上资格状态
  const { data: isEligibleOnChain } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'isEligible',
    args: address ? [address] : undefined,
  });

  // 检查链上是否已mint
  const { data: hasMintedOnChain } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'hasMinted',
    args: address ? [address] : undefined,
  });

  // 检查是否可以mint（合约的canMint函数）
  const { data: canMintOnChain } = useReadContract({
    address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
    abi: MINT_CONTROLLER_ABI,
    functionName: 'canMint',
    args: address ? [address] : undefined,
  });

  const { writeContract: mint, data: mintHash, error: mintError, isPending: isMintPending } = useWriteContract();

  const { isLoading: isMinting, isSuccess: isMintSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // Monitor mint error
  useEffect(() => {
    if (mintError) {
      console.error('\n' + '='.repeat(60));
      console.error('❌ Mint 错误（来自 wagmi）');
      console.error('='.repeat(60));
      console.error('错误对象:', mintError);
      console.error('错误名称:', (mintError as any)?.name);
      console.error('错误信息:', mintError.message);
      console.error('错误代码:', (mintError as any)?.code);
      console.error('短消息:', (mintError as any)?.shortMessage);
      console.error('详细数据:', (mintError as any)?.data);
      console.error('原因:', (mintError as any)?.cause);
      console.error('='.repeat(60) + '\n');
      
      let userFriendlyMessage = mintError.message;
      
      // 解析具体错误原因
      if (mintError.message.includes('User rejected') || mintError.message.includes('user rejected')) {
        userFriendlyMessage = '❌ 用户拒绝了交易';
      } else if (mintError.message.includes('insufficient funds')) {
        userFriendlyMessage = '❌ ETH余额不足（需要支付mint费用和gas费）';
      } else if (mintError.message.includes('Not eligible')) {
        userFriendlyMessage = '❌ 没有mint资格';
      } else if (mintError.message.includes('Already minted')) {
        userFriendlyMessage = '❌ 你已经mint过了';
      } else if (mintError.message.includes('No slots')) {
        userFriendlyMessage = '❌ Mint名额已满（2000人上限）';
      } else if (mintError.message.includes('Incorrect payment')) {
        userFriendlyMessage = '❌ 支付金额不正确';
      } else if (mintError.message.includes('execution reverted')) {
        userFriendlyMessage = '❌ 合约执行失败：' + ((mintError as any)?.shortMessage || '未知原因');
      }
      
      setError(userFriendlyMessage);
      setMinting(false);
    }
  }, [mintError]);

  // Monitor mint hash
  useEffect(() => {
    if (mintHash) {
      console.log('\n' + '🎉'.repeat(30));
      console.log('✅ 交易已提交到区块链！');
      console.log('📝 交易哈希:', mintHash);
      console.log('🔗 查看交易:', `https://basescan.org/tx/${mintHash}`);
      console.log('⏳ 等待区块确认...');
      console.log('🎉'.repeat(30) + '\n');
    }
  }, [mintHash]);

  // Monitor pending state
  useEffect(() => {
    if (isMintPending) {
      console.log('\n⏳ 状态：等待用户在钱包中确认交易...');
      console.log('💡 提示：请检查你的钱包插件（MetaMask/Coinbase Wallet等）');
    } else if (minting && !mintHash) {
      console.log('⏳ 状态：准备发送交易...');
    }
  }, [isMintPending, minting, mintHash]);
  
  // Monitor minting state
  useEffect(() => {
    if (isMinting) {
      console.log('⏳ 状态：交易已提交，等待区块确认...');
    }
  }, [isMinting]);

  useEffect(() => {
    if (!address) return;

    const checkEligibility = async () => {
      setLoading(true);
      try {
        const { data: userData } = await supabaseService.supabase
          .from('users')
          .select('is_eligible_for_mint, has_minted')
          .eq('address', address)
          .single();

        if (userData) {
          setIsEligible(userData.is_eligible_for_mint || false);
          setHasMinted(userData.has_minted || false);
        }
      } catch (error) {
        console.error('Check mint eligibility failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkEligibility();
  }, [address]);

  useEffect(() => {
    if (isMintSuccess && address) {
      supabaseService.supabase
        .from('users')
        .update({ has_minted: true })
        .eq('address', address)
        .then(() => {
          setHasMinted(true);
          setMinting(false);
          onMintSuccess?.();
        });
    }
  }, [isMintSuccess, address, onMintSuccess]);

  const handleMint = async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 开始 Mint 流程');
    console.log('='.repeat(60));
    
    if (!address) {
      console.error('❌ 错误：钱包未连接');
      setError('请先连接钱包');
      return;
    }

    // Check if on correct network
    if (chainId !== base.id) {
      console.error('❌ 错误：网络不正确');
      console.error('   当前链ID:', chainId);
      console.error('   期望链ID:', base.id, '(Base 主网)');
      setError(`请切换到 Base 主网 (当前: ${chainId})`);
      try {
        console.log('🔄 尝试切换网络...');
        await switchChain({ chainId: base.id });
        console.log('✅ 网络切换成功');
      } catch (err: any) {
        console.error('❌ 网络切换失败:', err);
        setError('切换网络失败，请手动切换到 Base 主网');
        return;
      }
    }

    console.log('\n📊 数据库状态（Supabase）:');
    console.log('├─ 有资格(DB):', isEligible);
    console.log('└─ 已Mint(DB):', hasMinted);
    
    console.log('\n⛓️ 链上状态（合约）:');
    console.log('├─ 有资格(链):', isEligibleOnChain?.toString());
    console.log('├─ 已Mint(链):', hasMintedOnChain?.toString());
    console.log('├─ 可以Mint(链):', canMintOnChain?.toString());
    console.log('├─ 剩余名额:', remainingSlots?.toString() || 'unknown');
    console.log('└─ 已Mint人数:', totalMintedUsers?.toString() || 'unknown');

    console.log('\n💰 资金状态:');
    console.log('├─ 钱包地址:', address);
    console.log('├─ 链ID:', chainId);
    console.log('├─ ETH余额:', ethBalance ? formatEther(ethBalance.value) : '0', 'ETH');
    console.log('├─ Mint成本:', MINT_COST_ETH, 'ETH');
    console.log('└─ 余额足够:', hasEnoughETH);
    
    // 检查数据一致性
    if (isEligible !== isEligibleOnChain) {
      console.warn('⚠️ 警告：数据库资格状态与链上不一致！');
      console.warn('   数据库:', isEligible);
      console.warn('   链上:', isEligibleOnChain);
    }
    
    if (hasMinted !== hasMintedOnChain) {
      console.warn('⚠️ 警告：数据库Mint状态与链上不一致！');
      console.warn('   数据库:', hasMinted);
      console.warn('   链上:', hasMintedOnChain);
    }

    console.log('\n📝 合约信息:');
    console.log('├─ MintController:', CONTRACT_ADDRESSES.MINT_CONTROLLER);
    console.log('├─ SparkToken:', CONTRACT_ADDRESSES.SPARK_TOKEN);
    console.log('└─ Mint金额:', parseEther(MINT_COST_ETH).toString(), 'wei');

    // 预检查
    if (!isEligible) {
      console.error('❌ 阻止：没有mint资格');
      setError('你没有mint资格。请先发布内容以获得资格（前2000名）');
      return;
    }

    if (hasMinted) {
      console.error('❌ 阻止：已经mint过了');
      setError('你已经mint过了');
      return;
    }

    if (!hasEnoughETH) {
      console.error('❌ 阻止：ETH余额不足');
      console.error('   需要:', MINT_COST_ETH, 'ETH');
      console.error('   当前:', ethBalance ? formatEther(ethBalance.value) : '0', 'ETH');
      setError(`ETH不足。需要至少 ${MINT_COST_ETH} ETH`);
      return;
    }

    setError(null);
    setMinting(true);
    
    console.log('\n🚀 准备调用合约...');
    console.log('├─ 函数: mint()');
    console.log('├─ 参数: [] (无参数)');
    console.log('├─ Value:', MINT_COST_ETH, 'ETH');
    console.log('└─ Gas: 自动估算');
    
    console.log('\n⚠️ 请在钱包中确认交易！');
    console.log('-'.repeat(60));
    
    try {
      const txConfig = {
        address: CONTRACT_ADDRESSES.MINT_CONTROLLER as `0x${string}`,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'mint' as const,
        args: [] as const,
        value: parseEther(MINT_COST_ETH),
      };
      
      console.log('\n📤 交易配置:', JSON.stringify({
        address: txConfig.address,
        functionName: txConfig.functionName,
        args: txConfig.args,
        value: txConfig.value.toString(),
      }, null, 2));
      
      mint(txConfig);
      
      console.log('✅ 交易已发送到钱包，等待用户确认...');
    } catch (error: any) {
      console.error('\n❌ Mint 调用失败!');
      console.error('='.repeat(60));
      console.error('错误类型:', error?.name || 'Unknown');
      console.error('错误信息:', error?.message || '未知错误');
      console.error('错误代码:', error?.code || 'N/A');
      console.error('错误数据:', error?.data || 'N/A');
      console.error('完整错误:', error);
      console.error('='.repeat(60));
      
      let errorMessage = '未知错误';
      if (error?.message) {
        errorMessage = error.message;
        
        // 解析常见错误
        if (error.message.includes('user rejected')) {
          errorMessage = '用户取消了交易';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'ETH余额不足（包括gas费）';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = '合约执行失败：' + (error.shortMessage || error.message);
        }
      }
      
      setError(`Mint 失败: ${errorMessage}`);
      setMinting(false);
    }
  };

  const hasEnoughETH = ethBalance && ethBalance.value >= parseEther(MINT_COST_ETH);

  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100">
        <div className="text-center">
          <AlertCircle className="mx-auto text-indigo-400 mb-4" size={48} />
          <p className="text-slate-600">Please connect wallet first</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100">
        <div className="text-center">
          <Loader className="mx-auto animate-spin text-indigo-600 mb-4" size={48} />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <MintProgressBar variant="detailed" />

      {/* Main Panel */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-8 rounded-3xl border border-indigo-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-3 rounded-2xl">
              <Zap className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900">Mint SPARK</h3>
              <p className="text-sm text-slate-500">Top 2000 exclusive</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl text-center">
          <Users className="mx-auto text-indigo-600 mb-2" size={20} />
          <p className="text-2xl font-black text-slate-900">
            {totalMintedUsers?.toString() || '0'}
          </p>
          <p className="text-xs text-slate-400">Minted users</p>
        </div>
        <div className="bg-white p-4 rounded-2xl text-center">
          <Coins className="mx-auto text-purple-600 mb-2" size={20} />
          <p className="text-2xl font-black text-slate-900">
            {remainingSlots?.toString() || '0'}
          </p>
          <p className="text-xs text-slate-400">Slots left</p>
        </div>
        <div className="bg-white p-4 rounded-2xl text-center">
          <Zap className="mx-auto text-amber-600 mb-2" size={20} />
          <p className="text-2xl font-black text-slate-900">10K</p>
          <p className="text-xs text-slate-400">SPARK reward</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl mb-6">
        <h4 className="font-bold text-slate-900 mb-3">Mint rules</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">•</span>
            <span>Top 2000 users who post get mint eligibility</span>
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">•</span>
            <span>Pay <strong className="text-indigo-600">{MINT_COST_ETH} ETH</strong> to mint <strong className="text-indigo-600">10,000 SPARK</strong></span>
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">•</span>
            <span>Each address can mint until 2000 slots are full</span>
          </li>
        </ul>
      </div>

      <div className="bg-white p-6 rounded-2xl mb-6">
        <h4 className="font-bold text-slate-900 mb-3">My assets</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">ETH balance:</span>
            <span className="font-bold text-slate-900">
              {ethBalance ? formatEther(ethBalance.value) : '0'} ETH
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">SPARK balance:</span>
            <span className="font-bold text-slate-900">
              {sparkBalance ? formatEther(sparkBalance) : '0'} SPARK
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Mint eligibility:</span>
            <span className="font-bold">
              {isEligible ? (
                <span className="text-green-600 flex items-center">
                  <CheckCircle size={16} className="mr-1" /> Eligible
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <XCircle size={16} className="mr-1" /> Not eligible
                </span>
              )}
            </span>
          </div>
          {hasMinted && (
            <div className="flex justify-between">
              <span className="text-slate-600">Mint status:</span>
              <span className="text-green-600 font-bold flex items-center">
                <CheckCircle size={16} className="mr-1" /> Minted
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Network warning */}
        {chainId !== base.id && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-2xl">
            <p className="text-sm text-orange-800 text-center">
              ⚠️ 请切换到 Base 主网 (当前链 ID: {chainId})
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
            <p className="text-sm text-red-800 text-center">❌ {error}</p>
          </div>
        )}

        {!isEligible && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
            <p className="text-sm text-amber-800 text-center">
              ⚠️ You don't have mint eligibility yet. Post content to qualify (top 2000).
            </p>
          </div>
        )}

        {isEligible && !hasEnoughETH && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl">
            <p className="text-sm text-red-800 text-center">
              ❌ Insufficient ETH. Need at least {MINT_COST_ETH} ETH
            </p>
          </div>
        )}

        {isEligible && hasEnoughETH && (
          <button
            onClick={handleMint}
            disabled={minting || isMinting || isMintPending || hasMinted || chainId !== base.id}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-bold hover:from-indigo-700 hover:to-purple-700 transition-all disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isMintPending ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>请在钱包中确认...</span>
              </>
            ) : minting || isMinting ? (
              <>
                <Loader className="animate-spin" size={20} />
                <span>Minting...</span>
              </>
            ) : hasMinted ? (
              <>
                <CheckCircle size={20} />
                <span>Minted</span>
              </>
            ) : chainId !== base.id ? (
              <>
                <AlertCircle size={20} />
                <span>Wrong Network</span>
              </>
            ) : (
              <>
                <Zap size={20} />
                <span>Mint 10,000 SPARK</span>
              </>
            )}
          </button>
        )}
        
        {/* Show transaction link */}
        {mintHash && (
          <div className="bg-green-50 border border-green-200 p-4 rounded-2xl">
            <p className="text-sm text-green-800 text-center mb-2">
              ✅ 交易已提交！
            </p>
            <a 
              href={`https://basescan.org/tx/${mintHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-600 hover:underline block text-center"
            >
              在 BaseScan 上查看交易 →
            </a>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
