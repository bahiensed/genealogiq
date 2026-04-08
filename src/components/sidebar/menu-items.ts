import {
  BarChart2,
  BoxIcon,
  BuildingIcon,
  HandPlatterIcon,
  IdCardIcon,
  LayoutDashboard,
  QrCodeIcon,
  ShoppingCartIcon,
  StoreIcon,
  TagIcon,
  UsersIcon,
} from 'lucide-react'

export const main = [
  {
    name: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Licenses',
    url: '/licenses',
    icon: QrCodeIcon,
  },
  {
    name: 'Customers',
    url: '/customers',
    icon: UsersIcon,
  },
]

export const system = [
  {
    name: 'Company Data',
    url: '/company',
    icon: BuildingIcon,
  },
  {
    name: 'System Users',
    url: '/users',
    icon: IdCardIcon,
  },
]

export const records = [
  {
    name: 'Licenses',
    url: '/licenses',
    icon: QrCodeIcon,
  },
  {
    name: 'Suppliers',
    url: '/suppliers',
    icon: StoreIcon,
  },
  {
    name: 'Supplier Categories',
    url: '/supplier-categories',
    icon: TagIcon,
  },
  {
    name: 'Products',
    url: '/products',
    icon: BoxIcon,
  },
  {
    name: 'Services',
    url: '/services',
    icon: HandPlatterIcon,
  },
  {
    name: 'Customers',
    url: '/customers',
    icon: UsersIcon,
  },
  {
    name: 'Customer Categories',
    url: '/customer-categories',
    icon: TagIcon,
  },
]

export const purchasing = [
  {
    name: 'Products',
    url: '/purchasing/products',
    icon: BoxIcon,
  },
  {
    name: 'Services',
    url: '/purchasing/services',
    icon: HandPlatterIcon,
  },
]

export const inventory = [
  {
    name: 'Products',
    url: '/inventory/products',
    icon: BoxIcon,
  },
]

export const sales = [
  {
    name: 'Sales',
    url: '/sales',
    icon: ShoppingCartIcon,
  },
]

export const finance = [
  {
    name: 'Finance',
    url: '/finance',
    icon: BarChart2,
  },
]
