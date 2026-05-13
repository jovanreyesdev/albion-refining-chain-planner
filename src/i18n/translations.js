// =============================================================================
// Translations for Refining Chain Planner.
//
// Lightweight i18n — no library, just a flat key → string map per language.
// To add a new language: copy `en` and translate. To add a new string:
// 1. Add the key+English text to `en` first.
// 2. Add it to the other locales (or it falls back to English).
//
// Use t("key") via the useTranslation hook. Pass placeholders as the second arg:
//   t("shoppingDoneOfTotal", { done: 3, total: 12 })
//
// We use placeholder syntax {name} for variables.
//
// Languages chosen based on Albion Online player demographics:
//   - en: default
//   - zh: Simplified Chinese (Asia-Pacific server has a large CN community)
//   - th: Thai
//   - id: Bahasa Indonesia (Indonesia has a huge Albion player base)
// =============================================================================

export const LANGUAGES = [
  { code: "en", label: "English",   flag: "EN" },
  { code: "zh", label: "中文",       flag: "🇨🇳" },
  { code: "th", label: "ไทย",       flag: "🇹🇭" },
  { code: "id", label: "Indonesia", flag: "🇮🇩" },
];

const dict = {
  // ----------------------------------------------------------------- ENGLISH
  en: {
    appTitle: "Refining Chain Planner",
    appTagline:
      "You bring back a mix of resources from gathering — different tiers, different enchantments. To refine them all, you need to buy some lower-tier refined items from market. But doing the math by hand is slow and easy to get wrong. This tool does it for you. Drag your items in, and it shows a clean shopping list: exactly what to buy and how much.",

    statRaw: "Raw",
    statRefined: "Refined",
    statWillProduce: "Will Produce",

    tabResource: "Resource",
    tabRefined: "Refined",

    inventoryHeading: "Your Inventory",
    btnSave: "Save",
    btnExport: "Export",
    btnClear: "Clear",
    btnSnapshots: "Snapshots",
    snapshotsEmpty: "No snapshots yet.",
    inventoryEmptyHint:
      "Drag items from the picker into these slots, or click a picker item to add directly.",

    confirmClear: "Clear all inventory?",
    promptSnapshotName: "Snapshot name:",
    confirmLoadSnapshot: 'Load "{name}"? Current inventory will be replaced.',

    qtyTitleRaw: "Raw material",
    qtyTitleRefined: "Refined",
    qtyLabel: "Quantity",
    qtyAdd: "Yes",
    qtySave: "Save",
    qtyCancel: "No",
    qtyTip: "Tip: Enter to confirm · Esc to cancel",

    shoppingTitle: "Shopping List",
    shoppingDoneOfTotal: "({done}/{total} done{checkmark})",
    shoppingResetChecks: "Reset checks",
    shoppingAllBalanced:
      "✓ All balanced — nothing else to buy. (Or your inventory is empty.)",
    shoppingBuyLine: "Buy {amount} × {label}",
    cascadeToggleLabel: "Use lower tier output for higher tier",
    cascadeOn: "(ON — buy less)",
    cascadeOff: "(OFF — each tier alone)",
    cascadeReasonWithCredit:
      "{baseShortfall} needed for {tier} {family}, minus {credit} from lower-tier cascade",
    cascadeReasonSimple: "to refine remaining {tier} {family}",
    cascadeReasonRaw: "to fully use {feeder} feeder",
    cascadeTooltipOn:
      "ON: When you refine low-tier items, the result is used for high-tier items.\n\nExample:\n• You have 70 T7 Hide and 300 T8 Hide.\n• Refining 70 T7 Hide makes 14 T7 Leather.\n• Those 14 T7 Leather are used for the 300 T8 Hide.\n• So you only need to buy 46 more T7 Leather (not 60).",
    cascadeTooltipOff:
      "OFF: Each tier is calculated alone. Refining low-tier items does NOT help with high-tier items.\n\nExample:\n• You have 70 T7 Hide and 300 T8 Hide.\n• T7 step says: buy 14 T6 Leather.\n• T8 step says: buy 60 T7 Leather.\n• The 14 T7 Leather you make from T7 Hide is ignored.",

    breakdownTitle: "Per-chain breakdown",
    breakdownActive: "({n} active)",
    breakdownTier: "Tier",
    breakdownRawUsed: "Raw used",
    breakdownFeederUsed: "Feeder used",
    breakdownProduced: "Produced",
    breakdownLeftAfter: "Left after",
    breakdownNotes: "Notes",
    breakdownNone: "none",
    breakdownNeedFeeder: "Need {n} {tier} ref",
    breakdownNeedRaw: "Need {n} {tier} raw",

    footerRecipe:
      "T2 = T1 raw ×2 · T3+ = (T-1) refined + T raw (×2, ×2, ×3, ×4, ×5, ×5)",
    footerStorage: "Inventory and snapshots are saved in your browser.",
    linkDiscord: "Join the Discord",
    linkKofi: "Buy me a coffee",

    // Resource family labels
    famOre: "Ore",
    famHide: "Hide",
    famFiber: "Fiber",
    famWood: "Wood",
    famMetalBars: "Metal Bars",
    famLeather: "Leather",
    famCloth: "Cloth",
    famPlank: "Plank",

    enchBase: "Base",

    // First-run guide — two-step animated tutorial
    guideTitle: "Welcome — here's how it works",
    guideStepPicker: "Pick an item from here…",
    guideStepInventory: "…and drop it into your inventory.",
    guideGotIt: "Got it",
    guideDismiss: "Close",
    guideHelpTooltip: "Show the welcome guide again",
  },

  // -------------------------------------------------------- SIMPLIFIED CHINESE
  zh: {
    appTitle: "精炼链规划器",
    appTagline:
      "采集回来的资源往往是多种等级、多种附魔混在一起。要把它们全部精炼，就需要从市场购买一些低等级的精炼品。但是手工计算又慢又容易出错。这个工具帮你算好了：把物品拖进来，它会显示一份清晰的购物清单 —— 该买什么、买多少，一目了然。",

    statRaw: "原料",
    statRefined: "精炼品",
    statWillProduce: "可生产",

    tabResource: "资源",
    tabRefined: "精炼品",

    inventoryHeading: "我的库存",
    btnSave: "保存",
    btnExport: "导出",
    btnClear: "清空",
    btnSnapshots: "快照",
    snapshotsEmpty: "暂无快照。",
    inventoryEmptyHint:
      "将物品从选择器拖到这些格子中，或点击选择器中的物品直接添加。",

    confirmClear: "清空所有库存？",
    promptSnapshotName: "快照名称：",
    confirmLoadSnapshot: "加载 \"{name}\"？当前库存将被替换。",

    qtyTitleRaw: "原料",
    qtyTitleRefined: "精炼品",
    qtyLabel: "数量",
    qtyAdd: "确认",
    qtySave: "保存",
    qtyCancel: "取消",
    qtyTip: "提示：按 Enter 确认 · 按 Esc 取消",

    shoppingTitle: "购物清单",
    shoppingDoneOfTotal: "（已完成 {done}/{total}{checkmark}）",
    shoppingResetChecks: "重置勾选",
    shoppingAllBalanced: "✓ 所有材料均已齐全 —— 无需购买。（或库存为空。）",
    shoppingBuyLine: "购买 {amount} × {label}",
    cascadeToggleLabel: "用低级精炼品供应高级精炼",
    cascadeOn: "（开启 —— 少买）",
    cascadeOff: "（关闭 —— 每级独立计算）",
    cascadeReasonWithCredit:
      "{tier} {family} 需要 {baseShortfall}，减去低级精炼提供的 {credit}",
    cascadeReasonSimple: "用于精炼剩余的 {tier} {family}",
    cascadeReasonRaw: "用于充分利用 {feeder} 精炼品",
    cascadeTooltipOn:
      "开启：低级物品精炼后的产物可用于高级物品的精炼。\n\n示例：\n• 你有 70 个 T7 兽皮和 300 个 T8 兽皮。\n• 精炼 70 个 T7 兽皮可得到 14 个 T7 皮革。\n• 这 14 个 T7 皮革用于精炼 300 个 T8 兽皮。\n• 所以你只需再购买 46 个 T7 皮革（而不是 60 个）。",
    cascadeTooltipOff:
      "关闭：每个等级独立计算。低级物品精炼后的产物不会用于高级物品的精炼。\n\n示例：\n• 你有 70 个 T7 兽皮和 300 个 T8 兽皮。\n• T7 阶段：需要购买 14 个 T6 皮革。\n• T8 阶段：需要购买 60 个 T7 皮革。\n• 从 T7 兽皮得到的 14 个 T7 皮革被忽略。",

    breakdownTitle: "各精炼链详情",
    breakdownActive: "（{n} 条活跃）",
    breakdownTier: "等级",
    breakdownRawUsed: "原料用量",
    breakdownFeederUsed: "供应物用量",
    breakdownProduced: "产出",
    breakdownLeftAfter: "结余",
    breakdownNotes: "备注",
    breakdownNone: "无",
    breakdownNeedFeeder: "需要 {n} 个 {tier} 精炼品",
    breakdownNeedRaw: "需要 {n} 个 {tier} 原料",

    footerRecipe:
      "T2 = T1 原料 ×2 · T3+ = (T-1) 精炼品 + T 原料 (×2, ×2, ×3, ×4, ×5, ×5)",
    footerStorage: "库存和快照保存在你的浏览器中。",
    linkDiscord: "加入 Discord",
    linkKofi: "请我喝杯咖啡",

    famOre: "矿石",
    famHide: "兽皮",
    famFiber: "纤维",
    famWood: "木材",
    famMetalBars: "金属锭",
    famLeather: "皮革",
    famCloth: "布料",
    famPlank: "木板",

    enchBase: "基础",

    // First-run guide — two-step animated tutorial
    guideTitle: "欢迎！来了解一下如何使用",
    guideStepPicker: "从这里选择一个物品……",
    guideStepInventory: "……然后拖到你的库存里。",
    guideGotIt: "知道了",
    guideDismiss: "关闭",
    guideHelpTooltip: "再次显示欢迎指引",
  },

  // ------------------------------------------------------------------ THAI
  th: {
    appTitle: "ตัวช่วยวางแผนการรีไฟน์",
    appTagline:
      "คุณกลับมาจากการเก็บของพร้อมวัตถุดิบหลายเทียร์ หลายระดับเอนแชนต์ปนกัน การจะรีไฟน์ทั้งหมดต้องซื้อของรีไฟน์เทียร์ต่ำกว่าจากตลาดด้วย แต่การคำนวณด้วยมือนั้นช้าและผิดพลาดง่าย เครื่องมือนี้คำนวณให้คุณ ลากไอเทมเข้ามา แล้วมันจะแสดงรายการซื้อที่ชัดเจน: ต้องซื้ออะไรบ้างและจำนวนเท่าไร",

    statRaw: "วัตถุดิบ",
    statRefined: "รีไฟน์แล้ว",
    statWillProduce: "จะผลิตได้",

    tabResource: "วัตถุดิบ",
    tabRefined: "รีไฟน์แล้ว",

    inventoryHeading: "คลังของคุณ",
    btnSave: "บันทึก",
    btnExport: "ส่งออก",
    btnClear: "ล้าง",
    btnSnapshots: "สแน็ปช็อต",
    snapshotsEmpty: "ยังไม่มีสแน็ปช็อต",
    inventoryEmptyHint:
      "ลากไอเทมจากแผงเลือกมาวางในช่องเหล่านี้ หรือคลิกที่ไอเทมเพื่อเพิ่มโดยตรง",

    confirmClear: "ล้างคลังทั้งหมด?",
    promptSnapshotName: "ชื่อสแน็ปช็อต:",
    confirmLoadSnapshot: 'โหลด "{name}"? คลังปัจจุบันจะถูกแทนที่',

    qtyTitleRaw: "วัตถุดิบ",
    qtyTitleRefined: "รีไฟน์แล้ว",
    qtyLabel: "จำนวน",
    qtyAdd: "ตกลง",
    qtySave: "บันทึก",
    qtyCancel: "ยกเลิก",
    qtyTip: "เคล็ดลับ: Enter เพื่อยืนยัน · Esc เพื่อยกเลิก",

    shoppingTitle: "รายการซื้อ",
    shoppingDoneOfTotal: "({done}/{total} เสร็จ{checkmark})",
    shoppingResetChecks: "รีเซ็ตการเลือก",
    shoppingAllBalanced:
      "✓ ทุกอย่างพอเพียงแล้ว — ไม่ต้องซื้ออะไรอีก (หรือคลังของคุณว่างเปล่า)",
    shoppingBuyLine: "ซื้อ {amount} × {label}",
    cascadeToggleLabel: "ใช้ผลผลิตจากเทียร์ต่ำเพื่อเทียร์สูง",
    cascadeOn: "(เปิด — ซื้อน้อยลง)",
    cascadeOff: "(ปิด — คำนวณแต่ละเทียร์แยกกัน)",
    cascadeReasonWithCredit:
      "ต้องการ {baseShortfall} สำหรับ {tier} {family} หัก {credit} จากการรีไฟน์เทียร์ต่ำกว่า",
    cascadeReasonSimple: "เพื่อรีไฟน์ {tier} {family} ที่เหลือ",
    cascadeReasonRaw: "เพื่อใช้ {feeder} ให้หมด",
    cascadeTooltipOn:
      "เปิด: เมื่อคุณรีไฟน์ไอเทมเทียร์ต่ำ ผลลัพธ์จะถูกใช้กับไอเทมเทียร์สูง\n\nตัวอย่าง:\n• คุณมี T7 Hide 70 ชิ้น และ T8 Hide 300 ชิ้น\n• รีไฟน์ T7 Hide 70 ชิ้น ได้ T7 Leather 14 ชิ้น\n• T7 Leather 14 ชิ้นนี้จะถูกใช้กับ T8 Hide 300 ชิ้น\n• ดังนั้นคุณซื้อ T7 Leather เพิ่มเพียง 46 ชิ้น (ไม่ใช่ 60)",
    cascadeTooltipOff:
      "ปิด: คำนวณแต่ละเทียร์แยกกัน การรีไฟน์ไอเทมเทียร์ต่ำจะไม่ช่วยเทียร์สูง\n\nตัวอย่าง:\n• คุณมี T7 Hide 70 ชิ้น และ T8 Hide 300 ชิ้น\n• ขั้น T7: ซื้อ T6 Leather 14 ชิ้น\n• ขั้น T8: ซื้อ T7 Leather 60 ชิ้น\n• T7 Leather 14 ชิ้นจาก T7 Hide จะถูกละเลย",

    breakdownTitle: "รายละเอียดแต่ละสายรีไฟน์",
    breakdownActive: "({n} สายใช้งานอยู่)",
    breakdownTier: "เทียร์",
    breakdownRawUsed: "วัตถุดิบที่ใช้",
    breakdownFeederUsed: "วัตถุป้อนที่ใช้",
    breakdownProduced: "ผลิตได้",
    breakdownLeftAfter: "เหลือ",
    breakdownNotes: "หมายเหตุ",
    breakdownNone: "ไม่มี",
    breakdownNeedFeeder: "ต้องการ {n} {tier} (รีไฟน์)",
    breakdownNeedRaw: "ต้องการ {n} {tier} (วัตถุดิบ)",

    footerRecipe:
      "T2 = T1 วัตถุดิบ ×2 · T3+ = (T-1) รีไฟน์ + T วัตถุดิบ (×2, ×2, ×3, ×4, ×5, ×5)",
    footerStorage: "คลังและสแน็ปช็อตถูกบันทึกในเบราว์เซอร์ของคุณ",
    linkDiscord: "เข้าร่วม Discord",
    linkKofi: "เลี้ยงกาแฟ",

    famOre: "แร่",
    famHide: "หนัง",
    famFiber: "เส้นใย",
    famWood: "ไม้",
    famMetalBars: "แท่งโลหะ",
    famLeather: "หนังฟอก",
    famCloth: "ผ้า",
    famPlank: "ไม้แปรรูป",

    enchBase: "พื้นฐาน",

    // First-run guide — two-step animated tutorial
    guideTitle: "ยินดีต้อนรับ — นี่คือวิธีใช้งาน",
    guideStepPicker: "เลือกไอเทมจากตรงนี้…",
    guideStepInventory: "…แล้วลากมาวางในคลังของคุณ",
    guideGotIt: "เข้าใจแล้ว",
    guideDismiss: "ปิด",
    guideHelpTooltip: "แสดงคำแนะนำต้อนรับอีกครั้ง",
  },

  // ------------------------------------------------------ BAHASA INDONESIA
  id: {
    appTitle: "Perencana Rantai Refining",
    appTagline:
      "Anda pulang dari mengumpulkan bahan dengan campuran sumber daya — berbagai tier, berbagai enchantment. Untuk merefine semuanya, Anda perlu membeli beberapa item refine tier rendah dari market. Tapi menghitung manual itu lambat dan mudah salah. Tool ini menghitungnya untuk Anda. Seret item Anda ke sini, dan tool akan menampilkan daftar belanja yang jelas: persis apa yang harus dibeli dan berapa banyak.",

    statRaw: "Mentah",
    statRefined: "Hasil Refine",
    statWillProduce: "Akan Dihasilkan",

    tabResource: "Bahan Mentah",
    tabRefined: "Hasil Refine",

    inventoryHeading: "Inventaris Anda",
    btnSave: "Simpan",
    btnExport: "Ekspor",
    btnClear: "Bersihkan",
    btnSnapshots: "Snapshot",
    snapshotsEmpty: "Belum ada snapshot.",
    inventoryEmptyHint:
      "Seret item dari panel pemilih ke slot ini, atau klik item untuk menambahkan langsung.",

    confirmClear: "Bersihkan semua inventaris?",
    promptSnapshotName: "Nama snapshot:",
    confirmLoadSnapshot: 'Muat "{name}"? Inventaris saat ini akan diganti.',

    qtyTitleRaw: "Bahan mentah",
    qtyTitleRefined: "Hasil refine",
    qtyLabel: "Jumlah",
    qtyAdd: "Ya",
    qtySave: "Simpan",
    qtyCancel: "Batal",
    qtyTip: "Tip: Enter untuk konfirmasi · Esc untuk batal",

    shoppingTitle: "Daftar Belanja",
    shoppingDoneOfTotal: "({done}/{total} selesai{checkmark})",
    shoppingResetChecks: "Reset centang",
    shoppingAllBalanced:
      "✓ Semua seimbang — tidak perlu beli apa-apa lagi. (Atau inventaris kosong.)",
    shoppingBuyLine: "Beli {amount} × {label}",
    cascadeToggleLabel: "Pakai hasil tier rendah untuk tier tinggi",
    cascadeOn: "(NYALA — beli lebih sedikit)",
    cascadeOff: "(MATI — setiap tier sendiri)",
    cascadeReasonWithCredit:
      "{baseShortfall} dibutuhkan untuk {tier} {family}, dikurangi {credit} dari refining tier lebih rendah",
    cascadeReasonSimple: "untuk merefine sisa {tier} {family}",
    cascadeReasonRaw: "untuk memanfaatkan semua {feeder}",
    cascadeTooltipOn:
      "NYALA: Saat Anda merefine item tier rendah, hasilnya dipakai untuk item tier tinggi.\n\nContoh:\n• Anda punya 70 T7 Hide dan 300 T8 Hide.\n• Merefine 70 T7 Hide menghasilkan 14 T7 Leather.\n• 14 T7 Leather itu dipakai untuk 300 T8 Hide.\n• Jadi Anda hanya perlu beli 46 T7 Leather lagi (bukan 60).",
    cascadeTooltipOff:
      "MATI: Setiap tier dihitung sendiri. Merefine item tier rendah TIDAK membantu item tier tinggi.\n\nContoh:\n• Anda punya 70 T7 Hide dan 300 T8 Hide.\n• Tahap T7: beli 14 T6 Leather.\n• Tahap T8: beli 60 T7 Leather.\n• 14 T7 Leather dari T7 Hide tidak diperhitungkan.",

    breakdownTitle: "Rincian per rantai",
    breakdownActive: "({n} aktif)",
    breakdownTier: "Tier",
    breakdownRawUsed: "Bahan mentah dipakai",
    breakdownFeederUsed: "Bahan pengumpan dipakai",
    breakdownProduced: "Dihasilkan",
    breakdownLeftAfter: "Sisa",
    breakdownNotes: "Catatan",
    breakdownNone: "tidak ada",
    breakdownNeedFeeder: "Butuh {n} {tier} (refine)",
    breakdownNeedRaw: "Butuh {n} {tier} (mentah)",

    footerRecipe:
      "T2 = T1 mentah ×2 · T3+ = (T-1) refine + T mentah (×2, ×2, ×3, ×4, ×5, ×5)",
    footerStorage: "Inventaris dan snapshot disimpan di browser Anda.",
    linkDiscord: "Gabung Discord",
    linkKofi: "Belikan kopi",

    famOre: "Bijih",
    famHide: "Kulit",
    famFiber: "Serat",
    famWood: "Kayu",
    famMetalBars: "Batang Logam",
    famLeather: "Kulit Olahan",
    famCloth: "Kain",
    famPlank: "Papan",

    enchBase: "Dasar",

    // First-run guide — two-step animated tutorial
    guideTitle: "Selamat datang — beginilah cara kerjanya",
    guideStepPicker: "Pilih item dari sini…",
    guideStepInventory: "…lalu seret ke inventaris Anda.",
    guideGotIt: "Mengerti",
    guideDismiss: "Tutup",
    guideHelpTooltip: "Tampilkan panduan selamat datang lagi",
  },
};

export default dict;
