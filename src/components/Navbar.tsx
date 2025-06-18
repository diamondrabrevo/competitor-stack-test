
/**
 * Application navbar component
 */
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { APP_NAME } from '@/constants';

interface NavbarProps {
  onNewPlan?: () => void;
}

const Navbar = ({ onNewPlan }: NavbarProps) => {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="h-8">
          <img 
            src="/lovable-uploads/3aa62476-6bd3-4794-a3d7-6136139f0630.png" 
            alt="Brevo Logo" 
            className="h-full" 
          />
        </Link>
        
        <nav className="flex items-center gap-4">
          {onNewPlan && (
            <Button 
              onClick={onNewPlan}
              className="bg-dusty-primary hover:bg-dusty-primary/90 text-white"
            >
              New Plan
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
