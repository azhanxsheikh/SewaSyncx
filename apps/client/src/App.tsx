import { useEffect, useState, type ReactElement } from 'react';
import type { Screen } from '../../../src/types/navigation';

import Home from '../../../src/screens/Home';
import ServiceSelect from '../../../src/screens/sos/ServiceSelect';
import PriorityTriage from '../../../src/screens/sos/PriorityTriage';
import LocationSelect from '../../../src/screens/sos/LocationSelect';
import PhotoUpload from '../../../src/screens/sos/PhotoUpload';
import Questionnaire from '../../../src/screens/sos/Questionnaire';
import Pricing from '../../../src/screens/sos/Pricing';
import SOSConfirmation from '../../../src/screens/sos/SOSConfirmation';
import FindingTechnician from '../../../src/screens/sos/FindingTechnician';
import TechnicianAssigned from '../../../src/screens/sos/TechnicianAssigned';
import LiveTracking from '../../../src/screens/sos/LiveTracking';
import Chat from '../../../src/screens/sos/Chat';
import TechnicianArrived from '../../../src/screens/sos/TechnicianArrived';
import ServiceInProgress from '../../../src/screens/sos/ServiceInProgress';
import AdditionalCost from '../../../src/screens/sos/AdditionalCost';
import JobCompleted from '../../../src/screens/sos/JobCompleted';
import DigitalInvoice from '../../../src/screens/sos/DigitalInvoice';
import Payment from '../../../src/screens/sos/Payment';
import Rating from '../../../src/screens/sos/Rating';
import FamilySOS from '../../../src/screens/FamilySOS';
import ScheduledBooking from '../../../src/screens/ScheduledBooking';
import BookingHistory from '../../../src/screens/BookingHistory';
import Profile from '../../../src/screens/Profile';
import Notifications from '../../../src/screens/Notifications';
import SOSRouteErrorBoundary from '../../../src/components/SOSRouteErrorBoundary';
import { DispatchProvider } from '../../../src/context/DispatchContext';
import { DataProvider, useData } from '../../../src/context/DataProvider';
import { AuthProvider, useAuth } from '../../../packages/shared/src/auth';
import LoginPage from './components/auth/LoginPage';

type FamilySubScreen = 'list' | 'member' | 'tracking';
type ScheduledSubScreen = 'category' | 'service' | 'datetime' | 'address' | 'pricing' | 'confirmation';

export default function ClientApp() {
  return (
    <AuthProvider>
      <DataProvider>
        <ClientAppInner />
      </DataProvider>
    </AuthProvider>
  );
}

