import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Gift, AlertCircle, Info, CheckCircle2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { playToastSound } from "@/hooks/useToastSound";
import { useToast } from "@/hooks/use-toast";

interface ActiveReward {
  reward_code: string;
  dice_value: number;
  reward_won: string;
  bill_amount: number;
  created_at: string;
}

const REWARDS_MAPPING: Record<number, string> = {
  1: "Free French Fries 🍟",
  2: "Free Brownie 🍫",
  3: "Free Mojito 🍹",
  4: "Free Shake 🥤",
  5: "Free Burger 🍔",
  6: "Free Mini Cheese Corn Pizza OR Flat 10% OFF 🍕",
};

// Generates a random 4-digit number code like MXD-4827
const generateRewardCode = (): string => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MXD-${num}`;
};

// Generates a random device ID if none exists
const getOrCreateDeviceId = (): string => {
  let deviceId = localStorage.getItem("matrix_dice_device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("matrix_dice_device_id", deviceId);
  }
  return deviceId;
};

const Dice = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // State
  const [billAmount, setBillAmount] = useState<string>("");

  useEffect(() => {
    const amount = searchParams.get("amount");
    if (amount) {
      setBillAmount(amount);
    }
  }, [searchParams]);

  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [hasRolled, setHasRolled] = useState<boolean>(false);
  const [diceValue, setDiceValue] = useState<number>(1);
  const [rewardCode, setRewardCode] = useState<string>("");
  const [activeReward, setActiveReward] = useState<ActiveReward | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(true);
  
  // 3D Dice Rotations
  const [cubeRotation, setCubeRotation] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Confetti particles array
  const confettiParticles = useRef<any[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Check anti-abuse rules on mount
  useEffect(() => {
    const checkAbuseAndActiveRewards = async () => {
      setIsChecking(true);
      const deviceId = getOrCreateDeviceId();
      const orderParam = searchParams.get("order");

      // 1. If we have a specific order ID in the URL, verify if it has already been rolled
      if (orderParam) {
        try {
          const { data, error } = await supabase
            .from("dice_rolls")
            .select("*")
            .eq("order_id", orderParam)
            .limit(1);

          if (error) {
            console.warn("Could not query order_id in dice_rolls:", error);
          } else if (data && data.length > 0) {
            // Already rolled for this order ID! Display it
            const dbRoll = data[0];
            const active: ActiveReward = {
              reward_code: dbRoll.reward_code,
              dice_value: dbRoll.dice_value,
              reward_won: dbRoll.reward_won,
              bill_amount: Number(dbRoll.bill_amount),
              created_at: dbRoll.created_at,
            };
            setActiveReward(active);
            setHasRolled(true);
            setIsChecking(false);
            return;
          } else {
            // Not rolled yet for this order! Allow rolling.
            // Reset rolled state in case local storage has a cached roll from a previous order
            setActiveReward(null);
            setHasRolled(false);
            setIsChecking(false);
            return;
          }
        } catch (err) {
          console.error("Failed to query order roll:", err);
        }
      }

      const localActive = localStorage.getItem("matrix_dice_active_reward");
      const lastRollTimeStr = localStorage.getItem("matrix_dice_last_roll_time");

      // Verify expiration (24 hours) of local storage active rewards
      if (localActive && lastRollTimeStr) {
        const lastRollTime = new Date(lastRollTimeStr).getTime();
        const now = Date.now();
        if (now - lastRollTime > 24 * 60 * 60 * 1000) {
          // Expired
          localStorage.removeItem("matrix_dice_active_reward");
          localStorage.removeItem("matrix_dice_last_roll_time");
        } else {
          setActiveReward(JSON.parse(localActive));
          setHasRolled(true);
          setIsChecking(false);
          return;
        }
      }

      // Query database for double guard check (last 24 hours rolls for this device)
      try {
        const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from("dice_rolls")
          .select("*")
          .eq("device_id", deviceId)
          .gt("created_at", past24Hours)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          // If the table doesn't exist yet, we log it and continue gracefully
          console.warn("Supabase dice_rolls table might not exist yet:", error);
        } else if (data && data.length > 0) {
          const dbRoll = data[0];
          const active: ActiveReward = {
            reward_code: dbRoll.reward_code,
            dice_value: dbRoll.dice_value,
            reward_won: dbRoll.reward_won,
            bill_amount: Number(dbRoll.bill_amount),
            created_at: dbRoll.created_at,
          };
          setActiveReward(active);
          setHasRolled(true);
          localStorage.setItem("matrix_dice_active_reward", JSON.stringify(active));
          localStorage.setItem("matrix_dice_last_roll_time", active.created_at);
        }
      } catch (err) {
        console.error("Network or database query failed:", err);
      } finally {
        setIsChecking(false);
      }
    };

    checkAbuseAndActiveRewards();
  }, [searchParams]);

  // Confetti Canvas Loop
  const startConfetti = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    confettiParticles.current = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * canvas.height,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`,
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      confettiParticles.current.forEach((p) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - p.r / 2) * 15;

        if (p.y < canvas.height) {
          active = true;
        }

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();
      });

      if (active) {
        animationFrameId.current = requestAnimationFrame(draw);
      }
    };

    draw();
  };

  useEffect(() => {
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Roll action
  const handleRollDice = async () => {
    const amount = parseFloat(billAmount);
    if (isNaN(amount) || amount < 599) {
      setErrorMsg("Minimum bill amount of ₹599 required.");
      return;
    }

    setErrorMsg("");
    setIsRolling(true);

    // Spin it multiple times by adding large degree offsets
    const spins = 5;
    const finalVal = Math.floor(Math.random() * 6) + 1;
    
    // Custom rotations for each target value
    const targetRotations: Record<number, { x: number; y: number }> = {
      1: { x: spins * 360, y: spins * 360 }, // front
      2: { x: spins * 360, y: spins * 360 - 90 }, // right
      3: { x: spins * 360 - 90, y: spins * 360 }, // top
      4: { x: spins * 360 + 90, y: spins * 360 }, // bottom
      5: { x: spins * 360, y: spins * 360 + 90 }, // left
      6: { x: spins * 360 + 180, y: spins * 360 }, // back
    };

    const rotation = targetRotations[finalVal];
    setCubeRotation(rotation);

    setTimeout(async () => {
      setDiceValue(finalVal);
      const code = generateRewardCode();
      setRewardCode(code);

      const reward = REWARDS_MAPPING[finalVal];
      const deviceId = getOrCreateDeviceId();
      const timestamp = new Date().toISOString();

      const newRoll: ActiveReward = {
        reward_code: code,
        dice_value: finalVal,
        reward_won: reward,
        bill_amount: amount,
        created_at: timestamp,
      };

      // Save to Supabase (catch errors gracefully)
      try {
        const { error } = await supabase
          .from("dice_rolls")
          .insert({
            reward_code: code,
            dice_value: finalVal,
            reward_won: reward,
            bill_amount: amount,
            device_id: deviceId,
            order_id: searchParams.get("order") || null,
            redeemed: false,
            created_at: timestamp,
          });

        if (error) {
          console.error("Database save failed:", error);
        }
      } catch (dbErr) {
        console.error("Error writing to supabase:", dbErr);
      }

      // Save to LocalStorage
      localStorage.setItem("matrix_dice_active_reward", JSON.stringify(newRoll));
      localStorage.setItem("matrix_dice_last_roll_time", timestamp);

      setActiveReward(newRoll);
      setHasRolled(true);
      setIsRolling(false);
      playToastSound();
      startConfetti();
      toast({
        title: "Congratulations! 🎉",
        description: `You won: ${reward}`,
      });
    }, 2500); // 2.5 seconds spin
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground p-6">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Checking reward eligibility...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12 relative overflow-hidden">
      {/* Confetti Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-50 w-full h-full" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-display text-xl text-foreground">
            Matrix Dice Challenge
          </h1>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      <main className="container mx-auto px-6 max-w-xl py-8 space-y-8 relative">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-semibold uppercase tracking-wider">
            Dine-In Exclusive
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold">
            🎲 Roll Once, Win Every Time
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Rolling is unlocked for dining bills of **₹599 or above**.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!hasRolled ? (
            /* Roll Section */
            <motion.div
              key="roll-section"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-card/45 border border-border/80 rounded-2xl p-6 shadow-medium backdrop-blur-md space-y-6"
            >
              {/* Rewards Lookup Card */}
              <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-accent" /> Dice Rewards Matrix:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-foreground/90">
                  <div className="flex gap-2"><span>🎲1:</span> <span className="font-medium">French Fries</span></div>
                  <div className="flex gap-2"><span>🎲2:</span> <span className="font-medium">Brownie</span></div>
                  <div className="flex gap-2"><span>🎲3:</span> <span className="font-medium">Mojito</span></div>
                  <div className="flex gap-2"><span>🎲4:</span> <span className="font-medium">Shake</span></div>
                  <div className="flex gap-2"><span>🎲5:</span> <span className="font-medium">Burger</span></div>
                  <div className="flex gap-2"><span>🎲6:</span> <span className="font-medium">Mini Pizza / 10% OFF</span></div>
                </div>
              </div>

              {/* Bill Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="bill-amount" className="text-sm font-medium">Enter Bill Amount (₹)</Label>
                <div className="relative">
                  <Input
                    id="bill-amount"
                    type="number"
                    placeholder="Enter bill amount to roll..."
                    value={billAmount}
                    onChange={(e) => {
                      setBillAmount(e.target.value);
                      if (errorMsg) setErrorMsg("");
                    }}
                    disabled={isRolling}
                    className="h-11 bg-background/50 border-border/80 focus-visible:ring-accent"
                  />
                </div>
                {errorMsg && (
                  <p className="text-xs text-destructive flex items-center gap-1.5 pt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errorMsg}
                  </p>
                )}
              </div>

              {/* Animated 3D Dice */}
              <div className="flex justify-center py-8">
                <div className="relative w-32 h-32 [perspective:1000px] flex items-center justify-center">
                  <motion.div
                    style={{
                      transformStyle: "preserve-3d",
                      rotateX: cubeRotation.x,
                      rotateY: cubeRotation.y,
                    }}
                    animate={
                      isRolling
                        ? {
                            rotateX: [0, 360, 720, 1080, 1440, cubeRotation.x],
                            rotateY: [0, 360, 720, 1080, 1440, cubeRotation.y],
                          }
                        : undefined
                    }
                    transition={
                      isRolling
                        ? {
                            duration: 2.5,
                            ease: "easeInOut",
                          }
                        : {
                            type: "spring",
                            stiffness: 100,
                            damping: 15,
                          }
                    }
                    className="w-16 h-16 relative transform-style-3d select-none"
                  >
                    {/* Face 1 (Front) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/15 shadow-xl flex items-center justify-center transform translate-z-[32px] backface-hidden">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                    {/* Face 6 (Back) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/15 shadow-xl flex items-center justify-center transform -translate-z-[32px] rotate-y-180 backface-hidden">
                      <div className="grid grid-cols-3 gap-2 w-10 h-10 items-center justify-items-center">
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      </div>
                    </div>
                    {/* Face 5 (Left) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/15 shadow-xl flex items-center justify-center transform -translate-x-[32px] rotate-y-90 backface-hidden">
                      <div className="grid grid-cols-3 gap-1.5 w-10 h-10 items-center justify-items-center">
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-0.5" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-0.5" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      </div>
                    </div>
                    {/* Face 2 (Right) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/15 shadow-xl flex items-center justify-center transform translate-x-[32px] rotate-y-90 backface-hidden">
                      <div className="grid grid-cols-2 gap-4 w-9 h-9 items-center justify-items-center">
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-0" />
                        <div className="w-0" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      </div>
                    </div>
                    {/* Face 3 (Top) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/15 shadow-xl flex items-center justify-center transform translate-y-[32px] rotate-x-90 backface-hidden">
                      <div className="grid grid-cols-3 gap-1.5 w-9 h-9 items-center justify-items-center">
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-0" />
                        <div className="w-0" />
                        <div className="w-0" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-0" />
                        <div className="w-0" />
                        <div className="w-0" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      </div>
                    </div>
                    {/* Face 4 (Bottom) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-accent to-orange-600 rounded-xl border border-accent-foreground/15 shadow-xl flex items-center justify-center transform -translate-y-[32px] rotate-x-90 backface-hidden">
                      <div className="grid grid-cols-2 gap-2 w-8 h-8 items-center justify-items-center">
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <Button
                variant="accent"
                size="xl"
                className="w-full text-base font-semibold tracking-wide"
                onClick={handleRollDice}
                disabled={isRolling || !billAmount}
              >
                {isRolling ? "Rolling Dice..." : "Roll Dice 🎲"}
              </Button>
            </motion.div>
          ) : (
            /* Results & Reward Code Card */
            <motion.div
              key="result-section"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 shadow-dramatic text-center space-y-6"
            >
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Congratulations 🎉
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  You Won: {activeReward?.reward_won}
                </h3>
              </div>

              {/* Reward Code Container */}
              <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Reward Code:
                </p>
                <p className="font-mono text-3xl font-bold text-accent tracking-wide">
                  {activeReward?.reward_code}
                </p>
              </div>

              {/* Expiration and Rules Notice */}
              <div className="text-xs text-muted-foreground text-left bg-accent/5 p-3 rounded-lg border border-accent/10 space-y-1.5 leading-relaxed">
                <p className="flex items-center gap-1 text-accent font-medium">
                  <Info className="w-3.5 h-3.5" /> Dine-In Redemption Info:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Show this code to the cashier at the counter to claim your free item.</li>
                  <li>This code is valid for **24 hours** from roll time.</li>
                  <li>One-time use only. Duplicate rolls from this device are blocked for 24 hours.</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) startConfetti();
                  }}
                  className="flex-1"
                >
                  Celebrate Again 🎉
                </Button>
                <Link to="/" className="flex-1">
                  <Button variant="secondary" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Dice;
