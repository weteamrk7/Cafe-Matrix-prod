import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, CalendarDays, ShoppingBag, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import OffersTicker from "./OffersTicker";

const navLinks = [
  { label: "Menu", href: "/#menu" },
  { label: "About", href: "/#about" },
  { label: "Gallery", href: "/#gallery" },
  { label: "Visit", href: "/#visit" },
];

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "bg-background/90 backdrop-blur-md shadow-soft"
            : "bg-transparent"
        }`}
      >
        <div className={`container mx-auto px-6 flex items-center justify-between transition-all duration-500 ${isScrolled ? 'py-4' : 'py-6'}`}>
          {/* Logo */}
          <a href="#" className="relative z-10 flex items-center gap-2">
            <img src="/logo.png" alt="Matrix Cafe" className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-full" />
            <h1 className={`font-display text-xl md:text-2xl font-semibold tracking-tight transition-colors duration-500 ${isScrolled ? 'text-foreground' : 'text-white'}`}>
              Café Matrix<span className="text-accent">.</span>
            </h1>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors animated-underline"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="default">
                <Shield className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
            <Link to="/order">
              <Button variant="outline" size="default">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Order Now
              </Button>
            </Link>
            <Link to="/reservations">
              <Button variant="hero" size="default">
                <CalendarDays className="w-4 h-4 mr-2" />
                Reserve Table
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden relative z-10 p-2"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>
        <OffersTicker />
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-background pt-24"
          >
            <nav className="flex flex-col items-center gap-8 py-12">
              {navLinks.map((link, index) => (
                <motion.a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="font-display text-3xl text-foreground hover:text-accent transition-colors"
                >
                  {link.label}
                </motion.a>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-4"
              >
                <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="xl">
                    <Shield className="w-5 h-5 mr-2" />
                    Admin
                  </Button>
                </Link>
                <Link to="/order" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" size="xl">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Order Now
                  </Button>
                </Link>
                <Link to="/reservations" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="hero" size="xl">
                    <CalendarDays className="w-5 h-5 mr-2" />
                    Reserve Table
                  </Button>
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
