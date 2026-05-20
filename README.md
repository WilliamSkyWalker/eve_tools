# EVE Kit

[eve-kit.com](https://eve-kit.com)

EVE Online industry toolkit. Pure frontend SPA supporting both Tranquility (Global) and Serenity (CN) servers.

EVE Online 工业工具，纯前端 SPA，支持世界服 (Tranquility) 和国服 (Serenity)。

---

## Features / 功能概览

### Home — Server Status & Kill Hotspots / 首页 — 服务器状态与战场热点

- Real-time player count and online/offline status for both servers / 双服务器实时在线人数、在线/离线状态
- Ship kills across all of New Eden in the past hour / 过去 1 小时全服舰船击杀数
- Top 10 PvP hotspot regions / PvP 热门区域 Top 10
- Top 10 PvE hotspot regions (NPC kills) / PvE 热门区域 Top 10
- Live sovereignty campaigns / 主权战役实时展示
- Region names follow language setting / 区域名中英文跟随语言设置

### Industry Calculator / 工业制造计算器

- Blueprint search (EN/CN), auto-filters limited/AT ships / 蓝图搜索（中英文），自动过滤特别版/AT 奖励舰船
- Manufacturing queue with ME and run settings / 制造队列：添加多个产品，设置 ME 和流程数
- Recursive BOM (up to 5 levels): T2 → components → reactions → moon materials / 递归 BOM 展开（最多 5 级）：T2 制造→T2 组件→反应中间体→月矿原料
- Jita real-time sell/buy prices (1h cache) / 吉他实时卖单/收单价（缓存 1 小时）
- Production time estimates (best to worst case) / 生产时间估算（满技能+最佳建筑 到 无加成范围）
- Inventory management + one-click copy of remaining materials / 已有材料管理 + 一键复制还需材料
- Range-selection-safe row copy from BOM tables / BOM 表格任意范围选区复制（不丢首行，统一 tab 分隔）
- Per-tier 待加工 / 其他材料 grouping / 按层级区分待加工 / 其他材料
- Global ME setting for sub-components / 子组件 ME 全局设置
- Plan share and import / 分享与导入

### Market / 市场价格查询

- Price lookup: paste material list, query Jita buy/sell / 价格查询：粘贴材料清单，查询吉他收单/卖单价格
- Reprocessing calculator (ore/ice/moon/scrap, configurable yield) / 化矿计算：矿石/冰矿/月矿/废铁化矿产物及总价
- Ore value ranking by ISK/m³ / 矿石价值：按 ISK/m³ 排序所有矿石

### Fitting Simulator / 模拟配船

- Interactive Pyfa-style ship fitting simulator / 交互式 Pyfa 风格配船模拟器
- Three-column layout: module browser + slot config + stats panel / 三栏布局：装备浏览器 + 槽位配置 + 属性面板
- Modules grouped by category, searchable, drag-and-drop / 装备按组分类浏览，支持搜索和拖拽装配
- Ammo selection (auto-filters compatible charges) / 弹药选择（自动过滤兼容弹药）
- Turret/launcher hardpoint enforcement / 炮台/导弹架硬点限制
- Module fitting restrictions (canFitShipType/Group) / 模块装配限制（canFitShipType/Group）
- Dogma attribute calculation engine (All Skills V) / Dogma 属性计算引擎（全技能 V）
  - CPU / Powergrid / Calibration / CPU / 能量栅格 / 校准值
  - DPS (turret/missile/drone) / DPS（炮台/导弹/无人机）
  - Defense: HP, resistances, EHP / 防御：血量、抗性、EHP
  - Navigation: speed, align time, warp speed / 导航：速度、起跳时间、跃迁速度
  - Capacitor stability simulation / 电容稳定性模拟
  - Targeting: range, scan res, max targets / 锁定：距离、分辨率、最大锁定数
- Module offline toggle (left-click) / 模块离线切换（左键）
- EFT format import/export / EFT 格式导入/导出
- Fit save/load (localStorage) / 配置保存/加载（localStorage）
- URL sharing / URL 分享

### Planetary Industry (PI) / 行星开发计算器

- PI production chain calculator / PI 产品制造链计算
- Input/output material display / 输入/输出材料展示

### LP Store / LP 商店计算器

- NPC corporation LP store browser / NPC 军团 LP 商店浏览
- ISK/LP ratio calculation / ISK/LP 比率计算

### Capital Jump Planner / 旗舰跳跃规划

- System search with autocomplete (EN/CN) / 起始/目的地星系搜索（自动补全，中英文）
- JDC V jump range presets / JDC V 跳跃距离预设:
  - Supers/Titans 6.0 LY / 超旗/泰坦 6.0 LY
  - Dreads/Carriers 7.0 LY / 无畏/航母 7.0 LY
  - Black Ops 8.0 LY / 黑隐特勤舰 8.0 LY
  - JF/Rorqual 10.0 LY / 跳货/长须鲸 10.0 LY
- BFS shortest path algorithm / BFS 最短路径算法
- Dual route options for highsec destinations / 高安目的地双路线选项
- System avoidance / 星系规避功能

### D-Scan / Local Parser / D-Scan / Local 解析

- Paste D-Scan or Local data, parse ship types and counts / 粘贴 D-Scan 或 Local 数据，解析舰船类型和数量统计

### Public Contracts / 公开合同查询

- Hidden feature (click logo 5 times to unlock) / 隐藏功能（连点 logo 5 次解锁）
- Search by region, filter by type / 按区域搜索，按类型筛选
- Jita buy comparison with discount calculation / 吉他收单对比，折扣率计算

### Wormhole Browser / 虫洞系统查询

- Search by name, filter by class (C1-C6) and effect / 虫洞名称搜索、等级筛选（C1-C6）、效应筛选
- System details: statics, lifetime, mass limits / 系统详情：静态洞口、存续时间、质量限制

### Sovereignty Map / 00主权势力地图

- Nullsec sovereignty alliance visualization / 零安主权联盟分布可视化

### Friend Links / 友情链接

- Curated list of commonly used EVE tool sites / EVE 常用工具网站汇总

### General / 通用功能

- Full EN/CN bilingual support / 中文/英文完整翻译
- One-click server toggle (Tranquility/Serenity) / 国服/世界服一键切换
- EVE Online-styled dark UI / EVE Online 风格深色 UI
- ESI order price cache (1h TTL) / ESI 订单价格缓存 1 小时

---

## Data Sources / 数据来源

| Source / 来源 | Usage / 用途 |
|------|------|
| [Fuzzwork SDE](https://www.fuzzwork.co.uk/dump/latest/) | Items, blueprints, systems, dogma attributes (CSV → JSON) / 物品、蓝图、星系、Dogma 属性等静态数据 |
| [CCP ESI](https://developers.eveonline.com/) | Market prices, orders, contracts, server status, kills, sovereignty, LP stores / 市场价格、订单、合同、服务器状态、击杀统计、主权、LP 商店 |
| [Serenity ESI](https://ali-esi.evepc.163.com) | CN server Chinese item, map names, and CN-only fittable types (Hubris-class, etc.) / 国服中文物品名、地图名以及国服独占可装配物品（座头鲸等） |
| [eve-bookmarks](https://github.com/OkYk/eve-bookmarks) | Wormhole system effects and statics / 虫洞系统效应和静态洞口 |
| [Pyfa](https://github.com/pyfa-org/Pyfa) | Fitting simulator design reference / 配船模拟器设计参考 |
| [EVEShipFit](https://github.com/EVEShipFit/dogma-engine) | Dogma engine architecture reference / Dogma 引擎架构参考 |

## Tech Stack / 技术栈

| Layer / 层 | Technology / 技术 |
|----|------|
| Framework / 框架 | Vue 3 (Composition API + `<script setup>`) |
| Router / 路由 | Vue Router |
| State / 状态 | Pinia |
| Build / 构建 | Vite |
| Deploy / 部署 | Cloudflare Pages (GitHub Actions) |
| Data / 数据 | Browser-direct ESI + pre-built JSON / 浏览器直连 ESI + 预构建 JSON |

Pure frontend SPA with no backend dependencies. Can be deployed to any static hosting service.

纯前端 SPA，无后端依赖，可部署到任何静态托管服务。

Industry and dogma data are split per server (`industry-serenity.json` / `industry-tranquility.json`, `dogma-serenity.json` / `dogma-tranquility.json`) to avoid CN translation conflicts: Serenity uses NetEase translations, Tranquility uses CCP translations.

工业和 Dogma 数据按服务器拆分输出两份（`industry-serenity.json` / `industry-tranquility.json`，`dogma-serenity.json` / `dogma-tranquility.json`）以避免国/欧服中文翻译冲突：Serenity 使用 NetEase 翻译，Tranquility 使用 CCP 翻译。

---

## Local Development / 本地开发

```bash
npm install
npm run dev          # Start dev server (port 5174) / 启动开发服务器
npm run build        # Production build / 构建生产版本
npm run preview      # Preview production build / 预览构建结果
```

## Data Update / 数据更新

```bash
# Download latest SDE and generate JSON (with CN names)
# 下载最新 SDE 并生成 JSON（含国服中文名）
node scripts/convert-sde.mjs --download --fetch-zh-names

# Also fetch CN-only items + dogma data from Serenity ESI (Hubris-class, etc., ~1 min)
# 同时从 Serenity ESI 拉取国服独占物品和 dogma 数据（座头鲸等，约 1 分钟）
node scripts/convert-sde.mjs --download --fetch-zh-names --fetch-serenity-extras

# Generate LP store data (optional, takes ~30s)
# 生成 LP 商店数据（可选，约 30 秒）
node scripts/convert-sde.mjs --download --fetch-zh-names --fetch-lp
```

## Weekly Maintenance / 每周维护

```bash
git pull
node scripts/convert-sde.mjs --download --fetch-zh-names --fetch-serenity-extras
git add public/data/
git diff --cached --quiet || git commit -m "Weekly SDE data update" && git push
```

Pushing to main triggers automatic build and deploy to Cloudflare Pages via GitHub Actions.

Push 到 main 后 GitHub Actions 自动构建部署到 Cloudflare Pages。

---

## Legal / 法律声明

EVE Online and the EVE logo are registered trademarks of CCP hf. This is a third-party fan project and is not affiliated with CCP Games. All EVE Online related intellectual property belongs to CCP hf.

EVE Online 和 EVE 标志是 CCP hf. 的注册商标。本工具为第三方粉丝项目，与 CCP Games 无关。所有 EVE Online 相关知识产权归 CCP hf. 所有。
