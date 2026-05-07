# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

eve_tools — EVE Kit (eve-kit.com)，EVE Online 工业工具，纯前端 SPA（无后端）。包含蓝图材料计算器、市场价格查询、LP商店计算器、D-Scan/Local解析器、旗舰跳跃路线规划、公开合同查询（隐藏功能，连点logo 5次解锁）、友情链接（EVE常用工具网站）和00主权势力地图。支持国服 Serenity 和世界服 Tranquility（通过 /gf 和 /of 路由区分）。致谢和捐赠均为 AppHeader 中的弹窗（非独立路由）。

## Tech Stack

- **Frontend**: Vue 3 (Vite + Pinia + Vue Router)，纯静态 SPA，无后端
- **ESI**: 浏览器直连 `https://ali-esi.evepc.163.com` (Serenity) / `https://esi.evetech.net` (Tranquility)
- **SDE**: Fuzzwork CSV dump（欧服）+ Serenity ESI 中文名 → JSON 转换脚本 (`scripts/convert-sde.mjs`)，数据存于 `public/data/`。国服独有物品（如座头鲸）通过 `--fetch-serenity-extras` 从 Serenity ESI `/universe/types` 拉取，仅含名字/分组/体积等基础字段（无蓝图/材料数据）。industry 数据按服务器拆分输出两份文件以避免国/欧服中文翻译冲突
- **部署**: Cloudflare Pages，push 到 main 自动部署（GitHub Actions + wrangler）

## Architecture

项目根目录即 Vue SPA 项目（package.json、vite.config.js、src/、public/），另含 `scripts/`（数据转换工具）和 `sde_data/`（Fuzzwork CSV 原始数据 + 社区 JSON 数据）。

### 数据层 (`public/data/`)

三个 JSON 文件，由 `scripts/convert-sde.mjs` 从 Fuzzwork CSV 转换生成：

- **`industry-serenity.json`** / **`industry-tranquility.json`** (~3MB 每份) — 按服务器拆分。物品类型（含中文名、体积）、分组、蓝图、制造活动、材料、产品、化矿数据。使用短 key（n=name, nz=name_zh, g=groupId, v=volume, ps=portionSize）压缩体积。**Serenity 用 NetEase 中文翻译，Tranquility 用 CCP 中文翻译**——这避免了 SDE 翻译重名（如 17918 Rattlesnake / 85062 Sidewinder 在 TQ 都是"响尾蛇级"，但 NetEase 给 Sidewinder 翻译为"侧进蛇级"）。Serenity 文件含国服独有物品（约 2500 个，由 `--fetch-serenity-extras` 拉取），不含 TQ-only 物品。`loader.js` 按 `settings.datasource` 加载对应文件。
- **`navigation.json`** (~1.4MB) — 星系（含 3D 光年坐标、安全等级）、区域、星门跳跃连接。坐标已在构建时从米转换为光年。
- **`wormhole.json`** (~125KB) — 虫洞星系（等级、效应、静态洞口）、虫洞类型属性。
- **`lpstore.json`** (~2MB) — LP商店数据：NPC军团、兑换报价（物品、LP/ISK花费、所需材料）、相关物品类型名。由 `--fetch-lp` 从 ESI 获取。
- **`dogma.json`** (~3MB) — 配船模拟器数据：属性定义（attrs）、效果定义含modifierInfo（effects）、可装配物品类型属性和效果（types：Ship/Module/Charge/Drone/Implant/Subsystem/Skill）、分组（groups）、类别（categories）。由 `dgmAttributeTypes`、`dgmEffects`、`dgmTypeEffects`、`dgmTypeAttributes` CSV 生成。modifierInfo 为从 CSV 中 YAML 格式解析的修改器列表，使用短 key（d=domain, f=func, ma=modifiedAttributeID, ya=modifyingAttributeID, op=operation, sk=skillTypeID, gid=groupID）。

### 服务层 (`src/services/`)

所有业务逻辑在浏览器端执行，从内存中的 JSON 数据计算：

