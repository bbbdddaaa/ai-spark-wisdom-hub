import OpenAI from "openai";

export type PostCategory = 
  | 'Technical Tutorial'  // AI technology, algorithms, code implementation
  | 'Product Review'  // AI product reviews, usage experience
  | 'Research'  // Academic papers, research sharing
  | 'Industry News'  // AI news, trend analysis
  | 'Case Study'  // Practical experience, project cases
  | 'Insights'; // Personal insights, thoughts

export interface CategorizationResult {
  primary: PostCategory;
  secondary?: PostCategory;
  confidence: number; // 0-100, confidence level
  reasoning: string;  // Classification reasoning
}

/**
 * Category descriptions and examples
 */
const CATEGORY_DESCRIPTIONS = {
  'Technical Tutorial': 'Contains AI technology teaching, algorithm explanations, code implementation, technical details, etc.',
  'Product Review': 'Shares AI product usage experience, feature reviews, tool comparisons, etc.',
  'Research': 'Involves academic papers, research results, theoretical analysis, research sharing, etc.',
  'Industry News': 'About AI industry news, development trends, market analysis, policy interpretation, etc.',
  'Case Study': 'Shares practical project experience, application scenarios, solutions, real-world cases, etc.',
  'Insights': 'Personal thoughts on AI, insights, reflections, opinions, etc.'
};

/**
 * Use AI to automatically categorize posts
 */
export const categorizePost = async (
  title: string,
  content: string
): Promise<CategorizationResult> => {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
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
    
    // Validate if category is valid
    const validCategories: PostCategory[] = [
      'Technical Tutorial', 'Product Review', 'Research', 'Industry News', 'Case Study', 'Insights'
    ];
    
    const primary = validCategories.includes(result.primary as PostCategory) 
      ? result.primary as PostCategory 
      : 'Insights'; // Default category
    
    const secondary = result.secondary && validCategories.includes(result.secondary as PostCategory)
      ? result.secondary as PostCategory
      : undefined;
    
    // Ensure confidence is within valid range
    const confidence = Math.min(100, Math.max(0, result.confidence || 70));
    
    return {
      primary,
      secondary: secondary !== primary ? secondary : undefined, // Ensure primary and secondary are different
      confidence,
      reasoning: result.reasoning || 'Categorized based on content features'
    };
  } catch (error) {
    console.error("Categorization Error:", error);
    // If categorization fails, return default category
    return {
      primary: 'Insights',
      confidence: 50,
      reasoning: 'Categorization service temporarily unavailable, default category used'
    };
  }
};

/**
 * Get category display color (for UI display)
 */
export const getCategoryColor = (category: PostCategory): string => {
  const colorMap: Record<PostCategory, string> = {
    'Technical Tutorial': '#3b82f6',  // Blue
    'Product Review': '#8b5cf6',  // Purple
    'Research': '#06b6d4',  // Cyan
    'Industry News': '#f59e0b',  // Orange
    'Case Study': '#10b981',  // Green
    'Insights': '#ec4899'   // Pink
  };
  return colorMap[category] || '#6b7280'; // Default gray
};

/**
 * Get category icon (for UI display)
 */
export const getCategoryIcon = (category: PostCategory): string => {
  const iconMap: Record<PostCategory, string> = {
    'Technical Tutorial': '💻',
    'Product Review': '📱',
    'Research': '📚',
    'Industry News': '📰',
    'Case Study': '🚀',
    'Insights': '💭'
  };
  return iconMap[category] || '📝';
};

/**
 * Batch categorization (for data migration or batch processing)
 */
export const categorizePosts = async (
  posts: Array<{ title: string; content: string }>
): Promise<CategorizationResult[]> => {
  const results: CategorizationResult[] = [];
  
  for (const post of posts) {
    try {
      const result = await categorizePost(post.title, post.content);
      results.push(result);
      // Add delay to avoid API rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Batch categorization error:', error);
      results.push({
        primary: 'Insights',
        confidence: 0,
        reasoning: 'Categorization failed'
      });
    }
  }
  
  return results;
};
