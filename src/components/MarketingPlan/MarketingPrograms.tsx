
/**
 * Marketing programs table component
 */
import { BarChart3, Lightbulb, Target } from 'lucide-react';
import { MarketingPlan } from '@/services/types';

interface MarketingProgramsProps {
  programs: MarketingPlan['programs_list'];
}

const MarketingPrograms = ({ programs }: MarketingProgramsProps) => {
  // Convert programs to array if it's not already an array
  const programsArray = Array.isArray(programs) 
    ? programs 
    : Object.entries(programs || {}).map(([_, program]) => program);

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
      <div className="flex items-center mb-4">
        <div className="plan-section-icon">
          <BarChart3 className="h-4 w-4" />
        </div>
        <h2 className="ml-2 text-lg font-tomato font-semibold">Marketing Relationship Programs</h2>
      </div>

      <div className="program-header">
        <div className="program-cell font-inter font-medium">PROGRAM NAME</div>
        <div className="program-cell font-inter font-medium flex items-center">
          <Target className="h-4 w-4 mr-1 text-dusty-primary" />
          TARGET
        </div>
        <div className="program-cell font-inter font-medium flex items-center">
          <Lightbulb className="h-4 w-4 mr-1 text-dusty-primary" />
          OBJECTIVE
        </div>
        <div className="program-cell font-inter font-medium flex items-center">
          <BarChart3 className="h-4 w-4 mr-1 text-dusty-primary" />
          KPI
        </div>
      </div>

      {programsArray.length === 0 ? (
        <div className="text-center py-8 text-gray-500 font-inter">
          No marketing programs available
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {programsArray.map((program, index) => (
            <div key={index} className="program-row">
              <div className="program-cell font-inter font-medium">
                <div className="md:hidden text-xs text-gray-500 mb-1 font-inter">PROGRAM NAME</div>
                {program.program_name || program.name}
              </div>
              <div className="program-cell font-inter">
                <div className="md:hidden text-xs text-gray-500 mb-1 flex items-center font-inter">
                  <Target className="h-3 w-3 mr-1 text-dusty-primary" />
                  TARGET
                </div>
                {program.target}
              </div>
              <div className="program-cell font-inter">
                <div className="md:hidden text-xs text-gray-500 mb-1 flex items-center font-inter">
                  <Lightbulb className="h-3 w-3 mr-1 text-dusty-primary" />
                  OBJECTIVE
                </div>
                {program.objective}
              </div>
              <div className="program-cell font-inter">
                <div className="md:hidden text-xs text-gray-500 mb-1 flex items-center font-inter">
                  <BarChart3 className="h-3 w-3 mr-1 text-dusty-primary" />
                  KPI
                </div>
                {program.kpi}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketingPrograms;
