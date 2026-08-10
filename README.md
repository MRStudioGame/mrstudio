# 《完了，我被老蒋包围了》官方站点

抽象猎奇搞笑 Galgame 的官方介绍与下载页。复古民国报纸风格，纯静态站点（HTML/CSS/JS），零成本托管。

## 本地预览

直接用浏览器打开 `index.html` 即可。

## 部署（免费，二选一）

### 方案 A：GitHub Pages（推荐，无审核、更新即生效）

1. 注册 GitHub 账号：https://github.com/signup （免费，邮箱即可，国内可访问）
2. 登录后点右上角 **+ → New repository**，仓库名随意（如 `game-site`），选 **Public**，创建
3. 本目录已经配好自动发布（`.github/workflows/pages.yml`），只需要把本目录内容推上去：
   ```
   git init
   git add .
   git commit -m "官网 v1.0"
   git branch -M main
   git remote add origin https://github.com/你的用户名/game-site.git
   git push -u origin main
   ```
4. 打开仓库 **Settings → Pages**，Source 选 **GitHub Actions**，保存
5. 等 1 分钟，网站上线：`https://你的用户名.github.io/game-site/`

**之后怎么实时更新**：改完本地文件后 `git add . && git commit -m "更新" && git push`，约 1 分钟后网站自动更新，无需任何手动操作。

### 方案 B：Gitee Pages（国内访问更快）

1. 注册 Gitee：https://gitee.com/signup （免费，需手机号，建议实名认证）
2. 新建仓库（公开）→ 把本目录文件上传（网页端直接拖拽上传即可）
3. 打开仓库 **服务 → Gitee Pages**，点「启动」→ 等待审核（一般几小时到 1 天）
4. 通过后网址：`https://你的用户名.gitee.io/仓库名/`

## 文件结构

```
game-site/
├── index.html          # 页面
├── css/style.css       # 样式
├── js/main.js          # 交互
├── assets/
│   ├── img/            # 游戏截图与图标
│   └── downloads/      # Windows 版 zip + 安卓版 apk（下载文件）
└── .github/workflows/pages.yml  # GitHub 自动发布配置
```

## 更新下载文件

替换 `assets/downloads/` 里的 zip / apk 为新版本（保持文件名不变），推送后网站上的下载链接自动指向新文件。

## 免责声明

「老蒋」为虚构戏仿角色，纯属娱乐；音乐版权归原作者；本页面及游戏由 MR工作室 制作。
