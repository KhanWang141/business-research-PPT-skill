# 项目模板与请求示例

按任务填写字段，空白不是事实或审批记录。只建立当前阶段实际需要的文件。

## Brief 和逐页大纲

Brief：项目 / 市场与城市 / 行业与场景 / 主品牌与合作品牌 / 受众与决策 / 语言 / 讲述或阅读密度 / 页数与时长 / 数据截止日 / 可用数据及许可 / 所需交付 / 目标 PowerPoint 版本与 OS / 负责人 / 取数人 / 另一位复核人 / 业务批准人 / QA / 缺口与截止日。

大纲表：页码｜结论式标题｜业务问题｜所需具体指标｜推荐 Bar Chart 或非数据版式｜可能来源｜待验证项｜是否重点页。默认标出最重要的 3 页；英文标题遵循项目语言要求。按 SOP 可放新 Google Sheet；用户指定其他位置时使用指定位置，无连接时提供本地表。

## 来源与绘图数据

sources.csv：source_id、slide_id、指标/定义、国家/主体、时期、原值/单位、actual/estimate/forecast、机构/报告、URL 或授权路径、页码/单元格、提取日期、文件/版本、许可、计算说明、复核人和状态。完整规则见 [证据与数据](evidence.md)。

chart_data.csv/xlsx：record_id、slide_id、chart_id、category、series、value、unit、year/period、source_id、status、valueType。需要时补币种、计价、分母和阈值字段；来源表或规范化 records 中保留详细定义，不能靠一个年份字段省略口径。

## 风格和单页卡

风格简报：国家/城市 / 行业 / 品牌 / 受众与目标 / 语言 / 官方品牌指南及 Logo / 已确认文化线索与素材许可 / 3 至 5 个视觉词 / 禁止风格 / 图表输入 / 交付格式。

单页卡：slide_id / 业务问题 / 结论 / 支持点 / record_ids / source_ids / chart_id / 图型 / 单位与时期 / 分类顺序 / 轴范围 / 精度与阈值 / 实际或预测 / 五类布局之一或适用模板页 / 资产 / 来源脚注 / 限制 / 备注 / 数据状态 / 业务批准。

令牌建议结构：canvas、colors、typography、spacing、layouts、charts、logo、media、motion。typography 同时记录 PPT pt 与 HTML 逻辑 px；charts 记录轴 20pt bold/italic、标签 16/18pt bold、显示 0/1 位小数、系列色和预测标识。避免在页面复制多套硬编码样式。

## 阶段请求示例

- 研究：为指定受众和目标输出逐页大纲、所需指标及来源台账。只用所提供/获授权材料，没有依据的观点和数值标待验证，列出缺口。
- 风格：根据品牌手册、目标国家素材和核验图表，给出 Editorial Minimal / Premium Local / Modern Dynamic 三个实际页面预览；说明各自的图表、背景和可读性处理。
- 样张：选定设计后输出 design-tokens.json 和五类布局，制作市场比较、品牌排行两页可编辑 HTML；收到确认再扩展全稿。
- 定点修订：仅修改指定页/图的指定视觉问题；先说明改法，再调整。不得改数值、排序、比例、单位、时期、来源或文字事实。
- 审稿：逐页按观点、图表、品牌、在地化、留白、跨页一致、溯源七项评分；列最低两项和具体改法，先报告，再按指定问题修改。
- 导出：从同一规范化 JSON、deck.json 与设计令牌生成原生 chart PPTX；提供逐页核对与桌面编辑验收记录，缺项如实写待验收。

## QA 与变更

QA：检查项 / 页与对象 / 预期 / 实际 / 证据文件 / 环境 / 检查人 / 日期 / 通过、失败或待验收 / 修复与复查。

变更：issue_id / slide、chart 或 record / 描述 / 阻断、严重或一般 / 原值或原文 / 新值或新文 / 依据 / 负责人 / 复核与批准 / 重建与复查。

迁移表：旧元素｜复用或替换｜新项目依据/许可｜新资产或数据｜影响页面｜样张确认状态。旧市场数据和来源不能直接迁移为新市场事实。

## 交付结构

项目根目录包含 brief.md、outline.csv（或在线表链接）、sources.csv、chart_data.csv/xlsx、design-tokens.json、deck.json、index.html、styles.css、app.js、data/、assets/、必要的 vendor/、PPTX 构建代码及依赖锁、presentation.pptx、QA.md、变更记录和 README.md；按用户要求增加 PDF/预览。

data/data.json 是规范化与编辑主版本；原始证据只读留在授权位置，source_id 关联。README 提供实际测试过的启动、编辑、保存/导入、重建、PPTX 回流说明，以及网络/离线依赖和限制。对旧 data.json/theme.json 输入保留映射兼容，不维护冲突副本。
