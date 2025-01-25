---
sidebar_position: 4
---

# 高级特性

本章节将介绍 X API 的高级特性和功能，包括流式 API、媒体处理、高级搜索等。这些功能可以帮助你构建更复杂和强大的应用。

## 流式 API

流式 API 允许实时接收推文和事件，是构建实时应用的重要工具。

### 1. 过滤流（Filtered Stream）

过滤流允许你根据规则实时接收匹配的推文：

````python
import json
import requests
from typing import Generator, Dict, List
import logging

class StreamClient:
    """流式API客户端"""

    def __init__(self, bearer_token: str):
        self.bearer_token = bearer_token
        self.base_url = "https://api.twitter.com/2"

    def setup_rules(self, rules: List[Dict]) -> Dict:
        """设置过滤规则"""
        url = f"{self.base_url}/tweets/search/stream/rules"

        # 首先删除所有现有规则
        current_rules = self.get_rules()
        if current_rules.get("data"):
            rule_ids = [rule["id"] for rule in current_rules["data"]]
            self.delete_rules(rule_ids)

        # 添加新规则
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json"
        }
        payload = {"add": rules}

        try:
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            logging.info("成功设置流式规则")
            return response.json()
        except Exception as e:
            logging.error(f"设置规则失败: {str(e)}")
            raise

    def get_rules(self) -> Dict:
        """获取当前规则"""
        url = f"{self.base_url}/tweets/search/stream/rules"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}

        response = requests.get(url, headers=headers)
        return response.json()

    def delete_rules(self, rule_ids: List[str]) -> Dict:
        """删除规则"""
        url = f"{self.base_url}/tweets/search/stream/rules"
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json"
        }
        payload = {"delete": {"ids": rule_ids}}

        response = requests.post(url, headers=headers, json=payload)
        return response.json()

    def connect_stream(self, tweet_fields: str = None) -> Generator[Dict, None, None]:
        """连接到流式API"""
        url = f"{self.base_url}/tweets/search/stream"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        params = {}

        if tweet_fields:
            params["tweet.fields"] = tweet_fields

        try:
            with requests.get(
                url,
                headers=headers,
                params=params,
                stream=True
            ) as response:
                if response.status_code != 200:
                    raise Exception(
                        f"流式连接失败: {response.status_code}"
                    )

                for line in response.iter_lines():
                    if line:
                        tweet = json.loads(line)
                        yield tweet
        except Exception as e:
            logging.error(f"流式处理错误: {str(e)}")
            raise

# 使用示例
def process_stream():
    client = StreamClient(bearer_token)

    # 设置规则
    rules = [
        {"value": "python", "tag": "python tweets"},
        {"value": "javascript", "tag": "javascript tweets"}
    ]
    client.setup_rules(rules)

    # 处理流式数据
    try:
        for tweet in client.connect_stream(
            tweet_fields="created_at,author_id,public_metrics"
        ):
            process_tweet(tweet)
    except Exception as e:
        logging.error(f"流式处理中断: {str(e)}")

### 2. 用户流（User Stream）

用户流允许接收特定用户的实时更新：

