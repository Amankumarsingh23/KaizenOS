"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { TopBar }    from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar }   from "./Sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

const pageTransition = {
  duration: 0.22,
  ease: [0.4, 0, 0.2, 1] as const,
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <TopBar />

        {/* Page content with transitions */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className={[
              "flex-1 w-full mx-auto",
              /* Horizontal padding: compact on mobile, comfortable on desktop */
              "px-4 sm:px-5 md:px-8",
              /* Top: small gap below sticky header */
              "pt-2",
              /* Bottom on mobile: clear the fixed bottom nav (64px) +
                 safe-area-inset-bottom + a little breathing room (16px) */
              "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px)+1rem)]",
              /* Desktop: regular padding, no nav overlap */
              "md:pb-10",
              /* Max width keeps content readable on very wide screens */
              "max-w-3xl",
            ].join(" ")}
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
