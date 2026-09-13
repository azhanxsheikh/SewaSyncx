import AddressModal from '../profile/AddressModal';
import type { SavedAddress } from '../../types/domain';

export interface EditAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: SavedAddress | null;
  onSaved?: () => void;
}

export function EditAddressModal({ isOpen, onClose, address, onSaved }: EditAddressModalProps) {
  return (
    <AddressModal
      isOpen={isOpen}
      onClose={onClose}
      address={address}
      onSaved={onSaved}
    />
  );
}

export default EditAddressModal;
