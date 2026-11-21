# 工科数学分析题库

浏览题库：https://anselmbosserman337-ctrl.github.io/goodnotes-math-practice/

截至 2026-11-21：307 组题目，其中 72 组定理或性质证明，原笔记共 292 页。
保留笔记顺序、页码、原页截图和 LaTeX 公式，支持搜索、按页筛选与证明展开。

## 每三天检测

GitHub Actions 在台北时间 10:23 检查，以 2026-11-21 为起点，每隔三个日历日执行，下一次为 11 月 24 日；GitHub 排队可能造成延迟。
手动运行：Actions → Check Goodnotes every three days → Run workflow。

查看 `monitor/报告.md` 或工作流运行摘要。
`monitor/status.json` 中的 `pending_since_transcription` 会持续保留相对当前题库版本的变化。
`latest.json` 是最近一次检测基线；`reviewed.json` 只有完成识图与题库更新后才应更新。

检查新增、删除、重新排序及逐页版本修改。若只发生文稿级版本变化，仍会标记需要复核，不能保证对应正文变化。
使用分享页实际调用的公开接口；不登录，不保存接口返回的临时 token，不调用付费模型。
此接口没有官方稳定性保证；分享关闭、接口变化或网络失败会使工作流失败并保留原基线。
**自动检测不会自动识图、誊写或改写题库。** 后续可将变化页交给 Codex 整理。

GitHub 可能暂停长期无活动的公开仓库计划任务；可在 Actions 页面查看和重新启用。

## 网站发布

`site-part-*.zip` 为完整静态资源的分包。Pages 工作流解压后统一发布；每个分包低于 GitHub 网页上传大小限制。
无需安装前端依赖。修改题库后重新打包全部分包，再提交即可发布。
题目及笔记内容属于笔记作者。
