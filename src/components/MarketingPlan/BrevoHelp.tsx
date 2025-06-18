
/**
 * Component that displays how Brevo could help with implementing marketing programs
 */
import { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  MessageCircle,
  Rocket,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface BrevoScenario {
  scenario_name: string;
  why_brevo_is_better: string;
  omnichannel_channels: string;
  setup_efficiency: string;
}

interface BrevoHelpProps {
  scenarios: BrevoScenario[];
}

const BrevoHelp = ({ scenarios }: BrevoHelpProps) => {
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);

  const toggleScenario = (scenarioName: string) => {
    setExpandedScenario(prevExpanded => 
      prevExpanded === scenarioName ? null : scenarioName
    );
  };

  if (!scenarios || scenarios.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
      <div className="flex items-center mb-4">
        <div className="plan-section-icon">
          <Sparkles className="h-4 w-4 text-blue-500" />
        </div>
        <h2 className="ml-2 text-lg font-tomato font-semibold">How Brevo Could Help You</h2>
      </div>

      <div className="space-y-4">
        {scenarios.map((scenario, index) => {
          const isExpanded = expandedScenario === scenario.scenario_name;
          
          return (
            <Card key={index} className={`border border-gray-200 transition-all ${isExpanded ? 'shadow-md' : ''}`}>
              <button
                className="w-full flex justify-between items-center p-4 text-left font-inter font-medium"
                onClick={() => toggleScenario(scenario.scenario_name)}
                aria-expanded={isExpanded}
                aria-controls={`scenario-content-${index}`}
              >
                <span>{scenario.scenario_name}</span>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>
              
              {isExpanded && (
                <CardContent className="pt-0" id={`scenario-content-${index}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center text-sm font-inter font-medium mb-2">
                        <Rocket className="h-4 w-4 mr-1 text-blue-500" />
                        Why Brevo is Better
                      </div>
                      <p className="text-sm font-inter">{scenario.why_brevo_is_better}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center text-sm font-inter font-medium mb-2">
                        <MessageCircle className="h-4 w-4 mr-1 text-blue-500" />
                        Omnichannel Strategy
                      </div>
                      <p className="text-sm font-inter">{scenario.omnichannel_channels}</p>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded">
                      <div className="flex items-center text-sm font-inter font-medium mb-2">
                        <Lightbulb className="h-4 w-4 mr-1 text-blue-500" />
                        Setup Efficiency
                      </div>
                      <p className="text-sm font-inter">{scenario.setup_efficiency}</p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BrevoHelp;
