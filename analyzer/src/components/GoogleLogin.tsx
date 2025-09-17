import { GoogleLogin as GoogleLoginButton } from '@react-oauth/google';
import { useState } from 'react';

interface GoogleLoginProps {
  onSuccess?: (credentialResponse: any) => void;
  onError?: () => void;
}

export const GoogleLogin: React.FC<GoogleLoginProps> = ({ onSuccess, onError }) => {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <GoogleLoginButton
        onSuccess={credentialResponse => {
          setError(null);
          onSuccess?.(credentialResponse);
        }}
        onError={() => {
          setError('Login Failed');
          onError?.();
        }}
        useOneTap
      />
      {error && (
        <div className="text-red-500 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default GoogleLogin;