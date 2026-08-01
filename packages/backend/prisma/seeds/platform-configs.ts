import { PrismaClient, PlatformCategory } from '@prisma/client';

export const OFFICIAL_PLATFORMS = [
    // ========== AI CHAT ASSISTANTS ==========
    {
        name: 'ChatGPT',
        domains: ['chat.openai.com', 'chatgpt.com'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['#prompt-textarea', 'textarea[placeholder*="Message"]'],
            submit: ['[data-testid="send-button"]', 'button[data-testid="fruitjuice-send-button"]'],
            container: ['main'],
            messageElements: ['[data-testid="conversation-turn"]'],
        },
        features: {
            supportsStreaming: true,
            hasMultimodal: true,
            hasFileUpload: true,
            hasCodeHighlighting: true,
            hasVoiceInput: true,
            hasImageGeneration: true,
        },
        description: 'OpenAI ChatGPT - Advanced AI conversational assistant',
        iconUrl: 'https://chat.openai.com/favicon.ico',
    },
    {
        name: 'Google Gemini',
        domains: ['gemini.google.com', 'bard.google.com'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['.ql-editor[contenteditable="true"]', 'rich-textarea'],
            submit: ['button[aria-label*="Send"]', '.send-button'],
            container: ['.conversation-container', 'main'],
            messageElements: ['.model-response-text', '.user-query'],
        },
        features: {
            supportsStreaming: true,
            hasMultimodal: true,
            hasFileUpload: true,
            hasCodeHighlighting: true,
            hasImageGeneration: true,
        },
        description: 'Google Gemini (formerly Bard) - Google AI assistant',
        iconUrl: 'https://www.gstatic.com/lamda/images/gemini_favicon_f069958c85030456e93de685481c559f160ea06b.png',
    },
    {
        name: 'Claude',
        domains: ['claude.ai', 'console.anthropic.com'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['div[contenteditable="true"][role="textbox"]', '.ProseMirror'],
            submit: ['button[aria-label="Send Message"]'],
            container: ['main', '.chat-container'],
            messageElements: ['.font-claude-message', '.message'],
        },
        features: {
            supportsStreaming: true,
            hasMultimodal: true,
            hasFileUpload: true,
            hasCodeHighlighting: true,
        },
        description: 'Anthropic Claude - AI assistant focused on safety',
        iconUrl: 'https://claude.ai/favicon.ico',
    },
    {
        name: 'Microsoft Copilot',
        domains: ['copilot.microsoft.com', 'bing.com/chat'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['textarea[placeholder*="Ask me anything"]', '#searchbox'],
            submit: ['button[aria-label="Submit"]'],
            container: ['#b_sydConvCont'],
            messageElements: ['.ac-textBlock'],
        },
        features: {
            supportsStreaming: true,
            hasMultimodal: true,
            hasImageGeneration: true,
        },
        description: 'Microsoft Copilot - AI-powered chat assistant',
        iconUrl: 'https://copilot.microsoft.com/favicon.ico',
    },
    {
        name: 'Perplexity AI',
        domains: ['perplexity.ai'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['textarea[placeholder*="Ask anything"]'],
            submit: ['button[aria-label="Submit"]'],
            container: ['main'],
            messageElements: ['.prose'],
        },
        features: {
            supportsStreaming: true,
            hasFileUpload: true,
            hasCodeHighlighting: true,
        },
        description: 'Perplexity AI - AI-powered search and answer engine',
        iconUrl: 'https://www.perplexity.ai/favicon.ico',
    },
    {
        name: 'Poe',
        domains: ['poe.com'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['textarea[class*="GrowingTextArea"]'],
            submit: ['button[class*="ChatMessageSendButton"]'],
            container: ['main'],
            messageElements: ['[class*="Message_messageRow"]'],
        },
        features: {
            supportsStreaming: true,
            hasMultimodal: true,
        },
        description: 'Poe - Multi-model AI chat platform',
        iconUrl: 'https://poe.com/favicon.ico',
    },
    {
        name: 'Character.AI',
        domains: ['character.ai', 'beta.character.ai'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['textarea[placeholder*="Type a message"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
            messageElements: ['.msg'],
        },
        features: {
            supportsStreaming: true,
        },
        description: 'Character.AI - Conversational AI characters',
        iconUrl: 'https://character.ai/favicon.ico',
    },
    {
        name: 'You.com',
        domains: ['you.com'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['textarea[name="query"]', 'input[type="search"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            supportsStreaming: true,
            hasMultimodal: true,
        },
        description: 'You.com - AI-powered search engine',
        iconUrl: 'https://you.com/favicon.ico',
    },
    {
        name: 'Mistral AI',
        domains: ['chat.mistral.ai', 'console.mistral.ai'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['textarea', 'div[contenteditable="true"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            supportsStreaming: true,
            hasCodeHighlighting: true,
        },
        description: 'Mistral AI - Open-source AI models',
        iconUrl: 'https://chat.mistral.ai/favicon.ico',
    },
    {
        name: 'HuggingFace Chat',
        domains: ['huggingface.co/chat'],
        category: 'AI_CHAT' as PlatformCategory,
        selectors: {
            input: ['textarea[placeholder*="Ask anything"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            supportsStreaming: true,
            hasCodeHighlighting: true,
        },
        description: 'HuggingFace Chat - Open-source AI models chat',
        iconUrl: 'https://huggingface.co/favicon.ico',
    },

    // ========== CODE ASSISTANTS ==========
    {
        name: 'GitHub Copilot',
        domains: ['github.com/copilot', 'copilot.github.com'],
        category: 'CODE_ASSISTANT' as PlatformCategory,
        selectors: {
            input: ['textarea', '.monaco-editor'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            hasCodeHighlighting: true,
            hasFileUpload: true,
        },
        description: 'GitHub Copilot - AI pair programmer',
        iconUrl: 'https://github.githubassets.com/favicons/favicon.svg',
    },
    {
        name: 'Cursor AI',
        domains: ['cursor.sh', 'cursor.com'],
        category: 'CODE_ASSISTANT' as PlatformCategory,
        selectors: {
            input: ['textarea', '.monaco-editor'],
            container: ['main'],
        },
        features: {
            hasCodeHighlighting: true,
            hasFileUpload: true,
        },
        description: 'Cursor - AI-first code editor',
        iconUrl: 'https://cursor.sh/favicon.ico',
    },
    {
        name: 'Codeium',
        domains: ['codeium.com'],
        category: 'CODE_ASSISTANT' as PlatformCategory,
        selectors: {
            input: ['textarea', '.monaco-editor'],
            container: ['main'],
        },
        features: {
            hasCodeHighlighting: true,
        },
        description: 'Codeium - Free AI code completion',
        iconUrl: 'https://codeium.com/favicon.ico',
    },
    {
        name: 'Tabnine',
        domains: ['tabnine.com', 'app.tabnine.com'],
        category: 'CODE_ASSISTANT' as PlatformCategory,
        selectors: {
            input: ['textarea', '.monaco-editor'],
            container: ['main'],
        },
        features: {
            hasCodeHighlighting: true,
        },
        description: 'Tabnine - AI code completion',
        iconUrl: 'https://www.tabnine.com/favicon.ico',
    },
    {
        name: 'Phind',
        domains: ['phind.com'],
        category: 'CODE_ASSISTANT' as PlatformCategory,
        selectors: {
            input: ['textarea[placeholder*="Ask"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            supportsStreaming: true,
            hasCodeHighlighting: true,
        },
        description: 'Phind - AI search engine for developers',
        iconUrl: 'https://www.phind.com/favicon.ico',
    },

    // ========== PRODUCTIVITY & COLLABORATION ==========
    {
        name: 'Notion AI',
        domains: ['notion.so', 'notion.com'],
        category: 'PRODUCTIVITY' as PlatformCategory,
        selectors: {
            input: ['div[contenteditable="true"]', '[data-content-editable-leaf="true"]'],
            container: ['main'],
        },
        features: {
            hasCodeHighlighting: true,
        },
        description: 'Notion AI - AI-powered workspace',
        iconUrl: 'https://www.notion.so/images/favicon.ico',
    },
    {
        name: 'Slack AI',
        domains: ['slack.com', 'app.slack.com'],
        category: 'COLLABORATION' as PlatformCategory,
        selectors: {
            input: ['div[contenteditable="true"][role="textbox"]', '.ql-editor'],
            submit: ['button[data-qa="texty_send_button"]'],
            container: ['main'],
        },
        features: {},
        description: 'Slack - Team collaboration with AI features',
        iconUrl: 'https://a.slack-edge.com/80588/marketing/img/meta/favicon-32.png',
    },
    {
        name: 'Microsoft Teams',
        domains: ['teams.microsoft.com', 'teams.live.com'],
        category: 'COLLABORATION' as PlatformCategory,
        selectors: {
            input: ['div[contenteditable="true"][role="textbox"]'],
            submit: ['button[data-tid="send-button"]'],
            container: ['main'],
        },
        features: {},
        description: 'Microsoft Teams - Collaboration platform',
        iconUrl: 'https://statics.teams.cdn.office.net/evergreen-assets/safelinks/1/atp-safelinks.html',
    },

    // ========== DESIGN ==========
    {
        name: 'Canva AI',
        domains: ['canva.com'],
        category: 'DESIGN' as PlatformCategory,
        selectors: {
            input: ['input[type="text"]', 'textarea'],
            container: ['main'],
        },
        features: {
            hasImageGeneration: true,
        },
        description: 'Canva - Design platform with AI features',
        iconUrl: 'https://static.canva.com/web/images/favicon.ico',
    },
    {
        name: 'Figma AI',
        domains: ['figma.com'],
        category: 'DESIGN' as PlatformCategory,
        selectors: {
            input: ['input[type="text"]', 'textarea'],
            container: ['main'],
        },
        features: {},
        description: 'Figma - Collaborative design tool',
        iconUrl: 'https://static.figma.com/app/icon/1/favicon.ico',
    },

    // ========== IMAGE GENERATION ==========
    {
        name: 'Midjourney',
        domains: ['midjourney.com', 'discord.com/channels/@me'], // Via Discord
        category: 'IMAGE_GENERATION' as PlatformCategory,
        selectors: {
            input: ['div[contenteditable="true"][role="textbox"]'],
            container: ['main'],
        },
        features: {
            hasImageGeneration: true,
        },
        description: 'Midjourney - AI image generation',
        iconUrl: 'https://www.midjourney.com/favicon.ico',
    },
    {
        name: 'DALL-E',
        domains: ['labs.openai.com'],
        category: 'IMAGE_GENERATION' as PlatformCategory,
        selectors: {
            input: ['textarea[placeholder*="Describe"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            hasImageGeneration: true,
        },
        description: 'DALL-E - OpenAI image generation',
        iconUrl: 'https://labs.openai.com/favicon.ico',
    },
    {
        name: 'Stable Diffusion',
        domains: ['stability.ai', 'stablediffusionweb.com'],
        category: 'IMAGE_GENERATION' as PlatformCategory,
        selectors: {
            input: ['textarea', 'input[type="text"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            hasImageGeneration: true,
        },
        description: 'Stable Diffusion - Open-source image generation',
        iconUrl: 'https://stability.ai/favicon.ico',
    },

    // ========== TRANSLATION ==========
    {
        name: 'DeepL',
        domains: ['deepl.com'],
        category: 'TRANSLATION' as PlatformCategory,
        selectors: {
            input: ['textarea[dl-test="translator-source-input"]'],
            container: ['main'],
        },
        features: {},
        description: 'DeepL - AI-powered translation',
        iconUrl: 'https://www.deepl.com/img/favicon/favicon_96.png',
    },
    {
        name: 'Google Translate',
        domains: ['translate.google.com'],
        category: 'TRANSLATION' as PlatformCategory,
        selectors: {
            input: ['textarea[aria-label*="Source"]'],
            container: ['main'],
        },
        features: {},
        description: 'Google Translate - Translation service',
        iconUrl: 'https://ssl.gstatic.com/translate/favicon.ico',
    },

    // ========== RESEARCH ==========
    {
        name: 'Consensus',
        domains: ['consensus.app'],
        category: 'RESEARCH' as PlatformCategory,
        selectors: {
            input: ['input[type="search"]', 'textarea'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            supportsStreaming: true,
        },
        description: 'Consensus - AI-powered research assistant',
        iconUrl: 'https://consensus.app/favicon.ico',
    },
    {
        name: 'Elicit',
        domains: ['elicit.org', 'elicit.com'],
        category: 'RESEARCH' as PlatformCategory,
        selectors: {
            input: ['textarea', 'input[type="text"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {},
        description: 'Elicit - AI research assistant',
        iconUrl: 'https://elicit.org/favicon.ico',
    },
    {
        name: 'Semantic Scholar',
        domains: ['semanticscholar.org'],
        category: 'RESEARCH' as PlatformCategory,
        selectors: {
            input: ['input[type="search"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {},
        description: 'Semantic Scholar - AI-powered research tool',
        iconUrl: 'https://www.semanticscholar.org/favicon.ico',
    },

    // ========== DOCUMENT PROCESSING ==========
    {
        name: 'Grammarly',
        domains: ['grammarly.com', 'app.grammarly.com'],
        category: 'DOCUMENT' as PlatformCategory,
        selectors: {
            input: ['div[contenteditable="true"]', 'textarea'],
            container: ['main'],
        },
        features: {},
        description: 'Grammarly - AI writing assistant',
        iconUrl: 'https://static.grammarly.com/assets/files/efe9a7c4a1e6089d7e04f0f7b1c0c9d7/favicon.svg',
    },
    {
        name: 'Jasper AI',
        domains: ['jasper.ai', 'app.jasper.ai'],
        category: 'DOCUMENT' as PlatformCategory,
        selectors: {
            input: ['textarea', 'div[contenteditable="true"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {
            supportsStreaming: true,
        },
        description: 'Jasper AI - AI content creation platform',
        iconUrl: 'https://www.jasper.ai/favicon.ico',
    },
    {
        name: 'Copy.ai',
        domains: ['copy.ai', 'app.copy.ai'],
        category: 'DOCUMENT' as PlatformCategory,
        selectors: {
            input: ['textarea', 'input[type="text"]'],
            submit: ['button[type="submit"]'],
            container: ['main'],
        },
        features: {},
        description: 'Copy.ai - AI copywriting tool',
        iconUrl: 'https://www.copy.ai/favicon.ico',
    },
];

export async function seedPlatformConfigs(prisma: PrismaClient) {
    console.log('🌐 Seeding official platform configurations...');

    // Delete existing official configs
    await prisma.platformConfig.deleteMany({
        where: { isOfficial: true },
    });

    // Create all official configs
    const createdConfigs = await prisma.platformConfig.createMany({
        data: OFFICIAL_PLATFORMS.map(platform => ({
            ...platform,
            tenantId: null,
            isOfficial: true,
            isActive: true,
        })),
    });

    console.log(`✅ ${createdConfigs.count} official platform configurations seeded`);
}
