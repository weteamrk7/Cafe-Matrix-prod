import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Gift, Zap, HelpCircle } from "lucide-react";

const REWARDS = [
  { emoji: "🍟", name: "French Fries" },
  { emoji: "🍫", name: "Brownie" },
  { emoji: "🍹", name: "Mojito" },
  { emoji: "🥤", name: "Shake" },
  { emoji: "🍔", name: "Burger" },
  { emoji: "🍕", name: "Mini Pizza OR 10% OFF" },
];

const DicePromo = () => {
  return (
    <section className="relative py-20 bg-muted/40 border-y border-border overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl -z-10" />

      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Promo Text (Left Side) */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              Dine-In Exclusive
            </div>

            <h2 className="font-display text-4xl sm:text-5xl text-foreground font-semibold leading-tight">
              🎲 Matrix Dice Challenge
            </h2>

            <p className="text-xl font-medium text-accent italic">
              Roll Once & Win Every Time!
            </p>

            <p className="text-muted-foreground max-w-xl text-base leading-relaxed">
              Celebrate your dining experience with us! Spend **₹599 or above** at Cafe Matrix, scan your bill, and roll our virtual 3D dice at the counter to win instant free rewards.
            </p>

            {/* Rewards Grid */}
            <div className="pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-accent" /> Exciting Rewards to Win:
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {REWARDS.map((reward, i) => (
                  <motion.div
                    key={reward.name}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    className="flex items-center gap-3 p-3.5 bg-card/60 border border-border/80 rounded-xl shadow-soft backdrop-blur-sm group hover:border-accent/40 hover:bg-card transition-all duration-300"
                  >
                    <span className="text-2xl group-hover:scale-125 transition-transform duration-300">
                      {reward.emoji}
                    </span>
                    <span className="text-sm font-medium text-foreground leading-tight">
                      {reward.name}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link to="/order" className="w-full sm:w-auto">
                <Button variant="accent" size="xl" className="w-full sm:w-auto shadow-lg hover:shadow-xl shadow-accent/15">
                  Roll The Dice
                </Button>
              </Link>
              
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/60 px-3 py-1.5 rounded-full border border-border">
                <HelpCircle className="w-3.5 h-3.5" /> Must have active Dine-In bill of ₹599+
              </span>
            </div>
          </div>

          {/* Dice Animation Display (Right Side) */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative w-full max-w-[280px] aspect-square flex justify-center items-center bg-card/40 border border-border/60 rounded-3xl p-6 shadow-dramatic backdrop-blur-md"
            >
              {/* Spinning 3D Mock Dice */}
              <motion.div
                animate={{
                  rotateX: [0, 360],
                  rotateY: [0, 360],
                  rotateZ: [0, 180],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-24 h-24 relative transform-style-3d cursor-pointer select-none"
              >
                {/* 3D Dice Faces */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/10 shadow-lg flex items-center justify-center text-3xl font-bold text-white transform translate-z-[48px]">
                  🎲
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/10 shadow-lg flex items-center justify-center text-3xl font-bold text-white transform -translate-z-[48px] rotate-y-180">
                  🍟
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/10 shadow-lg flex items-center justify-center text-3xl font-bold text-white transform -translate-x-[48px] rotate-y-90">
                  🍹
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/10 shadow-lg flex items-center justify-center text-3xl font-bold text-white transform translate-x-[48px] rotate-y-90">
                  🥤
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/10 shadow-lg flex items-center justify-center text-3xl font-bold text-white transform -translate-y-[48px] rotate-x-90">
                  🍔
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/10 shadow-lg flex items-center justify-center text-3xl font-bold text-white transform translate-y-[48px] rotate-x-90">
                  🍕
                </div>
              </motion.div>

              {/* Floating Emoticons */}
              <motion.span
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                className="absolute top-8 right-8 text-2xl"
              >
                ✨
              </motion.span>
              <motion.span
                animate={{ y: [0, -15, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute bottom-8 left-8 text-2xl"
              >
                🎉
              </motion.span>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DicePromo;
