# 安全策略 / Security policy

## 支持的版本 / Supported versions

只维护最新发布的版本（GitHub Pages 上的线上版本即最新版）。
Only the latest release is maintained; the GitHub Pages site always serves it.

## 报告漏洞 / Reporting a vulnerability

请**不要**公开提交 issue。使用 GitHub 的私下报告：
Please **do not** open a public issue. Use GitHub's private reporting:

<https://github.com/leenlbma/freebody/security/advisories/new>

请说明影响范围、复现步骤与浏览器版本；不要附带真实健康记录或 API Key。维护者会在 7 天内确认收到，修复后在 CHANGELOG 与 release 中致谢（如你愿意）。
Describe the impact, steps to reproduce and browser version, without real health records or API keys. We acknowledge reports within 7 days and credit reporters in the changelog and release notes if they wish.

## 范围 / Scope

FreeBody 是纯前端应用，没有服务器与账号。重点关注：
FreeBody is a front-end-only app with no server or accounts. We especially care about:

- 导入包或 `#import=` 链接导致的脚本注入（XSS）或数据被意外覆盖 / script injection or unexpected overwrites via import packs or links;
- API Key 被写入备份、日志或发送到用户所选服务商之外的地址 / the API key leaking into backups, logs or any host other than the provider the user chose;
- Service Worker 缓存导致加载被篡改或过期的代码 / service-worker caching that serves tampered or stale code;
- 任何未经用户操作的网络请求 / any network request the user did not initiate.

数据保存在用户自己的浏览器中，设备本身被他人控制（例如共用设备、恶意浏览器扩展）不在本项目可以防护的范围内。
Data lives in the user's own browser. A compromised device (shared device, malicious extension) is outside what this project can defend against.
