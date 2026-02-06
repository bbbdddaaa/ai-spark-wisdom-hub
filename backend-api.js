/**
 * Mint 资格授予 API 服务
 * 提供 HTTP API 供前端调用
 */

require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { createWalletClient, createPublicClient, http, parseAbi } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { base } = require('viem/chains');
const OpenAI = require('openai');

const app = express();
const PORT = process.env.API_PORT || 3100;

// 中间件
app.use(cors());
app.use(express.json());

// 配置
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const MINT_CONTROLLER_ADDRESS = '0x98F4a496ac7a5796cB6617401c9DBaFc50d5D839';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 初始化客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const privateKey = PRIVATE_KEY.startsWith('0x') ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
const account = privateKeyToAccount(privateKey);

const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

const MINT_CONTROLLER_ABI = parseAbi([
  'function grantEligibility(address[] calldata users) external',
  'function isEligible(address user) external view returns (bool)',
]);

// ==================== 工具函数 ====================

/**
 * 检查用户在链上是否有资格
 */
async function isEligibleOnChain(userAddress) {
  try {
    const result = await publicClient.readContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'isEligible',
      args: [userAddress],
    });
    return Boolean(result);
  } catch (error) {
    console.error('检查链上资格失败:', error);
    return false;
  }
}

/**
 * 验证用户是否有发帖记录
 */
async function verifyUserHasPost(userAddress) {
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('user_address', userAddress);
  
  if (error) {
    console.error('验证用户发帖失败:', error);
    return false;
  }
  
  return count > 0;
}

/**
 * 检查是否还有剩余名额
 */
async function checkRemainingSlots() {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('post_count', 0)
    .order('post_count', { ascending: false })
    .limit(2000);
  
  if (error) {
    console.error('检查名额失败:', error);
    return { hasSlots: false, count: 2000 };
  }
  
  return {
    hasSlots: count < 2000,
    count: count || 0,
    remaining: 2000 - (count || 0),
  };
}

/**
 * 授予链上资格
 */
async function grantEligibilityOnChain(userAddress) {
  try {
    console.log(`🔄 正在授予资格: ${userAddress}`);
    
    const hash = await walletClient.writeContract({
      address: MINT_CONTROLLER_ADDRESS,
      abi: MINT_CONTROLLER_ABI,
      functionName: 'grantEligibility',
      args: [[userAddress]],
    });
    
    console.log(`✅ 交易已发送: ${hash}`);
    
    // 等待确认
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log(`🎉 授予资格成功: ${userAddress}`);
      return { success: true, txHash: hash };
    } else {
      console.error(`❌ 交易失败: ${userAddress}`);
      return { success: false, error: 'Transaction failed' };
    }
  } catch (error) {
    console.error(`❌ 授予资格失败 ${userAddress}:`, error);
    return { success: false, error: error.message };
  }
}

// ==================== API 路由 ====================

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Mint Eligibility API',
  });
});

/**
 * 授予 Mint 资格
 * POST /api/grant-eligibility
 * Body: { address: '0x...' }
 */
