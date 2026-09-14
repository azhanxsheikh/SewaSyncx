import type { Screen } from "../../types/navigation"
import { useDispatch } from "../../context/DispatchContext"
import ClientBillSettlementView from "../../components/settlement/ClientBillSettlementView"

interface Props {
  navigate: (s: Screen) => void
  onBack: () => void
}

export default function DigitalInvoice({ navigate, onBack }: Props) {
  const { job } = useDispatch()
  return (
    <ClientBillSettlementView job={job} navigate={navigate} onBack={onBack} />
  )
}
