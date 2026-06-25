import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Phone,
  Receipt,
  ShoppingCart,
  Percent,
  Truck,
  Package,
  IndianRupee,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { playToastSound } from "@/hooks/useToastSound";
import { supabase } from "@/integrations/supabase/client";
import {
  orderMenuItems,
  orderCategories,
  type MenuItem as OrderMenuItem,
} from "@/data/orderMenuData";

interface BillingItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  categoryLabel: string;
  image: string;
  sizeLabel?: string;
}

const AdminBilling = () => {
  const { toast } = useToast();

  // Browse & search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Billing state
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [discount, setDiscount] = useState("");
  const [deliveryCharges, setDeliveryCharges] = useState("");
  const [parcelCharges, setParcelCharges] = useState("");

  // Validation
  const [phoneError, setPhoneError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<{ id: string; total: number } | null>(null);

  // Filter menu items based on search + category
  const filteredMenuItems = useMemo(() => {
    return orderMenuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  // Calculations
  const subtotal = useMemo(
    () =>
      billingItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [billingItems]
  );

  const discountAmount = useMemo(
    () => (discount ? parseFloat(discount) || 0 : 0),
    [discount]
  );

  const deliveryAmount = useMemo(
    () => (deliveryCharges ? parseFloat(deliveryCharges) || 0 : 0),
    [deliveryCharges]
  );

  const parcelAmount = useMemo(
    () => (parcelCharges ? parseFloat(parcelCharges) || 0 : 0),
    [parcelCharges]
  );

  const grandTotal = useMemo(
    () => Math.max(0, subtotal - discountAmount + deliveryAmount + parcelAmount),
    [subtotal, discountAmount, deliveryAmount, parcelAmount]
  );

  // Add item to billing (with optional size)
  const addItem = (item: OrderMenuItem, sizeLabel?: string, sizePrice?: number) => {
    const price = sizePrice ?? item.price;
    const uniqueId = sizeLabel ? `${item.id}__${sizeLabel}` : item.id;
    const displayName = sizeLabel ? `${item.name} (${sizeLabel})` : item.name;

    setBillingItems((prev) => {
      const existing = prev.find((bi) => bi.id === uniqueId);
      if (existing) {
        return prev.map((bi) =>
          bi.id === uniqueId ? { ...bi, quantity: bi.quantity + 1 } : bi
        );
      }
      return [
        ...prev,
        {
          id: uniqueId,
          name: displayName,
          price,
          quantity: 1,
          category: item.category,
          categoryLabel: item.categoryLabel,
          image: item.image,
          sizeLabel,
        },
      ];
    });
    toast({ title: `Added ${displayName}` });
  };

  // Update quantity
  const updateQuantity = (id: string, delta: number) => {
    setBillingItems((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove item
  const removeItem = (id: string) => {
    setBillingItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Phone validation
  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (cleaned.length !== 10) {
      setPhoneError("Phone number must be 10 digits");
      return false;
    }
    setPhoneError("");
    return true;
  };

  // Build WhatsApp message
  const buildWhatsAppMessage = (orderId?: string): string => {
    const name = customerName.trim() || "Customer";

    let msg = `Hello ${name},\nHere is your order summary from *Cafe Matrix*:\n\n`;
    msg += `🛒 *Items:*\n`;

    billingItems.forEach((item) => {
      const itemTotal = item.price * item.quantity;
      msg += `• ${item.name}`;
      if (item.quantity > 1) {
        msg += ` × ${item.quantity}`;
      }
      msg += ` – ₹${itemTotal}\n`;
    });

    msg += `\n─────────────────\n`;
    msg += `📋 *Subtotal:* ₹${subtotal}\n`;

    if (discountAmount > 0) {
      msg += `🎉 *Discount:* -₹${discountAmount}\n`;
    }
    if (deliveryAmount > 0) {
      msg += `🚚 *Delivery Charges:* ₹${deliveryAmount}\n`;
    }
    if (parcelAmount > 0) {
      msg += `📦 *Parcel Charges:* ₹${parcelAmount}\n`;
    }

    msg += `─────────────────\n`;
    msg += `💰 *Total Amount: ₹${grandTotal}*\n\n`;

    if (orderId && deliveryAmount === 0 && grandTotal >= 599) {
      msg += `🎲 *Matrix Dice Challenge:*\nSince your dine-in bill is ₹${grandTotal}, you qualify for a free roll! Click here to roll and win a guaranteed reward:\nhttps://cafematrix.co.in/dice?amount=${grandTotal}&order=${orderId}\n\n`;
    }

    msg += `Thank you for ordering with *Cafe Matrix*! 🙏\nWe hope you enjoy your meal! 😊\n\n🌐 Visit us: www.cafematrix.co.in`;

    return msg;
  };

  // Send WhatsApp and Save Order to Database
  const handleSendWhatsApp = async () => {
    if (billingItems.length === 0) {
      toast({
        title: "No items added",
        description: "Please add at least one item to the bill.",
        variant: "destructive",
      });
      playToastSound();
      return;
    }

    if (!validatePhone(phoneNumber)) {
      playToastSound();
      return;
    }

    setIsSaving(true);

    try {
      // 1. Create order in database
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_type: deliveryAmount > 0 ? "delivery" : "dine_in",
          customer_name: customerName.trim() || "Walk-in Customer",
          phone: phoneNumber.trim(),
          email: null,
          address: null,
          table_number: null,
          special_instructions: null,
          total: grandTotal,
          status: "completed",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items in database
      const orderItems = billingItems.map((item) => ({
        order_id: order.id,
        item_name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // 3. Open WhatsApp
      const cleaned = phoneNumber.replace(/\D/g, "");
      const fullNumber = `91${cleaned}`;
      const message = encodeURIComponent(buildWhatsAppMessage(order.id));
      const url = `https://wa.me/${fullNumber}?text=${message}`;

      window.open(url, "_blank");

      toast({
        title: "Order saved & WhatsApp opened!",
        description: "The order is saved in the dashboard and WhatsApp is opened.",
      });
      playToastSound();

      // Check if eligible for Dice Challenge (Dine-in and Total >= 599)
      if (deliveryAmount === 0 && grandTotal >= 599) {
        setLastOrderDetails({ id: order.id, total: grandTotal });
        setShowDiceModal(true);
      } else {
        // Clear the bill if not eligible
        handleClearBill();
      }
    } catch (error) {
      console.error("Error saving order:", error);
      toast({
        title: "Failed to save order",
        description: "There was an error saving the order to the database.",
        variant: "destructive",
      });
      playToastSound();
    } finally {
      setIsSaving(false);
    }
  };

  // Clear all
  const handleClearBill = () => {
    setBillingItems([]);
    setCustomerName("");
    setPhoneNumber("");
    setDiscount("");
    setDeliveryCharges("");
    setParcelCharges("");
    setPhoneError("");
  };

  // Check if an item (or any of its sizes) is already in the cart
  const isItemInCart = (itemId: string) => {
    return billingItems.some(
      (bi) => bi.id === itemId || bi.id.startsWith(`${itemId}__`)
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-2xl text-foreground">Billing</h2>
            <p className="text-sm text-muted-foreground">
              Create bills & send via WhatsApp
            </p>
          </div>
        </div>
        {billingItems.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearBill}
            className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Panel — Item Browser & Cart */}
        <div className="lg:col-span-3 space-y-5">
          {/* Search & Category Filters */}
          <div className="bg-card rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground text-sm uppercase tracking-wider">
                Add Items
              </h3>
              <span className="ml-auto text-xs text-muted-foreground">
                {orderMenuItems.length} items available
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="billing-item-search"
                placeholder="Search items by name or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Chips */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All
              </button>
              {orderCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="bg-card rounded-xl shadow-soft overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground text-sm uppercase tracking-wider">
                  {selectedCategory === "all"
                    ? "All Menu Items"
                    : orderCategories.find((c) => c.id === selectedCategory)
                        ?.label || "Items"}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {filteredMenuItems.length} result
                  {filteredMenuItems.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {filteredMenuItems.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-muted-foreground text-sm">
                  No items found
                  {searchQuery ? ` for "${searchQuery}"` : ""}
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                  {filteredMenuItems.map((item) => {
                    const inCart = isItemInCart(item.id);
                    const hasSizes = item.sizes && item.sizes.length > 0;

                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-4 py-3 border-b border-r border-border/40 transition-colors ${
                          inCart ? "bg-primary/5" : "hover:bg-muted/40"
                        }`}
                      >
                        {/* Item Image */}
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
                        />

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate leading-tight">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.categoryLabel} · ₹{item.price}
                          </p>
                        </div>

                        {/* Add Buttons */}
                        <div className="flex-shrink-0">
                          {hasSizes ? (
                            <div className="flex gap-1">
                              {item.sizes!.map((size) => {
                                const sizeId = `${item.id}__${size.label}`;
                                const sizeInCart = billingItems.some(
                                  (bi) => bi.id === sizeId
                                );
                                return (
                                  <button
                                    key={size.label}
                                    type="button"
                                    onClick={() =>
                                      addItem(item, size.label, size.price)
                                    }
                                    title={`${size.label} – ₹${size.price}`}
                                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all duration-150 ${
                                      sizeInCart
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {size.label.charAt(0)}
                                    <span className="block text-[9px] font-normal leading-tight">
                                      ₹{size.price}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addItem(item)}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${
                                inCart
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-primary/10 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {inCart ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Cart / Billing Items */}
          <div className="bg-card rounded-xl shadow-soft overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-foreground text-sm uppercase tracking-wider">
                    Order Items
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                  {billingItems.length} item
                  {billingItems.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {billingItems.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted/60 flex items-center justify-center">
                  <ShoppingCart className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No items added yet
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Browse the menu above to add items
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                <AnimatePresence mode="popLayout">
                  {billingItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      className="flex items-center gap-3 px-5 py-3 group"
                    >
                      {/* Item Image */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />

                      {/* Item Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ₹{item.price} each
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <p className="text-sm font-semibold text-foreground w-16 text-right tabular-nums">
                        ₹{item.price * item.quantity}
                      </p>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Summary & WhatsApp */}
        <div className="lg:col-span-2 space-y-5">
          {/* Customer Info */}
          <div className="bg-card rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground text-sm uppercase tracking-wider">
                Customer Details
              </h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="billing-customer-name" className="text-xs">
                  Customer Name
                </Label>
                <Input
                  id="billing-customer-name"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billing-phone" className="text-xs">
                  Phone Number *
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    +91
                  </span>
                  <Input
                    id="billing-phone"
                    type="tel"
                    placeholder="8431356962"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setPhoneNumber(val);
                      if (phoneError) validatePhone(val);
                    }}
                    className={`pl-11 ${
                      phoneError
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                  />
                </div>
                {phoneError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-destructive flex items-center gap-1"
                  >
                    <AlertCircle className="w-3 h-3" />
                    {phoneError}
                  </motion.p>
                )}
              </div>
            </div>
          </div>

          {/* Charges */}
          <div className="bg-card rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <IndianRupee className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground text-sm uppercase tracking-wider">
                Charges & Discounts
              </h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="billing-discount"
                  className="text-xs flex items-center gap-1.5"
                >
                  <Percent className="w-3 h-3" />
                  Discount (₹)
                </Label>
                <Input
                  id="billing-discount"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="billing-delivery"
                  className="text-xs flex items-center gap-1.5"
                >
                  <Truck className="w-3 h-3" />
                  Delivery Charges (₹)
                </Label>
                <Input
                  id="billing-delivery"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={deliveryCharges}
                  onChange={(e) => setDeliveryCharges(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="billing-parcel"
                  className="text-xs flex items-center gap-1.5"
                >
                  <Package className="w-3 h-3" />
                  Parcel Charges (₹)
                </Label>
                <Input
                  id="billing-parcel"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={parcelCharges}
                  onChange={(e) => setParcelCharges(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bill Summary */}
          <motion.div
            layout
            className="bg-card rounded-xl shadow-soft overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground text-sm uppercase tracking-wider">
                  Bill Summary
                </h3>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">₹{subtotal}</span>
              </div>

              {discountAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-green-600 flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Discount
                  </span>
                  <span className="font-medium text-green-600 tabular-nums">
                    -₹{discountAmount}
                  </span>
                </motion.div>
              )}

              {deliveryAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Delivery
                  </span>
                  <span className="font-medium tabular-nums">
                    +₹{deliveryAmount}
                  </span>
                </motion.div>
              )}

              {parcelAmount > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Parcel
                  </span>
                  <span className="font-medium tabular-nums">
                    +₹{parcelAmount}
                  </span>
                </motion.div>
              )}

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-foreground">
                    Grand Total
                  </span>
                  <span className="font-display text-2xl text-primary tabular-nums">
                    ₹{grandTotal}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* WhatsApp Button */}
          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button
              id="billing-send-whatsapp"
              onClick={handleSendWhatsApp}
              disabled={isSaving}
              className="w-full h-12 text-base font-semibold rounded-xl bg-[#25D366] hover:bg-[#1ebe5a] text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            >
              {isSaving ? (
                <span>Saving Order...</span>
              ) : (
                <>
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Send WhatsApp Message
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Dice Challenge Success Modal */}
      <AnimatePresence>
        {showDiceModal && lastOrderDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-card border border-border shadow-dramatic rounded-3xl p-6 overflow-hidden"
            >
              {/* Glowing decorative background */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none" />

              <div className="text-center space-y-5">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-accent/10 text-accent rounded-full text-3xl animate-bounce">
                  🎲
                </div>

                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    Matrix Dice Challenge!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This dine-in order of <span className="font-semibold text-accent">₹{lastOrderDetails.total}</span> qualifies for a free roll!
                  </p>
                </div>

                {/* QR Code Section */}
                <div className="flex flex-col items-center justify-center p-4 bg-muted/40 rounded-2xl border border-border/60">
                  <div className="w-48 h-48 bg-white p-2.5 rounded-xl shadow-soft flex items-center justify-center relative">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=5&data=${encodeURIComponent(
                        `${window.location.origin}/dice?amount=${lastOrderDetails.total}&order=${lastOrderDetails.id}`
                      )}`}
                      alt="Scan to roll"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-3">
                    Customer scans QR code to roll on phone
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-2">
                  <Button
                    onClick={() => {
                      window.open(
                        `/dice?amount=${lastOrderDetails.total}&order=${lastOrderDetails.id}`,
                        "_blank"
                      );
                    }}
                    className="w-full h-12 text-sm font-bold bg-gradient-to-r from-accent to-orange-500 hover:from-accent/90 hover:to-orange-500/90 text-white shadow-md shadow-accent/20 rounded-xl"
                  >
                    🖥️ Open Roll Page on Counter
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDiceModal(false);
                      setLastOrderDetails(null);
                      handleClearBill();
                    }}
                    className="w-full h-12 text-sm font-semibold rounded-xl"
                  >
                    Done & Clear Bill
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminBilling;
