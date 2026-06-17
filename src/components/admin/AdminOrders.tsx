import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Truck, UtensilsCrossed, Check, X, Clock, Trash2, MapPin, ChefHat, Volume2, VolumeX, Pencil, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday } from "date-fns";
import { useOrderNotification } from "@/hooks/useOrderNotification";
import { playToastSound } from "@/hooks/useToastSound";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderMenuItems } from "@/data/orderMenuData";

interface OrderItem {
  id: string;
  item_name: string;
  category: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_type: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  table_number: number | null;
  status: string;
  total: number;
  special_instructions: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

// Get initials from customer name for avatar
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Generate a consistent color from a name string
const getAvatarColor = (name: string): string => {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
    "from-teal-500 to-green-600",
    "from-red-500 to-orange-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Get the date label for an order
const getDateLabel = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d");
};

// Group orders by date label
const groupOrdersByDate = (orders: Order[]): { label: string; orders: Order[] }[] => {
  const groups: Map<string, Order[]> = new Map();

  for (const order of orders) {
    const label = getDateLabel(order.created_at);
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(order);
  }

  return Array.from(groups.entries()).map(([label, orders]) => ({
    label,
    orders,
  }));
};

const AdminOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  // State for editing order
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editOrderType, setEditOrderType] = useState<"dine_in" | "delivery">("dine_in");
  const [editTableNumber, setEditTableNumber] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");
  const [editSpecialInstructions, setEditSpecialInstructions] = useState<string>("");
  const [editItems, setEditItems] = useState<Omit<OrderItem, "id">[]>([]);
  const [selectedAddItem, setSelectedAddItem] = useState<string>("");
  const [selectedAddSize, setSelectedAddSize] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return;
    }

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      (data || []).map(async (order) => {
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);
        return { ...order, order_items: items || [] };
      })
    );

    setOrders(ordersWithItems);
  }, []);

  const { setEnabled } = useOrderNotification(fetchOrders);

  useEffect(() => {
    setEnabled(notificationEnabled);
  }, [notificationEnabled, setEnabled]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
      playToastSound();
      return;
    }

    toast({ title: `Order ${status}` });
    playToastSound();
    fetchOrders();
  };

  const deleteOrder = async (id: string) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      toast({ title: "Failed to delete order", variant: "destructive" });
      playToastSound();
      return;
    }

    toast({ title: "Order deleted" });
    playToastSound();
    fetchOrders();
  };

  const startEditOrder = (order: Order) => {
    setEditingOrder(order);
    setEditCustomerName(order.customer_name);
    setEditPhone(order.phone);
    setEditOrderType(order.order_type as "dine_in" | "delivery");
    setEditTableNumber(order.table_number ? order.table_number.toString() : "");
    setEditAddress(order.address || "");
    setEditSpecialInstructions(order.special_instructions || "");
    
    // Copy order items to edit state
    const itemsCopy = (order.order_items || []).map(item => ({
      item_name: item.item_name,
      category: item.category,
      quantity: item.quantity,
      price: item.price
    }));
    setEditItems(itemsCopy);
    setIsEditOpen(true);
  };

  const handleIncrementQty = (index: number) => {
    setEditItems(prev => prev.map((item, idx) => 
      idx === index ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  const handleDecrementQty = (index: number) => {
    setEditItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const newQty = item.quantity - 1;
        if (newQty <= 0) return null;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as typeof prev);
  };

  const handleRemoveItem = (index: number) => {
    setEditItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddEditItem = () => {
    if (!selectedAddItem) return;
    const menuItem = orderMenuItems.find(item => item.id === selectedAddItem);
    if (!menuItem) return;

    let finalName = menuItem.name;
    let finalPrice = menuItem.price;

    if (menuItem.sizes && menuItem.sizes.length > 0) {
      const sizeLabel = selectedAddSize || menuItem.sizes[0].label;
      const sizeOption = menuItem.sizes.find(s => s.label === sizeLabel);
      if (sizeOption) {
        finalName = `${menuItem.name} (${sizeLabel})`;
        finalPrice = sizeOption.price;
      }
    }

    // Check if item already exists in edit list
    const existingIndex = editItems.findIndex(item => item.item_name === finalName);
    if (existingIndex > -1) {
      setEditItems(prev => prev.map((item, idx) => 
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setEditItems(prev => [
        ...prev,
        {
          item_name: finalName,
          category: menuItem.category,
          quantity: 1,
          price: finalPrice
        }
      ]);
    }
    
    // Clear selections
    setSelectedAddItem("");
    setSelectedAddSize("");
  };

  const editTotal = useMemo(() => {
    return editItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [editItems]);

  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    if (!editCustomerName.trim() || !editPhone.trim()) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    if (editOrderType === "delivery" && !editAddress.trim()) {
      toast({ title: "Please enter delivery address", variant: "destructive" });
      return;
    }
    if (editOrderType === "dine_in" && !editTableNumber.trim()) {
      toast({ title: "Please enter table number", variant: "destructive" });
      return;
    }
    if (editItems.length === 0) {
      toast({ title: "Order must have at least one item", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      // 1. Update orders table
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          customer_name: editCustomerName.trim(),
          phone: editPhone.trim(),
          order_type: editOrderType,
          table_number: editOrderType === "dine_in" ? parseInt(editTableNumber) : null,
          address: editOrderType === "delivery" ? editAddress.trim() : null,
          special_instructions: editSpecialInstructions.trim() || null,
          total: editTotal,
        })
        .eq("id", editingOrder.id);

      if (orderError) throw orderError;

      // 2. Delete all existing order items
      const { error: deleteError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", editingOrder.id);

      if (deleteError) throw deleteError;

      // 3. Insert updated order items
      const insertItems = editItems.map(item => ({
        order_id: editingOrder.id,
        item_name: item.item_name,
        category: item.category,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: insertError } = await supabase
        .from("order_items")
        .insert(insertItems);

      if (insertError) throw insertError;

      toast({ title: "Order updated successfully" });
      setIsEditOpen(false);
      setEditingOrder(null);
      fetchOrders();
    } catch (err: any) {
      console.error("Error saving order:", err);
      toast({ title: "Failed to save order changes", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-primary/20 text-primary">Confirmed</Badge>;
      case "preparing":
        return <Badge className="bg-accent/20 text-accent">Preparing</Badge>;
      case "completed":
        return <Badge className="bg-primary/30 text-primary">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/20 text-destructive">Cancelled</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">Pending</Badge>;
    }
  };

  const deliveryOrders = useMemo(() => orders.filter((o) => o.order_type === "delivery"), [orders]);
  const dineInOrders = useMemo(() => orders.filter((o) => o.order_type === "dine_in"), [orders]);

  const groupedDeliveryOrders = useMemo(() => groupOrdersByDate(deliveryOrders), [deliveryOrders]);
  const groupedDineInOrders = useMemo(() => groupOrdersByDate(dineInOrders), [dineInOrders]);

  const renderOrderCard = (order: Order) => {
    const isPending = order.status === "pending";
    const isComplete = order.status === "complete";
    const initials = getInitials(order.customer_name);
    const avatarColor = getAvatarColor(order.customer_name);

    return (
      <motion.div
        key={order.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`rounded-xl shadow-soft overflow-hidden border ${
          isPending
            ? "bg-accent/10 border-accent/30 ring-1 ring-accent/20"
            : isComplete
            ? "bg-foreground/90 border-foreground/50 text-background"
            : "bg-card border-border"
        }`}
      >
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            {/* Customer avatar + info */}
            <div className="flex items-start gap-3 flex-1">
              {/* Avatar */}
              <div
                className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center flex-shrink-0 shadow-md`}
              >
                <span className="text-white font-bold text-sm leading-none">
                  {initials}
                </span>
              </div>

              {/* Order details */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-medium text-foreground text-lg">
                    {order.customer_name}
                  </h3>
                  {getStatusBadge(order.status)}
                  {order.order_type === "dine_in" && order.table_number && (
                    <Badge variant="outline">Table {order.table_number}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(order.created_at), "MMM d, h:mm a")}
                  </span>
                  <span className="font-semibold text-primary">₹{order.total}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {order.phone}
                  {order.email && ` • ${order.email}`}
                </div>
                {order.order_type === "delivery" && order.address && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {order.address}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {order.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-primary"
                  onClick={() => updateOrderStatus(order.id, "confirmed")}
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
              {order.status === "confirmed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-foreground"
                  onClick={() => updateOrderStatus(order.id, "preparing")}
                >
                  <ChefHat className="w-4 h-4 text-foreground" />
                </Button>
              )}
              {order.status === "preparing" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-primary"
                  onClick={() => updateOrderStatus(order.id, "completed")}
                >
                  <Check className="w-4 h-4" />
                </Button>
              )}
              {order.status !== "cancelled" && order.status !== "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => updateOrderStatus(order.id, "cancelled")}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => startEditOrder(order)}
                title="Edit Order"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Order?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the order for <strong>{order.customer_name}</strong>? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteOrder(order.id)}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

        </div>

        {/* Order Items - Always visible */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="border-t border-border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Order Items:</p>
            <div className="space-y-2">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-foreground">
                    {item.quantity}x {item.item_name}
                  </span>
                  <span className="text-muted-foreground">₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            {order.special_instructions && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Notes:</span> {order.special_instructions}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  const renderDateGroup = (group: { label: string; orders: Order[] }) => (
    <div key={group.label} className="space-y-3">
      {/* Date label header */}
      <div className="flex items-center gap-3">
        <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase ${
          group.label === "Today"
            ? "bg-primary/15 text-primary border border-primary/20"
            : group.label === "Yesterday"
            ? "bg-black text-white border border-black dark:bg-white dark:text-black"
            : "bg-muted text-muted-foreground border border-border"
        }`}>
          {group.label}
        </div>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          {group.orders.length} order{group.orders.length !== 1 ? "s" : ""}
        </span>
      </div>
      {/* Orders under this date */}
      <div className="space-y-4">
        {group.orders.map(renderOrderCard)}
      </div>
    </div>
  );

  const renderEmptyState = (type: string) => (
    <div className="bg-card rounded-xl p-8 text-center">
      {type === "delivery" ? (
        <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      ) : (
        <UtensilsCrossed className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
      )}
      <p className="text-muted-foreground">
        No {type === "delivery" ? "delivery" : "dine-in"} orders yet
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-display text-2xl text-foreground">Orders</h2>
        <div className="flex items-center gap-2">
          <Button
            variant={notificationEnabled ? "outline" : "ghost"}
            size="sm"
            onClick={() => setNotificationEnabled(!notificationEnabled)}
            title={notificationEnabled ? "Mute notifications" : "Unmute notifications"}
          >
            {notificationEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchOrders}>
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dine_in" className="space-y-4">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          {/* Dine-In tab FIRST (left side) */}
          <TabsTrigger value="dine_in" className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4" />
            Dine-In
            {dineInOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {dineInOrders.length}
              </Badge>
            )}
          </TabsTrigger>
          {/* Delivery tab SECOND (right side) */}
          <TabsTrigger value="delivery" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Delivery
            {deliveryOrders.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {deliveryOrders.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Dine-In content FIRST */}
        <TabsContent value="dine_in" className="space-y-6">
          {dineInOrders.length === 0
            ? renderEmptyState("dine_in")
            : groupedDineInOrders.map(renderDateGroup)}
        </TabsContent>

        {/* Delivery content SECOND */}
        <TabsContent value="delivery" className="space-y-6">
          {deliveryOrders.length === 0
            ? renderEmptyState("delivery")
            : groupedDeliveryOrders.map(renderDateGroup)}
        </TabsContent>
      </Tabs>

      {/* Edit Order Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
            <DialogDescription>
              Modify customer details or order items for this order.
            </DialogDescription>
          </DialogHeader>

          {editingOrder && (
            <div className="space-y-6 my-4">
              {/* Customer Info Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Customer Name</Label>
                  <Input
                    id="edit-name"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <Input
                    id="edit-phone"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Order Type & Table/Address */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Order Type</Label>
                  <Select
                    value={editOrderType}
                    onValueChange={(val: "dine_in" | "delivery") => setEditOrderType(val)}
                  >
                    <SelectTrigger id="edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dine_in">Dine-In</SelectItem>
                      <SelectItem value="delivery">Delivery</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editOrderType === "dine_in" ? (
                  <div className="space-y-2">
                    <Label htmlFor="edit-table">Table Number</Label>
                    <Input
                      id="edit-table"
                      type="number"
                      value={editTableNumber}
                      onChange={(e) => setEditTableNumber(e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="edit-address">Delivery Address</Label>
                    <Input
                      id="edit-address"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Special Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-instructions">Special Instructions / Notes</Label>
                <Textarea
                  id="edit-instructions"
                  value={editSpecialInstructions}
                  onChange={(e) => setEditSpecialInstructions(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold mb-3">Order Items</h3>
                
                {/* Items List */}
                <div className="space-y-3 mb-4">
                  {editItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border text-sm"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-medium text-foreground">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">₹{item.price} each</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* Qty controller */}
                        <div className="flex items-center gap-2 bg-background border border-border rounded-full px-2 py-0.5">
                          <button
                            type="button"
                            onClick={() => handleDecrementQty(index)}
                            className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                          >
                            <Minus className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <span className="w-6 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleIncrementQty(index)}
                            className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                        
                        <span className="font-semibold w-16 text-right">
                          ₹{item.price * item.quantity}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {editItems.length === 0 && (
                    <p className="text-center py-4 text-sm text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                      No items in this order. Add items below.
                    </p>
                  )}
                </div>

                {/* Add Item Section */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Add Item to Order
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="add-item-select" className="text-xs">Select Item</Label>
                      <Select
                        value={selectedAddItem}
                        onValueChange={(val) => {
                          setSelectedAddItem(val);
                          // Select default size if item has sizes
                          const item = orderMenuItems.find(i => i.id === val);
                          if (item && item.sizes && item.sizes.length > 0) {
                            setSelectedAddSize(item.sizes[0].label);
                          } else {
                            setSelectedAddSize("");
                          }
                        }}
                      >
                        <SelectTrigger id="add-item-select" className="h-9">
                          <SelectValue placeholder="Choose menu item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {orderMenuItems.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} {item.sizes ? "" : `(₹${item.price})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedAddItem && orderMenuItems.find(i => i.id === selectedAddItem)?.sizes && (
                      <div className="space-y-1">
                        <Label htmlFor="add-size-select" className="text-xs">Select Size</Label>
                        <Select
                          value={selectedAddSize}
                          onValueChange={setSelectedAddSize}
                        >
                          <SelectTrigger id="add-size-select" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {orderMenuItems
                              .find(i => i.id === selectedAddItem)
                              ?.sizes?.map((size) => (
                                <SelectItem key={size.label} value={size.label}>
                                  {size.label} (₹{size.price})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto mt-2"
                    onClick={handleAddEditItem}
                    disabled={!selectedAddItem}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Total Calculation */}
              <div className="flex justify-between items-center bg-muted/40 p-4 rounded-xl border border-border">
                <span className="font-medium text-foreground">Estimated Total</span>
                <span className="text-2xl font-bold text-primary">₹{editTotal}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingOrder(null);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
