/**
 * Modal component that requires users to input a valid business email
 * before accessing the marketing plan
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isFreeEmailDomain, EMAIL_REGEX, EMAIL_GATE_MESSAGES } from '@/constants/emailGate';
import { X, AlertCircle } from 'lucide-react';
import { addLog } from '@/services/api';
import { addDbLog } from './ApiLogs';

interface EmailGateModalProps {
  onSuccess: (email: string) => void;
  companyName: string;
  companySize?: string;
  pageUrl: string;
}

const EmailGateModal = ({ onSuccess, companyName, companySize, pageUrl }: EmailGateModalProps) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (emailAddress: string): { isValid: boolean; errorMessage?: string } => {
    // Special case: Accept exactly "sss" as valid (no whitespace, case sensitive)
    if (emailAddress === 'sss') {
      return { isValid: true };
    }
    
    // Check if the email matches the basic email pattern
    if (!EMAIL_REGEX.test(emailAddress)) {
      return { isValid: false, errorMessage: EMAIL_GATE_MESSAGES.INVALID_EMAIL };
    }

    // Extract the domain from the email
    const domain = emailAddress.split('@')[1];
    
    // Check if the domain matches any free email provider pattern
    if (isFreeEmailDomain(domain)) {
      return { isValid: false, errorMessage: EMAIL_GATE_MESSAGES.FREE_DOMAIN };
    }

    return { isValid: true };
  };

  const sendWebhook = async (userEmail: string) => {
    const webhookUrl = 'https://hook.eu1.make.com/cs6y2v6qu0370u73mkkwp5s6kf3neoye';
    
    const payload = {
      email: userEmail,
      company_name: companyName,
      company_size: companySize || 'Unknown',
      marketing_plan_url: pageUrl,
      created_date: new Date().toISOString(),
    };
    
    try {
      // Log the webhook request
      addDbLog({
        type: 'query',
        operation: 'webhook',
        data: payload,
        timestamp: new Date().toISOString()
      });
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      // Log the webhook response status
      addDbLog({
        type: 'result',
        operation: 'webhook',
        data: {
          status: response.status,
          statusText: response.statusText,
        },
        timestamp: new Date().toISOString()
      });
      
      console.log('Webhook sent successfully', response);
    } catch (error) {
      console.error('Failed to send webhook:', error);
      addDbLog({
        type: 'result',
        operation: 'webhook',
        data: {
          error: 'Failed to send webhook',
          details: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
        status: 'error'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const { isValid, errorMessage } = validateEmail(email);
    
    if (!isValid) {
      setError(errorMessage || '');
      setIsSubmitting(false);
      return;
    }
    
    // If valid, send webhook and continue
    try {
      await sendWebhook(email);
    } catch (error) {
      console.error('Error sending webhook:', error);
      // Continue with success even if webhook fails
    }
    
    // Clear any errors and call onSuccess
    setError(null);
    onSuccess(email);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md relative overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-3 text-gray-900">{EMAIL_GATE_MESSAGES.TITLE}</h2>
          <p className="mb-6 text-gray-600">{EMAIL_GATE_MESSAGES.DESCRIPTION}</p>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Business Email</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={EMAIL_GATE_MESSAGES.PLACEHOLDER}
                  className={`w-full ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                  autoFocus
                />
                
                {error && (
                  <div className="flex items-center text-red-500 text-sm mt-1">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-dusty-primary hover:bg-dusty-primary/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : EMAIL_GATE_MESSAGES.BUTTON_TEXT}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EmailGateModal;
