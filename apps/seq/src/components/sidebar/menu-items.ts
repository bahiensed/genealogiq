import { Barcode, BuildingIcon, IdCardIcon, LayoutDashboard, ScanBarcode, StoreIcon, TagIcon, UsersIcon, type LucideIcon } from 'lucide-react'

// Suppliers is the only optional module left. The products/services/finance/
// inventory family was removed: those pages rendered a title over nothing —
// there is no Product or Service model in the schema at all — and two of them
// (/purchasing/products, /purchasing/services) were menu entries with no page
// behind them, so enabling the flag 404'd the tenant.
export type ModuleKey =
  | 'moduleRecordsSuppliers'
  | 'moduleCategoriesSuppliers'

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
    { labelKey: 'items.buyGenCodes', url: '/purchasing/gencodes', icon: Barcode },
    { labelKey: 'items.myGenCodes',  url: '/inventory/gencodes',  icon: ScanBarcode },
  ],
  [
    { labelKey: 'items.customers', url: '/customers', icon: UsersIcon },
  ],
]

// ─── System (always visible) ─────────────────────────────────────────────────

export const system: MenuItem[] = [
  { labelKey: 'items.companyData', url: '/system/company', icon: BuildingIcon },
  { labelKey: 'items.employees',   url: '/system/users',   icon: IdCardIcon   },
]

// ─── Records ─────────────────────────────────────────────────────────────────
//
// One group, not two. Categories used to have a group of its own, but with the
// suppliers modules off — their default — each group held exactly one item, so
// the split bought two headings over one entry each. Entities and their
// categories now sit together, always-on first.

export const records: MenuItem[] = [
  { labelKey: 'items.customerCategories', url: '/categories/customers', icon: TagIcon   }, // always-on
  { labelKey: 'items.customers',          url: '/customers',            icon: UsersIcon }, // always-on
  { labelKey: 'items.supplierCategories', url: '/categories/suppliers', icon: TagIcon,   moduleKey: 'moduleCategoriesSuppliers' },
  { labelKey: 'items.suppliers',          url: '/suppliers',            icon: StoreIcon, moduleKey: 'moduleRecordsSuppliers'    },
]

// ─── Purchasing ──────────────────────────────────────────────────────────────

export const purchasing: MenuItem[] = [
  { labelKey: 'items.buyGenCodes', url: '/purchasing/gencodes', icon: Barcode },
]

// ─── Inventory ───────────────────────────────────────────────────────────────

export const inventory: MenuItem[] = [
  { labelKey: 'items.myGenCodes', url: '/inventory/gencodes', icon: ScanBarcode },
]