function ClientAppInner() {
  const { status, role, signOut } = useAuth();
  const [deniedMsg, setDeniedMsg] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [selectedService, setSelectedService] = useState('electrical');
  const [priority, setPriority] = useState('high');
  const [familySubScreen, setFamilySubScreen] = useState<FamilySubScreen>('list');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('f1');
  const [scheduledSubScreen, setScheduledSubScreen] = useState<ScheduledSubScreen>('category');

  useEffect(() => {
    if (status === 'signed-in' && role && role !== 'client') {
      void signOut();
      setDeniedMsg('ACCESS DENIED: Client portal is restricted to registered client accounts.');
    }
  }, [status, role, signOut]);

  const navigate = (s: Screen) => {
    if (s === 'admin') {
      window.location.href = window.location.hostname === 'localhost' ? 'http://localhost:3003' : '/admin';
      return;
    }
    setPrevScreen(screen);
    setScreen(s);
    const scheduledMap: Partial<Record<Screen, ScheduledSubScreen>> = {
      'scheduled-category': 'category',
      'scheduled-service': 'service',
      'scheduled-datetime': 'datetime',
      'scheduled-address': 'address',
      'scheduled-pricing': 'pricing',
      'scheduled-confirmation': 'confirmation',
    };
    if (scheduledMap[s]) setScheduledSubScreen(scheduledMap[s]!);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { justCompletedRequestId, clearJustCompleted, toastMessage, clearToast } = useData();
  useEffect(() => {
    if (!justCompletedRequestId) return;
    navigate('sos-completed');
    clearJustCompleted();
  }, [justCompletedRequestId, clearJustCompleted]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      clearToast();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage, clearToast]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Loading SOS HomeFix...</p>
        </div>
      </div>
    );
  }

  if (status === 'signed-out' || deniedMsg) {
    return (
      <LoginPage
        portal="client"
        title="SOS HomeFix"
        subtitle="Client SOS & Booking Portal"
        theme="light"
        initialError={deniedMsg}
        onSuccess={() => setDeniedMsg(null)}
      />
    );
  }

  if (role !== 'client') {
    return (
      <LoginPage
        portal="client"
        title="SOS HomeFix"
        subtitle="Client SOS & Booking Portal"
        theme="light"
        initialError="ACCESS DENIED: Client portal is restricted to registered client accounts."
      />
    );
  }

  const screenMap: Record<Screen, ReactElement> = {
    home: <Home navigate={navigate} />,

    'sos-service': (
      <ServiceSelect
        navigate={navigate}
        onBack={() => navigate('home')}
        setSelectedService={setSelectedService}
      />
    ),
    'sos-priority': (
      <PriorityTriage
        navigate={navigate}
        onBack={() => navigate('sos-service')}
        setPriority={setPriority}
        selectedService={selectedService}
      />
    ),
    'sos-location': (
      <LocationSelect
        navigate={navigate}
        onBack={() => navigate('sos-priority')}
      />
    ),
    'sos-photo': (
      <PhotoUpload
        navigate={navigate}
        onBack={() => navigate('sos-location')}
      />
    ),
    'sos-questionnaire': (
      <Questionnaire
        navigate={navigate}
        onBack={() => navigate('sos-photo')}
        selectedService={selectedService}
      />
    ),
    'sos-pricing': (
      <Pricing
        navigate={navigate}
        onBack={() => navigate('sos-questionnaire')}
        selectedService={selectedService}
        priority={priority}
      />
    ),
    'sos-confirmation': (
      <SOSConfirmation
        navigate={navigate}
        selectedService={selectedService}
        priority={priority}
      />
    ),
    'sos-finding': <FindingTechnician navigate={navigate} />,
    'sos-assigned': <TechnicianAssigned navigate={navigate} />,
    'sos-tracking': <LiveTracking navigate={navigate} />,
    'sos-chat': (
      <Chat
        navigate={navigate}
        onBack={() => navigate('sos-tracking')}
      />
    ),
    'sos-arrived': <TechnicianArrived navigate={navigate} />,
    'sos-inprogress': <ServiceInProgress navigate={navigate} />,
    'sos-additional-cost': (
      <AdditionalCost
        navigate={navigate}
        onBack={() => navigate('sos-inprogress')}
      />
    ),
    'sos-completed': <JobCompleted navigate={navigate} />,
    'sos-invoice': (
      <DigitalInvoice
        navigate={navigate}
        onBack={() => {
          clearJustCompleted();
          navigate(prevScreen === 'sos-completed' ? 'bookings' : (prevScreen || 'home'));
        }}
      />
    ),
    'sos-payment': (
      <Payment
        navigate={navigate}
        onBack={() => navigate('sos-invoice')}
      />
    ),
    'sos-rating': <Rating navigate={navigate} />,

    family: (
      <FamilySOS
        navigate={navigate}
        subScreen={familySubScreen}
        setSubScreen={setFamilySubScreen}
        selectedMember={selectedFamilyMember}
        setSelectedMember={setSelectedFamilyMember}
      />
    ),
    'family-member': (
      <FamilySOS
        navigate={navigate}
        subScreen="member"
        setSubScreen={setFamilySubScreen}
        selectedMember={selectedFamilyMember}
        setSelectedMember={setSelectedFamilyMember}
      />
    ),
    'scheduled-category': (
      <ScheduledBooking
        navigate={navigate}
        subScreen={scheduledSubScreen}
        setSubScreen={setScheduledSubScreen}
        onBack={() => navigate('home')}
      />
    ),
    'scheduled-service': (
      <ScheduledBooking
        navigate={navigate}
        subScreen={scheduledSubScreen}
        setSubScreen={setScheduledSubScreen}
        onBack={() => navigate('home')}
      />
    ),
    'scheduled-datetime': (
      <ScheduledBooking
        navigate={navigate}
        subScreen={scheduledSubScreen}
        setSubScreen={setScheduledSubScreen}
        onBack={() => navigate('home')}
      />
    ),
    'scheduled-address': (
      <ScheduledBooking
        navigate={navigate}
        subScreen={scheduledSubScreen}
        setSubScreen={setScheduledSubScreen}
        onBack={() => navigate('home')}
      />
    ),
    'scheduled-pricing': (
      <ScheduledBooking
        navigate={navigate}
        subScreen={scheduledSubScreen}
        setSubScreen={setScheduledSubScreen}
        onBack={() => navigate('home')}
      />
    ),
    'scheduled-confirmation': (
      <ScheduledBooking
        navigate={navigate}
        subScreen={scheduledSubScreen}
        setSubScreen={setScheduledSubScreen}
        onBack={() => navigate('home')}
      />
    ),

    bookings: <BookingHistory navigate={navigate} />,
    profile: <Profile navigate={navigate} />,
    notifications: <Notifications navigate={navigate} onBack={() => navigate(prevScreen)} />,
    admin: <div className="p-4 text-center text-sm text-gray-500">Redirecting to Admin Ops Console...</div>,
  };

  return (
    <DispatchProvider>
      <SOSRouteErrorBoundary>
        <div className="bg-gray-100 min-h-screen">
          <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-2xl shadow-gray-400/20">
            {toastMessage && (
              <div className="fixed top-4 left-4 right-4 z-50 pointer-events-none flex justify-center">
                <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-gray-800 text-sm font-600 flex items-center gap-2.5 animate-bounce pointer-events-auto">
                  <span>🔔</span>
                  <span>{toastMessage}</span>
                  <button onClick={clearToast} className="text-gray-400 hover:text-white ml-1 text-xs">✕</button>
                </div>
              </div>
            )}
            <div key={screen} className="fade-in">
              {screenMap[screen] || <Home navigate={navigate} />}
            </div>
          </div>
        </div>
      </SOSRouteErrorBoundary>
    </DispatchProvider>
  );
}
