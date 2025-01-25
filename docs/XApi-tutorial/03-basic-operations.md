---
sidebar_position: 3
---

# 基本操作

本章节将介绍 X API 的基本操作，包括发送推文、获取时间线等常用功能。我们将通过实际示例来展示如何使用这些 API。

## 客户端配置

在开始使用 API 之前，我们需要创建一个基础的客户端类：

```python
import requests
from typing import Dict, List, Optional
import json
import logging

class XClient:
    """X API客户端基类"""

    def __init__(self, bearer_token: str):
        self.bearer_token = bearer_token
        self.base_url = "https://api.twitter.com/2"
        self.headers = {
            "Authorization": f"Bearer {bearer_token}",
            "Content-Type": "application/json"
        }

    def _make_request(self, method: str, endpoint: str,
                     params: Optional[Dict] = None,
                     data: Optional[Dict] = None) -> Dict:
        """发送API请求"""
        url = f"{self.base_url}{endpoint}"

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                params=params,
                json=data
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logging.error(f"API请求失败: {str(e)}")
            raise
```

## 发送推文

### 1. 发送文本推文

```python
def post_tweet(self, text: str) -> Dict:
    """发送文本推文"""
    endpoint = "/tweets"
    data = {"text": text}

    try:
        response = self._make_request("POST", endpoint, data=data)
        tweet_id = response["data"]["id"]
        logging.info(f"推文发送成功，ID: {tweet_id}")
        return response
    except Exception as e:
        logging.error(f"发送推文失败: {str(e)}")
        raise

# 使用示例
client = XClient(bearer_token)
tweet = client.post_tweet("Hello, X API!")
```

### 2. 发送带媒体的推文

```python
def upload_media(self, file_path: str, media_type: str) -> str:
    """上传媒体文件"""
    url = "https://upload.twitter.com/1.1/media/upload.json"

    with open(file_path, "rb") as file:
        files = {"media": file}
        response = requests.post(
            url,
            headers={"Authorization": f"Bearer {self.bearer_token}"},
            files=files
        )
        return response.json()["media_id_string"]

def post_tweet_with_media(self, text: str, media_paths: List[str]) -> Dict:
    """发送带媒体的推文"""
    # 上传所有媒体文件
    media_ids = []
    for path in media_paths:
        media_type = self._get_media_type(path)
        media_id = self.upload_media(path, media_type)
        media_ids.append(media_id)

    # 发送推文
    endpoint = "/tweets"
    data = {
        "text": text,
        "media": {"media_ids": media_ids}
    }

    return self._make_request("POST", endpoint, data=data)
```

### 3. 发送回复

```python
def reply_to_tweet(self, in_reply_to_id: str, text: str) -> Dict:
    """回复推文"""
    endpoint = "/tweets"
    data = {
        "text": text,
        "reply": {
            "in_reply_to_tweet_id": in_reply_to_id
        }
    }

    return self._make_request("POST", endpoint, data=data)
```

## 获取推文

### 1. 获取单条推文

```python
def get_tweet(self, tweet_id: str, fields: Optional[List[str]] = None) -> Dict:
    """获取单条推文"""
    endpoint = f"/tweets/{tweet_id}"
    params = {}

    if fields:
        params["tweet.fields"] = ",".join(fields)

    return self._make_request("GET", endpoint, params=params)
```

### 2. 获取多条推文

```python
def get_tweets(self, tweet_ids: List[str],
               fields: Optional[List[str]] = None) -> Dict:
    """批量获取推文"""
    endpoint = "/tweets"
    params = {"ids": ",".join(tweet_ids)}

    if fields:
        params["tweet.fields"] = ",".join(fields)

    return self._make_request("GET", endpoint, params=params)
```

## 时间线操作

### 1. 获取用户时间线

```python
def get_user_timeline(self, user_id: str,
                     max_results: int = 10,
                     pagination_token: Optional[str] = None,
                     exclude_replies: bool = False,
                     exclude_retweets: bool = False) -> Dict:
    """获取用户时间线"""
    endpoint = f"/users/{user_id}/tweets"
    params = {
        "max_results": max_results,
        "tweet.fields": "created_at,public_metrics",
        "exclude": []
    }

    if pagination_token:
        params["pagination_token"] = pagination_token
    if exclude_replies:
        params["exclude"].append("replies")
    if exclude_retweets:
        params["exclude"].append("retweets")

    if params["exclude"]:
        params["exclude"] = ",".join(params["exclude"])
    else:
        del params["exclude"]

    return self._make_request("GET", endpoint, params=params)
```

### 2. 获取主页时间线

```python
def get_home_timeline(self, max_results: int = 10,
                     pagination_token: Optional[str] = None) -> Dict:
    """获取主页时间线"""
    endpoint = "/tweets/search/recent"
    params = {
        "max_results": max_results,
        "tweet.fields": "created_at,public_metrics,author_id"
    }

    if pagination_token:
        params["pagination_token"] = pagination_token

    return self._make_request("GET", endpoint, params=params)
```

## 用户操作

### 1. 获取用户信息

```python
def get_user_info(self, username: str) -> Dict:
    """通过用户名获取用户信息"""
    endpoint = f"/users/by/username/{username}"
    params = {
        "user.fields": "description,public_metrics,created_at,verified"
    }

    return self._make_request("GET", endpoint, params=params)

def get_user_by_id(self, user_id: str) -> Dict:
    """通过用户ID获取用户信息"""
    endpoint = f"/users/{user_id}"
    params = {
        "user.fields": "description,public_metrics,created_at,verified"
    }

    return self._make_request("GET", endpoint, params=params)
```

