/**
 * Security utilities - sanitize input and prevent attacks
 */

const SECURITY_CONFIG = {
  MAX_TITLE_LENGTH: 100,
  MAX_CONTENT_LENGTH: 5000,
  MIN_TITLE_LENGTH: 2,
  MIN_CONTENT_LENGTH: 10,
  MAX_TAG_LENGTH: 20,
  MAX_TAGS_COUNT: 10,
  SUBMIT_COOLDOWN_MS: 3000,
};

const DANGEROUS_PATTERNS = {
  SCRIPT_TAGS: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  IFRAME_TAGS: /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  EVENT_HANDLERS: /on\w+\s*=\s*["'][^"']*["']/gi,
  JAVASCRIPT_PROTOCOL: /javascript:/gi,
  DATA_PROTOCOL: /data:text\/html/gi,
  STYLE_EXPRESSION: /expression\s*\(/gi,
};

const SQL_KEYWORDS = [
  'DROP TABLE',
  'DELETE FROM',
  'INSERT INTO',
  'UPDATE SET',
  'EXEC ',
  'EXECUTE ',
  'UNION SELECT',
  '--',
  ';--',
  '/*',
  '*/',
  'xp_',
  'sp_',
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedData?: {
    title: string;
    content: string;
    tags: string[];
  };
}

export const escapeHtml = (text: string): string => {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

export const removeDangerousHtml = (text: string): string => {
  let cleaned = text;
  
  cleaned = cleaned.replace(DANGEROUS_PATTERNS.SCRIPT_TAGS, '');
  cleaned = cleaned.replace(DANGEROUS_PATTERNS.IFRAME_TAGS, '');
  cleaned = cleaned.replace(DANGEROUS_PATTERNS.EVENT_HANDLERS, '');
  cleaned = cleaned.replace(DANGEROUS_PATTERNS.JAVASCRIPT_PROTOCOL, '');
  cleaned = cleaned.replace(DANGEROUS_PATTERNS.DATA_PROTOCOL, '');
  cleaned = cleaned.replace(DANGEROUS_PATTERNS.STYLE_EXPRESSION, '');
  
  return cleaned;
};

export const containsSqlInjection = (text: string): boolean => {
  const upperText = text.toUpperCase();
  return SQL_KEYWORDS.some(keyword => upperText.includes(keyword));
};

export const sanitizeTitle = (title: string): { cleaned: string; errors: string[] } => {
  const errors: string[] = [];
  let cleaned = title.trim();
  
  if (cleaned.length === 0) {
    errors.push('Title cannot be empty');
    return { cleaned: '', errors };
  }
  
  if (cleaned.length < SECURITY_CONFIG.MIN_TITLE_LENGTH) {
    errors.push(`Title must be at least ${SECURITY_CONFIG.MIN_TITLE_LENGTH} characters`);
  }
  
  if (cleaned.length > SECURITY_CONFIG.MAX_TITLE_LENGTH) {
    errors.push(`Title cannot exceed ${SECURITY_CONFIG.MAX_TITLE_LENGTH} characters`);
    cleaned = cleaned.substring(0, SECURITY_CONFIG.MAX_TITLE_LENGTH);
  }
  
  if (containsSqlInjection(cleaned)) {
    errors.push('Title contains invalid content');
    return { cleaned: '', errors };
  }
  
  const beforeClean = cleaned;
  cleaned = removeDangerousHtml(cleaned);
  
  if (beforeClean !== cleaned) {
    errors.push('Title contains unsafe HTML');
  }
  
  return { cleaned, errors };
};

export const sanitizeContent = (content: string): { cleaned: string; errors: string[] } => {
  const errors: string[] = [];
  let cleaned = content.trim();
  
  if (cleaned.length === 0) {
    errors.push('Content cannot be empty');
    return { cleaned: '', errors };
  }
  
  if (cleaned.length < SECURITY_CONFIG.MIN_CONTENT_LENGTH) {
    errors.push(`Content must be at least ${SECURITY_CONFIG.MIN_CONTENT_LENGTH} characters`);
  }
  
  if (cleaned.length > SECURITY_CONFIG.MAX_CONTENT_LENGTH) {
    errors.push(`Content cannot exceed ${SECURITY_CONFIG.MAX_CONTENT_LENGTH} characters`);
    cleaned = cleaned.substring(0, SECURITY_CONFIG.MAX_CONTENT_LENGTH);
  }
  
  if (containsSqlInjection(cleaned)) {
    errors.push('Content contains invalid content');
    return { cleaned: '', errors };
  }
  
  const beforeClean = cleaned;
  cleaned = removeDangerousHtml(cleaned);
  
  if (beforeClean !== cleaned) {
    errors.push('Content contains unsafe HTML');
  }
  
  const urlCount = (cleaned.match(/https?:\/\//gi) || []).length;
  if (urlCount > 10) {
    errors.push('Content has too many links');
  }
  
  return { cleaned, errors };
};

export const sanitizeTags = (tags: string[]): { cleaned: string[]; errors: string[] } => {
  const errors: string[] = [];
  
  if (!Array.isArray(tags)) {
    return { cleaned: [], errors: ['Invalid tag format'] };
  }
  
  if (tags.length > SECURITY_CONFIG.MAX_TAGS_COUNT) {
    errors.push(`Cannot have more than ${SECURITY_CONFIG.MAX_TAGS_COUNT} tags`);
    tags = tags.slice(0, SECURITY_CONFIG.MAX_TAGS_COUNT);
  }
  
  const cleaned = tags
    .filter(tag => typeof tag === 'string')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)
    .map(tag => {
      if (tag.length > SECURITY_CONFIG.MAX_TAG_LENGTH) {
        return tag.substring(0, SECURITY_CONFIG.MAX_TAG_LENGTH);
      }
      return removeDangerousHtml(tag);
    })
    .filter(tag => !containsSqlInjection(tag));
  
  return { cleaned, errors };
};

export const validatePostData = (
  title: string,
  content: string,
  tags: string[]
): ValidationResult => {
  const allErrors: string[] = [];
  
  const titleResult = sanitizeTitle(title);
  allErrors.push(...titleResult.errors);
  
  const contentResult = sanitizeContent(content);
  allErrors.push(...contentResult.errors);
  
  const tagsResult = sanitizeTags(tags);
  allErrors.push(...tagsResult.errors);
  
  const hasBlockingErrors = allErrors.some(error => 
    error.includes('cannot be empty') || 
    error.includes('invalid content') ||
    error.includes('at least')
  );
  
  return {
    isValid: !hasBlockingErrors,
    errors: allErrors,
    sanitizedData: hasBlockingErrors ? undefined : {
      title: titleResult.cleaned,
      content: contentResult.cleaned,
      tags: tagsResult.cleaned,
    },
  };
};

/**
 * 提交频率限制器
 */
class SubmissionThrottle {
  private lastSubmitTime: number = 0;
  
  canSubmit(): boolean {
    const now = Date.now();
    const timeSinceLastSubmit = now - this.lastSubmitTime;
    return timeSinceLastSubmit >= SECURITY_CONFIG.SUBMIT_COOLDOWN_MS;
  }
  
  recordSubmit(): void {
    this.lastSubmitTime = Date.now();
  }
  
  getRemainingCooldown(): number {
    const now = Date.now();
    const timeSinceLastSubmit = now - this.lastSubmitTime;
    const remaining = SECURITY_CONFIG.SUBMIT_COOLDOWN_MS - timeSinceLastSubmit;
    return Math.max(0, Math.ceil(remaining / 1000));
  }
}

export const submissionThrottle = new SubmissionThrottle();

/**
 * Export config for external use
 */
export const getSecurityConfig = () => ({ ...SECURITY_CONFIG });