app.post('/api/grant-eligibility', async (req, res) => {
  const startTime = Date.now();
  const { address } = req.body;
  
  console.log(`📝 收到授予资格请求: ${address}`);
  
  // 1. 验证参数
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid address format',
    });
  }
  
  try {
    // 2. 检查是否已有链上资格
    const alreadyEligible = await isEligibleOnChain(address);
    if (alreadyEligible) {
      console.log(`✅ 用户已有资格: ${address}`);
      return res.json({
        success: true,
        message: 'User already has eligibility',
        alreadyEligible: true,
      });
    }
    
    // 3. 验证用户是否有发帖记录
    const hasPost = await verifyUserHasPost(address);
    if (!hasPost) {
      console.log(`❌ 用户没有发帖记录: ${address}`);
      return res.status(403).json({
        success: false,
        error: 'User has no posts',
      });
    }
    
    // 4. 检查是否还有剩余名额
    const slots = await checkRemainingSlots();
    if (!slots.hasSlots) {
      console.log(`❌ 名额已满: ${address}`);
      return res.status(403).json({
        success: false,
        error: 'No remaining slots (2000 limit reached)',
        slotsInfo: slots,
      });
    }
    
    // 5. 授予资格
    const result = await grantEligibilityOnChain(address);
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ 请求处理时间: ${duration}ms`);
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'Eligibility granted successfully',
        txHash: result.txHash,
        duration,
        slotsInfo: slots,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error,
        duration,
      });
    }
  } catch (error) {
    console.error('处理请求失败:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 批量检查资格状态
 * POST /api/check-eligibility
 * Body: { addresses: ['0x...', '0x...'] }
 */
app.post('/api/check-eligibility', async (req, res) => {
  const { addresses } = req.body;
  
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid addresses array',
    });
  }
  
  try {
    const results = await Promise.all(
      addresses.map(async (address) => ({
        address,
        isEligible: await isEligibleOnChain(address),
      }))
    );
    
    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('批量检查失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * 获取统计信息
 * GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
  try {
    const slots = await checkRemainingSlots();
    
    res.json({
      success: true,
      stats: {
        totalEligible: slots.count,
        remainingSlots: slots.remaining,
        maxSlots: 2000,
        percentage: (slots.count / 2000 * 100).toFixed(2),
      },
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * AI 评分服务
 * POST /api/score-post
 * Body: { title: string, content: string }
 */
app.post('/api/score-post', async (req, res) => {
  const startTime = Date.now();
  const { title, content } = req.body;
  
  console.log('📝 收到 AI 评分请求');
  
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: '标题和内容不能为空',
    });
  }
  
  try {
    const prompt = `你是一个专业的AI内容评分Agent，请对以下AI相关帖子进行评分（满分100分）：

标题: ${title}
内容: ${content}

评分标准：
1. AI相关性 (0-35分)
   - 内容是否与AI技术、产品、应用相关
   - 是否有具体的AI主题讨论
   - 完全不相关：0-10分
   - 部分相关：11-20分
   - 相关性强：21-30分
   - 高度相关：31-35分
   
2. 内容质量 (0-35分)
   - 逻辑是否清晰
   - 表达是否准确
   - 结构是否完整
   - 是否有明显错误
   - 质量差：0-10分
   - 一般：11-20分
   - 良好：21-30分
   - 优秀：31-35分
   
3. 教育价值 (0-30分)
   - 对读者是否有帮助
   - 是否提供新知识或见解
   - 是否有实用性
   - 价值低：0-10分
   - 一般：11-20分
   - 价值高：21-30分

请客观公正地评分，并提供详细的评价和改进建议。

请以 JSON 格式返回结果，包含以下字段：
{
  "relevance": number (0-35),
  "quality": number (0-35),
  "value": number (0-30),
  "total": number (0-100),
  "details": string
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "你是一个专业的AI内容评分专家。请严格按照给定的标准进行评分，并以JSON格式返回结果。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const text = response.choices[0].message.content || '{}';
    const result = JSON.parse(text);
    
    // 确保分数在有效范围内
    const relevance = Math.min(35, Math.max(0, result.relevance || 0));
    const quality = Math.min(35, Math.max(0, result.quality || 0));
    const value = Math.min(30, Math.max(0, result.value || 0));
    const total = relevance + quality + value;
    
    const scoringResult = {
      relevance,
      quality,
      value,
      total,
      details: result.details || '评分完成',
      isPassing: total >= 60
    };
    
    const duration = Date.now() - startTime;
    console.log(`✅ AI 评分完成: ${total}分 (${duration}ms)`);
    
    res.json({
      success: true,
      data: scoringResult,
    });
  } catch (error) {
    console.error('AI 评分失败:', error);
    res.status(500).json({
      success: false,
      error: 'AI 评分服务暂时不可用',
      data: {
        relevance: 20,
        quality: 20,
        value: 15,
        total: 55,
        details: '评分服务暂时不可用，请稍后重试。',
        isPassing: false
      }
    });
  }
});

/**
 * AI 分类服务
 * POST /api/categorize-post
 * Body: { title: string, content: string }
 */