### 2. 关注操作

```python
def follow_user(self, source_user_id: str, target_user_id: str) -> Dict:
    """关注用户"""
    endpoint = f"/users/{source_user_id}/following"
    data = {"target_user_id": target_user_id}

    return self._make_request("POST", endpoint, data=data)

def unfollow_user(self, source_user_id: str, target_user_id: str) -> Dict:
    """取消关注"""
    endpoint = f"/users/{source_user_id}/following/{target_user_id}"

    return self._make_request("DELETE", endpoint)
```

### 3. 获取关注列表

```python
def get_following(self, user_id: str,
                 max_results: int = 100,
                 pagination_token: Optional[str] = None) -> Dict:
    """获取关注列表"""
    endpoint = f"/users/{user_id}/following"
    params = {
        "max_results": max_results,
        "user.fields": "description,public_metrics"
    }

    if pagination_token:
        params["pagination_token"] = pagination_token

    return self._make_request("GET", endpoint, params=params)

def get_followers(self, user_id: str,
                 max_results: int = 100,
                 pagination_token: Optional[str] = None) -> Dict:
    """获取粉丝列表"""
    endpoint = f"/users/{user_id}/followers"
    params = {
        "max_results": max_results,
        "user.fields": "description,public_metrics"
    }

    if pagination_token:
        params["pagination_token"] = pagination_token

    return self._make_request("GET", endpoint, params=params)
```

## 错误处理

### 1. API 错误处理

```python
class XAPIError(Exception):
    """X API错误基类"""
    def __init__(self, message: str, status_code: int,
                 error_code: Optional[str] = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)

def handle_api_error(self, response: requests.Response) -> None:
    """处理API错误"""
    if response.status_code != 200:
        error = response.json()
        raise XAPIError(
            message=error.get("detail", "未知错误"),
            status_code=response.status_code,
            error_code=error.get("type")
        )
```

### 2. 请求重试

```python
from tenacity import retry, stop_after_attempt, wait_exponential

class XClientWithRetry(XClient):
    """带重试机制的客户端"""

    @retry(stop=stop_after_attempt(3),
           wait=wait_exponential(multiplier=1, min=4, max=10))
    def _make_request(self, method: str, endpoint: str,
                     params: Optional[Dict] = None,
                     data: Optional[Dict] = None) -> Dict:
        """带重试的请求方法"""
        return super()._make_request(method, endpoint, params, data)
```

## 速率限制处理

### 1. 速率限制检查

```python
def check_rate_limit(self, response: requests.Response) -> None:
    """检查速率限制"""
    remaining = response.headers.get("x-rate-limit-remaining")
    reset_time = response.headers.get("x-rate-limit-reset")

    if remaining and int(remaining) < 10:
        logging.warning(
            f"API调用次数即将达到限制，剩余：{remaining}，"
            f"将在 {reset_time} 重置"
        )
```

### 2. 限流器实现

```python
import time
from datetime import datetime

class RateLimiter:
    """速率限制器"""

    def __init__(self, max_requests: int, time_window: int):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = []

    def acquire(self) -> bool:
        """获取请求许可"""
        now = time.time()

        # 清理过期的请求记录
        self.requests = [req for req in self.requests
                        if now - req < self.time_window]

        if len(self.requests) >= self.max_requests:
            return False

        self.requests.append(now)
        return True
```

## 使用示例

### 1. 基本用法

```python
# 创建客户端
client = XClient(bearer_token)

# 发送推文
tweet = client.post_tweet("Hello, World!")

# 获取用户信息
user = client.get_user_info("username")

# 获取时间线
timeline = client.get_user_timeline(user["data"]["id"])
```

### 2. 带重试的客户端

```python
# 创建带重试的客户端
client = XClientWithRetry(bearer_token)

# 自动重试的请求
try:
    tweet = client.post_tweet("Hello with retry!")
except XAPIError as e:
    print(f"最终失败: {e}")
```

### 3. 分页获取数据

```python
def get_all_followers(client: XClient, user_id: str) -> List[Dict]:
    """获取所有粉丝"""
    followers = []
    pagination_token = None

    while True:
        response = client.get_followers(
            user_id,
            pagination_token=pagination_token
        )

        followers.extend(response["data"])

        if "next_token" not in response["meta"]:
            break

        pagination_token = response["meta"]["next_token"]

    return followers
```

## 最佳实践

### 1. 异常处理

- 捕获所有 API 异常
- 实现优雅降级
- 记录详细错误日志
- 提供友好错误提示

### 2. 性能优化

- 使用连接池
- 实现请求缓存
- 批量处理请求
- 异步处理操作

### 3. 代码组织

- 模块化设计
- 清晰的接口定义
- 完善的注释文档
- 统一的错误处理

### 4. 测试建议

- 编写单元测试
- 模拟 API 响应
- 测试错误场景
- 性能压力测试

## 下一步

1. 了解高级功能
2. 学习流式 API
3. 掌握媒体处理
4. 实现高级搜索
5. 优化应用性能

在下一章节中，我们将介绍 X API 的高级特性，包括流式 API、媒体上传等功能。
