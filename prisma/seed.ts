import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const preSigningTemplates = [
  { name: "项目主体登记/授权", category: "permits", riskDescription: "无登记无法签署有效合同", sortOrder: 1 },
  { name: "土地权属与使用权", category: "land", riskDescription: "未落实将导致开工无法启动", sortOrder: 2 },
  { name: "都市计划/用途地域确认", category: "permits", riskDescription: "用途不符可能无法建设", sortOrder: 3 },
  { name: "开发许可/造成/盛土规制法", category: "permits", riskDescription: "工程和工期直接受影响", sortOrder: 4 },
  { name: "建筑确认/建筑基准法手续", category: "permits", riskDescription: "无确认不得开工", sortOrder: 5 },
  { name: "消防法危险物判定", category: "environment", riskDescription: "影响总平布置和消防系统费用", sortOrder: 6 },
  { name: "消防设计审查/备案", category: "environment", riskDescription: "未审查不得开工", sortOrder: 7 },
  { name: "环保/噪音/振动/景观协商", category: "environment", riskDescription: "可能限制施工时间和方式", sortOrder: 8 },
  { name: "农地相关手续（农转非）", category: "land", riskDescription: "农地转用审批周期长达6-12个月", sortOrder: 9 },
  { name: "森林/河川/砂防/道路占用等", category: "permits", riskDescription: "特殊限制条件需提前识别", sortOrder: 10 },
  { name: "土壌汚染/文化财/埋設物", category: "environment", riskDescription: "可能产生额外处理费用", sortOrder: 11 },
  { name: "电网接続検討回答", category: "grid", riskDescription: "无回答无法确定并网条件", sortOrder: 12 },
  { name: "发调/基本契約申込受理", category: "grid", riskDescription: "电网手续未推进则工期不可控", sortOrder: 13 },
  { name: "non-firm接入同意", category: "grid", riskDescription: "未签署可能影响项目收益模型", sortOrder: 14 },
  { name: "工事负担金契約", category: "grid", riskDescription: "金额和支付节点影响项目经济性", sortOrder: 15 },
  { name: "系统连系保証金缴纳", category: "grid", riskDescription: "未缴纳可能中止电网手续", sortOrder: 16 },
  { name: "送电/通信路由地役权", category: "grid", riskDescription: "路由不通将无法并网", sortOrder: 17 },
  { name: "地方政府/自治会/周边说明", category: "residents", riskDescription: "未取得同意可能导致现场无法施工", sortOrder: 18 },
  { name: "消防离隔落实到总平", category: "environment", riskDescription: "离隔不达标需重新设计布置", sortOrder: 19 },
  { name: "业主法务/当地顾问合规清单", category: "permits", riskDescription: "遗漏手续可能导致违法开工", sortOrder: 20 },
];

const preConstructionTemplates = [
  { name: "项目基础数据统一", category: "other", riskDescription: "名称/地址不一致导致图纸和合同引用混乱", sortOrder: 1 },
  { name: "项目主体与授权明确", category: "other", riskDescription: "签约/申请权限不明确", sortOrder: 2 },
  { name: "土地权属/使用权落实", category: "land", riskDescription: "无权属证明不能开工", sortOrder: 3 },
  { name: "场地边界与测量齐备", category: "land", riskDescription: "土建工程量无法锁定", sortOrder: 4 },
  { name: "地勘满足设计输入", category: "land", riskDescription: "基础设计只能暂估", sortOrder: 5 },
  { name: "接続検討回答已取得", category: "grid", riskDescription: "系统条件不明无法确定方案", sortOrder: 6 },
  { name: "契約申込持续推进", category: "grid", riskDescription: "电网手续停滞则工期延误", sortOrder: 7 },
  { name: "non-firm条件接受", category: "grid", riskDescription: "运营条件未确认影响设计", sortOrder: 8 },
  { name: "电网二次接口纳入设计", category: "grid", riskDescription: "保护/通信设计无法固化", sortOrder: 9 },
  { name: "主变阻抗要求落实", category: "other", riskDescription: "设备选型和报价无法固化", sortOrder: 10 },
  { name: "損害実費契約已签", category: "grid", riskDescription: "电网前置合同未完成", sortOrder: 11 },
  { name: "保証金/负担金安排明确", category: "grid", riskDescription: "资金计划不明影响项目推进", sortOrder: 12 },
  { name: "行政审批路径明确", category: "permits", riskDescription: "工程进度无法确定", sortOrder: 13 },
  { name: "消防适用与离隔明确", category: "environment", riskDescription: "可能导致仕样变更和布局变更", sortOrder: 14 },
  { name: "施工准备条件落实", category: "other", riskDescription: "临水临电/道路未落实不能进场", sortOrder: 15 },
  { name: "地权/地元协调可控", category: "residents", riskDescription: "直接影响工期稳定性", sortOrder: 16 },
  { name: "停电窗口限制纳入进度", category: "other", riskDescription: "夏季/农耕期限制未考虑导致延期", sortOrder: 17 },
  { name: "合同与范围边界明确", category: "other", riskDescription: "边界不清导致重复或遗漏", sortOrder: 18 },
  { name: "技术方案达到报价深度", category: "other", riskDescription: "方案不足导致报价偏差大", sortOrder: 19 },
  { name: "NTP/付款与保险条件明确", category: "other", riskDescription: "合同性开工条件未满足", sortOrder: 20 },
];

async function main() {
  console.log("Seeding checklist templates...");

  for (const t of preSigningTemplates) {
    await prisma.checklistTemplate.upsert({
      where: { name_phase: { name: t.name, phase: "pre_signing" } },
      update: { ...t, phase: "pre_signing" },
      create: { ...t, phase: "pre_signing", defaultDays: 30 },
    });
  }

  for (const t of preConstructionTemplates) {
    await prisma.checklistTemplate.upsert({
      where: { name_phase: { name: t.name, phase: "pre_construction" } },
      update: { ...t, phase: "pre_construction" },
      create: { ...t, phase: "pre_construction", defaultDays: 30 },
    });
  }

  console.log(`Seeded ${preSigningTemplates.length} pre-signing + ${preConstructionTemplates.length} pre-construction templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
