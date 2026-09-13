import AddressModal, { type AddressModalProps } from '../profile/AddressModal';

export interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function AddAddressModal({ isOpen, onClose, onSaved }: AddAddressModalProps) {
  return (
    <AddressModal
      isOpen={isOpen}
      onClose={onClose}
      address={null}
      onSaved={onSaved}
    />
  );
}

export default AddAddressModal;
