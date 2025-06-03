# 存储工具模块

这个目录包含了项目中所有与存储相关的工具类和辅助函数。

## 模块说明

### storage.ts

`storage.ts` 提供了统一的存储操作接口，主要用于管理应用程序状态的持久化存储。

**主要功能**：
- 封装了 Expo SecureStore 的操作，提供更简单的 API
- 提供标准化的错误处理
- 管理所有存储键的常量定义
- 针对身份验证数据提供专门的方法

**使用示例**：

```typescript
import storage from '@/utils/storage';

// 基本操作
await storage.setItem('my_key', 'my_value');
const value = await storage.getItem('my_key');
await storage.removeItem('my_key');

// 身份验证相关操作
await storage.saveToken('jwt_token');
const token = await storage.getToken();
await storage.saveUserRole('admin');
await storage.clearAuthData();
```

### apiAuth.ts

`apiAuth.ts` 提供了 API 请求授权的管理，主要处理身份验证令牌和 API 请求头的设置。

**主要功能**：
- 初始化应用程序的 API 授权状态
- 统一管理 API 请求的授权令牌
- 在登录/登出时处理令牌的保存和清除
- 与 storage.ts 协同工作，确保令牌的持久化

**使用示例**：

```typescript
import apiAuth from '@/utils/apiAuth';

// 初始化授权状态（在应用启动时调用）
await apiAuth.initialize();

// 设置授权（登录成功后调用）
await apiAuth.setAuth('jwt_token', 'admin');

// 清除授权（登出时调用）
await apiAuth.clearAuth();
```

## 最佳实践

1. **统一使用 storage 模块**：
   - 不要直接使用 SecureStore
   - 所有持久化存储操作都应通过 storage 模块进行

2. **认证流程**：
   - 登录/注册成功后使用 AuthContext 的 login 方法
   - login 方法内部会调用 apiAuth.setAuth
   - 登出时使用 AuthContext 的 logout 方法
   - logout 方法内部会调用 apiAuth.clearAuth

3. **存储键管理**：
   - 所有存储键都应在 STORAGE_KEYS 常量中定义
   - 避免在代码中使用字符串字面量作为键名

4. **错误处理**：
   - storage 模块内部包含基本的错误处理和日志记录
   - 业务逻辑应捕获并适当处理存储操作的错误 