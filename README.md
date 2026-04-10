# EVE Kit

[eve-kit.com](https://eve-kit.com)

EVE Online 工业工具，纯前端 SPA，支持国服 (Serenity) 和世界服 (Tranquility)。

EVE Online industry toolkit. Pure frontend SPA supporting both Serenity (CN) and Tranquility (Global) servers.

---

## 功能概览 / Features

### 首页 / Home — 服务器状态与战场热点 / Server Status & Kill Hotspots

- 双服务器实时在线人数、在线/离线状态 / Real-time player count and server status for both servers
- 过去 1 小时全服舰船击杀数 / Ship kills across all of New Eden in the past hour
- PvP 热门区域 Top 10 / Top 10 PvP hotspot regions
- PvE 热门区域 Top 10 / Top 10 PvE hotspot regions (NPC kills)
- 主权战役实时展示 / Live sovereignty campaigns display
- 区域名中英文跟随语言设置 / Region names follow language setting

### 工业制造计算器 / Industry Calculator

- 蓝图搜索（中英文），自动过滤特别版/AT 奖励舰船 / Blueprint search (CN/EN), auto-filters limited/AT ships
- 制造队列：添加多个产品，设置 ME 和流程数 / Manufacturing queue with ME and run settings
- 递归 BOM 展开（最多 5 级）：T2 制造→T2 组件→反应中间体→月矿原料 / Recursive BOM (up to 5 levels): T2→components→reactions→moon materials
- 吉他实时卖单/收单价（缓存1小时）/ Jita real-time sell/buy prices (1h cache)
- 生产时间估算（满技能+最佳建筑 到 无加成范围）/ Production time estimates (best to worst case)
- 已有材料管理 + 一键复制还需材料 / Inventory management + one-click copy remaining materials
- 子组件 ME 全局设置 / Sub-component ME global setting
- 分享与导入 / Share and import fits

### 市场价格查询 / Market

- 价格查询：粘贴材料清单，查询吉他收单/卖单价格 / Price lookup: paste material list, query Jita buy/sell
- 化矿计算：矿石/冰矿/月矿/废铁化矿产物及总价 / Reprocessing calculator with yield settings
- 矿石价值：按 ISK/m³ 排序所有矿石 / Ore value ranking by ISK/m³

### 模拟配船 / Fitting Simulator

- 交互式 Pyfa 风格配船模拟器 / Interactive Pyfa-style ship fitting simulator
- 三栏布局：装备浏览器 + 槽位配置 + 属性面板 / Three-column layout: module browser + slot config + stats panel
- 装备按组分类浏览，支持搜索和拖拽装配 / Modules grouped by category, searchable with drag-and-drop
- 弹药选择（自动过滤兼容弹药）/ Ammo selection (auto-filters compatible charges)
- 炮台/导弹架硬点限制 / Turret/launcher hardpoint enforcement
- 模块装配限制（canFitShipType/Group）/ Module fitting restrictions
- Dogma 属性计算引擎（全技能 V）/ Dogma attribute calculation engine (All Skills V)
  - CPU / 能量栅格 / 校准值 / CPU / Powergrid / Calibration
  - DPS（炮台/导弹/无人机）/ DPS (turret/missile/drone)
  - 防御：血量、抗性、EHP / Defense: HP, resistances, EHP
  - 导航：速度、起跳时间、跃迁速度 / Navigation: speed, align time, warp speed
  - 电容稳定性模拟 / Capacitor stability simulation
  - 锁定：距离、分辨率、最大锁定数 / Targeting: range, scan res, max targets
- 模块离线切换（左键）/ Module offline toggle (left-click)
- EFT 格式导入/导出 / EFT format import/export
- 配置保存/加载（localStorage）/ Fit save/load (localStorage)
- URL 分享 / URL sharing

### 行星开发计算器 / Planetary Industry (PI)

- PI 产品制造链计算 / PI production chain calculator
- 输入/输出材料展示 / Input/output material display

### LP 商店计算器 / LP Store

- NPC 军团 LP 商店浏览 / NPC corporation LP store browser
- ISK/LP 比率计算 / ISK/LP ratio calculation

### 旗舰跳跃规划 / Capital Jump Planner

- 起始/目的地星系搜索（自动补全，中英文）/ System search with autocomplete (CN/EN)
- JDC V 跳跃距离预设 / JDC V jump range presets:
  - 超旗/泰坦 6.0 LY / Supers/Titans 6.0 LY
  - 无畏/航母 7.0 LY / Dreads/Carriers 7.0 LY
  - 黑隐特勤舰 8.0 LY / Black Ops 8.0 LY
  - 跳货/长须鲸 10.0 LY / JF/Rorqual 10.0 LY
- BFS 最短路径算法 / BFS shortest path algorithm
- 高安目的地双路线选项 / Dual route options for highsec destinations
- 星系规避功能 / System avoidance

### D-Scan / Local 解析 / D-Scan / Local Parser

- 粘贴 D-Scan 或 Local 数据，解析舰船类型和数量统计 / Paste D-Scan or Local data, parse ship types and counts

### 公开合同查询 / Public Contracts

- 隐藏功能（连点 logo 5 次解锁）/ Hidden feature (click logo 5 times to unlock)
- 按区域搜索，按类型筛选 / Search by region, filter by type
- 吉他收单对比，折扣率计算 / Jita buy comparison with discount calculation

### 虫洞系统查询 / Wormhole Browser

- 虫洞名称搜索、等级筛选（C1-C6）、效应筛选 / Search by name, filter by class (C1-C6) and effect
- 系统详情：静态洞口、存续时间、质量限制 / System details: statics, lifetime, mass limits

### 00主权势力地图 / Sovereignty Map

- 零安主权联盟分布可视化 / Nullsec sovereignty alliance visualization

### 通用功能 / General

- 中文/英文完整翻译 / Full CN/EN bilingual support
- 国服/世界服一键切换 / Server toggle (Serenity/Tranquility)
- EVE Online 风格深色 UI / EVE Online-styled dark UI
- ESI 订单价格缓存 1 小时 / ESI order price cache (1h TTL)

---

## 数据来源 / Data Sources

| 来源 / Source | 用途 / Usage |
|------|------|
| [Fuzzwork SDE](https://www.fuzzwork.co.uk/dump/latest/) | 物品、蓝图、星系、Dogma 属性等静态数据 / Items, blueprints, systems, dogma attributes (CSV → JSON) |
| [CCP ESI](https://developers.eveonline.com/) | 市场价格、订单、合同、服务器状态、击杀统计、主权、LP 商店 / Market prices, orders, contracts, server status, kills, sovereignty, LP stores |
| [Serenity ESI](https://ali-esi.evepc.163.com) | 国服中文物品名和地图名 / CN server Chinese item and map names |
| [eve-bookmarks](https://github.com/OkYk/eve-bookmarks) | 虫洞系统效应和静态洞口 / Wormhole system effects and statics |
| [Pyfa](https://github.com/pyfa-org/Pyfa) | 配船模拟器设计参考 / Fitting simulator design reference |
| [EVEShipFit](https://github.com/EVEShipFit/dogma-engine) | Dogma 引擎架构参考 / Dogma engine architecture reference |

## 技术栈 / Tech Stack

| 层 / Layer | 技术 / Technology |
|----|------|
| 框架 / Framework | Vue 3 (Composition API + `<script setup>`) |
| 路由 / Router | Vue Router |
| 状态 / State | Pinia |
| 构建 / Build | Vite |
| 部署 / Deploy | Cloudflare Pages (GitHub Actions) |
| 数据 / Data | 浏览器直连 ESI + 预构建 JSON / Browser-direct ESI + pre-built JSON |

纯前端 SPA，无后端依赖，可部署到任何静态托管服务。

Pure frontend SPA with no backend dependencies. Can be deployed to any static hosting service.

---

## 本地开发 / Local Development

```bash
npm install
npm run dev          # 启动开发服务器 / Start dev server (port 5174)
npm run build        # 构建生产版本 / Production build
```

## 数据更新 / Data Update

```bash
# 下载最新 SDE 并生成 JSON（含国服中文名）
# Download latest SDE and generate JSON (with CN names)
node scripts/convert-sde.mjs --download --fetch-zh-names

# 生成 LP 商店数据（可选，需要较长时间）
# Generate LP store data (optional, takes ~30s)
node scripts/convert-sde.mjs --download --fetch-zh-names --fetch-lp
```

## 每周维护 / Weekly Maintenance

```bash
git pull
node scripts/convert-sde.mjs --download --fetch-zh-names
git add public/data/
git diff --cached --quiet || git commit -m "Weekly SDE data update" && git push
```

Push 到 main 后 GitHub Actions 自动构建部署到 Cloudflare Pages。

Pushing to main triggers automatic build and deploy to Cloudflare Pages via GitHub Actions.

---

## 法律声明 / Legal

EVE Online 和 EVE 标志是 CCP hf. 的注册商标。本工具为第三方粉丝项目，与 CCP Games 无关。所有 EVE Online 相关知识产权归 CCP hf. 所有。

EVE Online and the EVE logo are registered trademarks of CCP hf. This is a third-party fan project and is not affiliated with CCP Games. All EVE Online related intellectual property belongs to CCP hf.
