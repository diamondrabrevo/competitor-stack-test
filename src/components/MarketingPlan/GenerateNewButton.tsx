
/**
 * Button component for generating a new marketing plan
 */
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface GenerateNewButtonProps {
  onClick: () => void;
}

const GenerateNewButton = ({ onClick }: GenerateNewButtonProps) => {
  return (
    <div className="w-full flex justify-center mb-6">
      <Button 
        onClick={onClick}
        className="bg-dusty-primary hover:bg-dusty-primary/90 text-white font-inter font-medium"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        Generate New Plan
      </Button>
    </div>
  );
};

export default GenerateNewButton;
