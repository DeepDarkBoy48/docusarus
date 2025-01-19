# 构建阶段
FROM node:18 AS builder

# 设置工作目录
WORKDIR /app

# 复制所有文件
COPY . .

# 安装依赖
RUN npm install

# 构建项目
RUN npm run build

# 运行阶段
FROM nginx:alpine

# 删除默认的html
RUN rm -rf /usr/share/nginx/html/*

# 复制构建产物到 Nginx 目录
COPY --from=builder /app/build /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]