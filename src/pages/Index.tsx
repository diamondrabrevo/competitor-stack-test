import { useNavigate } from "react-router-dom";
import InputForm from "@/components/InputForm";
import {
  Rocket,
  ListOrdered,
  MessageSquare,
  BarChart2,
  Linkedin,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { startAnalysis } from "@/services/api";
import { normalizeDomain } from "@/utils/domainUtils";
import { getUserLanguage } from "@/utils/languageDetection";
import ApiLogs from "@/components/ApiLogs";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useDebugMode } from "@/hooks/useDebugMode";
import { Separator } from "@/components/ui/separator";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize debug mode hook
  const { showDebugLogs, setErrorOccurred } = useDebugMode();

  // Initialize language detection on component mount
  useEffect(() => {
    const detectedLanguage = getUserLanguage();
    console.log(
      "Language detection initialized on page load:",
      detectedLanguage
    );
  }, []);

  const handleSubmit = async (domain: string) => {
    setIsLoading(true);
    try {
      const normalizedDomain = normalizeDomain(domain);
      console.log("Starting competitor analysis for domain:", normalizedDomain);

      // Log language detection for analytics
      const userLanguage = getUserLanguage();
      console.log("User language detected for analysis:", userLanguage);

      // Add a small delay to show loading state
      //await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await startAnalysis(normalizedDomain);
      console.log("Analysis response:", response);

      if (response.success && response.conversationId) {
        // Navigate to results page
        navigate(`/results/${encodeURIComponent(normalizedDomain)}`, {
          state: {
            companyDomain: normalizedDomain,
            conversationId: response.conversationId,
            userLanguage: userLanguage, // Pass language to results page
          },
        });
      } else {
        const errorMessage = response.error || "Failed to start analysis";
        console.error("Analysis failed:", errorMessage);

        // Auto-enable debug logs for API failures
        setErrorOccurred(true);
        toast.error(errorMessage);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);

      // Auto-enable debug logs for unexpected errors
      setErrorOccurred(true);
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const testimonial = {
    quote:
      "The competitor analysis is incredibly accurate and detailed. It helped us understand our market position and identify key opportunities we were missing.",
    author: "Sarah Chen",
    position: "Product Manager",
    image: "/lovable-uploads/f8013694-f9ab-40a6-a32f-c52af1ea05cc.png",
    linkedin: "https://www.linkedin.com/in/sarah-chen",
  };

  return (
    <ErrorBoundary onErrorOccurred={setErrorOccurred}>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto flex h-16 items-center px-4">
            <img
              src="/lovable-uploads/3aa62476-6bd3-4794-a3d7-6136139f0630.png"
              alt="Brevo Logo"
              className="h-8"
            />
          </div>
        </header>

        <section className="flex-1">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div className="space-y-8">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-tomato font-bold text-gray-800 tracking-tight leading-tight">
                  Discover Your Top Competitors
                </h1>
                <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-inter">
                  Get instant insights into your top 3 competitors with detailed
                  analysis powered by AI. Understand your market position and
                  identify opportunities to stay ahead.
                </p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 hover:bg-green-200"
                  >
                    Free
                  </Badge>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-dusty-primary/15 to-dusty-primary/10 rounded-2xl transform rotate-6 transition-all duration-300 group-hover:from-dusty-primary/25 group-hover:to-dusty-primary/20 group-hover:scale-105 group-hover:rotate-3"></div>
                <div className="relative bg-white rounded-xl shadow-lg p-8 transition-all duration-300 group-hover:shadow-xl">
                  <InputForm onSubmit={handleSubmit} isLoading={isLoading} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-tomato font-semibold text-center mb-16">
              Why Use Competitor Stack?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20 max-w-7xl mx-auto">
              <div className="p-8 rounded-xl bg-gradient-to-b from-white to-gray-50 shadow-md border border-gray-100">
                <div className="h-14 w-14 bg-dusty-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <ListOrdered className="h-7 w-7 text-dusty-primary" />
                </div>
                <h3 className="text-2xl font-tomato font-semibold mb-4">
                  Top 3 Competitors
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed font-inter">
                  Get your most relevant competitors identified through advanced
                  AI analysis of market positioning and business models.
                </p>
              </div>

              <div className="p-8 rounded-xl bg-gradient-to-b from-white to-gray-50 shadow-md border border-gray-100">
                <div className="h-14 w-14 bg-dusty-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <MessageSquare className="h-7 w-7 text-dusty-primary" />
                </div>
                <h3 className="text-2xl font-tomato font-semibold mb-4">
                  Detailed Analysis
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed font-inter">
                  Comprehensive insights into each competitor's strengths,
                  weaknesses, and market positioning.
                </p>
              </div>

              <div className="p-8 rounded-xl bg-gradient-to-b from-white to-gray-50 shadow-md border border-gray-100">
                <div className="h-14 w-14 bg-dusty-primary/10 rounded-xl flex items-center justify-center mb-6">
                  <BarChart2 className="h-7 w-7 text-dusty-primary" />
                </div>
                <h3 className="text-2xl font-tomato font-semibold mb-4">
                  Market Intelligence
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed font-inter">
                  Understand your competitive landscape and identify
                  opportunities to differentiate and grow.
                </p>
              </div>
            </div>

            {/* Enhanced Review & Example Section */}
            <div className="max-w-7xl mx-auto relative mt-28 mb-20">
              <div className="absolute -top-16 left-1/2 transform -translate-x-1/2">
                <Badge
                  variant="outline"
                  className="py-2 px-6 bg-white border-2 border-dusty-primary/20 text-dusty-primary font-inter font-medium text-sm"
                >
                  REVIEWS & EXAMPLES
                </Badge>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* Single Testimonial Section */}
                <div className="bg-gradient-to-br from-white to-gray-50 p-8 md:p-10 rounded-2xl shadow-lg border border-gray-100 relative">
                  <div className="absolute -top-5 -left-5 text-5xl text-dusty-primary/20">
                    "
                  </div>

                  <div className="space-y-6">
                    <blockquote className="italic text-gray-600 text-xl mb-8 font-inter font-medium leading-relaxed">
                      {testimonial.quote}
                    </blockquote>

                    <div className="flex items-center gap-4">
                      <img
                        src={testimonial.image}
                        alt={testimonial.author}
                        className="w-16 h-16 rounded-full object-cover border-2 border-dusty-primary/20"
                      />
                      <div>
                        <div className="font-inter font-medium text-lg flex items-center gap-2">
                          {testimonial.author}
                          <a
                            href={testimonial.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-dusty-primary hover:text-dusty-primary/80"
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                        </div>
                        <p className="text-gray-600 font-inter">
                          {testimonial.position}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -bottom-5 -right-5 text-5xl text-dusty-primary/20">
                    "
                  </div>
                </div>

                {/* Example Section */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-8">
                    <h3 className="text-xl font-tomato font-semibold mb-2">
                      Try It Now
                    </h3>
                    <p className="text-gray-600 font-inter mb-4">
                      Enter any company domain to discover their top competitors
                      and get detailed market analysis.
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 font-mono">
                        Example: netflix.com, spotify.com, airbnb.com
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Decorative wave separator before footer */}
        <div className="bg-white relative h-16">
          <svg
            className="absolute bottom-0 w-full h-16"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 74"
          >
            <path
              fill="#f9fafb"
              fillRule="evenodd"
              d="M0,37.5 C320,79.5 480,11.5 720,11.5 C960,11.5 1120,79.5 1440,37.5 L1440,74 L0,74 L0,37.5 Z"
            ></path>
          </svg>
        </div>

        <footer className="bg-gray-50 py-8 border-t">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-600 font-inter">
              Made with ❤️ by{" "}
              <a
                href="https://www.brevo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dusty-primary hover:underline"
              >
                Brevo
              </a>
            </p>
            <p className="text-sm text-gray-500 mt-1 font-inter">
              Based on the methodology of{" "}
              <a
                href="https://www.cartelis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-dusty-primary hover:underline"
              >
                Cartelis consulting firm
              </a>
            </p>
          </div>
        </footer>

        {showDebugLogs && (
          <div className="fixed bottom-4 right-4 z-50">
            <ApiLogs />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Index;
