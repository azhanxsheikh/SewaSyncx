import { useState } from 'react';
import { LoginPage as SharedLoginPage, type LoginPageProps } from '../../../../../packages/shared/src/auth/LoginPage';
import { TechnicianSignUpModal } from './TechnicianSignUpModal';

export interface TechnicianLoginPageProps extends Partial<LoginPageProps> {}

export function LoginPage(props: TechnicianLoginPageProps) {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  return (
    <>
      <SharedLoginPage
        title="SewaSync Technician"
        subtitle="Sign in to see your live dispatch feed"
        theme="light"
        {...props}
        portal="technician"
        onSignUpClick={() => setIsSignUpOpen(true)}
      />
      <TechnicianSignUpModal
        isOpen={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        onSuccess={props.onSuccess}
      />
    </>
  );
}

export default LoginPage;
