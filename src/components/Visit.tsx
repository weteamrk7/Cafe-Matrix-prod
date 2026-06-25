import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { MapPin, Clock, Phone, Wifi, Car, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

const amenities = [
  { icon: Wifi, label: "Free WiFi" },
  { icon: Car, label: "Free Parking" },
  { icon: CreditCard, label: "UPI Payments" },
];

const Visit = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="visit" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            ref={ref}
            initial={{ opacity: 0, x: -60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-accent text-sm uppercase tracking-[0.3em] font-medium">
              Visit Us
            </span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground mt-4 mb-8">
              Come Say <span className="italic">Hello</span>
            </h2>

            {/* Info Cards */}
            <div className="space-y-6 mb-10">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Location</h4>
                  <p className="text-muted-foreground">Main Road, Sira Town, Karnataka</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Hours</h4>
                  <p className="text-muted-foreground">
                    Mon - Sun: 10:00 AM - 10:00 PM
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 bg-secondary rounded-lg">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Contact</h4>
                  <a href="tel:+918431356962" className="text-foreground font-medium hover:underline">+91 84313 56962</a>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-4 mb-10">
              {amenities.map((amenity) => (
                <div
                  key={amenity.label}
                  className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full"
                >
                  <amenity.icon className="w-4 h-4 text-accent" />
                  <span className="text-sm text-foreground">{amenity.label}</span>
                </div>
              ))}
            </div>

            <Button variant="hero" size="xl" asChild>
              <a
                href="https://maps.app.goo.gl/YESjwCiUVnYwUbxBA"
                target="_blank"
                rel="noopener noreferrer"
              >
                Get Directions
              </a>
            </Button>
          </motion.div>

          {/* Map Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-square bg-muted rounded-2xl overflow-hidden shadow-dramatic"
          >
            {/* Decorative Map Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-secondary to-muted">
              <div className="absolute inset-0 opacity-30">
                {/* Grid Pattern */}
                <div className="w-full h-full" style={{
                  backgroundImage: `
                    linear-gradient(hsl(var(--border)) 1px, transparent 1px),
                    linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px'
                }} />
              </div>
            </div>
            
            {/* Center Pin */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="relative"
              >
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center shadow-dramatic">
                  <MapPin className="w-8 h-8 text-accent-foreground" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-foreground/20 rounded-full blur-sm" />
              </motion.div>
            </div>

            {/* Label */}
            <div className="absolute bottom-6 left-6 right-6 bg-card/90 backdrop-blur-sm p-4 rounded-lg">
              <p className="font-display text-lg text-foreground">Matrix Cafe</p>
              <p className="text-sm text-muted-foreground">Sira, Karnataka</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Visit;
