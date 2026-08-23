import {
  Building2,
  BuildingIcon,
  Coins,
  Fingerprint,
  HandCoinsIcon,
  IdCardIcon,
  Layers,
  LayoutDashboard,
  QrCodeIcon,
  SquarePlus,
  TagIcon,
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
  { name: 'Physical QR Codes',      url: '/physical-qr',       icon: Fingerprint },
  { name: 'Digital QR Codes (B2B)', url: '/packages',          icon: QrCodeIcon  },
  { name: 'Subscriptions (B2C)',    url: '/subscriptions',     icon: Layers      },
  { name: 'Extra Units',            url: '/extra-unit-prices', icon: SquarePlus  },
]

export const customers = [
  { name: 'Customer Categories', url: '/categories/customers', icon: TagIcon   },
  { name: 'Customers',           url: '/customers',            icon: Building2 },
]

export const sales = [
  { name: 'Discount Coupons',   url: '/sales/discount-coupons',   icon: TicketPercent  },
  { name: 'Manual Sales',       url: '/sales/manual-sales',       icon: HandCoinsIcon  },
  { name: 'Sales Reports',      url: '/sales/reports',            icon: Coins          },
]

export const groups = [
  { label: 'System',    items: system    },
  { label: 'Products',  items: products  },
  { label: 'Customers', items: customers },
  { label: 'Sales',     items: sales     },
]