```python
class UserStreamClient(StreamClient):
    """用户流客户端"""

    def connect_user_stream(self, user_id: str) -> Generator[Dict, None, None]:
        """连接用户流"""
        url = f"{self.base_url}/users/{user_id}/stream"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}

        with requests.get(url, headers=headers, stream=True) as response:
            for line in response.iter_lines():
                if line:
                    event = json.loads(line)
                    yield event

# 使用示例
def monitor_user(user_id: str):
    client = UserStreamClient(bearer_token)
    for event in client.connect_user_stream(user_id):
        handle_user_event(event)
````

## 媒体处理

### 1. 分块上传大文件

对于大型媒体文件，需要使用分块上传：

````python
import os
from typing import Optional

class MediaUploader:
    """媒体上传工具"""

    def __init__(self, bearer_token: str):
        self.bearer_token = bearer_token
        self.upload_url = "https://upload.twitter.com/1.1/media/upload.json"

    def upload_media(self, file_path: str,
                    media_type: Optional[str] = None,
                    media_category: Optional[str] = None) -> str:
        """上传媒体文件"""
        if not media_type:
            media_type = self._get_media_type(file_path)

        # INIT
        media_id = self._init_upload(file_path, media_type, media_category)

        # APPEND
        self._upload_chunks(file_path, media_id)

        # FINALIZE
        return self._finalize_upload(media_id)

    def _init_upload(self, file_path: str,
                     media_type: str,
                     media_category: Optional[str] = None) -> str:
        """初始化上传"""
        total_bytes = os.path.getsize(file_path)

        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        data = {
            "command": "INIT",
            "total_bytes": total_bytes,
            "media_type": media_type
        }

        if media_category:
            data["media_category"] = media_category

        response = requests.post(
            self.upload_url,
            headers=headers,
            data=data
        )
        return response.json()["media_id_string"]

    def _upload_chunks(self, file_path: str,
                      media_id: str,
                      chunk_size: int = 1024 * 1024) -> None:
        """上传文件块"""
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        segment_index = 0

        with open(file_path, "rb") as file:
            while True:
                chunk = file.read(chunk_size)
                if not chunk:
                    break

                data = {
                    "command": "APPEND",
                    "media_id": media_id,
                    "segment_index": segment_index
                }
                files = {"media": chunk}

                response = requests.post(
                    self.upload_url,
                    headers=headers,
                    data=data,
                    files=files
                )
                response.raise_for_status()
                segment_index += 1

    def _finalize_upload(self, media_id: str) -> str:
        """完成上传"""
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        data = {
            "command": "FINALIZE",
            "media_id": media_id
        }

        response = requests.post(
            self.upload_url,
            headers=headers,
            data=data
        )
        return media_id

    def _get_media_type(self, file_path: str) -> str:
        """获取媒体类型"""
        extension = os.path.splitext(file_path)[1].lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".mp4": "video/mp4",
            ".mov": "video/quicktime"
        }
        return media_types.get(extension, "application/octet-stream")

# 使用示例
def upload_video(file_path: str) -> str:
    uploader = MediaUploader(bearer_token)
    media_id = uploader.upload_media(
        file_path,
        media_category="tweet_video"
    )
    return media_id

### 2. 媒体元数据

处理媒体元数据和状态：

```python
class MediaMetadata:
    """媒体元数据处理"""

    def __init__(self, bearer_token: str):
        self.bearer_token = bearer_token
        self.base_url = "https://upload.twitter.com/1.1/media"

    def get_status(self, media_id: str) -> Dict:
        """获取媒体处理状态"""
        url = f"{self.base_url}/upload.json"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        params = {
            "command": "STATUS",
            "media_id": media_id
        }

        response = requests.get(url, headers=headers, params=params)
        return response.json()

    def add_metadata(self, media_id: str,
                    alt_text: Optional[str] = None,
                    title: Optional[str] = None) -> None:
        """添加媒体元数据"""
        url = f"{self.base_url}/metadata/create.json"
        headers = {
            "Authorization": f"Bearer {self.bearer_token}",
            "Content-Type": "application/json"
        }

        metadata = {"media_id": media_id}
        if alt_text:
            metadata["alt_text"] = {"text": alt_text}
        if title:
            metadata["title"] = title

        response = requests.post(url, headers=headers, json=metadata)
        response.raise_for_status()
````

## 高级搜索

### 1. 复杂查询构建

