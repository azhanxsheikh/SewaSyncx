import { useState } from 'react';
import { LoginPage as SharedLoginPage, type LoginPageProps } from '../../../../../packages/shared/src/auth/LoginPage';
import { ClientSignUpModal } from './ClientSignUpModal';

export interface ClientLoginPageProps extends Partial<LoginPageProps> {}

export function LoginPage(props: ClientLoginPageProps) {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  return (
    <>
      <SharedLoginPage
        title="SOS HomeFix"
        subtitle="Client SOS & Booking Portal"
        theme="light"
        {...props}
        portal="client"
        onSignUpClick={() => setIsSignUpOpen(true)}
      />
      <ClientSignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        onSuccess={props.onSuccess}
      />
    </>
  );
}

export default LoginPage;