app.post('/api/categorize-post', async (req, res) => {
  const startTime = Date.now();
  const { title, content } = req.body;
  
  console.log('📂 收到 AI 分类请求');
  
  if (!title || !content) {
    return res.status(400).json({
      success: false,
      error: '标题和内容不能为空',
    });
  }
  
  try {
    const CATEGORY_DESCRIPTIONS = {
      'Technical Tutorial': 'Contains AI technology teaching, algorithm explanations, code implementation, technical details, etc.',
      'Product Review': 'Shares AI product usage experience, feature reviews, tool comparisons, etc.',
      'Research': 'Involves academic papers, research results, theoretical analysis, research sharing, etc.',
      'Industry News': 'About AI industry news, development trends, market analysis, policy interpretation, etc.',
      'Case Study': 'Shares practical project experience, application scenarios, solutions, real-world cases, etc.',
      'Insights': 'Personal thoughts on AI, insights, reflections, opinions, etc.'
    };
    
    const prompt = `You are a professional content categorization agent. Please categorize the following AI-related post:

Title: ${title}
Content: ${content}

Available categories and descriptions:
${Object.entries(CATEGORY_DESCRIPTIONS).map(([cat, desc]) => `- ${cat}: ${desc}`).join('\n')}

Please select the most matching primary category. If the post content spans multiple domains, you can select a secondary category.
Also provide classification confidence (0-100) and reasoning.

Note:
1. Primary category must be selected, secondary category is optional
2. If the post clearly belongs to a category, confidence should be high (80+)
3. If the post content spans multiple categories, confidence can be moderate (60-80)
4. Provide clear classification reasoning

Please return the result in JSON format with these fields:
{
  "primary": "one of: Technical Tutorial, Product Review, Research, Industry News, Case Study, Insights",
  "secondary": "optional, one of the same categories",
  "confidence": number (0-100),
  "reasoning": "explanation"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional content categorization expert. Analyze posts carefully and return results in strict JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const text = response.choices[0].message.content || '{}';
    const result = JSON.parse(text);
    
    const validCategories = [
      'Technical Tutorial', 'Product Review', 'Research', 'Industry News', 'Case Study', 'Insights'
    ];
    
    const primary = validCategories.includes(result.primary) 
      ? result.primary 
      : 'Insights';
    
    const secondary = result.secondary && validCategories.includes(result.secondary) && result.secondary !== primary
      ? result.secondary
      : undefined;
    
    const confidence = Math.min(100, Math.max(0, result.confidence || 70));
    
    const categorizationResult = {
      primary,
      secondary,
      confidence,
      reasoning: result.reasoning || 'Categorized based on content features'
    };
    
    const duration = Date.now() - startTime;
    console.log(`✅ AI 分类完成: ${primary} (${duration}ms)`);
    
    res.json({
      success: true,
      data: categorizationResult,
    });
  } catch (error) {
    console.error('AI 分类失败:', error);
    res.status(500).json({
      success: false,
      error: 'AI 分类服务暂时不可用',
      data: {
        primary: 'Insights',
        confidence: 50,
        reasoning: 'Categorization service temporarily unavailable, default category used'
      }
    });
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 AI Spark API 服务已启动');
  console.log('='.repeat(60));
  console.log('');
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`📍 健康检查: http://localhost:${PORT}/health`);
  console.log('');
  console.log('💎 Mint 资格管理:');
  console.log(`   - 授予资格: POST http://localhost:${PORT}/api/grant-eligibility`);
  console.log(`   - 检查资格: POST http://localhost:${PORT}/api/check-eligibility`);
  console.log(`   - 统计信息: GET http://localhost:${PORT}/api/stats`);
  console.log('');
  console.log('🤖 AI 服务:');
  console.log(`   - 帖子评分: POST http://localhost:${PORT}/api/score-post`);
  console.log(`   - 内容分类: POST http://localhost:${PORT}/api/categorize-post`);
  console.log('');
  console.log('✅ 准备就绪，等待请求...');
  console.log('');
});
