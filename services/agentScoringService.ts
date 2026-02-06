import OpenAI from "openai";

export interface ScoringResult {
  relevance: number;     // 0-35
  quality: number;       // 0-35  
  value: number;         // 0-30
  total: number;         // 总分
  details: string;       // 评分说明
  isPassing: boolean;    // 是否通过60分
}

// 最低通过分数（默认60分）
const MIN_PASSING_SCORE = 60;

/**
 * 使用AI Agent对帖子进行多维度评分
 * 符合ERC-8004协议的评分标准
 */
export const scorePost = async (
  title: string, 
  content: string
): Promise<ScoringResult> => {
  try {
    // 创建 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
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
    
    return {
      relevance,
      quality,
      value,
      total,
      details: result.details || '评分完成',
      isPassing: total >= MIN_PASSING_SCORE
    };
  } catch (error) {
    console.error("AI Scoring Error:", error);
    // 如果AI评分失败，返回一个中等评分，避免阻止用户发帖
    return {
      relevance: 20,
      quality: 20,
      value: 15,
      total: 55,
      details: '评分服务暂时不可用，请稍后重试。为确保服务可用，已给予基础评分。',
      isPassing: false
    };
  }
};

/**
 * 批量评分（用于审计或统计）
 */
export const scorePosts = async (
  posts: Array<{ title: string; content: string }>
): Promise<ScoringResult[]> => {
  const results: ScoringResult[] = [];
  
  for (const post of posts) {
    try {
      const score = await scorePost(post.title, post.content);
      results.push(score);
      // 添加延迟避免API限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Batch scoring error:', error);
      results.push({
        relevance: 0,
        quality: 0,
        value: 0,
        total: 0,
        details: '评分失败',
        isPassing: false
      });
    }
  }
  
  return results;
};
