import TechnicianPortal from '../../../src/screens/TechnicianPortal'
import { DispatchProvider } from '../../../src/context/DispatchContext'

export default function TechnicianApp() {
  return (
    <DispatchProvider>
      <TechnicianPortal />
    </DispatchProvider>
  )
}
