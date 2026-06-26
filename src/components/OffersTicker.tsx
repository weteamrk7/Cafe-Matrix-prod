import { motion } from "framer-motion";

const offers = [
  "🍕 Buy 1 Medium Pizza & Get 1 Mini Pizza Free",
  "🍕 Buy 1 Large Pizza & Get 1 Regular Pizza Free",
  "🎂 Buy Half KG Pastry Cake & Decoration Only @699",
  "🎂 Buy 1 KG Pastry Cake & Decoration Only @899",
  "🍰 Buy Half KG Normal Cake & Decoration Only @499",
  "🍰 Buy 1 KG Normal Cake & Decoration Only @699",
  "🧁 Buy Any Pastry Piece Cake @ just 30 Rupees",
];

const OffersTicker = () => {
  // Duplicate offers to allow perfect seamless loop
  const tickerItems = [...offers, ...offers];

  return (
    <div className="w-full bg-primary border-t border-b border-primary-foreground/5 py-2.5 overflow-hidden flex items-center select-none z-40">
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          ease: "linear",
          duration: 35, // Smooth scrolling speed
          repeat: Infinity,
        }}
        className="flex whitespace-nowrap gap-16 pr-16 text-[10px] sm:text-xs uppercase tracking-[0.15em] font-medium text-primary-foreground/95"
      >
        {tickerItems.map((offer, idx) => (
          <span key={idx} className="flex items-center gap-16">
            <span>{offer}</span>
            <span className="text-accent">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
};

export default OffersTicker;