- **`calculator.js`** — ME 材料公式，`getSourceForProduct()` 查找制造/反应来源
- **`bom.js`** — 递归 BOM 展开，层级聚合，批量 BOM
- **`blueprintLookup.js`** — 蓝图搜索（中英文），自动过滤特别版/AT奖励舰船
- **`routeFinder.js`** — 旗舰跳跃 BFS 路径算法，星门 BFS，高安目的地双路线选项
- **`systemSearch.js`** — 星系名称前缀搜索
- **`wormholeSearch.js`** — 虫洞系统搜索、详情、类型列表、效应信标加成数据（硬编码C1-C6各效应乘数）
- **`sovereignty.js`** — 00主权数据（ESI sovereignty/map）、按区域聚合、凸包计算、联盟颜色生成
- **`esiClient.js`** — 浏览器直连 ESI（市场价格、订单、合同），内置价格缓存（1小时 TTL）
- **`market.js`** — 材料文本解析 + 物品名称解析（本地）+ ESI 订单价格。市场页含三个标签：价格查询、化矿计算（吉他收单）、矿石价值（按 ISK/m³ 排序，80%化矿率，吉他收单）
- **`contracts.js`** — 合同查询、物品详情（含吉他价格对比）、区域搜索
- **`dogmaEngine.js`** — 配船模拟 Dogma 属性计算引擎。收集基础属性、效果和修改器（modifierInfo），按 6 种 operation 类型顺序应用（PreMul→ModAdd→PostMul→PostPercent→PostAssign），PostPercent 非 stackable 修改器应用堆叠惩罚公式 `0.5^((i/2.22292081)^2)`。假设 All Skills Level V（技能等级属性 280 固定返回 5）
- **`fittingStats.js`** — 从 Dogma 计算结果提取人类可读统计：CPU/PG/校准值使用量、盾/甲/壳 HP+抗性+EHP、速度/起跳时间/跃迁速度、电容容量/回充、锁定距离/分辨率/最大锁定数

### API 兼容层 (`src/api/`)

将服务层封装为 `{ data: ... }` 格式，保持 Vue 组件调用方式不变。

### 数据加载 (`src/data/loader.js`)

懒加载 JSON 数据，内存缓存，多调用者共享同一 Promise。各视图在 `onMounted` 中调用对应的 `loadXxxData()`。`loadIndustryData()` 按 `settings.datasource` 加载对应服务器文件并切换 active 数据；`App.vue` 的 `<router-view>` 用 `:key="$route.fullPath"` 在 server 切换时强制 remount 视图重新触发 onMounted。

### 前端视图 (`src/views/`)

所有功能页通过 `/:server(gf|of)/` 动态路由前缀区分服务器。`stores/settings.js` 持久化 server 和 locale 到 localStorage。`i18n.js` 提供双语翻译。捐赠弹窗根据语言切换：中文显示微信赞赏码（`public/donate-wechat.png`），英文显示 Ko-fi 按钮。

## UI Design

