import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

interface CollapsibleToolProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
  dataTestId?: string
}

export const CollapsibleTool = ({
  title,
  icon,
  children,
  className,
  dataTestId
}: CollapsibleToolProps) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <AnimatePresence>
      <motion.div
        className="w-full max-w-full"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex gap-2 items-start w-full max-w-lg md:max-w-2xl">
          <div 
            className={cn("flex flex-col w-full", className)}
            data-testid={dataTestId}
          >
            <Button 
              variant="ghost" 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between w-full px-3 py-2 h-auto text-left bg-muted hover:bg-muted/80 rounded-md transition-colors duration-200"
            >
              <div className="text-sm font-medium flex items-center gap-2">
                <motion.div
                  animate={{ rotate: isOpen ? 90 : 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                >
                  <ChevronRight size={16} />
                </motion.div>
                {icon}
                <span>{title}</span>
              </div>
            </Button>
            
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ 
                    duration: 0.3, 
                    ease: "easeInOut",
                    opacity: { duration: 0.2 }
                  }}
                  className="overflow-hidden w-full"
                >
                  <div className="bg-muted/50 p-3 rounded-md border border-muted mt-2 w-full">
                    <motion.div 
                      initial={{ y: -10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1, duration: 0.2 }}
                      className="overflow-x-auto"
                    >
                      {children}
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
} 