# V0.1 验证记录

验证环境：Node.js 24.19.0、npm 11.9.0，Linux 云环境，系统 Chromium。

| 检查 | 实际结果 |
| --- | --- |
| `npm ci --cache /tmp/zhuan-npm-cache --no-audit --no-fund` | 成功；从锁文件重装后再次测试与构建 |
| `npm test` | 2 个文件、11 项测试通过，无跳过 |
| `npm run build` | TypeScript 校验通过，Vite 生产构建通过，生成 manifest 和 Service Worker，预缓存 9 项资源 |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e` | 桌面 1440px、手机 390px 共 2 项通过 |
| 真实浏览器学习流程 | 课程标记、综合题答错、复习答对、条件反转、逐项解析通过 |
| 真实浏览器数据流程 | JSON 导出、清空、导入确认、恢复、刷新持久化通过 |
| PWA 离线 | Service Worker 实际控制页面，断网刷新、打开课程、完成离线作答并保存通过 |
| 页面异常与布局 | 端到端流程无 pageerror；桌面/手机无页面横向溢出；已人工查看截图 |
| `npm audit --audit-level=high` | 0 个已知漏洞（含开发依赖；审计结果会随公告变化） |
| Git | 功能分支已提交并推送；GitHub GraphQL 和 REST 创建 PR 请求均返回 Forbidden |

## 尚未验证的范围

- Windows 和安卓真机安装、操作系统重启后的行为；Chromium 手机尺寸测试不等于真机认证。
- 公网 HTTPS 部署和云环境快照发布后的新任务恢复；当前预览为云环境内部服务。
- 完整四科题库、正式考试评分、Markdown 批量导入、后台审核工作台均不在 V0.1 演示范围内。

## 手动创建 PR

打开仓库的 Compare & pull request，选择 base `main`、compare `feat/zhuan-v0.1`。标题可使用“创建注安深度学习系统 V0.1：离线课程、训练与复习闭环”，说明可复制同目录的 `PULL_REQUEST.md`。代码已在远程分支，无需重新上传文件。
