# 储能项目风控平台

BESS (Battery Energy Storage System) Project Risk Control Platform

上海电气日本工程株式会社内部工具，用于标准化储能项目签约前/开工前的风险检查管理。

## 核心功能

- **40 项标准检查清单**：20 项签约前 + 20 项开工前，基于实际项目经验提取
- **强制文件验证**：每项检查必须上传证明文件（PDF/JPG/PNG/DOCX）才能标记完成
- **红黄绿灯仪表盘**：一眼看到所有项目的风险状态，高风险项目置顶
- **风险自动暴露**：超期未完成项自动变红灯，附带风险说明

## 为什么做这个

一宮市 2MW/8MWh 储能项目因开工条件（农转手续、并网确认书）信息偏差导致延期近一年。开发人员口头汇报与实际文件存在偏差，领导无法及时发现问题。本平台通过系统化的检查清单和文件强制上传机制，在签约前就暴露风险。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| ORM | Prisma 5 |
| 数据库 | PostgreSQL 16 |
| CSS | Tailwind CSS 4 |
| 认证 | iron-session |
| 部署 | Docker + docker-compose |

## 快速开始

### 前置要求

- Docker & Docker Compose
- Node.js 20+（仅本地开发）

### Docker 部署（推荐）

```bash
# 克隆仓库
git clone https://github.com/charles283x-cloud/bess-risk-platform-claude-opus-20260324.git
cd bess-risk-platform-claude-opus-20260324

# 启动（首次会自动构建镜像、创建数据库、运行迁移）
docker compose up -d

# 导入检查清单模板（首次部署后执行一次）
docker compose exec -T db psql -U bess -d bess_risk < prisma/seed.sql
```

访问 `http://localhost:3000`，默认账号：
- 管理员：`admin` / `admin123`
- 查看者：`viewer` / `viewer123`

### 本地开发

```bash
npm install
npx prisma generate

# 需要本地 PostgreSQL，配置 .env（参考 .env.example）
npx prisma migrate dev
npm run dev
```

## 项目结构

```
src/
├── app/
│   ├── login/           # 登录页
│   ├── dashboard/       # 仪表盘（红黄绿灯总览）
│   ├── projects/        # 项目管理（新建、详情、检查清单）
│   ├── templates/       # 检查清单模板管理
│   └── api/             # 后端 API
├── lib/
│   ├── risk.ts          # 红黄绿灯计算逻辑（核心业务规则）
│   ├── auth.ts          # 认证
│   ├── db.ts            # 数据库连接
│   └── files.ts         # 文件存储抽象层
└── components/          # UI 组件
```

## 红黄绿灯规则

| 优先级 | 条件 | 状态 |
|--------|------|------|
| 1 | 项目标记为高风险 | 🔴 红灯 |
| 2 | 有检查项超过截止日期且未完成 | 🔴 红灯 |
| 3 | 有未完成项（未超期或未设截止日期） | 🟡 黄灯 |
| 4 | 所有检查项已完成且有文件 | 🟢 绿灯 |
| 5 | 没有检查项 | 🟡 黄灯 |

## 检查清单模板

基于栃木大田原系統蓄電所实际项目收资清单提取，涵盖：

**签约前（20项）**：项目主体、土地权属、都市计划、建筑确认、消防、环境、并网（接続検討、契約申込、工事负担金等）、居民协调、合规清单

**开工前（20项）**：基础数据统一、土地落实、地勘、电网接口、主变阻抗、行政审批、消防离隔、施工准备、合同边界、NTP条件

## API

详见 [项目交接文档](https://github.com/charles283x-cloud/bess-risk-platform-claude-opus-20260324/wiki) 或本地 `~/Desktop/储能项目风控平台/项目交接文档.md`

## License

Private — 上海电气日本工程株式会社内部使用

---

Built with [Claude Code](https://claude.ai/claude-code) (Claude Opus 4.6) on 2026-03-24
