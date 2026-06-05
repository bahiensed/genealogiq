import {
  Building2,
  BuildingIcon,
  ChartNoAxesCombined,
  Coins,
  FactoryIcon,
  Fingerprint,
  HandCoinsIcon,
  IdCardIcon,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  PackageIcon,
  QrCodeIcon,
  TagIcon,
  TicketPercent,
} from 'lucide-react'

export const main = [
  { name: 'Dashboard',          url: '/dashboard',    icon: LayoutDashboard },
  { name: 'Subscriptions (B2C)', url: '/subscriptions', icon: Layers        },
  { name: 'QR Codes (B2B)',     url: '/packages',     icon: QrCodeIcon      },
  { name: 'Physical QR Codes',  url: '/physical-qr',  icon: Fingerprint     },
  { name: 'Customers',          url: '/customers',    icon: Building2       },
  { name: 'Manual Sales',       url: '/manual-sales', icon: HandCoinsIcon   },
]

export const system = [
  { name: 'Company Data',  url: '/company', icon: BuildingIcon },
  { name: 'System Users',  url: '/users',   icon: IdCardIcon   },
]

export const records = [
  { name: 'Subscriptions (B2C)', url: '/subscriptions', icon: Layers      },
  { name: 'QR Codes (B2B)',      url: '/packages',      icon: QrCodeIcon  },
  { name: 'Suppliers',           url: '/suppliers',     icon: FactoryIcon },
  { name: 'Products',            url: '/products',      icon: PackageIcon },
  { name: 'Services',            url: '/services',      icon: LifeBuoy    },
  { name: 'Customers',           url: '/customers',     icon: Building2   },
]

export const categories = [
  { name: 'Supplier Categories', url: '/supplier-categories', icon: TagIcon },
  { name: 'Product Categories',  url: '/product-categories',  icon: TagIcon },
  { name: 'Service Categories',  url: '/service-categories',  icon: TagIcon },
  { name: 'Customer Categories', url: '/customer-categories', icon: TagIcon },
]

export const purchasing = [
  { name: 'Products', url: '/purchasing/products', icon: PackageIcon },
  { name: 'Services', url: '/purchasing/services', icon: LifeBuoy    },
]

export const inventory = [
  { name: 'Products', url: '/inventory/products', icon: PackageIcon },
]

export const sales = [
  { name: 'Sales',              url: '/sales',                    icon: Coins          },
  { name: 'Manual Sales',       url: '/manual-sales',             icon: HandCoinsIcon  },
  { name: 'Discount Coupons',   url: '/sales/discount-coupons',   icon: TicketPercent  },
]

export const finance = [
  { name: 'Finance', url: '/finance', icon: ChartNoAxesCombined },
]

export const groups = [
  { label: 'System',      items: system     },
  { label: 'Records',     items: records    },
  { label: 'Categories',  items: categories },
  { label: 'Purchasing',  items: purchasing },
  { label: 'Inventory',   items: inventory  },
  { label: 'Sales',       items: sales      },
  { label: 'Finance',     items: finance    },
]
