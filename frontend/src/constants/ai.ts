export const AI_STORAGE_KEYS = {
  ACTIVE_SESSION_ID: 'procms_active_ai_session_id',
  DRAFT_IMPORT: 'procms_ai_chat_draft_import_v1',
} as const;

export const AI_CHAT_PERSONAS = [
  { value: 'general', label: '🤖 General Assistant', sublabel: 'Balanced helper for all tasks' },
  { value: 'review_editor', label: '✍️ Product Review Editor', sublabel: 'Wirecutter-style honest reviews' },
  { value: 'seo_strategist', label: '📈 Affiliate SEO Strategist', sublabel: 'CTR titles, meta & keywords' },
  { value: 'news_journalist', label: '📰 Tech & Deals Journalist', sublabel: 'Fast newsroom articles' },
  { value: 'translator', label: '🌐 EN ↔ VI Translator', sublabel: 'Natural editorial translation' },
  { value: 'developer', label: '💻 Full-Stack Engineer', sublabel: 'Code, SQL & debugging' },
] as const;

export interface AiSlashPromptTemplate {
  command: string;
  label: string;
  desc: string;
  template: string;
}

export const AI_SLASH_PROMPTS: readonly AiSlashPromptTemplate[] = [
  {
    command: '/create-review',
    label: 'Auto-Create Review Draft',
    desc: 'Generate a full SEO review (HTML, meta, tags, coupons) & save as DRAFT',
    template:
      'Use autoCreateReviewPostForStore to automatically write and save a complete SEO review DRAFT post in PostgreSQL for store (leave blank to auto-pick top unreviewed store): ',
  },
  {
    command: '/analytics',
    label: 'Live CMS Analytics',
    desc: 'Query live clicks, top stores, posts & deals expiring within 48h',
    template:
      'Use your CMS tools to pull a live analytics summary (stores, clicks, posts, unread inquiries) and list any offers expiring in the next 48 hours. Present the report cleanly with a Markdown table and action items.',
  },
  {
    command: '/audit-seo',
    label: 'SEO Audit & Fix',
    desc: 'Scan posts missing meta title, meta description, excerpt, or image',
    template:
      'Run an SEO audit on our recent posts using your CMS tool. List all posts missing metaTitle, metaDescription, excerpt, or featured image with their edit links, and suggest improved SEO metadata I can ask you to apply.',
  },
  {
    command: '/inquiries',
    label: 'Customer Inquiries',
    desc: 'Read unread feedbacks & draft professional reply emails',
    template:
      'Fetch all unread customer inquiries using your CMS tool. Summarize each message by urgency/category and draft a concise, polite reply email for each one.',
  },
  {
    command: '/auto-drafts',
    label: 'Unreviewed Stores',
    desc: 'Find top stores missing a review post & create DRAFT articles',
    template:
      'List our highest-traffic active stores that do not have a review post yet using your CMS tool. Recommend the top 3 priorities and ask me which store(s) I want you to create DRAFT review posts for.',
  },
  {
    command: '/add-offer',
    label: 'Create Store Offer',
    desc: 'Add a new coupon or deal to an existing partner store',
    template:
      'Create a new active offer in the CMS using your tool for Store: [store-slug], Offer Name: [headline], Discount Badge: [e.g. 20% OFF], Code: [optional code]. ',
  },
  {
    command: '/review',
    label: 'Product Review',
    desc: 'Structured SEO review with pros/cons & FAQs',
    template:
      'Write a comprehensive, honest SEO product review with an executive verdict, key features, Pros & Cons table, Who Should Buy, and 5 FAQs for: ',
  },
  {
    command: '/seo',
    label: 'SEO Titles & Meta',
    desc: '5 high-CTR titles (<60 chars) & meta descriptions',
    template:
      'Generate 5 high-CTR SEO titles (under 60 characters), 3 Meta Descriptions (under 155 characters), and 8 target keywords for: ',
  },
  {
    command: '/rewrite',
    label: 'Rewrite News',
    desc: 'Fresh journalistic rewrite with Key Takeaways',
    template:
      'Rewrite the attached article/URL in fresh, original journalistic prose with a punchy lead, Key Takeaways bullets, and consumer impact analysis: ',
  },
  {
    command: '/compare',
    label: 'Head-to-Head Compare',
    desc: 'Side-by-side comparison table & winner verdict',
    template:
      'Create a detailed head-to-head comparison with a Markdown feature & pricing table, pros/cons, and clear winner recommendation for: ',
  },
  {
    command: '/faq',
    label: 'Buyer FAQs',
    desc: '6 concise FAQ Q&As ready for schema markup',
    template:
      'Write 6 clear, helpful buyer FAQ questions and concise answers optimized for Google Featured Snippets about: ',
  },
  {
    command: '/translate',
    label: 'Translate EN ↔ VI',
    desc: 'Natural editorial translation preserving Markdown',
    template:
      'Translate the following text into natural, fluent editorial prose (Vietnamese if English, or English if Vietnamese), keeping all facts and formatting intact:\n\n',
  },
  {
    command: '/plan',
    label: '7-Day Content Plan',
    desc: 'Weekly mix of Reviews & News with keywords',
    template:
      'Build a 7-day editorial content calendar (3 Reviews + 4 News posts) with catchy titles and target SEO keywords for niche: ',
  },
] as const;

