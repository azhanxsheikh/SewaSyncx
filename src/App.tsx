import { useState, type ReactElement } from 'react';
import type { Screen } from './types/navigation';

import Home from './screens/Home';
import ServiceSelect from './screens/sos/ServiceSelect';
import PriorityTriage from './screens/sos/PriorityTriage';
import LocationSelect from './screens/sos/LocationSelect';
import PhotoUpload from './screens/sos/PhotoUpload';
import Questionnaire from './screens/sos/Questionnaire';
import Pricing from './screens/sos/Pricing';
import SOSConfirmation from './screens/sos/SOSConfirmation';
import FindingTechnician from './screens/sos/FindingTechnician';
import TechnicianAssigned from './screens/sos/TechnicianAssigned';
import LiveTracking from './screens/sos/LiveTracking';
import Chat from './screens/sos/Chat';
import TechnicianArrived from './screens/sos/TechnicianArrived';
import ServiceInProgress from './screens/sos/ServiceInProgress';
import AdditionalCost from './screens/sos/AdditionalCost';
import JobCompleted from './screens/sos/JobCompleted';
import DigitalInvoice from './screens/sos/DigitalInvoice';
import Payment from './screens/sos/Payment';
import Rating from './screens/sos/Rating';
import FamilySOS from './screens/FamilySOS';
import ScheduledBooking from './screens/ScheduledBooking';
import BookingHistory from './screens/BookingHistory';
import Profile from './screens/Profile';
import Notifications from './screens/Notifications';
import AdminDashboard from './components/admin/AdminDashboard';
import Login from './components/Login';
import { DispatchProvider } from './context/DispatchContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import SOSRouteErrorBoundary from './components/SOSRouteErrorBoundary';
import { getAppTarget } from './lib/appTarget';

type FamilySubScreen = 'list' | 'member' | 'tracking';
type ScheduledSubScreen = 'category' | 'service' | 'datetime' | 'address' | 'pricing' | 'confirmation';

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

function AppInner() {
  // Resolved once per render from env/port/path, not component state: which
  // surface this build serves is fixed for its lifetime (see lib/appTarget).
  const target = getAppTarget();
  const { status, staffRole } = useAuth();

  const [screen, setScreen] = useState<Screen>('home');
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [selectedService, setSelectedService] = useState('electrical');
  const [priority, setPriority] = useState('high');
  const [familySubScreen, setFamilySubScreen] = useState<FamilySubScreen>('list');
  const [selectedFamilyMember, setSelectedFamilyMember] = useState('f1');
  const [scheduledSubScreen, setScheduledSubScreen] = useState<ScheduledSubScreen>('category');

  const navigate = (s: Screen) => {
    setPrevScreen(screen);
    setScreen(s);
    // Sync scheduled sub-screen state when navigating to known scheduled routes
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

  const goBack = () => {
    navigate(prevScreen);
  };

  // Standalone Admin deployment (pnpm dev:admin / build:admin, or an /admin
  // path on a combined deployment — see lib/appTarget): render the Ops
  // console directly, without the client screen router or its
  // BroadcastChannel/localStorage dispatch bridge. This is separate from the
  // `admin` Screen below, which stays as the in-app "Admin Operations
  // Console" entry point reachable from Profile on the client target.
  // "Exit Console" has nothing to return to here, so it's inert rather than
  // wired to a client screen.
  if (status === 'loading') {
    return null;
  }

  if (target === 'admin') {
    if (status === 'signed-out') {
      return <Login title="SewaSync Ops Console" subtitle="Staff sign-in" theme="dark" />;
    }
    if (!staffRole) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
          <div className="max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center">
            <p className="font-display text-lg font-800 text-white">Not authorised</p>
            <p className="mt-2 text-sm text-slate-400">
              This account isn't registered as SewaSync staff. Sign in with a platform_staff
              account to reach the Ops console.
            </p>
          </div>
        </div>
      );
    }
    return <AdminDashboard navigate={navigate} onBack={() => {}} />;
  }

  if (status === 'signed-out') {
    return <Login title="SOS HomeFix" subtitle="Sign in to continue" theme="light" />;
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
        onBack={() => navigate('sos-completed')}
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
    admin: <AdminDashboard navigate={navigate} onBack={() => navigate('profile')} />,
  };

  return (
    <DispatchProvider>
    <SOSRouteErrorBoundary>
    {screen === 'admin' ? (
      screenMap.admin
    ) : (
      <div className="bg-gray-100 min-h-screen">
        {/* Mobile frame wrapper for desktop */}
        <div className="max-w-md mx-auto bg-white min-h-screen relative shadow-2xl shadow-gray-400/20">
          <div key={screen} className="fade-in">
            {screenMap[screen] || <Home navigate={navigate} />}
          </div>
        </div>
      </div>
    )}
    </SOSRouteErrorBoundary>
    </DispatchProvider>
  );
}
