
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import MarketingPlanPage from "./pages/MarketingPlanPage";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "./components/ErrorBoundary";

// Configure query client with retry options and error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ShadcnToaster />
      <Sonner position="top-center" closeButton richColors />
      <BrowserRouter>
        <ErrorBoundary resetOnPropsChange={true}>
          <Routes>
            {/* Ensure the root path strictly renders Index component */}
            <Route path="/" element={<Index />} />
            
            {/* Support both URL patterns with explicit paths */}
            <Route path="/results/:companyDomain" element={<MarketingPlanPage />} />
            <Route path="/plan/:conversationId" element={<MarketingPlanPage />} />
            
            {/* Add a catch-all route for 404 handling */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
