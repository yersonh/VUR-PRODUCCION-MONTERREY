import { motion } from 'framer-motion'
import alcaldiaLogo from '@/assets/logos/alcaldia.jpg'
import { cn } from '@/lib/utils'

interface AlcaldiaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
}

export function AlcaldiaLogo({ size = 'md', className }: AlcaldiaLogoProps) {
  return (
    <motion.div
      className={cn('rounded-full shrink-0 overflow-hidden cursor-pointer', sizes[size], className)}
      style={{ boxShadow: '0 0 0 2px #C8A800' }}
      whileHover={{
        scale: 1.12,
        boxShadow: '0 0 0 3px #C8A800, 0 0 0 6px rgba(200,168,0,0.25), 0 4px 20px rgba(200,168,0,0.3)',
        transition: { duration: 0.25, ease: 'easeOut' },
      }}
      whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
    >
      <motion.img
        src={alcaldiaLogo}
        alt="Escudo Alcaldía Monterrey Casanare"
        className="w-full h-full object-cover"
        whileHover={{ scale: 1.08, transition: { duration: 0.25 } }}
      />
    </motion.div>
  )
}