export interface AiProviderPresetMeta {
  label: string;
  baseUrl: string;
  keyPlaceholder: string;
  docsUrl: string;
}

export const AI_PROVIDER_PRESETS: Record<string, AiProviderPresetMeta> = {
  openrouter: {
    label: 'OpenRouter (All-in-One Gateway)',
    baseUrl: 'https://openrouter.ai/api',
    keyPlaceholder: 'sk-or-v1-...',
    docsUrl: 'https://openrouter.ai/keys',
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    baseUrl: 'https://api.openai.com',
    keyPlaceholder: 'sk-proj-...',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    label: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    keyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
  },
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyPlaceholder: 'AIzaSy...',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  qwen: {
    label: 'Alibaba Qwen (DashScope)',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://dashscope.console.aliyun.com/apiKey',
  },
  kimi: {
    label: 'Moonshot AI (Kimi)',
    baseUrl: 'https://api.moonshot.ai',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.moonshot.ai/console/api-keys',
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
  xai: {
    label: 'xAI (Grok)',
    baseUrl: 'https://api.x.ai',
    keyPlaceholder: 'xai-...',
    docsUrl: 'https://console.x.ai',
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai',
    keyPlaceholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
  },
  cerebras: {
    label: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai',
    keyPlaceholder: 'csk-...',
    docsUrl: 'https://cloud.cerebras.ai',
  },
  mistral: {
    label: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai',
    keyPlaceholder: 'mistral_...',
    docsUrl: 'https://console.mistral.ai',
  },
  ollama: {
    label: 'Ollama (Local / Self-Hosted)',
    baseUrl: 'http://localhost:11434',
    keyPlaceholder: '(Not required for local Ollama)',
    docsUrl: 'https://ollama.com',
  },
  custom: {
    label: 'Custom OpenAI-Compatible Endpoint',
    baseUrl: '',
    keyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
  },
};

export const AI_LANGUAGE_OPTIONS = [
  { value: 'English', label: '🇺🇸 English (US Editorial)' },
  { value: 'Vietnamese', label: '🇻🇳 Tiếng Việt' },
] as const;

export const AI_TONE_OPTIONS = [
  {
    value: 'Editorial & Objective',
    label: 'Editorial & Objective',
    sublabel: 'Wirecutter / Consumer Reports style',
  },
  {
    value: 'Journalistic News',
    label: 'Journalistic Newsroom',
    sublabel: 'Reuters / CNN news style',
  },
  {
    value: 'Friendly Buyer Guide',
    label: 'Friendly Buyer Guide',
    sublabel: 'Helpful shopping & coupon advice',
  },
] as const;

export const AI_AUTO_PUBLISH_MODE_OPTIONS = [
  { value: 'draft', label: 'Save as DRAFT', sublabel: 'Review before publishing' },
  { value: 'publish', label: 'Auto-PUBLISH Immediately', sublabel: 'Go live right after AI writes' },
] as const;

export const AI_SAMPLE_RSS_FEEDS = [
  'https://news.google.com/rss/search?q=consumer+tech+deals+gadgets&hl=en-US&gl=US&ceid=US:en',
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/index.xml',
] as const;

export const AI_CHAT_STARTER_PROMPTS = [
  {
    icon: 'analytics',
    badge: 'Live DB',
    title: 'Live CMS Analytics & Expiring Deals',
    desc: 'Query real DB stats, top stores, and coupons expiring within 48h',
    prompt:
      'Use your CMS tools to give me a live analytics summary of our portal and check if any offers are expiring in the next 48 hours.',
  },
  {
    icon: 'seo',
    badge: 'SEO Audit',
    title: 'Audit Posts SEO Health',
    desc: 'Find posts missing meta descriptions, excerpts, or featured images',
    prompt:
      'Run an SEO audit on our recent posts using your CMS tool and list which posts are missing meta descriptions, excerpts, or images.',
  },
  {
    icon: 'stores',
    badge: '1-Click Draft',
    title: 'Auto-Create 1 Full Review Draft',
    desc: 'Auto-pick top unreviewed store, write full SEO review & save as DRAFT in DB',
    prompt:
      'Use your autoCreateReviewPostForStore tool to automatically pick our highest-traffic unreviewed store, write a full SEO review article with real coupons & FAQs, save it as a DRAFT post in PostgreSQL, and give me the Markdown edit link.',
  },
  {
    icon: 'inquiries',
    badge: 'Support',
    title: 'Triage Unread Customer Inquiries',
    desc: 'Summarize unread feedbacks & draft professional reply emails',
    prompt:
      'Read our unread customer inquiries using your CMS tool, summarize them, and draft polite reply emails.',
  },
] as const;

export const AI_USAGE_GUIDE_STEPS = [
  {
    step: '1',
    title: 'Choose AI Provider & Model',
    desc: 'Pick a saved API configuration and model from the top bar (e.g. local Ollama llama3.1:8b, OpenRouter, OpenAI, Gemini, Claude).',
  },
  {
    step: '2',
    title: 'Keep CMS Agent Enabled',
    desc: 'When the green CMS Agent toggle is ON, AI can query your live PostgreSQL data and safely create DRAFT posts or offers.',
  },
  {
    step: '3',
    title: 'Type Naturally or Use / Commands',
    desc: 'Ask in Vietnamese or English, type "/" for instant templates, or attach a Store, URL, or File below the chat box.',
  },
] as const;

export const AI_USAGE_GUIDE_CAPABILITIES = [
  {
    mode: 'READ',
    title: 'Live Analytics & Expiring Offers',
    desc: 'View real-time clicks, top stores, post stats, and coupons expiring within 48h.',
    example: 'Báo cáo thống kê CMS hiện tại và các mã giảm giá sắp hết hạn trong 48h tới.',
  },
  {
    mode: 'READ',
    title: 'SEO Audit & One-Command Fix',
    desc: 'Detect posts missing meta title, meta description, excerpt, or featured image.',
    example: 'Kiểm toán SEO các bài viết gần đây và liệt kê bài nào đang thiếu meta description.',
  },
  {
    mode: 'SAFE WRITE',
    title: 'Create DRAFT Review Posts',
    desc: 'Auto-pick an unreviewed top store (or any store you name), write a full SEO review & save as DRAFT.',
    example: 'Tự động chọn 1 store chưa có bài review, viết hoàn chỉnh bài review chuẩn SEO (đủ meta, tags, ưu/nhược điểm) và lưu thành bài NHÁP vào CMS giúp tôi.',
  },
  {
    mode: 'SAFE WRITE',
    title: 'Add Store Offers / Coupons',
    desc: 'Create a new offer linked to any partner store directly from chat.',
    example: 'Tạo mã giảm giá 20% OFF (code SAVE20) cho store đầu tiên trong danh sách.',
  },
  {
    mode: 'READ',
    title: 'Customer Inquiries Triage',
    desc: 'Summarize unread feedback messages and draft polite reply emails.',
    example: 'Đọc tất cả liên hệ chưa đọc từ khách hàng, tóm tắt và soạn sẵn email phản hồi.',
  },
] as const;

export const AI_USAGE_GUIDE_TIPS = [
  'Attach a Store (@Store) to inject real store facts and active promo codes so AI never invents fake codes.',
  'Attach any URL to crawl and rewrite news or product pages in seconds.',
  'Click "Save as Draft Post" under any AI reply to open it directly in the Post Editor.',
  'Every session remembers up to 30 turns in PostgreSQL. Pin or rename important chats in the left sidebar.',
] as const;
