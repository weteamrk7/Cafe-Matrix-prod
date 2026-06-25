import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CalendarDays, Clock, Users, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Formspree endpoint
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mgolwldp";

const timeSlots = [
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
  "2:00 PM", "2:30 PM", "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM"
];

const occasions = [
  "Birthday", "Anniversary", "Business Meeting", "Date Night", 
  "Family Gathering", "Celebration", "Other"
];

const seatingOptions = ["Indoor", "Outdoor", "Window Seat", "Private Hall", "No Preference"];

const Reservations = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [date, setDate] = useState<Date>();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    time: "",
    partySize: "",
    dietaryNotes: "",
    occasion: "",
    seatingPreference: "",
    specialRequests: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !formData.time || !formData.name || !formData.email || !formData.phone || !formData.partySize) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("reservations").insert({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        date: format(date, "yyyy-MM-dd"),
        time: formData.time,
        party_size: parseInt(formData.partySize),
        dietary_notes: formData.dietaryNotes || null,
        occasion: formData.occasion || null,
        seating_preference: formData.seatingPreference || null,
        special_requests: formData.specialRequests || null,
        status: "pending"
      });

      if (error) throw error;

      // Send to Formspree
      await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "Reservation",
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          date: format(date, "MMMM d, yyyy"),
          time: formData.time,
          partySize: formData.partySize,
          seatingPreference: formData.seatingPreference || "No preference",
          occasion: formData.occasion || "Not specified",
          dietaryNotes: formData.dietaryNotes || "None",
          specialRequests: formData.specialRequests || "None",
        }),
      });

      setIsSuccess(true);
      toast({
        title: "Reservation Confirmed!",
        description: "We've received your reservation. You'll receive a confirmation email shortly."
      });
    } catch (error) {
      console.error("Reservation error:", error);
      toast({
        title: "Reservation Failed",
        description: "Something went wrong. Please try again or call us directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-3xl text-foreground mb-4">Reservation Confirmed!</h1>
          <p className="text-muted-foreground mb-8">
            Thank you, {formData.name}! We've reserved a table for {formData.partySize} on{" "}
            {date && format(date, "MMMM d, yyyy")} at {formData.time}.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            A confirmation email has been sent to {formData.email}.
          </p>
          <Link to="/">
            <Button variant="hero" size="lg">
              Back to Home
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            <h1 className="font-display text-2xl text-foreground">Reserve a Table</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-4xl text-foreground mb-4">
            Book Your Experience
          </h2>
          <p className="text-muted-foreground">
            Fill in the details below and we'll reserve the perfect table for you.
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          {/* Contact Info */}
          <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="font-display text-xl text-foreground mb-4">Contact Information</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 84313 56962"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Reservation Details */}
          <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="font-display text-xl text-foreground mb-4">Reservation Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Time *</Label>
                <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
                  <SelectTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Party Size *</Label>
                <Select value={formData.partySize} onValueChange={(value) => setFormData({ ...formData, partySize: value })}>
                  <SelectTrigger>
                    <Users className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Number of guests" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? "Guest" : "Guests"}
                      </SelectItem>
                    ))}
                    <SelectItem value="10+">10+ (Call us)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Seating Preference</Label>
                <Select value={formData.seatingPreference} onValueChange={(value) => setFormData({ ...formData, seatingPreference: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any preference?" />
                  </SelectTrigger>
                  <SelectContent>
                    {seatingOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div className="bg-card rounded-2xl p-6 shadow-soft space-y-4">
            <h3 className="font-display text-xl text-foreground mb-4">Special Requests</h3>
            
            <div className="space-y-2">
              <Label>Occasion</Label>
              <Select value={formData.occasion} onValueChange={(value) => setFormData({ ...formData, occasion: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Celebrating something special?" />
                </SelectTrigger>
                <SelectContent>
                  {occasions.map((occasion) => (
                    <SelectItem key={occasion} value={occasion}>{occasion}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietary">Dietary Requirements</Label>
              <Input
                id="dietary"
                placeholder="e.g., Vegetarian, Vegan, Gluten-free, Allergies"
                value={formData.dietaryNotes}
                onChange={(e) => setFormData({ ...formData, dietaryNotes: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requests">Additional Requests</Label>
              <Textarea
                id="requests"
                placeholder="Any special arrangements, decorations, or preferences..."
                rows={3}
                value={formData.specialRequests}
                onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            size="xl" 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Confirming..." : "Confirm Reservation"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            For parties larger than 10, please call us at{" "}
            <a href="tel:+918431356962" className="text-foreground font-medium hover:underline">
              +91 84313 56962
            </a>
          </p>
        </motion.form>
      </main>
    </div>
  );
};

export default Reservations;
