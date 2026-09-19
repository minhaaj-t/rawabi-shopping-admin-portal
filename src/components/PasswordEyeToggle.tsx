import { Hide, Show } from "react-iconly";

type Props = {
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
  showLabel: string;
  hideLabel: string;
};

export function PasswordEyeToggle({ open, onToggle, disabled, showLabel, hideLabel }: Props) {
  const Icon = open ? Hide : Show;
  return (
    <button
      type="button"
      className="login-password-toggle"
      onClick={onToggle}
      disabled={disabled}
      aria-label={open ? hideLabel : showLabel}
      aria-pressed={open}
      tabIndex={-1}
    >
      <span className="login-password-eye" aria-hidden>
        <Icon size={20} />
      </span>
    </button>
  );
}
