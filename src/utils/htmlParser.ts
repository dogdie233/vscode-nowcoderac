import * as cheerio from 'cheerio';
import { ContestInfo, ProblemExample, ProblemExtra } from '../models/models';

export const parseProblemPage = (html: string): ProblemExtra => {
   const $ = cheerio.load(html);
   
   // 解析脚本中的元数据
   const scriptContent = $('script:contains("window.pageInfo")').html() || '';
   
   // 提取questionId、tagId、subTagId和doneQuestionId
   const questionIdMatch = scriptContent.match(/questionId:\s*['"]([^'"]+)['"]/);
   const tagIdMatch = scriptContent.match(/tagId:\s*['"]([^'"]+)['"]/);
   const subTagIdMatch = scriptContent.match(/subTagId:\s*['"]([^'"]+)['"]/);
   const doneQuestionIdMatch = scriptContent.match(/doneQuestionId:\s*['"]([^'"]+)['"]/);
   
   const questionId = questionIdMatch ? questionIdMatch[1] : '';
   const tagId = tagIdMatch ? tagIdMatch[1] : '';
   const subTagId = subTagIdMatch ? subTagIdMatch[1] : '';
   const doneQuestionId = doneQuestionIdMatch ? doneQuestionIdMatch[1] : '';
   
   // 解析题目内容
   const content = parseContent($);
   
   // 解析样例
   const examples = parseExamples($);

   return {
       tagId,
       questionId,
       subTagId,
       doneQuestionId,
       content,
       examples
   };
};

/**
 * 解析比赛页面的HTML并提取比赛信息
 * @param html HTML字符串
 * @returns 比赛信息对象或undefined
 */
export const parseContestPage = (html: string): ContestInfo | undefined => {
    const $ = cheerio.load(html);

    const scriptContent = $('script:contains("window.pageInfo")').html();
    if (!scriptContent) {
        return undefined;
    }

    const pageInfoMatch = scriptContent.match(/window\.pageInfo\s*=\s*({.*?});/s);
    if (!pageInfoMatch || !pageInfoMatch[1]) {
        return undefined;
    }

    try {
        const pageInfo = JSON.parse(pageInfoMatch[1]);
        return pageInfo as ContestInfo;
    } catch (e) {
        console.error("Failed to parse pageInfo", e);
        return undefined;
    }
};

/**
 * 解析题目内容并转换为Markdown
 * @param $ Cheerio实例
 * @returns Markdown格式的题目内容
 */
function parseContent($: cheerio.Root): string {
    const descriptionDiv = $('.subject-describe .subject-question');
    
    // 题目描述
    let content = '## 题目描述\n\n';
    content += parseContentRich($, descriptionDiv) + '\n\n';
    
    // 输入描述
    const inputDescTitle = $('h2:contains("输入描述:")');
    content += '## 输入描述\n\n';
    content += parseContentRich($, inputDescTitle.next('pre')) + '\n\n';
    
    // 输出描述
    const outputDescTitle = $('h2:contains("输出描述:")');
    content += '## 输出描述\n\n';
    content += parseContentRich($, outputDescTitle.next('pre')) + '\n\n';
    
    return content;
}

/**
 * 解析包含文本和图片的内容
 * @param $ Cheerio实例
 * @param element Cheerio元素
 * @returns 解析后的Markdown文本
 */
function parseContentRich($: cheerio.Root, element: cheerio.Cheerio): string {
    if (!element || element.length === 0) {
        return '';
    }

    // 递归处理HTML节点
    const parseNode = (node: cheerio.Element): string => {
        if (!node) {
            return '';
        }
        
        // 文本节点
        if (node.type === 'text') {
            const text = $(node).text();
            return text.trim().replace(/\n/g, '  \n');
        }
        
        // 标签节点
        if (node.type === 'tag') {
            const el = $(node);
            
            // 图片处理
            if (node.name === 'img') {
                const src = el.attr('src') || '';
                const alt = el.attr('alt') || '';
                
                if (src.includes('nowcoder.com/equation')) {
                    return ` $${alt}$ `; // LaTeX公式
                } else {
                    return ` ![${alt}](${src}) `; // 普通图片
                }
            }
            
            // 处理各种标签
            switch (node.name) {
                case 'br':
                    return '  \n';
                case 'p':
                    return '  \n' + processChildren(node) + '  \n';
                case 'div':
                    return processChildren(node) + '  \n';
                case 'strong':
                case 'b':
                    return `**${processChildren(node)}**`;
                case 'em':
                case 'i':
                    return `*${processChildren(node)}*`;
                case 'u':
                    // 检查u标签下是否有strong子标签
                    const firstChild = node.firstChild;
                    if (firstChild && firstChild.type === 'tag' && firstChild.name === 'strong') {
                        return `**${$(firstChild).text().trim()}**`;
                    }
                    return `__${processChildren(node)}__`;
                case 'code':
                    return `\`${processChildren(node)}\``;
                case 'pre':
                    return `\n\`\`\`\n${processChildren(node)}\n\`\`\`\n`;
                case 'ul':
                    return processChildren(node);
                case 'ol':
                    return processChildren(node);
                case 'li':
                    return `- ${processChildren(node)}\n`;
                case 'table':
                    return `\n${processChildren(node)}\n`;
                case 'tr':
                    return `${processChildren(node)}\n`;
                case 'th':
                case 'td':
                    return `| ${processChildren(node)} `;
                default:
                    // 默认处理：递归处理子节点
                    return processChildren(node);
            }
        }
        
        return '';
    };
    
    // 处理元素的所有子节点
    const processChildren = (node: cheerio.Element): string => {
        let result = '';
        $(node).contents().each((_, child) => {
            result += parseNode(child as cheerio.Element);
        });
        return result;
    };
    
    // 处理根元素
    let result = '';
    element.contents().each((_, node) => {
        result += parseNode(node as cheerio.Element);
    });
    
    // 后处理
    // 合并连续的加粗、斜体等标记
    result = result.replaceAll('****', '');
    result = result.replaceAll('____', '');
    result = result.replaceAll('**__', '**');
    result = result.replaceAll('__**', '**');
    
    return result;
}

/**
 * 解析题目样例
 * @param $ Cheerio实例
 * @returns 样例数组
 */
function parseExamples($: cheerio.Root): ProblemExample[] {
    const examples: ProblemExample[] = [];
    
    // 查找所有样例区块
    $('.question-oi').each((_, element) => {
        const exampleDiv = $(element);
        
        // 获取输入输出内容
        const input = exampleDiv.find('.question-oi-mod:first-child .question-oi-cont pre').text().trim();
        const output = exampleDiv.find('.question-oi-mod:nth-child(2) .question-oi-cont pre').text().trim();
        const tipsElement = exampleDiv.find('.question-oi-mod:nth-child(3) .question-oi-cont pre');
        const tips = tipsElement ? parseContentRich($, tipsElement) : null;
        
        if (input && output) {
            examples.push({ input, output, tips });
        }
    });
    
    return examples;
}
