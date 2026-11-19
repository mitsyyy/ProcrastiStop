import { SecondaryButton } from '../ui/SecondaryButton';

interface RetryButtonProps {
  onPress: () => void;
  label?: string;
}

export function RetryButton({ onPress, label = 'Try another scan' }: RetryButtonProps) {
  return <SecondaryButton title={label} icon="refresh" onPress={onPress} fullWidth />;
}