```python
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime

@dataclass
class SearchQuery:
    """搜索查询构建器"""

    keywords: Optional[List[str]] = None
    hashtags: Optional[List[str]] = None
    from_user: Optional[str] = None
    to_user: Optional[str] = None
    mentioned_users: Optional[List[str]] = None
    min_replies: Optional[int] = None
    min_likes: Optional[int] = None
    min_retweets: Optional[int] = None
    since_date: Optional[datetime] = None
    until_date: Optional[datetime] = None
    lang: Optional[str] = None

    def build(self) -> str:
        """构建查询字符串"""
        query_parts = []

        if self.keywords:
            query_parts.extend(self.keywords)

        if self.hashtags:
            query_parts.extend([f"#{tag}" for tag in self.hashtags])

        if self.from_user:
            query_parts.append(f"from:{self.from_user}")

        if self.to_user:
            query_parts.append(f"to:{self.to_user}")

        if self.mentioned_users:
            query_parts.extend(
                [f"@{user}" for user in self.mentioned_users]
            )

        if self.min_replies:
            query_parts.append(f"min_replies:{self.min_replies}")

        if self.min_likes:
            query_parts.append(f"min_likes:{self.min_likes}")

        if self.min_retweets:
            query_parts.append(f"min_retweets:{self.min_retweets}")

        if self.since_date:
            query_parts.append(
                f"since:{self.since_date.strftime('%Y-%m-%d')}"
            )

        if self.until_date:
            query_parts.append(
                f"until:{self.until_date.strftime('%Y-%m-%d')}"
            )

        if self.lang:
            query_parts.append(f"lang:{self.lang}")

        return " ".join(query_parts)

class AdvancedSearch:
    """高级搜索实现"""

    def __init__(self, bearer_token: str):
        self.bearer_token = bearer_token
        self.base_url = "https://api.twitter.com/2"

    def search_recent(self, query: SearchQuery,
                     max_results: int = 100) -> Dict:
        """最近7天搜索"""
        url = f"{self.base_url}/tweets/search/recent"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        params = {
            "query": query.build(),
            "max_results": max_results,
            "tweet.fields": "created_at,public_metrics,author_id"
        }

        response = requests.get(url, headers=headers, params=params)
        return response.json()

    def search_all(self, query: SearchQuery,
                  max_results: int = 100) -> Dict:
        """全量搜索"""
        url = f"{self.base_url}/tweets/search/all"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}
        params = {
            "query": query.build(),
            "max_results": max_results,
            "tweet.fields": "created_at,public_metrics,author_id"
        }

        response = requests.get(url, headers=headers, params=params)
        return response.json()

# 使用示例
def search_python_tweets():
    query = SearchQuery(
        keywords=["python", "programming"],
        hashtags=["coding"],
        min_likes=10,
        lang="en"
    )

    search = AdvancedSearch(bearer_token)
    results = search.search_recent(query)

    return results
```

## 批量操作

### 1. 批量用户查询

```python
class BatchOperations:
    """批量操作工具"""

    def __init__(self, bearer_token: str):
        self.bearer_token = bearer_token
        self.base_url = "https://api.twitter.com/2"

    def get_users_batch(self, user_ids: List[str],
                       user_fields: Optional[List[str]] = None) -> Dict:
        """批量获取用户信息"""
        url = f"{self.base_url}/users"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}

        # 分批处理，每批最多100个ID
        results = []
        for i in range(0, len(user_ids), 100):
            batch = user_ids[i:i + 100]
            params = {"ids": ",".join(batch)}

            if user_fields:
                params["user.fields"] = ",".join(user_fields)

            response = requests.get(url, headers=headers, params=params)
            results.extend(response.json().get("data", []))

        return {"data": results}

    def get_tweets_batch(self, tweet_ids: List[str],
                        tweet_fields: Optional[List[str]] = None) -> Dict:
        """批量获取推文"""
        url = f"{self.base_url}/tweets"
        headers = {"Authorization": f"Bearer {self.bearer_token}"}

        results = []
        for i in range(0, len(tweet_ids), 100):
            batch = tweet_ids[i:i + 100]
            params = {"ids": ",".join(batch)}

            if tweet_fields:
                params["tweet.fields"] = ",".join(tweet_fields)

            response = requests.get(url, headers=headers, params=params)
            results.extend(response.json().get("data", []))

        return {"data": results}
```

## 异步操作

### 1. 使用 aiohttp 实现异步请求

```python
import aiohttp
import asyncio
from typing import List, Dict, Any

class AsyncXClient:
    """异步X API客户端"""

    def __init__(self, bearer_token: str):
        self.bearer_token = bearer_token
        self.base_url = "https://api.twitter.com/2"
        self.headers = {
            "Authorization": f"Bearer {bearer_token}"
        }

    async def get_users(self, user_ids: List[str]) -> List[Dict[str, Any]]:
        """异步获取多个用户信息"""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for user_id in user_ids:
                url = f"{self.base_url}/users/{user_id}"
                task = self.fetch_user(session, url)
                tasks.append(task)

            return await asyncio.gather(*tasks)

    async def fetch_user(self,
                        session: aiohttp.ClientSession,
                        url: str) -> Dict[str, Any]:
        """获取单个用户信息"""
        async with session.get(url, headers=self.headers) as response:
            return await response.json()

    async def search_tweets(self,
                          queries: List[str]) -> List[Dict[str, Any]]:
        """异步执行多个搜索"""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for query in queries:
                url = f"{self.base_url}/tweets/search/recent"
                params = {"query": query}
                task = self.fetch_search(session, url, params)
                tasks.append(task)

            return await asyncio.gather(*tasks)

    async def fetch_search(self,
                         session: aiohttp.ClientSession,
                         url: str,
                         params: Dict[str, str]) -> Dict[str, Any]:
        """执行单个搜索"""
        async with session.get(
            url,
            headers=self.headers,
            params=params
        ) as response:
            return await response.json()

# 使用示例
async def main():
    client = AsyncXClient(bearer_token)

    # 异步获取用户信息
    user_ids = ["123", "456", "789"]
    users = await client.get_users(user_ids)

    # 异步搜索
    queries = ["python", "javascript", "rust"]
    results = await client.search_tweets(queries)

    return users, results

# 运行异步代码
if __name__ == "__main__":
    users, results = asyncio.run(main())
```

