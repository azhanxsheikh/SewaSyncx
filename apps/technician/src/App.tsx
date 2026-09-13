import TechnicianPortal from '../../../src/screens/TechnicianPortal'
import Login from '../../../src/components/Login'
import { DispatchProvider } from '../../../src/context/DispatchContext'
import { AuthProvider, useAuth } from '../../../src/context/AuthContext'

function TechnicianAppInner() {
  const { status } = useAuth()

  if (status === 'loading') return null
  if (status === 'signed-out') {
    return <Login title="SewaSync Technician" subtitle="Sign in to see your dispatch feed" theme="dark" />
  }

  return (
    <DispatchProvider>
      <TechnicianPortal />
    </DispatchProvider>
  )
}

export default function TechnicianApp() {
  return (
    <AuthProvider>
      <TechnicianAppInner />
    </AuthProvider>
  )
}