EVE Online 官网风格配色：深黑背景 (#0d0d0d)、深灰面板 (#1a1a1a)、金色强调色 (#c8aa6e)、金色hover (#e0c882)。功能性颜色：绿色 (#4caf50) 高安/制造，橙色 (#ff9800) 低安/反应，红色 (#ef5350) 零安/错误。物品名称旁显示 EVE 图标（`https://images.evetech.net/types/{type_id}/icon?size=32`）。

## Key Formula


材料计算: `required = max(runs, ceil(round(runs * base_quantity * (1 - ME_level * 0.01), 2)))`

activityID 常量: 1=制造, 11=反应

BOM 递归支持完整 T2 制造链：蓝图→T2组件(制造)→反应中间体(反应)→月矿原料。

Dogma 堆叠惩罚: `effectiveness[i] = 0.5 ^ ((i / 2.22292081) ^ 2)`（i 从 0 开始，按绝对值降序排列，正负分开计算）

起跳时间: `alignTime = -ln(0.25) * mass * agility / 1000000`

EHP: `ehp = Σ(hp_layer / (1 - avg_resist_layer))`（对盾/甲/壳分别计算后求和）

Dogma modifier 应用顺序: PreMul(0) → PreDiv(1) → ModAdd(2) → ModSub(3) → PostMul(4) → PostDiv(5) → PostPercent(6, 含堆叠惩罚) → PostAssign(7)

### 配船模拟器

交互式 Pyfa 风格配船模拟器（`FittingView.vue`）。双栏布局：左栏船体选择+槽位布局+无人机+EFT导入导出，右栏属性面板（装配/防御/火力/导航/电容/锁定 6个标签）。

核心文件：
- **Store**: `stores/fitting.js` — Pinia store 管理配船状态（ship/modules/charges/drones）
- **Engine**: `services/dogmaEngine.js` — 属性计算引擎，All Skills V
- **Stats**: `services/fittingStats.js` — 派生统计（CPU/PG/HP/抗性/EHP/速度/电容/锁定）
- **Parser**: `composables/useEftParser.js` — EFT 格式解析和导出
- **Components**: `components/fitting/` — ShipSearch, ModuleBrowser（左侧装备列表，按组分类+搜索+拖拽）, SlotLayout, SlotRow（拖放+左键切换离线+右键移除+弹药指示器）, ModuleSearch, ChargeSearch（弹药选择弹窗，按兼容组过滤）, DroneBay, EftPanel, StatsPanel（竖排标签）, StatsFitting, StatsDefense, StatsOffense, StatsNavigation, StatsCapacitor, StatsTargeting, StatBar

已实现功能：
- [x] DPS 计算（炮台=charge伤害×damageMult/RoF、导弹=charge伤害×missileDmgMult/RoF、无人机=自身伤害×dmgMult/RoF×count）
- [x] 电容稳定性模拟（逐秒模拟 dC/dt=10*Cmax/tau*(sqrt(pct)-pct)-usage，600 秒内稳定则报百分比，否则报持续时间）
- [x] 技能对模块 CPU/PG 的减成（引擎对模块应用 LocationRequiredSkillModifier/LocationGroupModifier 等修改器）
- [x] 模块离线切换（Shift+右键切换，offlineSlots 状态，离线模块跳过计算）
- [x] 配置保存/加载（localStorage key=eve_fits，JSON 序列化，支持多配置命名/删除）
- [x] URL 分享（btoa(JSON) 编码到 hash，页面加载时自动恢复）
- [x] 弹药模拟（武器 chargeGroup 604/605/606/609 + chargeSize 128 匹配兼容弹药，ChargeSearch 弹窗）
- [x] 炮台/导弹架硬点限制（attr 102=turretHardpoints, 101=launcherHardpoints，放置时校验，高槽标签显示 T/L 计数）

默认假设全技能 V（skillLevel attr 280 固定返回 5），不模拟具体技能等级。
操作：左键空槽=搜索装备，左键已装备=切换离线，右键=移除，双击浏览器装备=自动放入空槽，拖拽放置。

## Commands

```bash
# 数据转换（从项目根目录执行）
node scripts/convert-sde.mjs                     # 从已有 CSV 生成 JSON
node scripts/convert-sde.mjs --download           # 下载最新 CSV 后生成 JSON
node scripts/convert-sde.mjs --fetch-zh-names     # 同时从 Serenity ESI 获取中文物品名+地图名
node scripts/convert-sde.mjs --fetch-lp           # 从 ESI 获取 LP 商店数据（需联网，约30秒）
node scripts/convert-sde.mjs --fetch-serenity-extras  # 拉取国服独有物品（座头鲸等）+ 国服中文名，输出 industry-serenity.json（约1分钟，不带此 flag 时 industry-serenity.json = industry-tranquility.json）

# 前端开发（从项目根目录执行）
npm install
npm run dev                                       # 启动 Vite 开发服务器 (端口 5174)
npm run build                                     # 构建生产版本 (输出到 dist/)
npm run preview                                   # 预览构建结果

# 部署（push 到 main 自动触发 GitHub Actions 部署，也可手动）
npm run build && npx wrangler pages deploy dist/  # 手动部署到 Cloudflare Pages

# 每周数据维护（push 后自动部署，无需手动 wrangler）
git pull
node scripts/convert-sde.mjs --download --fetch-zh-names --fetch-serenity-extras
git add public/data/
git diff --cached --quiet || git commit -m "Weekly SDE data update" && git push
```

## 编码规范
更新代码时，更新 [CLAUDE.md](CLAUDE.md)


