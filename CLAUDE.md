# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

eve_tools — EVE Kit (eve-kit.com)，EVE Online 工业工具，纯前端 SPA（无后端）。包含蓝图材料计算器、市场价格查询、旗舰跳跃路线规划、公开合同查询和虫洞系统查询。支持国服 Serenity 和世界服 Tranquility（通过 /gf 和 /of 路由区分）。致谢和捐赠均为 AppHeader 中的弹窗（非独立路由）。

## Tech Stack

- **Frontend**: Vue 3 (Vite + Pinia + Vue Router)，纯静态 SPA，无后端
- **ESI**: 浏览器直连 `https://ali-esi.evepc.163.com` (Serenity) / `https://esi.evetech.net` (Tranquility)
- **SDE**: Fuzzwork CSV dump（欧服）+ Serenity ESI 中文名 → JSON 转换脚本 (`scripts/convert-sde.mjs`)，数据存于 `public/data/`。注意：国服专属物品（如座头鲸）无公开 SDE，暂不支持
- **部署**: Cloudflare Pages，push 到 main 自动部署（GitHub Actions + wrangler）

## Architecture

项目根目录即 Vue SPA 项目（package.json、vite.config.js、src/、public/），另含 `scripts/`（数据转换工具）和 `sde_data/`（Fuzzwork CSV 原始数据 + 社区 JSON 数据）。

### 数据层 (`public/data/`)

三个 JSON 文件，由 `scripts/convert-sde.mjs` 从 Fuzzwork CSV 转换生成：

- **`industry.json`** (~2MB) — 物品类型（含中文名）、分组、蓝图、制造活动、材料、产品。使用短 key（n=name, nz=name_zh, g=groupId）压缩体积。
- **`navigation.json`** (~1.4MB) — 星系（含 3D 光年坐标、安全等级）、区域、星门跳跃连接。坐标已在构建时从米转换为光年。
- **`wormhole.json`** (~125KB) — 虫洞星系（等级、效应、静态洞口）、虫洞类型属性。

### 服务层 (`src/services/`)

所有业务逻辑在浏览器端执行，从内存中的 JSON 数据计算：

- **`calculator.js`** — ME 材料公式，`getSourceForProduct()` 查找制造/反应来源
- **`bom.js`** — 递归 BOM 展开，层级聚合，批量 BOM
- **`blueprintLookup.js`** — 蓝图搜索（中英文），自动过滤特别版/AT奖励舰船
- **`routeFinder.js`** — 旗舰跳跃 BFS 路径算法，星门 BFS，高安目的地双路线选项
- **`systemSearch.js`** — 星系名称前缀搜索
- **`wormholeSearch.js`** — 虫洞系统搜索、详情、类型列表
- **`esiClient.js`** — 浏览器直连 ESI（市场价格、订单、合同），内置价格缓存（1小时 TTL）
- **`market.js`** — 材料文本解析 + 物品名称解析（本地）+ ESI 订单价格
- **`contracts.js`** — 合同查询、物品详情（含吉他价格对比）、区域搜索

### API 兼容层 (`src/api/`)

将服务层封装为 `{ data: ... }` 格式，保持 Vue 组件调用方式不变。

### 数据加载 (`src/data/loader.js`)

懒加载 JSON 数据，内存缓存，多调用者共享同一 Promise。各视图在 `onMounted` 中调用对应的 `loadXxxData()`。

### 前端视图 (`src/views/`)

所有功能页通过 `/:server(gf|of)/` 动态路由前缀区分服务器。`stores/settings.js` 持久化 server 和 locale 到 localStorage。`i18n.js` 提供双语翻译。捐赠弹窗根据语言切换：中文显示微信赞赏码（`public/donate-wechat.png`），英文显示 Ko-fi 按钮。

## UI Design

EVE Online 官网风格配色：深黑背景 (#0d0d0d)、深灰面板 (#1a1a1a)、金色强调色 (#c8aa6e)、金色hover (#e0c882)。功能性颜色：绿色 (#4caf50) 高安/制造，橙色 (#ff9800) 低安/反应，红色 (#ef5350) 零安/错误。物品名称旁显示 EVE 图标（`https://images.evetech.net/types/{type_id}/icon?size=32`）。

## Key Formula


材料计算: `required = max(runs, ceil(round(runs * base_quantity * (1 - ME_level * 0.01), 2)))`

activityID 常量: 1=制造, 11=反应

BOM 递归支持完整 T2 制造链：蓝图→T2组件(制造)→反应中间体(反应)→月矿原料。

## Commands

```bash
# 数据转换（从项目根目录执行）
node scripts/convert-sde.mjs                     # 从已有 CSV 生成 JSON
node scripts/convert-sde.mjs --download           # 下载最新 CSV 后生成 JSON
node scripts/convert-sde.mjs --fetch-zh-names     # 同时从 Serenity ESI 获取中文物品名+地图名

# 前端开发（从项目根目录执行）
npm install
npm run dev                                       # 启动 Vite 开发服务器 (端口 5174)
npm run build                                     # 构建生产版本 (输出到 dist/)
npm run preview                                   # 预览构建结果

# 部署（push 到 main 自动触发 GitHub Actions 部署，也可手动）
npm run build && npx wrangler pages deploy dist/  # 手动部署到 Cloudflare Pages

# 每周数据维护（push 后自动部署，无需手动 wrangler）
git pull
node scripts/convert-sde.mjs --download --fetch-zh-names
git add public/data/
git diff --cached --quiet || git commit -m "Weekly SDE data update" && git push
```

## 编码规范
更新代码时，更新 [CLAUDE.md](CLAUDE.md)
