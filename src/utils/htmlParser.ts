import * as cheerio from 'cheerio';
import { ProblemExample, ProblemExtra } from '../models/models';

export class HtmlParser {
    /**
     * 从题目页面提取必要的数据
     * @param html 页面HTML内容
     * @returns 解析后的数据
     */
    static parseProblemPage(html: string): ProblemExtra {
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
        const content = HtmlParser.parseContent($);
        
        // 解析样例
        const examples = HtmlParser.parseExamples($);

        return {
            tagId,
            questionId,
            subTagId,
            doneQuestionId,
            content,
            examples
        };
    }
    
    /**
     * 解析题目内容并转换为Markdown
     * @param $ Cheerio实例
     * @returns Markdown格式的题目内容
     */
    private static parseContent($: cheerio.Root): string {
        const descriptionDiv = $('.subject-describe .subject-question');
        
        // 题目描述
        let content = '## 题目描述\n\n';
        content += this.parseContentWithImages($, descriptionDiv) + '\n\n';
        
        // 输入描述
        const inputDescTitle = $('h2:contains("输入描述:")');
        content += '## 输入描述\n\n';
        content += this.parseContentWithImages($, inputDescTitle.next('pre')) + '\n\n';
        
        // 输出描述
        const outputDescTitle = $('h2:contains("输出描述:")');
        content += '## 输出描述\n\n';
        content += this.parseContentWithImages($, outputDescTitle.next('pre')) + '\n\n';
        
        return content;
    }

    /**
     * 解析包含文本和图片的内容
     * @param $ Cheerio实例
     * @param element Cheerio元素
     * @returns 解析后的Markdown文本
     */
    private static parseContentWithImages($: cheerio.Root, element: cheerio.Cheerio): string {
        let result = '';
        
        element.contents().each((_, node) => {
            if (node.type === 'text') {
                // 处理文本中的换行符
                const text = $(node).text();
                result += text.trim().replace(/\n/g, '  \n');
            } else if (node.type === 'tag') {
                const el = $(node);
                if (node.name === 'img') {
                    const src = el.attr('src') || '';
                    const alt = el.attr('alt') || '';
                    
                    if (src.includes('nowcoder.com/equation')) {
                        result += `$${alt}$ `; // LaTeX公式
                    } else {
                        result += `![${alt}](${src}) `; // 普通图片
                    }
                } else if (node.name === 'br') {
                    result += '  \n'; // 处理 <br> 标签
                } else if (node.name === 'p') {
                    // 对于段落标签，确保其前后有换行
                    result += '  \n' + $(node).text().trim() + '\n';
                }
            }
        });
        
        return result;
    }
    
    /**
     * 解析题目样例
     * @param $ Cheerio实例
     * @returns 样例数组
     */
    private static parseExamples($: cheerio.Root): ProblemExample[] {
        const examples: ProblemExample[] = [];
        
        // 查找所有样例区块
        $('.question-oi').each((_, element) => {
            const exampleDiv = $(element);
            
            // 获取输入输出内容
            const input = exampleDiv.find('.question-oi-mod:first-child .question-oi-cont pre').text().trim();
            const output = exampleDiv.find('.question-oi-mod:last-child .question-oi-cont pre').text().trim();
            
            if (input && output) {
                examples.push({ input, output });
            }
        });
        
        return examples;
    }
}
