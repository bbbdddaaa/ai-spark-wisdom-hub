/**
 * Supabase Edge Function: 设置周排名奖励
 * 
 * 触发方式：
 * 1. 每周一自动触发（cron）
 * 2. 手动触发
 * 
 * 功能：
 * - 计算上周排名（前10名）
 * - 调用合约设置奖励
 * - 更新数据库状态
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createWalletClient, http, parseAbi, parseEther } from 'https://esm.sh/viem@2'
import { privateKeyToAccount } from 'https://esm.sh/viem@2/accounts'
import { base } from 'https://esm.sh/viem@2/chains'

// 环境变量
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PRIVATE_KEY = Deno.env.get('PRIVATE_KEY')!
const BASE_RPC_URL = Deno.env.get('BASE_RPC_URL') || 'https://mainnet.base.org'

// 合约地址
const REWARD_POOL_ADDRESS = '0x873B9298B689bD4D1703ABef0AeB9738d826214B' as `0x${string}`

// 合约 ABI
const REWARD_POOL_ABI = parseAbi([
  'function setWeeklyRewards(uint256 weekId, address[] calldata users, uint256[] calldata amounts) external',
  'function getCurrentWeekId() external view returns (uint256)',
])

// 奖励配置
const REWARD_CONFIG = {
  RANK_1: 10000,
  RANK_10: 2000,
  DECREASE_PER_RANK: 889,
}

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 创建钱包客户端
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(BASE_RPC_URL),
})

/**
 * 计算排名奖励金额
 */
function calculateRewardAmount(rank: number): bigint {
  if (rank < 1 || rank > 10) return 0n
  const amount = REWARD_CONFIG.RANK_1 - (rank - 1) * REWARD_CONFIG.DECREASE_PER_RANK
  return parseEther(amount.toString())
}

/**
 * 获取周开始和结束日期
 */
function getLastWeekDates() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = today.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  
  const lastMonday = new Date(today)
  lastMonday.setDate(today.getDate() - daysToMonday - 7)
  
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)
  lastSunday.setHours(23, 59, 59, 999)
  
  return {
    start: lastMonday.toISOString(),
    end: lastSunday.toISOString(),
  }
}

/**
 * 获取周ID
 */
function getWeekId(date: Date = new Date()): number {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return Math.floor(monday.getTime() / (7 * 24 * 60 * 60 * 1000))
}

serve(async (req) => {
  try {
    console.log('🚀 开始设置周排名奖励...')

    // 1. 获取上周日期范围
    const { start, end } = getLastWeekDates()
    const weekId = getWeekId(new Date(start))
    
    console.log(`📅 上周范围: ${start} 至 ${end}`)
    console.log(`🆔 Week ID: ${weekId}`)

    // 2. 从数据库查询上周排名（根据点赞数）
    const { data: rankings, error: queryError } = await supabase
      .rpc('get_weekly_ranking', {
        start_date: start,
        end_date: end,
      })
      .limit(10)

    if (queryError) {
      throw new Error(`查询排名失败: ${queryError.message}`)
    }

    if (!rankings || rankings.length === 0) {
      console.log('✅ 上周没有用户参与，无需发放奖励')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '上周没有用户参与',
          weekId,
          count: 0 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 3. 准备奖励数据
    const users: `0x${string}`[] = []
    const amounts: bigint[] = []

    for (let i = 0; i < Math.min(rankings.length, 10); i++) {
      const { user_wallet } = rankings[i]
      if (user_wallet) {
        users.push(user_wallet as `0x${string}`)
        amounts.push(calculateRewardAmount(i + 1))
      }
    }

    console.log(`🏆 前 ${users.length} 名用户:`)
    users.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user} - ${amounts[i]} SPARK`)
    })

    // 4. 调用合约设置奖励
    console.log(`🔗 调用合约设置周排名奖励...`)
    const hash = await walletClient.writeContract({
      address: REWARD_POOL_ADDRESS,
      abi: REWARD_POOL_ABI,
      functionName: 'setWeeklyRewards',
      args: [BigInt(weekId), users, amounts],
    })

    console.log(`✅ 交易已发送: ${hash}`)

    // 5. 记录到数据库
    const rewardRecords = users.map((user, i) => ({
      week_id: weekId,
      user_wallet: user,
      rank: i + 1,
      amount: amounts[i].toString(),
      claimed: false,
      transaction_hash: hash,
    }))

    const { error: insertError } = await supabase
      .from('weekly_rewards')
      .upsert(rewardRecords, { 
        onConflict: 'week_id,user_wallet' 
      })

    if (insertError) {
      console.error('⚠️  记录数据库失败:', insertError.message)
    }

    console.log('🎉 设置周排名奖励完成！')

    return new Response(
      JSON.stringify({
        success: true,
        message: '设置周排名奖励成功',
        weekId,
        count: users.length,
        winners: users,
        transactionHash: hash,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ 错误:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
