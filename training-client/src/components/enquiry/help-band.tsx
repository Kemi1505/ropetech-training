import LearnerEnquiry from './learner-enquiry';

/** The "Need help?" band above the footer (placement A in the review). */
export default function HelpBand() {
  return (
    <section className="bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-14 text-center">
        <h2 className="text-xl font-bold text-brand-800">Need help choosing a course?</h2>
        <p className="mt-2 text-sm text-brand-500">Ask us anything and we&rsquo;ll reply by email.</p>
        <div className="mt-5">
          <LearnerEnquiry />
        </div>
      </div>
    </section>
  );
}
