import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function LoginModal({
  open,
  onClose,
  title,
  children
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-slate-900/80 
              border border-white/10 backdrop-blur-2xl shadow-2xl p-8"
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-black text-white mb-6">
                {title}
              </h3>

              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
