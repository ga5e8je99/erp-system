import { PrismaClient, AccountType, EmployeeStatus } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Masar ERP database seeding...");

  // ----------------------------------------------------
  // 1. Permissions List
  // ----------------------------------------------------
  console.log("Creating permissions...");
  const permissionsData = [
    // Auth & Users
    { key: "auth.user.manage", module: "auth", description: "Manage users and accounts" },
    { key: "auth.role.manage", module: "auth", description: "Manage roles and permissions" },
    { key: "auth.audit.view", module: "auth", description: "View audit logs" },

    // Company Settings
    { key: "company.settings.manage", module: "settings", description: "Manage company settings and configuration" },

    // Inventory
    { key: "inventory.category.manage", module: "inventory", description: "Manage product categories" },
    { key: "inventory.unit.manage", module: "inventory", description: "Manage measurement units" },
    { key: "inventory.product.view", module: "inventory", description: "View products and catalog" },
    { key: "inventory.product.create", module: "inventory", description: "Create new products" },
    { key: "inventory.product.edit", module: "inventory", description: "Update existing products" },
    { key: "inventory.product.delete", module: "inventory", description: "Delete products" },
    { key: "inventory.warehouse.manage", module: "inventory", description: "Manage warehouses and locations" },
    { key: "inventory.stock.adjust", module: "inventory", description: "Perform stock adjustments" },
    { key: "inventory.stock.transfer", module: "inventory", description: "Transfer stock between warehouses" },

    // Sales
    { key: "sales.customer.view", module: "sales", description: "View customer profiles and list" },
    { key: "sales.customer.manage", module: "sales", description: "Create and edit customer records" },
    { key: "sales.quotation.view", module: "sales", description: "View sales quotations" },
    { key: "sales.quotation.manage", module: "sales", description: "Create and update quotations" },
    { key: "sales.order.view", module: "sales", description: "View sales orders" },
    { key: "sales.order.manage", module: "sales", description: "Create and confirm sales orders" },
    { key: "sales.invoice.view", module: "sales", description: "View sales invoices" },
    { key: "sales.invoice.create", module: "sales", description: "Create sales invoices" },
    { key: "sales.invoice.post", module: "sales", description: "Post and finalize sales invoices" },
    { key: "sales.payment.create", module: "sales", description: "Record customer payments" },
    { key: "sales.return.manage", module: "sales", description: "Process sales returns" },

    // Purchasing
    { key: "purchasing.supplier.view", module: "purchasing", description: "View supplier profiles" },
    { key: "purchasing.supplier.manage", module: "purchasing", description: "Create and edit suppliers" },
    { key: "purchasing.order.view", module: "purchasing", description: "View purchase orders" },
    { key: "purchasing.order.manage", module: "purchasing", description: "Create and manage purchase orders" },
    { key: "purchasing.receipt.view", module: "purchasing", description: "View goods receipts" },
    { key: "purchasing.receipt.create", module: "purchasing", description: "Record goods receipts" },
    { key: "purchasing.invoice.view", module: "purchasing", description: "View purchase invoices" },
    { key: "purchasing.invoice.create", module: "purchasing", description: "Create purchase bills" },
    { key: "purchasing.invoice.post", module: "purchasing", description: "Post and finalize purchase invoices" },
    { key: "purchasing.payment.view", module: "purchasing", description: "View supplier payments" },
    { key: "purchasing.payment.create", module: "purchasing", description: "Record payments to suppliers" },
    { key: "purchasing.return.manage", module: "purchasing", description: "Process purchase returns" },

    // Accounting
    { key: "accounting.account.view", module: "accounting", description: "View chart of accounts" },
    { key: "accounting.account.manage", module: "accounting", description: "Create and modify accounts" },
    { key: "accounting.journal.view", module: "accounting", description: "View journal entries" },
    { key: "accounting.journal.create", module: "accounting", description: "Create draft journal entries" },
    { key: "accounting.journal.post", module: "accounting", description: "Post journal entries to ledger" },
    { key: "accounting.period.manage", module: "accounting", description: "Manage fiscal periods" },
    { key: "accounting.expense.manage", module: "accounting", description: "Record and manage expenses" },

    // HR
    { key: "hr.department.manage", module: "hr", description: "Manage organizational departments" },
    { key: "hr.position.manage", module: "hr", description: "Manage employee job positions" },
    { key: "hr.employee.view", module: "hr", description: "View employee profiles" },
    { key: "hr.employee.manage", module: "hr", description: "Create, update and manage employees" },
    { key: "hr.attendance.manage", module: "hr", description: "Record employee attendance" },
    { key: "hr.leave.manage", module: "hr", description: "Process leave requests" },
    { key: "hr.payroll.manage", module: "hr", description: "Process and run monthly payroll" },
    { key: "hr.salary.view", module: "hr", description: "View sensitive employee salary details" },

    // Reports
    { key: "reports.sales.view", module: "reports", description: "View sales analytics and reports" },
    { key: "reports.purchases.view", module: "reports", description: "View purchase analytics and reports" },
    { key: "reports.inventory.view", module: "reports", description: "View inventory valuation and movement reports" },
    { key: "reports.financial.view", module: "reports", description: "View income statements and balance sheets" },
  ];

  const permissions = await Promise.all(
    permissionsData.map((perm) =>
      prisma.permission.upsert({
        where: { key: perm.key },
        update: { module: perm.module, description: perm.description },
        create: perm,
      })
    )
  );

  const permissionMap = new Map(permissions.map((p) => [p.key, p.id]));

  // ----------------------------------------------------
  // 2. Roles & Permissions Mapping
  // ----------------------------------------------------
  console.log("Creating default roles...");
  const rolesData = [
    {
      name: "Admin",
      description: "Full system administration with unrestricted access",
      permissions: permissions.map((p) => p.key),
    },
    {
      name: "Accountant",
      description: "Access to accounting, financial reporting, and invoice validation",
      permissions: [
        "accounting.account.view",
        "accounting.account.manage",
        "accounting.journal.view",
        "accounting.journal.create",
        "accounting.journal.post",
        "accounting.period.manage",
        "accounting.expense.manage",
        "sales.invoice.view",
        "sales.invoice.create",
        "sales.invoice.post",
        "sales.payment.create",
        "purchasing.invoice.create",
        "purchasing.payment.create",
        "reports.financial.view",
        "reports.sales.view",
        "reports.purchases.view",
      ],
    },
    {
      name: "Sales",
      description: "Customer management, quotations, sales orders, and invoices",
      permissions: [
        "sales.customer.view",
        "sales.customer.manage",
        "sales.quotation.view",
        "sales.quotation.manage",
        "sales.order.view",
        "sales.order.manage",
        "sales.invoice.view",
        "sales.invoice.create",
        "sales.payment.create",
        "sales.return.manage",
        "inventory.product.view",
        "reports.sales.view",
      ],
    },
    {
      name: "Warehouse",
      description: "Inventory stock monitoring, receipts, transfers, and adjustments",
      permissions: [
        "inventory.product.view",
        "inventory.stock.adjust",
        "inventory.stock.transfer",
        "purchasing.receipt.create",
        "purchasing.order.view",
        "reports.inventory.view",
      ],
    },
    {
      name: "HR",
      description: "Human resources, attendance, leave requests, and payroll",
      permissions: [
        "hr.department.manage",
        "hr.position.manage",
        "hr.employee.view",
        "hr.employee.manage",
        "hr.attendance.manage",
        "hr.leave.manage",
        "hr.payroll.manage",
        "hr.salary.view",
      ],
    },
    {
      name: "Viewer",
      description: "Read-only access to catalogs, customers, and standard reports",
      permissions: [
        "inventory.product.view",
        "sales.customer.view",
        "sales.quotation.view",
        "sales.order.view",
        "sales.invoice.view",
        "purchasing.supplier.view",
        "purchasing.order.view",
        "reports.sales.view",
      ],
    },
  ];

  const roleEntities: Record<string, { id: string; name: string }> = {};

  for (const roleDef of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: { description: roleDef.description },
      create: {
        name: roleDef.name,
        description: roleDef.description,
      },
    });

    roleEntities[roleDef.name] = role;

    // Connect default permissions safely without wiping custom permissions
    const rolePermRecords = roleDef.permissions
      .map((key) => permissionMap.get(key))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({
        roleId: role.id,
        permissionId,
      }));

    if (rolePermRecords.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermRecords,
        skipDuplicates: true,
      });
    }
  }

  // ----------------------------------------------------
  // 3. Admin User
  // ----------------------------------------------------
  console.log("Checking Admin user...");
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@masar.local" },
  });

  if (!existingAdmin) {
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "Admin@12345";
    const passwordHash = bcryptjs.hashSync(adminPassword, 10);

    const adminUser = await prisma.user.create({
      data: {
        name: "مدير النظام (Admin)",
        email: "admin@masar.local",
        passwordHash,
        roleId: roleEntities["Admin"].id,
        locale: "ar",
        isActive: true,
      },
    });

    console.log(`
  ========================================================================
  ⚠️  SECURITY NOTICE:
  Default administrator account created:
    Email:    ${adminUser.email}
    Password: ${adminPassword}
  PLEASE CHANGE THIS PASSWORD IMMEDIATELY UPON FIRST LOGIN!
  ========================================================================
    `);
  } else {
    console.log("ℹ️  Admin user already exists. Existing credentials preserved.");
  }

  // ----------------------------------------------------
  // 4. Company Settings
  // ----------------------------------------------------
  console.log("Configuring default company settings...");
  const existingSettings = await prisma.companySettings.findFirst();
  if (!existingSettings) {
    await prisma.companySettings.create({
      data: {
        name: "شركة مسار للتجارة والتوزيع ذ.م.م",
        taxNumber: "300123456789",
        phone: "+20 2 2345 6789",
        email: "info@masar-erp.local",
        address: "المنطقة الصناعية، التجمع الخامس، القاهرة، مصر",
        currency: "EGP",
        defaultTaxRate: 14.0,
        fiscalYearStart: 1,
        invoicePrefix: "INV",
        orderPrefix: "SO",
        poPrefix: "PO",
        receiptPrefix: "GR",
        returnPrefix: "RTN",
        paymentPrefix: "PAY",
        journalPrefix: "JRN",
        expensePrefix: "EXP",
      },
    });
  }

  // ----------------------------------------------------
  // 5. Units of Measurement
  // ----------------------------------------------------
  console.log("Creating measurement units...");
  const unitsData = [
    { name: "قطعة", symbol: "قطعة" },
    { name: "كرتونة", symbol: "كرتونة" },
    { name: "كيلوجرام", symbol: "كجم" },
    { name: "متر", symbol: "م" },
    { name: "لتر", symbol: "لتر" },
  ];

  const units: Record<string, string> = {};
  for (const u of unitsData) {
    let unitRecord = await prisma.unit.findFirst({ where: { name: u.name } });
    if (!unitRecord) {
      unitRecord = await prisma.unit.create({ data: u });
    }
    units[u.name] = unitRecord.id;
  }

  // ----------------------------------------------------
  // 6. Main Warehouse
  // ----------------------------------------------------
  console.log("Creating default warehouse...");
  const warehouse = await prisma.warehouse.upsert({
    where: { code: "WH-MAIN" },
    update: { isDefault: true },
    create: {
      name: "المخزن الرئيسي (Central Warehouse)",
      code: "WH-MAIN",
      address: "مستودع أ - المنطقة اللوجستية المركزية",
      isDefault: true,
    },
  });

  // ----------------------------------------------------
  // 7. Chart of Accounts (COA)
  // ----------------------------------------------------
  console.log("Building Chart of Accounts...");
  const coaData = [
    // 1000 - الأصول
    { code: "1000", name: "الأصول", type: "ASSET", isPostable: false, parentCode: null },
    { code: "1100", name: "الأصول المتداولة", type: "ASSET", isPostable: false, parentCode: "1000" },
    { code: "1110", name: "الخزينة الرئيسية (نقدية)", type: "ASSET", isPostable: true, parentCode: "1100" },
    { code: "1120", name: "الحساب البنكي التجاري", type: "ASSET", isPostable: true, parentCode: "1100" },
    { code: "1130", name: "حسابات العملاء (مدينون)", type: "ASSET", isPostable: true, parentCode: "1100" },
    { code: "1140", name: "مخزون البضائع للبيع", type: "ASSET", isPostable: true, parentCode: "1100" },
    { code: "1200", name: "الأصول الثابتة", type: "ASSET", isPostable: false, parentCode: "1000" },
    { code: "1210", name: "أثاث ومعدات مكتبية", type: "ASSET", isPostable: true, parentCode: "1200" },

    // 2000 - الالتزامات
    { code: "2000", name: "الالتزامات", type: "LIABILITY", isPostable: false, parentCode: null },
    { code: "2100", name: "الالتزامات المتداولة", type: "LIABILITY", isPostable: false, parentCode: "2000" },
    { code: "2110", name: "حسابات الموردين (دائنون)", type: "LIABILITY", isPostable: true, parentCode: "2100" },
    { code: "2120", name: "أمانات ضريبة القيمة المضافة", type: "LIABILITY", isPostable: true, parentCode: "2100" },
    { code: "2130", name: "مستحقات الرواتب والأجور", type: "LIABILITY", isPostable: true, parentCode: "2100" },

    // 3000 - حقوق الملكية
    { code: "3000", name: "حقوق الملكية", type: "EQUITY", isPostable: false, parentCode: null },
    { code: "3100", name: "رأس المال المدفوع", type: "EQUITY", isPostable: true, parentCode: "3000" },
    { code: "3200", name: "الأرباح والخسائر المرحلة", type: "EQUITY", isPostable: true, parentCode: "3000" },

    // 4000 - الإيرادات
    { code: "4000", name: "الإيرادات", type: "REVENUE", isPostable: false, parentCode: null },
    { code: "4100", name: "إيرادات مبيعات البضائع", type: "REVENUE", isPostable: true, parentCode: "4000" },
    { code: "4200", name: "إيرادات تشغيلية أخرى", type: "REVENUE", isPostable: true, parentCode: "4000" },

    // 5000 - تكلفة البضاعة المباعة
    { code: "5000", name: "تكلفة البضاعة المباعة", type: "EXPENSE", isPostable: false, parentCode: null },
    { code: "5100", name: "تكلفة المبيعات", type: "EXPENSE", isPostable: true, parentCode: "5000" },

    // 6000 - المصروفات التشغيلية
    { code: "6000", name: "المصروفات التشغيلية", type: "EXPENSE", isPostable: false, parentCode: null },
    { code: "6100", name: "مصروفات الرواتب والأجور", type: "EXPENSE", isPostable: true, parentCode: "6000" },
    { code: "6200", name: "إيجار المقر والمخازن", type: "EXPENSE", isPostable: true, parentCode: "6000" },
    { code: "6300", name: "مصروفات شحن وتوزيع", type: "EXPENSE", isPostable: true, parentCode: "6000" },
    { code: "6400", name: "مصروفات عمومية وإدارية", type: "EXPENSE", isPostable: true, parentCode: "6000" },
  ];

  const accountIds: Record<string, string> = {};
  for (const item of coaData) {
    const parentId = item.parentCode ? accountIds[item.parentCode] : null;
    const account = await prisma.account.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        type: item.type as AccountType,
        isPostable: item.isPostable,
        parentId,
      },
      create: {
        code: item.code,
        name: item.name,
        type: item.type as AccountType,
        isPostable: item.isPostable,
        parentId,
      },
    });
    accountIds[item.code] = account.id;
  }

  // Link Default Accounts to Company Settings
  const defaultSettings = await prisma.companySettings.findFirst();
  if (defaultSettings) {
    await prisma.companySettings.update({
      where: { id: defaultSettings.id },
      data: {
        arAccountId: accountIds["1130"] || null,
        apAccountId: accountIds["2110"] || null,
        salesAccountId: accountIds["4100"] || null,
        cogsAccountId: accountIds["5100"] || null,
        inventoryAccountId: accountIds["1140"] || null,
        taxAccountId: accountIds["2120"] || null,
        cashAccountId: accountIds["1110"] || null,
        bankAccountId: accountIds["1120"] || null,
      },
    });
  }

  // ----------------------------------------------------
  // 8. Categories & 20 Products
  // ----------------------------------------------------
  console.log("Seeding categories and 20 products...");
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

  const pieceId = units["قطعة"] || Object.values(units)[0];
  const boxId = units["كرتونة"] || pieceId;

  const rawProducts = [
    // Electronics
    { sku: "EL-001", name: "شاحن هاتف سريع 65W Type-C", cat: "إلكترونيات وملحقات", unitId: pieceId, cost: 250, price: 390, stock: 150 },
    { sku: "EL-002", name: "كابل بيانات مجدول Type-C to Type-C 1m", cat: "إلكترونيات وملحقات", unitId: pieceId, cost: 45, price: 95, stock: 300 },
    { sku: "EL-003", name: "باور بانك 20,000 مللي أمبير بقوة 22.5W", cat: "إلكترونيات وملحقات", unitId: pieceId, cost: 450, price: 720, stock: 80 },
    { sku: "EL-004", name: "فأرة لاسلكية قابلة للشحن مريحة لليد", cat: "إلكترونيات وملحقات", unitId: pieceId, cost: 120, price: 210, stock: 120 },
    { sku: "EL-005", name: "لوحة مفاتيح ميكانيكية بإضاءة RGB", cat: "إلكترونيات وملحقات", unitId: pieceId, cost: 550, price: 850, stock: 45 },
    { sku: "EL-006", name: "سماعة رأس بلوتوث عازلة للضوضاء", cat: "إلكترونيات وملحقات", unitId: pieceId, cost: 650, price: 1100, stock: 60 },

    // Stationery
    { sku: "ST-001", name: "ورق تصوير A4 وزن 80 جرام (كرتونة 5 رزم)", cat: "أدوات وقرطاسية مكتبية", unitId: boxId, cost: 680, price: 840, stock: 100 },
    { sku: "ST-002", name: "طقم أقلام حبر جاف أزرق (علبة 50 قلم)", cat: "أدوات وقرطاسية مكتبية", unitId: boxId, cost: 110, price: 175, stock: 200 },
    { sku: "ST-003", name: "ملف حفظ وثائق بلاستيكي بحلقات A4", cat: "أدوات وقرطاسية مكتبية", unitId: pieceId, cost: 25, price: 45, stock: 400 },
    { sku: "ST-004", name: "دباسة مكتبية ثقيلة مع علبة دبابيس", cat: "أدوات وقرطاسية مكتبية", unitId: pieceId, cost: 85, price: 140, stock: 90 },
    { sku: "ST-005", name: "دفتر ملاحظات سلك مقاس A5 مسطر 100 ورقة", cat: "أدوات وقرطاسية مكتبية", unitId: pieceId, cost: 35, price: 65, stock: 250 },

    // Packaging
    { sku: "PK-001", name: "كرتون شحن مقوى مقاس 40x30x25 سم", cat: "مستلزمات التعبئة والتغليف", unitId: pieceId, cost: 18, price: 32, stock: 600 },
    { sku: "PK-002", name: "كرتون شحن صغير 25x20x15 سم", cat: "مستلزمات التعبئة والتغليف", unitId: pieceId, cost: 12, price: 22, stock: 800 },
    { sku: "PK-003", name: "شريط لاصق شفاف عريض 48 ملم x 100 ياردة", cat: "مستلزمات التعبئة والتغليف", unitId: pieceId, cost: 22, price: 40, stock: 500 },
    { sku: "PK-004", name: "لفة بلاستيك فقاعي لحماية الشحنات 50 سم x 50 م", cat: "مستلزمات التعبئة والتغليف", unitId: pieceId, cost: 160, price: 260, stock: 50 },
    { sku: "PK-005", name: "سترتش فيلم تغليف صناعي 50 سم 2.5 كجم", cat: "مستلزمات التعبئة والتغليف", unitId: pieceId, cost: 190, price: 290, stock: 75 },

    // Networking
    { sku: "NT-001", name: "كابل شبكة Cat6 نحاس خالص بطول 305 متر", cat: "شبكات وكابلات", unitId: boxId, cost: 1400, price: 2100, stock: 30 },
    { sku: "NT-002", name: "باتش كورد شبكة Cat6 طول 3 أمتار رمادي", cat: "شبكات وكابلات", unitId: pieceId, cost: 28, price: 55, stock: 220 },
    { sku: "NT-003", name: "سويتش شبكة 8 منافذ Gigabit معدني", cat: "شبكات وكابلات", unitId: pieceId, cost: 380, price: 590, stock: 40 },
    { sku: "NT-004", name: "كونكتور شبكة RJ45 كيس 100 حبة", cat: "شبكات وكابلات", unitId: boxId, cost: 65, price: 110, stock: 150 },
  ];

  for (const item of rawProducts) {
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {}, // Safe: never overwrite existing product pricing or properties
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

    // Upsert stock level safely (never overwrite existing stock count)
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
  // 9. 10 Customers
  // ----------------------------------------------------
  console.log("Seeding 10 customers...");
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
      update: {}, // Safe: never overwrite customer balances or data
      create: c,
    });
  }

  // ----------------------------------------------------
  // 10. 5 Suppliers
  // ----------------------------------------------------
  console.log("Seeding 5 suppliers...");
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
      update: {}, // Safe: never overwrite supplier balances or data
      create: s,
    });
  }

  // ----------------------------------------------------
  // 11. HR: Departments, Positions, 8 Employees
  // ----------------------------------------------------
  console.log("Seeding HR departments, positions, and 8 employees...");
  const deptsData = [
    { code: "MGMT", name: "الإدارة العليا (Management)", description: "إدارة الشركة والقرارات الاستراتيجية" },
    { code: "FIN", name: "المالية والمحاسبة (Finance)", description: "الحسابات، المراجعة، والتقارير المالية" },
    { code: "SALES", name: "المبيعات والتسويق (Sales)", description: "إدارة علاقات العملاء، عروض الأسعار، والمبيعات" },
    { code: "LOG", name: "المخازن واللوجستيات (Logistics)", description: "إدارة المستودعات، الاستلام، وحركة المخزون" },
  ];

  const deptMap: Record<string, string> = {};
  for (const d of deptsData) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description },
      create: d,
    });
    deptMap[d.code] = dept.id;
  }

  const positionsData = [
    { code: "GM", title: "المدير التنفيذي (General Manager)", dept: "MGMT" },
    { code: "FM", title: "مدير مالي (Finance Manager)", dept: "FIN" },
    { code: "ACC", title: "محاسب أول (Senior Accountant)", dept: "FIN" },
    { code: "SM", title: "مدير المبيعات (Sales Manager)", dept: "SALES" },
    { code: "REP", title: "مندوب مبيعات تنفيذي (Sales Rep)", dept: "SALES" },
    { code: "WH_MGR", title: "مدير المخازن (Warehouse Manager)", dept: "LOG" },
    { code: "WH_KPR", title: "أمين مخزن (Storekeeper)", dept: "LOG" },
    { code: "LOG_SUP", title: "مشرف حركة ونقل (Logistics Supervisor)", dept: "LOG" },
  ];

  const posMap: Record<string, string> = {};
  for (const p of positionsData) {
    const pos = await prisma.position.upsert({
      where: { code: p.code },
      update: { title: p.title, departmentId: deptMap[p.dept] },
      create: {
        code: p.code,
        title: p.title,
        departmentId: deptMap[p.dept],
      },
    });
    posMap[p.code] = pos.id;
  }

  // Leave types
  const leaveTypesData = [
    { name: "إجازة اعتيادية سنوية", daysAllowed: 21, isPaid: true },
    { name: "إجازة مرضية", daysAllowed: 15, isPaid: true },
    { name: "إجازة عارضة", daysAllowed: 7, isPaid: true },
  ];
  for (const lt of leaveTypesData) {
    const existing = await prisma.leaveType.findFirst({ where: { name: lt.name } });
    if (!existing) {
      await prisma.leaveType.create({ data: lt });
    }
  }

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
    await prisma.employee.upsert({
      where: { code: emp.code },
      update: {}, // Safe: never overwrite employee records or salaries in production
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

  // ----------------------------------------------------
  // 12. Initialize Document Sequences
  // ----------------------------------------------------
  console.log("Setting up document sequences for current year...");
  const currentYear = new Date().getFullYear();
  const sequenceTypes = [
    { type: "INVOICE", prefix: "INV" },
    { type: "ORDER", prefix: "SO" },
    { type: "QUOTATION", prefix: "QTN" },
    { type: "PURCHASE_ORDER", prefix: "PO" },
    { type: "GOODS_RECEIPT", prefix: "GR" },
    { type: "PURCHASE_INVOICE", prefix: "PINV" },
    { type: "CUSTOMER_PAYMENT", prefix: "CPAY" },
    { type: "SUPPLIER_PAYMENT", prefix: "SPAY" },
    { type: "SALES_RETURN", prefix: "SRTN" },
    { type: "PURCHASE_RETURN", prefix: "PRTN" },
    { type: "JOURNAL_ENTRY", prefix: "JRN" },
    { type: "EXPENSE", prefix: "EXP" },
    { type: "PAYROLL", prefix: "PAY" },
  ];

  for (const seq of sequenceTypes) {
    await prisma.documentSequence.upsert({
      where: {
        type_year: {
          type: seq.type,
          year: currentYear,
        },
      },
      update: {}, // Safe: never reset or modify sequence counters in production
      create: {
        type: seq.type,
        prefix: seq.prefix,
        year: currentYear,
        nextNumber: 1,
        padding: 5,
      },
    });
  }

  console.log("✅ Masar ERP database seeded successfully!");
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
