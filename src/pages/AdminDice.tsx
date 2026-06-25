import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, LogOut, Check, ArrowLeft, Search, Calendar, Download, RefreshCw, BarChart2, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { playToastSound } from "@/hooks/useToastSound";

interface DiceRoll {
  id: string;
  reward_code: string;
  dice_value: number;
  reward_won: string;
  bill_amount: number;
  device_id: string;
  redeemed: boolean;
  redeemed_at: string | null;
  created_at: string;
}

const AdminDice = () => {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [password, setPassword] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  
  // Data State
  const [rolls, setRolls] = useState<DiceRoll[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [dbError, setDbError] = useState<boolean>(false);

  // Authentication check
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);

    try {
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "admin_password")
        .single();

      if (error) throw error;

      if (data.setting_value === password) {
        setIsAuthenticated(true);
        localStorage.setItem("admin_auth", "true");
        toast({ title: "Welcome!", description: "You are now logged in to the Dice Panel." });
      } else {
        toast({ title: "Incorrect password", variant: "destructive" });
      }
    } catch (error) {
      console.error("Login verification error:", error);
      toast({ title: "Login verification failed", variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_auth");
    setPassword("");
  };

  // Fetch rolls
  const fetchRolls = useCallback(async () => {
    setIsLoading(true);
    setDbError(false);
    try {
      const { data, error } = await supabase
        .from("dice_rolls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      
      setRolls(data || []);
    } catch (error) {
      console.error("Error fetching dice rolls:", error);
      setDbError(true);
      toast({ title: "Failed to fetch rolls", description: "Database table might not be created.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Check auth storage on load
  useEffect(() => {
    const isAuth = localStorage.getItem("admin_auth");
    if (isAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch rolls if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchRolls();
    }
  }, [isAuthenticated, fetchRolls]);

  // Mark as redeemed
  const handleRedeem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("dice_rolls")
        .update({
          redeemed: true,
          redeemed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Reward marked as redeemed!" });
      playToastSound();
      fetchRolls();
    } catch (error: any) {
      console.error("Redemption update failed:", error);
      toast({ title: "Redemption failed", description: error.message, variant: "destructive" });
    }
  };

  // Filtered rolls calculation
  const filteredRolls = useMemo(() => {
    return rolls.filter((roll) => {
      const matchesSearch = roll.reward_code.toLowerCase().includes(searchTerm.toLowerCase().trim());
      
      let matchesDate = true;
      if (dateFilter) {
        const rollDate = format(new Date(roll.created_at), "yyyy-MM-dd");
        matchesDate = rollDate === dateFilter;
      }

      return matchesSearch && matchesDate;
    });
  }, [rolls, searchTerm, dateFilter]);

  // Analytics
  const stats = useMemo(() => {
    const totalRolls = rolls.length;
    const redeemedCount = rolls.filter((r) => r.redeemed).length;
    const activeCount = totalRolls - redeemedCount;

    // Counts by rewards won
    const rewardCounts: Record<string, number> = {};
    rolls.forEach((r) => {
      rewardCounts[r.reward_won] = (rewardCounts[r.reward_won] || 0) + 1;
    });

    const mostWonRewards = Object.entries(rewardCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalRolls,
      redeemedCount,
      activeCount,
      mostWonRewards,
    };
  }, [rolls]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRolls.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = ["Reward Code", "Dice Value", "Reward Won", "Bill Amount", "Created At", "Redeemed", "Redeemed At"];
    const rows = filteredRolls.map((r) => [
      r.reward_code,
      r.dice_value,
      r.reward_won,
      r.bill_amount,
      format(new Date(r.created_at), "yyyy-MM-dd HH:mm:ss"),
      r.redeemed ? "Yes" : "No",
      r.redeemed_at ? format(new Date(r.redeemed_at), "yyyy-MM-dd HH:mm:ss") : "N/A",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.map((val) => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dice_rolls_export_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-foreground">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-dramatic"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl">Dice Roll Admin</h1>
            <p className="text-muted-foreground text-sm mt-2">Enter your admin password to access logs</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="h-11"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Link to="/admin" className="flex-1">
                <Button type="button" variant="outline" className="w-full h-11">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </Link>
              <Button type="submit" variant="accent" className="flex-1 h-11" disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Login"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon" title="Main Admin Panel">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="font-display text-2xl">
              Matrix<span className="text-accent">.</span> Dice Panel
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Supabase Missing Table Banner */}
        {dbError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-destructive flex items-center gap-1.5 text-sm">
                Database Table Missing
              </h3>
              <p className="text-xs text-muted-foreground max-w-xl">
                The `public.dice_rolls` table does not exist in your Supabase project database. Please apply the migration SQL file located at: `supabase/migrations/20260625000000_create_dice_rolls.sql` inside your Supabase SQL Editor.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={fetchRolls}>
              Retry Fetch
            </Button>
          </div>
        )}

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border p-5 rounded-xl shadow-soft space-y-1">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Total Dice Rolls</p>
            <p className="text-3xl font-bold text-accent">{stats.totalRolls}</p>
          </div>
          <div className="bg-card border border-border p-5 rounded-xl shadow-soft space-y-1">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Active Rewards</p>
            <p className="text-3xl font-bold text-foreground">{stats.activeCount}</p>
          </div>
          <div className="bg-card border border-border p-5 rounded-xl shadow-soft space-y-1">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Redeemed Rewards</p>
            <p className="text-3xl font-bold text-green-500">{stats.redeemedCount}</p>
          </div>
          <div className="bg-card border border-border p-5 rounded-xl shadow-soft space-y-2 col-span-1">
            <p className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-accent" /> Top Rewards Won
            </p>
            <div className="text-xs space-y-1">
              {stats.mostWonRewards.map((w, index) => (
                <div key={w.name} className="flex justify-between font-medium">
                  <span className="truncate max-w-[150px]">{index + 1}. {w.name}</span>
                  <span className="text-accent">{w.count} won</span>
                </div>
              ))}
              {stats.mostWonRewards.length === 0 && (
                <p className="text-muted-foreground text-center py-1">No stats available</p>
              )}
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-soft">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search Reward Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-border/80"
              />
            </div>
            {/* Date Input */}
            <div className="relative w-full sm:w-48">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-3 rounded-md bg-background border border-border/80 text-sm focus:outline-none focus:border-accent"
              />
            </div>
            {/* Reset Filters */}
            {(searchTerm || dateFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setDateFilter("");
                }}
              >
                Clear
              </Button>
            )}
          </div>

          <div className="flex gap-2 w-full md:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={fetchRolls} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button variant="accent" size="sm" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Dice Rolls Logs Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-muted-foreground text-xs uppercase font-semibold">
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Reward Code</th>
                  <th className="p-4">Dice Value</th>
                  <th className="p-4">Reward Won</th>
                  <th className="p-4">Bill Amount</th>
                  <th className="p-4">Redemption Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRolls.map((roll) => {
                  const createdDate = new Date(roll.created_at);
                  const isExpired = Date.now() - createdDate.getTime() > 24 * 60 * 60 * 1000;
                  
                  return (
                    <tr key={roll.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-mono text-xs whitespace-nowrap">
                        {format(createdDate, "yyyy-MM-dd HH:mm:ss")}
                      </td>
                      <td className="p-4 font-mono font-bold text-accent whitespace-nowrap">
                        {roll.reward_code}
                      </td>
                      <td className="p-4 text-center font-medium">
                        🎲 {roll.dice_value}
                      </td>
                      <td className="p-4 font-medium text-foreground">
                        {roll.reward_won}
                      </td>
                      <td className="p-4 font-mono font-semibold">
                        ₹{roll.bill_amount}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {roll.redeemed ? (
                          <div className="space-y-0.5">
                            <Badge className="bg-green-500/10 text-green-500 border border-green-500/25">Redeemed</Badge>
                            {roll.redeemed_at && (
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {format(new Date(roll.redeemed_at), "MM-dd HH:mm")}
                              </p>
                            )}
                          </div>
                        ) : isExpired ? (
                          <Badge variant="outline" className="text-muted-foreground border-border bg-muted/20">Expired</Badge>
                        ) : (
                          <Badge className="bg-accent/15 text-accent border border-accent/25">Active</Badge>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        {!roll.redeemed && !isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-green-500/5 text-green-500 hover:bg-green-500/10 hover:text-green-500 border-green-500/20"
                            onClick={() => handleRedeem(roll.id)}
                          >
                            <CheckSquare className="w-3.5 h-3.5 mr-1" /> Redeem
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredRolls.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {isLoading ? "Loading roll logs..." : "No dice rolls matched filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDice;
