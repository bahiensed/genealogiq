import { BarChart2, BoxIcon, BuildingIcon, Fingerprint, FolderIcon, HandPlatterIcon, IdCardIcon, LayoutDashboard, QrCodeIcon, ShoppingCartIcon, StoreIcon, TagIcon, UsersIcon, type LucideIcon } from 'lucide-react'

export type ModuleKey =
  | 'moduleRecordsSuppliers'
  | 'moduleRecordsProducts'
  | 'moduleRecordsServices'
  | 'moduleCategoriesSuppliers'
  | 'moduleCategoriesProducts'
  | 'moduleCategoriesServices'
  | 'modulePurchasingProducts'
  | 'modulePurchasingServices'
  | 'moduleInventoryProducts'
  | 'moduleFinance'

export interface MenuItem {
  /** i18n key under the `Sidebar.items` namespace (translated in app-sidebar). */
  labelKey: string
  url: string
  icon: LucideIcon
  moduleKey?: ModuleKey
}

// ─── Main (fast menu — sub-sections separated by a divider) ──────────────────

export const main: MenuItem[][] = [
  [
    { labelKey: 'items.dashboard', url: '/dashboard', icon: LayoutDashboard },
  ],
  [
    { labelKey: 'items.buyPhysicalQr', url: '/purchasing/physical-qr', icon: Fingerprint },
    { labelKey: 'items.myPhysicalQr',  url: '/inventory/physical-qr',  icon: Fingerprint },
  ],
  [
    { labelKey: 'items.buyDigitalQr', url: '/purchasing/digital-qr', icon: QrCodeIcon },
    { labelKey: 'items.myDigitalQr',  url: '/inventory/digital-qr',  icon: QrCodeIcon },
  ],
  [
    { labelKey: 'items.customers', url: '/customers', icon: UsersIcon },
    { labelKey: 'items.sales',     url: '/sales',     icon: ShoppingCartIcon },
  ],
]

// ─── System (always visible) ─────────────────────────────────────────────────

export const system: MenuItem[] = [
  { labelKey: 'items.companyData', url: '/system/company', icon: BuildingIcon },
  { labelKey: 'items.employees',   url: '/system/users',   icon: IdCardIcon   },
]

// ─── Records (Customers always-on) ───────────────────────────────────────────

export const records: MenuItem[] = [
  { labelKey: 'items.suppliers', url: '/suppliers', icon: StoreIcon,       moduleKey: 'moduleRecordsSuppliers' },
  { labelKey: 'items.products',  url: '/products',  icon: BoxIcon,         moduleKey: 'moduleRecordsProducts'  },
  { labelKey: 'items.services',  url: '/services',  icon: HandPlatterIcon, moduleKey: 'moduleRecordsServices'  },
  { labelKey: 'items.customers', url: '/customers', icon: UsersIcon        }, // always-on
]

// ─── Categories (Customer Categories always-on) ───────────────────────────────

export const categories: MenuItem[] = [
  { labelKey: 'items.supplierCategories', url: '/categories/suppliers', icon: TagIcon,    moduleKey: 'moduleCategoriesSuppliers' },
  { labelKey: 'items.productCategories',  url: '/categories/products',  icon: FolderIcon, moduleKey: 'moduleCategoriesProducts'  },
  { labelKey: 'items.serviceCategories',  url: '/categories/services',  icon: FolderIcon, moduleKey: 'moduleCategoriesServices'  },
  { labelKey: 'items.customerCategories', url: '/categories/customers', icon: TagIcon     }, // always-on
]

// ─── Purchasing (QR always-on) ───────────────────────────────────────────────

export const purchasing: MenuItem[] = [
  { labelKey: 'items.buyPhysicalQr', url: '/purchasing/physical-qr', icon: Fingerprint     },
  { labelKey: 'items.buyDigitalQr',  url: '/purchasing/digital-qr',  icon: QrCodeIcon      },
  { labelKey: 'items.products',      url: '/purchasing/products',    icon: BoxIcon,         moduleKey: 'modulePurchasingProducts' },
  { labelKey: 'items.services',      url: '/purchasing/services',    icon: HandPlatterIcon, moduleKey: 'modulePurchasingServices' },
]

// ─── Inventory (QR always-on) ────────────────────────────────────────────────

export const inventory: MenuItem[] = [
  { labelKey: 'items.myPhysicalQr', url: '/inventory/physical-qr', icon: Fingerprint },
  { labelKey: 'items.myDigitalQr',  url: '/inventory/digital-qr',  icon: QrCodeIcon  },
  { labelKey: 'items.products',     url: '/inventory/products',    icon: BoxIcon,     moduleKey: 'moduleInventoryProducts' },
]

// ─── Sales (always visible) ───────────────────────────────────────────────────

export const sales: MenuItem[] = [
  { labelKey: 'items.sales', url: '/sales', icon: ShoppingCartIcon },
]

// ─── Finance ──────────────────────────────────────────────────────────────────

export const finance: MenuItem[] = [
  { labelKey: 'items.finance', url: '/finance', icon: BarChart2, moduleKey: 'moduleFinance' },
]
