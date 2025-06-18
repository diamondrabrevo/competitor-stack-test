
/**
 * 404 Not Found page with marketing plan context
 */
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [domainFromUrl, setDomainFromUrl] = useState<string | null>(null);
  
  // Try to extract domain from URL if we're in a /results/ path
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/results/') && !path.includes('/conversation/')) {
      const domain = path.replace('/results/', '');
      if (domain && domain.length > 0) {
        setDomainFromUrl(domain);
      }
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-dusty-primary mb-4">404</h1>
        <h2 className="text-2xl font-medium text-gray-800 mb-6">Marketing Plan Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          {domainFromUrl ? 
            `We couldn't find a marketing plan for "${domainFromUrl}". This domain might not exist in our database yet.` :
            `We couldn't find the page you're looking for. It might have been moved or deleted.`
          }
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate('/')}
            className="bg-dusty-primary hover:bg-dusty-primary/90 text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <Button
            onClick={() => navigate('/', { state: { showForm: true, domainToGenerate: domainFromUrl } })}
            variant="outline"
            className="border-dusty-primary text-dusty-primary hover:bg-dusty-primary/10"
          >
            <Search className="mr-2 h-4 w-4" />
            Generate a New Plan
            {domainFromUrl && ` for ${domainFromUrl}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
