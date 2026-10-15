# 项目模板

以下为空白字段，按任务填写；不是商业事实或审批记录。

## Brief

项目 / 市场与品牌 / 受众与决策 / 语言 / 页数与时长 / 会议日期 / 数据截止日 / 披露范围 / 所需交付 / 目标 PowerPoint 版本与 OS / 负责人 / 取数人 / 另一位复核人 / 业务批准人 / 设计与 QA / 缺口与截止日。

## 单页卡

slide_id / 业务问题 / 结论标题 / 支持点 / record_ids / source_ids / chart_id / 图型 / 指标与单位 / 时期与实际或预测 / 分类排序 / 轴范围 / 显示精度 / 版式或模板页 ID / 资产 / 来源脚注 / 限制 / 备注 / 数据状态 / 业务批准。

## QA 记录

检查项 / 页与对象 / 预期 / 实际 / 证据文件 / 执行环境 / 检查人 / 日期 / 通过、失败或待验收 / 修复与复查结果。

## 问题与变更

issue_id / slide、chart 或 record / 描述 / 阻断、严重或一般 / 原值或原文 / 新值或新文 / 依据 / 负责人 / 截止日 / 复核人 / 批准人 / 重建与复查结果。

## 交付结构

```text
project/
  brief.md
  sources.csv
  data.json
  deck.json
  theme.json
  assets/
  html/
  build/             # 构建代码和依赖锁
  output/            # PPTX、PDF 与预览
  qa.md
  changelog.md
  README.md          # 实际运行、保存、重建及回流说明
```

研究阶段只建实际需要的文件。证据原件按授权范围另存，sources.csv 记录定位。草稿使用可辨识标记，正式输出不包含 demo 或待核验值。
