import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface AccessDeniedPageProps {
  message?: string;
}

const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({ 
  message = "You don't have permission to access this section. Please contact an administrator if you believe this is an error."
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="max-w-lg w-full">
        <div className="flex flex-col items-center text-center p-6">
          <div className="bg-danger-100 p-4 rounded-full mb-6">
            <ShieldAlert size={64} className="text-danger-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-8">
            {message}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              leftIcon={<ArrowLeft size={18} />}
              className="w-full sm:w-auto"
            >
              Go Back
            </Button>
            
            <Button
              variant="primary"
              onClick={() => navigate('/dashboard')}
              leftIcon={<Home size={18} />}
              className="w-full sm:w-auto"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AccessDeniedPage;