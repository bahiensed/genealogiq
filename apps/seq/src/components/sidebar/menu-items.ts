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
  name: string
  url: string
  icon: LucideIcon
  moduleKey?: ModuleKey
}

// ─── Main (fast menu — sub-sections separated by a divider) ──────────────────

export const main: MenuItem[][] = [
  [
    { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  ],
  [
    { name: 'Buy Physical QR Codes', url: '/purchasing/physical-qr', icon: Fingerprint },
    { name: 'My Physical QR Codes',  url: '/inventory/physical-qr',  icon: Fingerprint },
  ],
  [
    { name: 'Buy Digital QR Codes', url: '/purchasing/digital-qr', icon: QrCodeIcon },
    { name: 'My Digital QR Codes',  url: '/inventory/digital-qr',  icon: QrCodeIcon },
  ],
  [
    { name: 'Customers', url: '/customers', icon: UsersIcon },
    { name: 'Sales',     url: '/sales',     icon: ShoppingCartIcon },
  ],
]

// ─── System (always visible) ─────────────────────────────────────────────────

export const system: MenuItem[] = [
  { name: 'Company Data', url: '/system/company', icon: BuildingIcon },
  { name: 'Employees',    url: '/system/users',   icon: IdCardIcon   },
]

// ─── Records (Customers always-on) ───────────────────────────────────────────

export const records: MenuItem[] = [
  { name: 'Suppliers', url: '/suppliers', icon: StoreIcon,       moduleKey: 'moduleRecordsSuppliers' },
  { name: 'Products',  url: '/products',  icon: BoxIcon,         moduleKey: 'moduleRecordsProducts'  },
  { name: 'Services',  url: '/services',  icon: HandPlatterIcon, moduleKey: 'moduleRecordsServices'  },
  { name: 'Customers', url: '/customers', icon: UsersIcon        }, // always-on
]

// ─── Categories (Customer Categories always-on) ───────────────────────────────

export const categories: MenuItem[] = [
  { name: 'Supplier Categories', url: '/categories/suppliers', icon: TagIcon,    moduleKey: 'moduleCategoriesSuppliers' },
  { name: 'Product Categories',  url: '/categories/products',  icon: FolderIcon, moduleKey: 'moduleCategoriesProducts'  },
  { name: 'Service Categories',  url: '/categories/services',  icon: FolderIcon, moduleKey: 'moduleCategoriesServices'  },
  { name: 'Customer Categories', url: '/categories/customers', icon: TagIcon     }, // always-on
]

// ─── Purchasing (QR always-on) ───────────────────────────────────────────────

export const purchasing: MenuItem[] = [
  { name: 'Buy Physical QR Codes', url: '/purchasing/physical-qr', icon: Fingerprint     },
  { name: 'Buy Digital QR Codes',  url: '/purchasing/digital-qr',  icon: QrCodeIcon      },
  { name: 'Products',              url: '/purchasing/products',    icon: BoxIcon,         moduleKey: 'modulePurchasingProducts' },
  { name: 'Services',              url: '/purchasing/services',    icon: HandPlatterIcon, moduleKey: 'modulePurchasingServices' },
]

// ─── Inventory (QR always-on) ────────────────────────────────────────────────

export const inventory: MenuItem[] = [
  { name: 'My Physical QR Codes', url: '/inventory/physical-qr', icon: Fingerprint },
  { name: 'My Digital QR Codes',  url: '/inventory/digital-qr',  icon: QrCodeIcon  },
  { name: 'Products',             url: '/inventory/products',    icon: BoxIcon,     moduleKey: 'moduleInventoryProducts' },
]

// ─── Sales (always visible) ───────────────────────────────────────────────────

export const sales: MenuItem[] = [
  { name: 'Sales', url: '/sales', icon: ShoppingCartIcon },
]

// ─── Finance ──────────────────────────────────────────────────────────────────

export const finance: MenuItem[] = [
  { name: 'Finance', url: '/finance', icon: BarChart2, moduleKey: 'moduleFinance' },
]
