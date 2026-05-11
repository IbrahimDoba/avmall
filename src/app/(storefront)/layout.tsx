import { TopNav } from "@/components/storefront/top-nav";
import { StorefrontFooter } from "@/components/storefront/footer";
import { AiChatWidget } from "@/components/storefront/ai-chat-widget";
import { Toaster } from "@/components/ui/toaster";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <TopNav />
      <main className="flex-1">{children}</main>
      <StorefrontFooter />
      <AiChatWidget />
      <Toaster />
    </div>
  );
}
