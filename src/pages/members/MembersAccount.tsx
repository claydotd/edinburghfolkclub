import PayPalButtonStub from '../../components/PayPalButtonStub';
import { useMembership } from '../../membership/useMembership';

export default function MembersAccount() {
  const { memberEmail, isPaid, markPaid } = useMembership();

  return (
    <main className="page members-account">
      <header className="page-masthead">
        <h1 className="page-title">Account</h1>
        <p className="page-lede">Membership status for {memberEmail}</p>
      </header>

      <section className="membership-status" aria-live="polite">
        <h2>Membership</h2>
        {isPaid ? (
          <p className="membership-status-paid">
            Your membership is marked as paid for this season.
          </p>
        ) : (
          <>
            <p className="membership-status-unpaid">
              Your membership payment is outstanding.
            </p>
            <PayPalButtonStub onMockSuccess={markPaid} />
          </>
        )}
      </section>
    </main>
  );
}
