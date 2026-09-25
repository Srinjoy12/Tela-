/**
 * Tela Internationalisation Utilities
 * - formatINR: Indian comma system (1,00,000 = 1 lakh; 1,00,00,000 = 1 crore)
 * - t: translation lookup for key UI labels
 * - formatDate: locale-aware date display
 */

export type AppLanguage = 'en' | 'hi' | 'bn' | 'te' | 'ta' | 'mr' | 'gu' | 'kn';

export function formatINR(amount: number, compact = false): string {
  if (isNaN(amount)) return '₹0';
  if (compact) {
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(2).replace(/\.?0+$/, '')}Cr`;
    if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(2).replace(/\.?0+$/, '')}L`;
    if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1).replace(/\.?0+$/, '')}K`;
    return `${sign}₹${abs.toLocaleString('en-IN')}`;
  }
  return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0, minimumFractionDigits: 0 });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

export function formatDate(dateStr: string, lang: AppLanguage = 'en'): string {
  try {
    const localeMap: Record<AppLanguage, string> = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', te: 'te-IN', ta: 'ta-IN', mr: 'mr-IN', gu: 'gu-IN', kn: 'kn-IN' };
    return new Date(dateStr).toLocaleDateString(localeMap[lang] || 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

export type TranslationKey =
  | 'nav_dashboard' | 'nav_products' | 'nav_billing' | 'nav_goals' | 'nav_reports' | 'nav_customers' | 'nav_suppliers'
  | 'dashboard_title' | 'total_revenue' | 'total_profit' | 'pieces_sold' | 'low_stock'
  | 'add_product' | 'search_placeholder' | 'save' | 'cancel' | 'delete' | 'edit' | 'loading' | 'no_data'
  | 'bill_total' | 'discount' | 'payment_mode' | 'cash' | 'upi' | 'credit' | 'part_payment' | 'create_bill'
  | 'customer_name' | 'customer_phone' | 'balance_due' | 'udhaar' | 'record_payment'
  | 'profit_goal' | 'target' | 'achieved' | 'remaining' | 'monthly_summary' | 'dead_stock' | 'restock'
  | 'export_excel' | 'print' | 'cost_price' | 'selling_price' | 'quantity' | 'supplier' | 'category';

type Translations = Record<TranslationKey, string>;

const strings: Record<AppLanguage, Partial<Translations>> = {
  en: {
    nav_dashboard: 'Dashboard', nav_products: 'Stock & Inventory', nav_billing: 'Quick Billing (POS)',
    nav_goals: 'Profit Goals', nav_reports: 'Reports & Insights', nav_customers: 'Customer Udhaar',
    nav_suppliers: 'Suppliers & Purchases',
    dashboard_title: 'Business Overview', total_revenue: 'Gross Revenue', total_profit: 'Counter Gross Margin',
    pieces_sold: 'Pieces Sold', low_stock: 'Low Stock Alerts', add_product: 'Add Product',
    search_placeholder: 'Search by name or code...', save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit',
    loading: 'Loading...', no_data: 'No data found.', bill_total: 'Bill Total', discount: 'Discount',
    payment_mode: 'Payment Mode', cash: 'Cash', upi: 'UPI', credit: 'Credit (Udhaar)',
    part_payment: 'Part Payment', create_bill: 'Create Bill', customer_name: 'Customer Name',
    customer_phone: 'Phone Number', balance_due: 'Balance Due', udhaar: 'Udhaar (Credit)',
    record_payment: 'Record Payment', profit_goal: 'Profit Goal', target: 'Target', achieved: 'Achieved',
    remaining: 'Remaining', monthly_summary: 'Monthly Summary', dead_stock: 'Dead Stock',
    restock: 'Restock Alerts', export_excel: 'Download Excel', print: 'Print',
    cost_price: 'Cost Price', selling_price: 'Selling Price', quantity: 'Quantity',
    supplier: 'Supplier', category: 'Category',
  },
  hi: {
    nav_dashboard: 'डैशबोर्ड', nav_products: 'स्टॉक और इन्वेंटरी', nav_billing: 'बिलिंग (POS)',
    nav_goals: 'लाभ लक्ष्य', nav_reports: 'रिपोर्ट', nav_customers: 'उधार खाता',
    nav_suppliers: 'सप्लायर और खरीद',
    dashboard_title: 'व्यापार अवलोकन', total_revenue: 'कुल राजस्व', total_profit: 'सकल लाभ',
    pieces_sold: 'बेची गई साड़ियाँ', low_stock: 'कम स्टॉक अलर्ट', add_product: 'उत्पाद जोड़ें',
    search_placeholder: 'नाम या कोड से खोजें...', save: 'सहेजें', cancel: 'रद्द करें',
    delete: 'हटाएं', edit: 'संपादन', loading: 'लोड हो रहा है...', no_data: 'कोई डेटा नहीं मिला।',
    bill_total: 'बिल राशि', discount: 'छूट', payment_mode: 'भुगतान विधि', cash: 'नकद', upi: 'UPI',
    credit: 'उधार', part_payment: 'आंशिक भुगतान', create_bill: 'बिल बनाएं',
    customer_name: 'ग्राहक का नाम', customer_phone: 'फोन नंबर', balance_due: 'बकाया राशि',
    udhaar: 'उधार', record_payment: 'भुगतान दर्ज करें', profit_goal: 'लाभ लक्ष्य',
    target: 'लक्ष्य', achieved: 'प्राप्त', remaining: 'शेष', monthly_summary: 'मासिक सारांश',
    dead_stock: 'बंद पड़ा स्टॉक', restock: 'पुनः स्टॉक', export_excel: 'एक्सेल डाउनलोड',
    print: 'प्रिंट', cost_price: 'लागत मूल्य', selling_price: 'बिक्री मूल्य',
    quantity: 'मात्रा', supplier: 'आपूर्तिकर्ता', category: 'श्रेणी',
  },
  bn: {
    nav_dashboard: 'ড্যাশবোর্ড', nav_products: 'স্টক ও ইনভেন্টরি', nav_billing: 'বিলিং (POS)',
    nav_goals: 'লাভের লক্ষ্য', nav_reports: 'রিপোর্ট', nav_customers: 'উধার খাতা',
    nav_suppliers: 'সরবরাহকারী ও ক্রয়',
    total_revenue: 'মোট আয়', total_profit: 'মোট মুনাফা', pieces_sold: 'বিক্রিত শাড়ি',
    add_product: 'পণ্য যোগ করুন', save: 'সংরক্ষণ', cancel: 'বাতিল', delete: 'মুছুন', edit: 'সম্পাদনা',
    cash: 'নগদ', upi: 'UPI', credit: 'বাকি (উধার)', create_bill: 'বিল তৈরি',
    balance_due: 'বকেয়া', udhaar: 'উধার', target: 'লক্ষ্য', achieved: 'অর্জিত',
    cost_price: 'ক্রয় মূল্য', selling_price: 'বিক্রয় মূল্য', quantity: 'পরিমাণ',
    supplier: 'সরবরাহকারী', category: 'বিভাগ',
  },
  te: {
    nav_dashboard: 'డాష్‌బోర్డ్', nav_products: 'స్టాక్ & ఇన్వెంటరీ', nav_billing: 'బిల్లింగ్',
    nav_goals: 'లాభ లక్ష్యాలు', nav_reports: 'నివేదికలు', nav_customers: 'అప్పు లెక్క',
    nav_suppliers: 'సరఫరాదారులు & కొనుగోళ్లు',
    total_revenue: 'మొత్తం ఆదాయం', total_profit: 'నికర లాభం', pieces_sold: 'అమ్మిన చీరలు',
    add_product: 'ఉత్పత్తి జోడించు', save: 'సేవ్', cancel: 'రద్దు', cash: 'నగదు',
    credit: 'అప్పు', target: 'లక్ష్యం', quantity: 'పరిమాణం', supplier: 'సరఫరాదారు', category: 'వర్గం',
  },
  ta: {
    nav_dashboard: 'டாஷ்போர்டு', nav_products: 'கையிருப்பு', nav_billing: 'பில்லிங்',
    nav_goals: 'இலக்குகள்', nav_reports: 'அறிக்கைகள்', nav_customers: 'கடன் கணக்கு',
    nav_suppliers: 'சப்ளையர் & கொள்முதல்',
    total_revenue: 'மொத்த வருவாய்', total_profit: 'நிகர லாபம்', pieces_sold: 'விற்ற புடவைகள்',
    add_product: 'பொருள் சேர்', save: 'சேமி', cancel: 'ரத்து', cash: 'பணம்',
    credit: 'கடன்', target: 'இலக்கு', quantity: 'அளவு', supplier: 'சப்ளையர்', category: 'வகை',
  },
  mr: {
    nav_dashboard: 'डॅशबोर्ड', nav_products: 'साठा व यादी', nav_billing: 'बिलिंग',
    nav_goals: 'नफा लक्ष्य', nav_reports: 'अहवाल', nav_customers: 'उधार खाते',
    nav_suppliers: 'पुरवठादार व खरेदी',
    total_revenue: 'एकूण महसूल', total_profit: 'एकूण नफा', add_product: 'उत्पादन जोडा',
    save: 'जतन करा', cancel: 'रद्द करा', quantity: 'प्रमाण', supplier: 'पुरवठादार', category: 'श्रेणी',
  },
  gu: {
    nav_dashboard: 'ડૅશબોર્ડ', nav_products: 'સ્ટૉક & ઇન્વેન્ટરી', nav_billing: 'બિલિંગ',
    nav_goals: 'નફો ધ્યેય', nav_reports: 'અહેવાલ', nav_customers: 'ઉધાર ખાતું',
    nav_suppliers: 'સપ્લાયર્સ & ખરીદી',
    total_revenue: 'કુલ આવક', total_profit: 'ચોખ્ખો નફો', add_product: 'ઉત્પાદ ઉમેરો',
    save: 'સાચવો', cancel: 'રદ કરો', quantity: 'જથ્થો', supplier: 'સપ્લાયર', category: 'કેટેગરી',
  },
  kn: {
    nav_dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್', nav_products: 'ಸ್ಟಾಕ್ & ಇನ್ವೆಂಟರಿ', nav_billing: 'ಬಿಲ್ಲಿಂಗ್',
    nav_goals: 'ಲಾಭ ಗುರಿ', nav_reports: 'ವರದಿಗಳು', nav_customers: 'ಸಾಲ ಲೆಕ್ಕ',
    nav_suppliers: 'ಸರಬರಾಜುದಾರರು & ಖರೀದಿ',
    total_revenue: 'ಒಟ್ಟು ಆದಾಯ', total_profit: 'ನಿವ್ವಳ ಲಾಭ', add_product: 'ಉತ್ಪನ್ನ ಸೇರಿಸಿ',
    save: 'ಉಳಿಸಿ', cancel: 'ರದ್ದು', quantity: 'ಪ್ರಮಾಣ', supplier: 'ಪೂರೈಕೆದಾರ', category: 'ವರ್ಗ',
  },
};

export function t(key: TranslationKey, lang: AppLanguage = 'en'): string {
  return strings[lang]?.[key] ?? strings['en'][key] ?? key;
}
