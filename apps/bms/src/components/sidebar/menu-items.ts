import {
  Building2,
  BuildingIcon,
  Fingerprint,
  HandCoinsIcon,
  IdCardIcon,
  Layers,
  LayoutDashboard,
  SquarePlus,
  TicketPercent,
} from 'lucide-react'

export const main = [
  { name: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
]

export const system = [
  { name: 'Company Data',  url: '/system/company', icon: BuildingIcon },
  { name: 'System Users',  url: '/system/users',   icon: IdCardIcon   },
]

export const products = [
  { name: 'GenCodes (B2B)',         url: '/gencodes',          icon: Fingerprint },
  { name: 'Subscriptions (B2C)',    url: '/subscriptions',     icon: Layers      },
  { name: 'Extra Units',            url: '/extra-unit-prices', icon: SquarePlus  },
]

export const customers = [
  { name: 'Customers', url: '/customers', icon: Building2 },
]

// Sales Reports is deliberately absent, not deleted: /sales/reports and its
// queries stay in the tree and go back on this list once the report is ready.
export const sales = [
  { name: 'Discount Coupons', url: '/sales/discount-coupons', icon: TicketPercent },
  { name: 'Manual Sales',     url: '/sales/manual-sales',     icon: HandCoinsIcon },
]

export const groups = [
  { label: 'System',    items: system    },
  { label: 'Products',  items: products  },
  { label: 'Customers', items: customers },
  { label: 'Sales',     items: sales     },
]
