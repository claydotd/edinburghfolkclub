import { useMembership } from '../../membership/useMembership';
import { formatMemberDate } from '../../membership/types';

export default function MembersAccount() {
  const { memberEmail, memberName, isPaid, paidAt, expiresAt, current } =
    useMembership();

  return (
    <main className="page members-account">
      <header className="page-masthead">
        <h1 className="page-title">Account</h1>
        <p className="page-lede">
          Membership status for {memberName || memberEmail}
        </p>
      </header>

      <section className="membership-status" aria-live="polite">
        <h2>Membership</h2>
        {current ? (
          <p className="membership-status-paid">
            Your membership is paid. It expires on {formatMemberDate(expiresAt)}.
          </p>
        ) : isPaid ? (
          <p className="membership-status-unpaid">
            Your membership expired on {formatMemberDate(expiresAt)}.
          </p>
        ) : (
          <p className="membership-status-unpaid">
            Your membership payment is outstanding.
          </p>
        )}
        {paidAt ? (
          <dl className="membership-details">
            <div>
              <dt>Paid on</dt>
              <dd>{formatMemberDate(paidAt)}</dd>
            </div>
            {expiresAt ? (
              <div>
                <dt>Expires</dt>
                <dd>{formatMemberDate(expiresAt)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </section>
    </main>
  );
}
