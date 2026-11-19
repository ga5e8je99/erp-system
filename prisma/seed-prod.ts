import { PrismaClient, AccountType } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

export async function seedProductionEssentials() {
  console.log("🌱 Starting Masar ERP production essentials database seeding...");

  // ----------------------------------------------------
  // 1. Permissions List
  // ----------------------------------------------------
  console.log("Creating system permissions...");
  const permissionsData = [
    // System wildcard
    { key: "*", module: "system", description: "Full superuser access to all system functions and resources" },

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
  console.log("Creating default system roles...");
  const rolesData = [
    {
      name: "Super Admin",
      description: "Full system administration with unrestricted access",
      permissions: ["*"],
    },
    {
      name: "Admin",
      description: "Full system administration with unrestricted access",
      permissions: ["*", ...permissions.map((p) => p.key)],
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
    const isProd = process.env.NODE_ENV === "production";
    const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

    const effectivePassword = adminPassword || "Admin@12345";
    if (isProd && !adminPassword) {
      console.warn(
        "⚠️ WARNING: ADMIN_INITIAL_PASSWORD environment variable was not specified. Defaulting administrator password to 'Admin@12345'. Please change it immediately after initial login!"
      );
    }
    const passwordHash = bcryptjs.hashSync(effectivePassword, 10);

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
  Default administrator account created: ${adminUser.email}
  (Password configured securely via ADMIN_INITIAL_PASSWORD)
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
        address: "المنطقة الصناعية، القاهرة، مصر",
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
  console.log("Creating standard measurement units...");
  const unitsData = [
    { name: "قطعة", symbol: "قطعة" },
    { name: "كرتونة", symbol: "كرتونة" },
    { name: "كيلوجرام", symbol: "كجم" },
    { name: "متر", symbol: "م" },
    { name: "لتر", symbol: "لتر" },
  ];

  for (const u of unitsData) {
    const existing = await prisma.unit.findFirst({ where: { name: u.name } });
    if (!existing) {
      await prisma.unit.create({ data: u });
    }
  }

  // ----------------------------------------------------
  // 6. Main Warehouse
  // ----------------------------------------------------
  console.log("Creating default warehouse...");
  await prisma.warehouse.upsert({
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
  // 8. Base Departments & Positions
  // ----------------------------------------------------
  console.log("Setting up organizational structure...");
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

  for (const p of positionsData) {
    await prisma.position.upsert({
      where: { code: p.code },
      update: { title: p.title, departmentId: deptMap[p.dept] },
      create: {
        code: p.code,
        title: p.title,
        departmentId: deptMap[p.dept],
      },
    });
  }

  // Standard Leave Types
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

  // ----------------------------------------------------
  // 9. Document Sequences
  // ----------------------------------------------------
  console.log("Setting up document sequences for current fiscal year...");
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
      update: {}, // Safe: never reset or modify sequence counters
      create: {
        type: seq.type,
        prefix: seq.prefix,
        year: currentYear,
        nextNumber: 1,
        padding: 5,
      },
    });
  }

  console.log("✅ Production essentials seeded successfully (0 demo records inserted).");
}

async function main() {
  await seedProductionEssentials();
}

if (require.main === module || process.argv[1]?.includes("seed-prod")) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("❌ Production seed failed with error:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
