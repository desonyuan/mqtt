import axios, { AxiosRequestConfig } from 'axios';
import storage from '@/utils/storage';

// API基本URL
const API_BASE_URL = 'http://192.168.5.21:8000';

// 创建axios实例
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 15000, // 15秒超时
});

// 文章列表项接口
export interface ArticleListItem {
    article_id: number;
    author_uuid: string;
    author_name: string;
    title: string;
    created_at: string; // ISO格式的时间戳
}

// 文章详情接口
export interface ArticleDetail extends ArticleListItem {
    content: string;
}

// 分页文章响应接口
export interface ArticlesResponse {
    data: ArticleListItem[];
    current_page: number;
    total_pages: number;
    total_items: number;
}

// 文章API服务类
class ArticleApiService {
    private async request<T>(config: AxiosRequestConfig): Promise<T> {
        try {
            // 获取认证令牌
            const token = await storage.getToken();
            
            // 如果有令牌，添加到请求头
            if (token) {
                config.headers = {
                    ...config.headers,
                    'Authorization': `Bearer ${token}`
                };
            }
            
            // 发送请求
            const response = await api(config);
            return response.data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    }

    /**
     * 获取文章列表
     * @param page 页码
     * @param pageSize 每页大小
     */
    async getArticles(page: number = 1, pageSize: number = 10): Promise<ArticlesResponse> {
        return this.request({
            url: '/articles',
            method: 'GET',
            params: { page, page_size: pageSize }
        });
    }

    /**
     * 获取文章详情
     * @param articleId 文章ID
     */
    async getArticleDetail(articleId: number): Promise<ArticleDetail> {
        return this.request({
            url: `/articles/${articleId}`,
            method: 'GET'
        });
    }

    /**
     * 管理员添加文章
     * @param title 文章标题
     * @param content 文章内容
     */
    async addArticle(title: string, content: string): Promise<{ article_id: number, message: string }> {
        return this.request({
            url: '/admin/articles',
            method: 'POST',
            data: { title, content }
        });
    }

    /**
     * 管理员更新文章
     * @param articleId 文章ID
     * @param title 文章标题
     * @param content 文章内容
     */
    async updateArticle(articleId: number, title: string, content: string): Promise<ArticleDetail & { message: string }> {
        return this.request({
            url: `/admin/articles/${articleId}`,
            method: 'PUT',
            data: { title, content }
        });
    }

    /**
     * 管理员删除文章
     * @param articleId 文章ID
     */
    async deleteArticle(articleId: number): Promise<{ article_id: number, message: string }> {
        return this.request({
            url: `/admin/articles/${articleId}`,
            method: 'DELETE'
        });
    }
}

// 导出单例实例
export const articleApi = new ArticleApiService();
export default articleApi; 