## 错误重试

### 1. 高级重试机制

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_log,
    after_log
)
import logging

logger = logging.getLogger(__name__)

class RetryableError(Exception):
    """可重试的错误"""
    pass

class NonRetryableError(Exception):
    """不可重试的错误"""
    pass

@retry(
    retry=retry_if_exception_type(RetryableError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.INFO)
)
def api_call_with_retry(func, *args, **kwargs):
    """带重试机制的API调用"""
    try:
        return func(*args, **kwargs)
    except requests.exceptions.RequestException as e:
        if e.response.status_code in [429, 500, 502, 503, 504]:
            raise RetryableError(str(e))
        raise NonRetryableError(str(e))
```

## 监控和日志

### 1. API 调用监控

```python
import time
from dataclasses import dataclass
from datetime import datetime

@dataclass
class APIMetrics:
    """API指标收集"""

    endpoint: str
    method: str
    status_code: int
    response_time: float
    timestamp: datetime

class MetricsCollector:
    """指标收集器"""

    def __init__(self):
        self.metrics = []

    def record_api_call(self, endpoint: str,
                       method: str,
                       status_code: int,
                       response_time: float):
        """记录API调用"""
        metric = APIMetrics(
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time=response_time,
            timestamp=datetime.now()
        )
        self.metrics.append(metric)

    def get_average_response_time(self, endpoint: str) -> float:
        """获取平均响应时间"""
        relevant_metrics = [
            m for m in self.metrics if m.endpoint == endpoint
        ]
        if not relevant_metrics:
            return 0.0

        total_time = sum(m.response_time for m in relevant_metrics)
        return total_time / len(relevant_metrics)

    def get_error_rate(self, endpoint: str) -> float:
        """获取错误率"""
        relevant_metrics = [
            m for m in self.metrics if m.endpoint == endpoint
        ]
        if not relevant_metrics:
            return 0.0

        error_count = sum(
            1 for m in relevant_metrics if m.status_code >= 400
        )
        return error_count / len(relevant_metrics)

class MonitoredXClient:
    """带监控的X客户端"""

    def __init__(self, bearer_token: str):
        self.client = XClient(bearer_token)
        self.metrics = MetricsCollector()

    def post_tweet(self, text: str) -> Dict:
        """发送推文（带监控）"""
        start_time = time.time()
        try:
            response = self.client.post_tweet(text)
            status_code = 200
        except Exception as e:
            status_code = getattr(e, "status_code", 500)
            raise
        finally:
            end_time = time.time()
            self.metrics.record_api_call(
                endpoint="/tweets",
                method="POST",
                status_code=status_code,
                response_time=end_time - start_time
            )
        return response
```

## 最佳实践

### 1. 性能优化

- 使用连接池
- 实现请求缓存
- 批量处理请求
- 异步操作处理
- 合理使用流式 API

### 2. 错误处理

- 实现智能重试
- 优雅降级策略
- 完善的日志记录
- 监控告警机制

### 3. 资源管理

- 连接池管理
- 内存使用优化
- 并发控制
- 超时处理

### 4. 安全考虑

- 密钥保护
- 请求签名
- 速率限制
- 错误处理

## 下一步

1. 深入了解流式 API
2. 优化媒体处理
3. 实现高级搜索
4. 添加监控系统
5. 性能调优

在实际开发中，可以根据具体需求选择合适的功能组合，构建强大的应用。
