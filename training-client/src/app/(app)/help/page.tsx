import type { Metadata } from 'next';
import HelpBand from '@/components/enquiry/help-band';
import { h1 } from '@/components/ui/styles';

export const metadata: Metadata = { title: 'Help' };

const FAQ = [
  ['How do I pay for a course?', 'Enroll in the course, then transfer the course price to the account shown in the payment window. Come back, enter the name on the transfer and the amount you sent, and submit.'],
  ['How long does payment approval take?', 'An admin checks the account and approves your payment. You will get a notification and an email when it is approved or rejected.'],
  ['My payment was rejected. What now?', 'Open the course, read the reason, and submit your payment again with the correct details.'],
  ['How does certification work?', 'Finish every lesson, take the assessment, and pass it. Passing makes you eligible for a certificate. Each course sets its own pass mark and number of attempts.'],
  ['What if a course asks for a previous certification?', 'Upload it in your profile. An admin reviews it, and you will be told when it is approved. Then you can enroll.'],
];

export default function HelpPage() {
  return (
    <>
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h1 className={h1}>Help</h1>
        <p className="mt-2 text-brand-500">Quick answers to common questions.</p>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-lg bg-surface-alt">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-brand-800 [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-brand-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-black">{a}</p>
            </details>
          ))}
        </div>
      </section>
      <HelpBand />
    </>
  );
}
