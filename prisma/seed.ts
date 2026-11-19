import { PrismaClient, EmployeeStatus } from "@prisma/client";
import { seedProductionEssentials } from "./seed-prod";

const prisma = new PrismaClient();

async function main() {
  // 1. Seed system essentials (roles, permissions, admin, coa, sequences)
  await seedProductionEssentials();

  if (process.env.SEED_DEMO_DATA === "false") {
    console.log("ℹ️  SEED_DEMO_DATA is set to 'false'. Skipping demo data seeding.");
    return;
  }

  console.log("🌱 Seeding development demo catalog and transactions...");

  const warehouse = await prisma.warehouse.findUnique({
    where: { code: "WH-MAIN" },
  });

  if (!warehouse) {
    throw new Error("Default warehouse WH-MAIN not found");
  }

  // ----------------------------------------------------
  // Categories & Products
  // ----------------------------------------------------
  const categoriesData = [
    { name: "إلكترونيات وملحقات", description: "أجهزة إلكترونية وملحقات حاسوب وشواحن" },
    { name: "أدوات وقرطاسية مكتبية", description: "ورق، أقلام، وملفات حفظ ومستلزمات مكتبية" },
    { name: "مستلزمات التعبئة والتغليف", description: "كراتين، أشرطة لاصقة، وبلاستيك فقاعي" },
    { name: "شبكات وكابلات", description: "كابلات إنترنت، موصلات، ومحولات" },
  ];

  const catIds: Record<string, string> = {};
  for (const cat of categoriesData) {
    let catRecord = await prisma.category.findFirst({ where: { name: cat.name } });
    if (!catRecord) {
      catRecord = await prisma.category.create({ data: cat });
    }
    catIds[cat.name] = catRecord.id;
  }

  const defaultUnit = await prisma.unit.findFirst();
  const unitId = defaultUnit?.id || "";

  const rawProducts = [
    // Electronics
    { sku: "EL-001", name: "شاحن هاتف سريع 65W Type-C", cat: "إلكترونيات وملحقات", unitId, cost: 250, price: 390, stock: 150 },
    { sku: "EL-002", name: "كابل بيانات مجدول Type-C to Type-C 1m", cat: "إلكترونيات وملحقات", unitId, cost: 45, price: 95, stock: 300 },
    { sku: "EL-003", name: "باور بانك 20,000 مللي أمبير بقوة 22.5W", cat: "إلكترونيات وملحقات", unitId, cost: 450, price: 720, stock: 80 },
    { sku: "EL-004", name: "فأرة لاسلكية قابلة للشحن مريحة لليد", cat: "إلكترونيات وملحقات", unitId, cost: 120, price: 210, stock: 120 },
    { sku: "EL-005", name: "لوحة مفاتيح ميكانيكية بإضاءة RGB", cat: "إلكترونيات وملحقات", unitId, cost: 550, price: 850, stock: 45 },
    { sku: "EL-006", name: "سماعة رأس بلوتوث عازلة للضوضاء", cat: "إلكترونيات وملحقات", unitId, cost: 650, price: 1100, stock: 60 },

    // Stationery
    { sku: "ST-001", name: "ورق تصوير A4 وزن 80 جرام (كرتونة 5 رزم)", cat: "أدوات وقرطاسية مكتبية", unitId, cost: 680, price: 840, stock: 100 },
    { sku: "ST-002", name: "طقم أقلام حبر جاف أزرق (علبة 50 قلم)", cat: "أدوات وقرطاسية مكتبية", unitId, cost: 110, price: 175, stock: 200 },
    { sku: "ST-003", name: "ملف حفظ وثائق بلاستيكي بحلقات A4", cat: "أدوات وقرطاسية مكتبية", unitId, cost: 25, price: 45, stock: 400 },
    { sku: "ST-004", name: "دباسة مكتبية ثقيلة مع علبة دبابيس", cat: "أدوات وقرطاسية مكتبية", unitId, cost: 85, price: 140, stock: 90 },
    { sku: "ST-005", name: "دفتر ملاحظات سلك مقاس A5 مسطر 100 ورقة", cat: "أدوات وقرطاسية مكتبية", unitId, cost: 35, price: 65, stock: 250 },

    // Packaging
    { sku: "PK-001", name: "كرتون شحن مقوى مقاس 40x30x25 سم", cat: "مستلزمات التعبئة والتغليف", unitId, cost: 18, price: 32, stock: 600 },
    { sku: "PK-002", name: "كرتون شحن صغير 25x20x15 سم", cat: "مستلزمات التعبئة والتغليف", unitId, cost: 12, price: 22, stock: 800 },
    { sku: "PK-003", name: "شريط لاصق شفاف عريض 48 ملم x 100 ياردة", cat: "مستلزمات التعبئة والتغليف", unitId, cost: 22, price: 40, stock: 500 },
    { sku: "PK-004", name: "لفة بلاستيك فقاعي لحماية الشحنات 50 سم x 50 م", cat: "مستلزمات التعبئة والتغليف", unitId, cost: 160, price: 260, stock: 50 },
    { sku: "PK-005", name: "سترتش فيلم تغليف صناعي 50 سم 2.5 كجم", cat: "مستلزمات التعبئة والتغليف", unitId, cost: 190, price: 290, stock: 75 },

    // Networking
    { sku: "NT-001", name: "كابل شبكة Cat6 نحاس خالص بطول 305 متر", cat: "شبكات وكابلات", unitId, cost: 1400, price: 2100, stock: 30 },
    { sku: "NT-002", name: "باتش كورد شبكة Cat6 طول 3 أمتار رمادي", cat: "شبكات وكابلات", unitId, cost: 28, price: 55, stock: 220 },
    { sku: "NT-003", name: "سويتش شبكة 8 منافذ Gigabit معدني", cat: "شبكات وكابلات", unitId, cost: 380, price: 590, stock: 40 },
    { sku: "NT-004", name: "كونكتور شبكة RJ45 كيس 100 حبة", cat: "شبكات وكابلات", unitId, cost: 65, price: 110, stock: 150 },
  ];

  for (const item of rawProducts) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {},
      create: {
        sku: item.sku,
        name: item.name,
        categoryId: catIds[item.cat],
        unitId: item.unitId,
        costPrice: item.cost,
        salePrice: item.price,
        taxRate: 14.0,
        reorderLevel: 15,
        isActive: true,
        trackStock: true,
      },
    });

    await prisma.stockLevel.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        warehouseId: warehouse.id,
        quantity: item.stock,
      },
    });
  }

  // ----------------------------------------------------
  // Customers
  // ----------------------------------------------------
  const customersData = [
    { code: "CUST-001", name: "مؤسسة الأهرام للتوزيع والخدمات", phone: "+20 10 1111 2222", email: "orders@ahram-dist.com", address: "وسط البلد، القاهرة", creditLimit: 150000, balance: 12500 },
    { code: "CUST-002", name: "شركة النيل للتجارة العامة والتوريدات", phone: "+20 11 2222 3333", email: "nile.trade@gmail.com", address: "الدقي، الجيزة", creditLimit: 200000, balance: 45000 },
    { code: "CUST-003", name: "مكتبة الشرق الأوسط الحديثة", phone: "+20 12 3333 4444", email: "info@me-stationery.com", address: "مدينة نصر، القاهرة", creditLimit: 75000, balance: 8200 },
    { code: "CUST-004", name: "شركة سمارت هوم للحلول الرقمية", phone: "+20 10 4444 5555", email: "sales@smarthome-eg.com", address: "المعادي، القاهرة", creditLimit: 120000, balance: 0 },
    { code: "CUST-005", name: "مؤسسة الإسكندرية للتجارة والشحن", phone: "+20 12 5555 6666", email: "alex.trade@outlook.com", address: "سموحة، الإسكندرية", creditLimit: 180000, balance: 28400 },
    { code: "CUST-006", name: "مركز الأمل لخدمات الكمبيوتر والشبكات", phone: "+20 10 6666 7777", email: "alamal.comp@yahoo.com", address: "المنصورة، الدقهلية", creditLimit: 60000, balance: 5100 },
    { code: "CUST-007", name: "شركة الدلتا للتوزيع واللوجستيات", phone: "+20 11 7777 8888", email: "supply@delta-dist.com", address: "طنطا، الغربية", creditLimit: 250000, balance: 64000 },
    { code: "CUST-008", name: "متجر تكنو سيتي للإلكترونيات", phone: "+20 10 8888 9999", email: "techno.cairo@gmail.com", address: "شبرا، القاهرة", creditLimit: 90000, balance: 15300 },
    { code: "CUST-009", name: "مؤسسة الفرسان للمقاولات والتوريدات", phone: "+20 12 9999 0000", email: "alforsan.supply@gmail.com", address: "السادس من أكتوبر، الجيزة", creditLimit: 300000, balance: 0 },
    { code: "CUST-010", name: "شركة المستقبل للحلول المكتبية المتكاملة", phone: "+20 10 0000 1111", email: "info@future-offices.com", address: "مصر الجديدة، القاهرة", creditLimit: 100000, balance: 19800 },
  ];

  for (const c of customersData) {
    await prisma.customer.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  // ----------------------------------------------------
  // Suppliers
  // ----------------------------------------------------
  const suppliersData = [
    { code: "SUPP-001", name: "الشركة الدولية للاستيراد والتوزيع", phone: "+20 2 3344 5566", email: "import@global-trading.com", address: "المنطقة الحرة، الإسكندرية", balance: 54000 },
    { code: "SUPP-002", name: "مصنع الوفاق للصناعات الورقية والتعبئة", phone: "+20 15 1111 2222", email: "sales@wefaq-paper.com", address: "العاشر من رمضان، الشرقية", balance: 32000 },
    { code: "SUPP-003", name: "شركة ميجا تك للمعدات الإلكترونية", phone: "+20 2 2455 6677", email: "supply@megatech-dist.com", address: "العبور، القليوبية", balance: 88000 },
    { code: "SUPP-004", name: "مؤسسة كابلات الشرق للأدوات الكهربائية والشبكات", phone: "+20 2 2788 9900", email: "orders@orientcables.com", address: "حلوان، القاهرة", balance: 15000 },
    { code: "SUPP-005", name: "شركة النور للمستلزمات البلاستيكية والتغليف", phone: "+20 10 5544 3322", email: "info@alnoor-plastic.com", address: "السادات، المنوفية", balance: 0 },
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  // ----------------------------------------------------
  // Employees
  // ----------------------------------------------------
  const depts = await prisma.department.findMany();
  const deptMap = Object.fromEntries(depts.map((d) => [d.code, d.id]));

  const positions = await prisma.position.findMany();
  const posMap = Object.fromEntries(positions.map((p) => [p.code, p.id]));

  const employeesData = [
    { code: "EMP-001", name: "محمود حسن الشريف", nationalId: "28501010101111", email: "m.hassan@masar.local", phone: "+20 10 9876 5432", hireDate: new Date("2021-01-15"), dept: "MGMT", pos: "GM", salary: 35000 },
    { code: "EMP-002", name: "سارة فاروق العدلي", nationalId: "29002020202222", email: "s.adel@masar.local", phone: "+20 11 8765 4321", hireDate: new Date("2022-03-01"), dept: "FIN", pos: "FM", salary: 26000 },
    { code: "EMP-003", name: "أحمد جمال الدين", nationalId: "29203030303333", email: "a.gamal@masar.local", phone: "+20 12 7654 3210", hireDate: new Date("2023-05-10"), dept: "FIN", pos: "ACC", salary: 14000 },
    { code: "EMP-004", name: "كريم عبد الرحمن", nationalId: "28804040404444", email: "k.abdelrahman@masar.local", phone: "+20 10 6543 2109", hireDate: new Date("2021-08-20"), dept: "SALES", pos: "SM", salary: 22000 },
    { code: "EMP-005", name: "طارق زياد منصور", nationalId: "29505050505555", email: "t.ziad@masar.local", phone: "+20 11 5432 1098", hireDate: new Date("2023-09-01"), dept: "SALES", pos: "REP", salary: 11000 },
    { code: "EMP-006", name: "ياسر إبراهيم حجازي", nationalId: "28706060606666", email: "y.hegazi@masar.local", phone: "+20 12 4321 0987", hireDate: new Date("2022-01-10"), dept: "LOG", pos: "WH_MGR", salary: 18000 },
    { code: "EMP-007", name: "مصطفى كمال النجار", nationalId: "29407070707777", email: "m.kamal@masar.local", phone: "+20 10 3210 9876", hireDate: new Date("2023-02-15"), dept: "LOG", pos: "WH_KPR", salary: 9500 },
    { code: "EMP-008", name: "سامح ربيع الجندي", nationalId: "29108080808888", email: "s.elgendy@masar.local", phone: "+20 11 2109 8765", hireDate: new Date("2023-06-01"), dept: "LOG", pos: "LOG_SUP", salary: 10500 },
  ];

  for (const emp of employeesData) {
    if (deptMap[emp.dept] && posMap[emp.pos]) {
      await prisma.employee.upsert({
        where: { code: emp.code },
        update: {},
        create: {
          code: emp.code,
          fullName: emp.name,
          nationalId: emp.nationalId,
          phone: emp.phone,
          email: emp.email,
          hireDate: emp.hireDate,
          departmentId: deptMap[emp.dept],
          positionId: posMap[emp.pos],
          baseSalary: emp.salary,
          status: EmployeeStatus.ACTIVE,
        },
      });
    }
  }

  console.log("✅ Development demo catalog seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed with error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
