# business-research-deck

为市场研究、国家比较和品牌合作提案提供证据核验、品牌与国家视觉设计、交互式 HTML 及原生可编辑 PPTX 交付流程。

版本 2.0.0：逐页大纲 → 数据与柱条图规格 → 三套真实内容风格预览 → 设计令牌与两页样张 → 确认后扩展全稿 → 定点修订及双端验收。图表轴默认 20pt 加粗斜体，数值标签 16/18pt 加粗；数字显示整数或一位小数，原始精度保持不变。

## 使用

把仓库目录安装为 `~/.codex/skills/business-research-deck`，下一轮对话即可发现。

示例：

> 使用 $business-research-deck，为某餐饮品牌的市场进入提案建立证据表和逐页大纲。资料在指定目录；受众为业务负责人，语言为中文。先列出证据缺口，不使用未核实数字。

> 使用 $business-research-deck，根据核验过的 chart_data.csv、sources.csv、品牌指南和授权照片，先给出三套视觉预览；选定后制作市场比较与品牌排行两页交互样张，确认后扩展全稿并生成原生 PPTX。

HTML 采用固定 1920×1080、16:9 舞台，支持切页、克制的入场动画、文字与图表数据编辑、JSON 保存/导入及演示模式。样张确认要求沿用已有授权，用户已明确选定设计并授权全稿时不重复确认。

## 可视化看板

仓库现包含 [AI 演示工作台](dashboard/README.md)：IBG 风格的本地工作区，默认空白项目，可登记来源、导入 CSV、编辑柱条图与主题、保存项目 JSON，并下载给 Codex 的任务说明。

在本仓库根目录运行：

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8000/dashboard/`。无需安装前端依赖或配置 API 密钥。详细步骤见 [看板使用说明](dashboard/README.md)。实际 AI 制作与原生 PPTX 生成由 Codex 执行；看板中的 HTML 草稿下载不是正式 PPTX 导出。项目数据仅在浏览器缓存，务必另存 JSON；不将业务文件提交到公开仓库。

## 文件

- `SKILL.md`：触发范围和工作流程。
- `references/sop.md`：供人使用的精简 SOP。
- `references/evidence.md`：字段、计算和复核规则。
- `references/visual-design.md`：品牌与国家分析、三方向预览、设计令牌、样张与迁移。
- `references/interactive-html.md`：固定舞台、播放/动画、编辑保存、打包与功能检查。
- `references/production.md`：共源数据、PPTX 映射与交付验收。
- `references/case-study.md`：参考稿逐页方法及第 4 页示例。
- `references/templates.md`：Brief、单页卡和 QA 模板。

设计与交互方法参考 [Frontend Slides](https://github.com/zarazhangrui/frontend-slides)，按商业 SOP 重写组织；未捆绑上游源码。默认交付多文件维护包，支持 SVG/DOM 或 ECharts，不强制单文件或零依赖。HTML 编辑不代表 PPTX 原生可编辑，后者使用同一数据独立生成与验收。

该 skill 提供工作方法，dashboard 提供浏览器预览与项目交接，不自带生产级 PPTX 渲染器、数据库权限或 PowerPoint 验收环境。制作任务使用当前环境中的文档、演示工具；缺少能力时按实际完成情况报告。写作规则已内置，无需另装 Humanizer。
