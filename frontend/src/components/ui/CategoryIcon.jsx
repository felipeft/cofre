import {
  ShoppingCart,
  Car,
  UtensilsCrossed,
  Home,
  HeartPulse,
  Popcorn,
  RefreshCw,
  GraduationCap,
  MoreHorizontal,
  Wallet,
  Laptop,
  TrendingUp,
} from 'lucide-react'

const iconMap = {
  ShoppingCart,
  Car,
  UtensilsCrossed,
  Home,
  HeartPulse,
  Popcorn,
  RefreshCw,
  GraduationCap,
  MoreHorizontal,
  Wallet,
  Laptop,
  TrendingUp,
}

export default function CategoryIcon({ name, size = 16, className = '', style }) {
  const Icon = iconMap[name] ?? MoreHorizontal
  return <Icon size={size} className={className} style={style} strokeWidth={2} />
}
