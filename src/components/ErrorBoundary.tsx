
/**
 * Error boundary component to catch unexpected runtime errors
 * Enhanced with forced reset capability and debug mode auto-activation
 */
import { Component, ErrorInfo, ReactNode } from 'react';
import ErrorState from './ErrorState';
import { addDbLog } from './ApiLogs'; // Import for direct DB logging

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  onErrorOccurred?: (occurred: boolean) => void; // New prop for debug mode activation
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  key: number; // Added key for forced resets
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    key: 0
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Auto-enable debug mode when error occurs
    if (this.props.onErrorOccurred) {
      this.props.onErrorOccurred(true);
    }
    
    // Log error to our database
    addDbLog({
      type: 'check',
      operation: 'ErrorBoundary Caught Error',
      data: { 
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
      },
      timestamp: new Date().toISOString(),
      status: 'error'
    });
    
    this.setState({
      errorInfo
    });
    
    // Report to error handling service if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }
  
  // Reset when props change if enabled
  public componentDidUpdate(prevProps: Props) {
    // Only reset if we have an error and resetOnPropsChange is true
    if (this.state.hasError && this.props.resetOnPropsChange) {
      // Check if any props have changed
      const currentProps = JSON.stringify(this.props);
      const previousProps = JSON.stringify(prevProps);
      
      if (currentProps !== previousProps) {
        console.log('ErrorBoundary: Props changed, resetting error state');
        this.handleRetry();
      }
    }
  }

  private handleRetry = () => {
    console.log('ErrorBoundary: Retrying after error');
    
    addDbLog({
      type: 'check',
      operation: 'ErrorBoundary Retry',
      data: { 
        previousError: this.state.error?.message,
        url: window.location.href
      },
      timestamp: new Date().toISOString()
    });
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      key: prevState.key + 1 // Increment key to force remount
    }));
  };

  public render() {
    if (this.state.hasError) {
      // If a custom fallback was provided, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';
      const errorDetails = [
        this.state.error?.stack,
        this.state.errorInfo?.componentStack
      ].filter(Boolean).join('\n\n');

      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
          <ErrorState
            message={errorMessage}
            details={errorDetails}
            onRetry={this.handleRetry}
          />
        </div>
      );
    }

    // Use the key to force remount when needed
    return <div key={this.state.key}>{this.props.children}</div>;
  }
}

export default ErrorBoundary;
