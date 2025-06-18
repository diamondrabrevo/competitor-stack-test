
/**
 * Brevo Call to Action component displayed as a sticky footer at the bottom of the marketing plan
 */
import { ArrowRight, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BrevoCallToAction = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-teal-500 to-green-500 shadow-2xl border-t-4 border-teal-300">
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left side - Main message */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Target className="h-5 w-5 text-white" />
              <h2 className="text-xl font-tomato font-semibold text-white">
                Ready to turn this plan into results?
              </h2>
            </div>
            <p className="text-teal-50 text-sm leading-relaxed font-inter">
              Your marketing plan is just the beginning. See how Brevo's omnichannel CRM can help you execute every strategy and track real ROI.
            </p>
          </div>
          
          {/* Right side - CTA and stats */}
          <div className="flex flex-col items-center gap-3">
            <Button
              asChild
              className="bg-white text-teal-600 hover:bg-teal-50 font-inter font-medium px-6 py-3 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
            >
              <a 
                href="https://www.brevo.com/enterprise/contact-us/?utm_medium=tool&utm_source=marketing-plan-generator&utm_campaign=ALL-ENT-tool-marketing-plan-generator" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Get Expert Guidance
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            
            <div className="text-xs text-teal-100 text-center font-inter">
              Free consultation • No commitment
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrevoCallToAction;
