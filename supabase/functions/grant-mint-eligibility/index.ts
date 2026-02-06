/**
 * Supabase Edge Function: 自动授予 Mint 资格
 * 
 * 触发方式：
 * 1. 定时触发（每小时）
 * 2. 手动触发
 * 
 * 功能：
 * - 查询评分 ≥60 的帖子
 * - 调用合约授予用户 mint 资格
 * - 更新数据库状态
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createWalletClient, http, parseAbi } from 'https://esm.sh/viem@2'
import { privateKeyToAccount } from 'https://esm.sh/viem@2/accounts'
import { base } from 'https://esm.sh/viem@2/chains'

// 环境变量
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PRIVATE_KEY = Deno.env.get('PRIVATE_KEY')!
const BASE_RPC_URL = Deno.env.get('BASE_RPC_URL') || 'https://mainnet.base.org'

// 合约地址
const MINT_CONTROLLER_ADDRESS = '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839' as `0x${string}`

// 合约 ABI
const MINT_CONTROLLER_ABI = parseAbi([
  'function grantEligibility(address[] calldata users) external',
  'function isEligible(address user) external view returns (bool)',
])

// 创建 Supabase 客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 创建钱包客户端
const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`)
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(BASE_RPC_URL),
})

serve(async (req) => {
  try {
    console.log('🚀 开始授予 Mint 资格...')

    // 1. 查询待授予资格的用户（所有发帖用户）
    const { data: posts, error: queryError } = await supabase
      .from('posts')
      .select('user_wallet')
      .is('mint_eligibility_granted', false) // 未授予资格
      .not('user_wallet', 'is', null) // 有钱包地址

    if (queryError) {
      throw new Error(`查询数据库失败: ${queryError.message}`)
    }

    if (!posts || posts.length === 0) {
      console.log('✅ 没有需要授予资格的用户')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '没有需要授予资格的用户',
          count: 0 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 2. 去重用户地址
    const userAddresses = [...new Set(posts.map(p => p.user_wallet))] as `0x${string}`[]
    console.log(`📋 找到 ${userAddresses.length} 个用户待授予资格`)

    // 3. 检查哪些用户已经有资格（避免重复授予）
    const eligibleUsers: `0x${string}`[] = []
    for (const address of userAddresses) {
      const isEligible = await walletClient.readContract({
        address: MINT_CONTROLLER_ADDRESS,
        abi: MINT_CONTROLLER_ABI,
        functionName: 'isEligible',
        args: [address],
      })
      
      if (!isEligible) {
        eligibleUsers.push(address)
      } else {
        console.log(`⚠️  用户 ${address} 已有资格，跳过`)
      }
    }

    if (eligibleUsers.length === 0) {
      console.log('✅ 所有用户都已有资格')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: '所有用户都已有资格',
          count: 0 
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 4. 调用合约授予资格
    console.log(`🔗 授予 ${eligibleUsers.length} 个用户资格...`)
    const hash = await walletClient.writeContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'grantEligibility',
      args: [eligibleUsers],
    })

    console.log(`✅ 交易已发送: ${hash}`)

    // 5. 更新数据库状态
    const { error: updateError } = await supabase
      .from('posts')
      .update({ 
        mint_eligibility_granted: true,
        mint_eligibility_granted_at: new Date().toISOString()
      })
      .in('user_wallet', eligibleUsers)

    if (updateError) {
      console.error('⚠️  更新数据库失败:', updateError.message)
    }

    console.log('🎉 授予资格完成！')

    return new Response(
      JSON.stringify({
        success: true,
        message: '授予资格成功',
        count: eligibleUsers.length,
        users: eligibleUsers,
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
