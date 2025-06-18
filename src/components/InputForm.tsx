/**
 * Form component for collecting the company domain input
 */
import { useState } from 'react';
import { Building2, Mail, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ERROR_MESSAGES } from '@/constants';
import { EMAIL_REGEX, isFreeEmailDomain } from '@/constants/emailGate';

interface InputFormProps {
  onSubmit: (domain: string, email: string) => void;
  isLoading: boolean;
}

const InputForm = ({
  onSubmit,
  isLoading
}: InputFormProps) => {
  const [domain, setDomain] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [domainError, setDomainError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const validateDomain = (domain: string): boolean => {
    const trimmedDomain = domain.trim();
    if (!trimmedDomain) {
      setDomainError(ERROR_MESSAGES.EMPTY_DOMAIN);
      return false;
    }

    // Basic domain validation - strip protocols and check for at least one dot
    const strippedDomain = trimmedDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!strippedDomain.includes('.')) {
      setDomainError('Please enter a valid domain (e.g. example.com)');
      return false;
    }

    // Check for common invalid inputs
    const lowercaseDomain = strippedDomain.toLowerCase();
    if (lowercaseDomain === 'example.com' || lowercaseDomain === 'test.com' || lowercaseDomain === 'domain.com' || lowercaseDomain === 'mydomain.com' || lowercaseDomain === 'yourcompany.com') {
      setDomainError('Please enter your actual company domain.');
      return false;
    }

    // Additional validation for problematic domains
    if (lowercaseDomain.length < 4) {
      setDomainError('Domain name appears too short. Please enter a valid domain.');
      return false;
    }

    // Check for domains that typically return no data
    // Removed amazon.com from the problematic domains list
    const problematicDomains = ['google.com', 'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'aol.com', 'mail.com', 'protonmail.com', 'icloud.com', 'me.com', 'a.com', 'b.com', 'c.com', 'microsoft.com', 'apple.com', 'facebook.com', 'xyz.com', 'abc.com', '123.com', 'test123.com', 'xrapit.io', 'xrapit.com', 'test.io', 'demo.io', 'app.io', 'site.io', 'web.io', 'dev.io'];
    if (problematicDomains.includes(lowercaseDomain)) {
      setDomainError('Please enter your company domain, not a generic or personal domain.');
      return false;
    }

    // Check for potentially problematic TLDs (top-level domains)
    const problematicTLDs = ['.io', '.xyz', '.test', '.example', '.local', '.dev'];
    const hasPotentiallyProblematicTLD = problematicTLDs.some(tld => lowercaseDomain.endsWith(tld));

    // More aggressive validation for .io domains
    if (hasPotentiallyProblematicTLD) {
      // For .io domains, must have a dash or be longer than 8 chars
      const domainWithoutTLD = lowercaseDomain.split('.')[0];
      if (domainWithoutTLD.length < 6 && !domainWithoutTLD.includes('-')) {
        setDomainError('This domain may not have enough public information. Please try a company with more established online presence.');
        return false;
      }

      // For very short .io domains, suggest they might not work
      if (domainWithoutTLD.length < 4) {
        setDomainError('Very short .io domains rarely have enough public information. Please try a different domain.');
        return false;
      }
    }
    setDomainError('');
    return true;
  };

  const validateEmail = (email: string): boolean => {
    // Special bypass for exactly "sss" (no spaces, case sensitive)
    if (email === 'sss') {
      setEmailError('');
      return true;
    }

    if (!email.trim()) {
      setEmailError('Please enter your business email.');
      return false;
    }

    if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }

    const emailDomain = email.split('@')[1];
    if (isFreeEmailDomain(emailDomain)) {
      setEmailError('Please use your company email address (not a free email provider).');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setDomainError('');
    setEmailError('');

    // Validate domain
    const domainValid = validateDomain(domain);

    // Validate email
    const emailValid = validateEmail(email);

    // Only submit if both are valid
    if (domainValid && emailValid) {
      onSubmit(domain.trim(), email.trim());
    }
  };

  return <Card className="border-none">
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-xxl font-medium text-dusty-primary">
          <Rocket size={20} />
          Marketing Plan Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Building2 size={16} />
              Company Domain
            </div>
            <Input type="text" placeholder="yourbrand.com" value={domain} onChange={e => setDomain(e.target.value)} className="w-full" disabled={isLoading} />
            {domainError && <p className="text-sm text-red-500">{domainError}</p>}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail size={16} />
              Business Email
            </div>
            <Input type="text" placeholder="you@yourcompany.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full" disabled={isLoading} />
            {emailError && <p className="text-sm text-red-500">{emailError}</p>}
          </div>
          
          <Button type="submit" className="w-full bg-dusty-primary hover:bg-dusty-primary/90 text-white" disabled={isLoading}>
            <Rocket className="mr-2 h-4 w-4" />
            {isLoading ? 'Generating Plan...' : 'Generate Marketing Plan'}
          </Button>
        </form>
      </CardContent>
    </Card>;
};

export default InputForm;
