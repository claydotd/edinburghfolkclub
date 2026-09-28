type PayPalButtonStubProps = {
  onMockSuccess: () => void;
  disabled?: boolean;
};

/**
 * Phase 1 placeholder — no PayPal SDK.
 * Phase 2: load PayPal Buttons with VITE_PAYPAL_BUTTON_ID.
 */
export default function PayPalButtonStub({
  onMockSuccess,
  disabled,
}: PayPalButtonStubProps) {
  const buttonId = import.meta.env.VITE_PAYPAL_BUTTON_ID as string | undefined;

  return (
    <div className="paypal-stub">
      <button
        type="button"
        className="paypal-stub-button"
        disabled={disabled}
        onClick={onMockSuccess}
      >
        Pay membership with PayPal
      </button>
      <p className="paypal-stub-note">
        Prototype only
        {buttonId ? ` · button id reserved: ${buttonId}` : ''}. Live PayPal
        checkout arrives in Phase 2.
      </p>
    </div>
  );
}
