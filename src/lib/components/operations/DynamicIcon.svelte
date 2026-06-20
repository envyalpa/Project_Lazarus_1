<script>
  import {
    Building2, Store, Globe, UserCircle, Factory,
    Landmark, ShoppingBag, HeartHandshake, GraduationCap, Gamepad2,
    User, Briefcase, Building,
    FileText, Table, Monitor, Folder, ClipboardCheck,
    Video, Calendar, Mail, MessageSquare, StickyNote,
    NotebookText, LayoutDashboard, Code, Hash, Kanban, Palette,
    Tag, Wallet, CreditCard, DollarSign, Ban, Trophy, TrendingUp, TrendingDown,
    Car, Receipt, UtensilsCrossed, Fuel, ShoppingCart, Scissors, PawPrint,
    Home, HeartPulse, Banknote, ArrowLeftRight, HelpCircle, Shirt, Heart,
    BookOpen
  } from '@lucide/svelte';

  let { name = 'User', size = 20, color = undefined } = $props();

  const iconMap = {
    Building2, Store, Globe, UserCircle, Factory,
    Landmark, ShoppingBag, HeartHandshake, GraduationCap, Gamepad2,
    User, Briefcase, Building,
    FileText, Table, Monitor, Folder, ClipboardCheck,
    Video, Calendar, Mail, MessageSquare, StickyNote,
    NotebookText, LayoutDashboard, Code, Hash, Kanban, Palette,
    Tag, Wallet, CreditCard, DollarSign, Ban, Trophy, TrendingUp, TrendingDown,
    Car, Receipt, UtensilsCrossed, Fuel, ShoppingCart, Scissors, PawPrint,
    Home, HeartPulse, Banknote, ArrowLeftRight, HelpCircle, Shirt, Heart,
    BookOpen
  };

  const Comp = $derived(iconMap[name] || User);
</script>

{#if Comp}
  <Comp {size} {color} />
{/if}

<style>
  :global(svg) {
    flex-shrink: 0;
  }
</style>
