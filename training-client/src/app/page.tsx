import { Fragment } from 'react';
import Link from 'next/link';
import { Button, LinkButton } from '@/components/button';
import { Footer } from '@/components/footer';
import Image from "next/image";
import  Logo  from '@/components/logo';
import EnquiryModal from '@/components/enquiry-modal';

const features = [
  {
    icon: '🌐',
    title: 'Learn Anywhere',
    description: 'Access every course from any device, wherever the job takes you.',
  },
  {
    icon: '◷',
    title: 'Learn at Your Pace',
    description: 'Self-paced modules built around your schedule, not a classroom clock.',
  },
  {
    icon: '✓',
    title: 'Practical Training',
    description: 'Real-world rigging and safety scenarios, not just theory.',
  },
  {
    icon: '🎓',
    title: 'Earn Your Certificate',
    description: "Finish strong with an industry-recognized certificate of completion.",
  },
];

// Placeholder cards until this section is wired to GET /courses.
const previewCourses = [
  {
    title: 'Rigging Fundamentals',
    description: 'The essentials every rigger needs before stepping onto a job site.',
  },
  {
    title: 'Lifting Safety Essentials',
    description: 'Load limits, signals, and the safety checks that prevent incidents.',
  },
  {
    title: 'Advanced Load Handling',
    description: 'Complex lifts, multi-point rigging, and real-world case studies.',
  },
];

const steps = [
  { number: '01', title: 'Sign Up', description: 'Create your account.' },
  { number: '02', title: 'Enroll', description: 'Enroll for a course.' },
  { number: '03', title: 'Learn', description: 'Take the course at your pace.' },
  { number: '04', title: 'Take Assessment', description: 'Complete and meet the pass mark.' },
  { number: '05', title: 'Get Certified', description: 'Earn your certificate of completion.' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-brand-100 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 items-center px-6 py-4 md:grid-cols-3">
          <Logo
           />
          <nav className="hidden items-center justify-center gap-8 text-sm font-medium text-black md:flex">
            <Link href="/courses" className="hover:text-brand-500">
              Courses
            </Link>
            <Link href="/about" className="hover:text-brand-500">
              About
            </Link>
            <Link href="/contact" className="hover:text-brand-500">
              Contact
            </Link>
          </nav>
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/login"
              className=" px-4 py-2 text-sm font-semibold text-brand-700 hover:text-brand-500 sm:inline-flex"
            >
              Log in
            </Link>
            <LinkButton href="/signup" pill className="px-5 py-2 text-sm">
              Get Started
            </LinkButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — bg-white (section 1 of the alternation) */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-black sm:text-5xl">
              Learn and Get Certified at your own pace.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-brand-700">
              Professional training you can trust, self paced, industry-recognized. 
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <LinkButton 
              href="/signup" 
              pill 
              className="min-w-[190px] px-10 py-4 text-base">
                Get Started
              </LinkButton>

              <EnquiryModal />

            </div>
          </div>
          {/* TODO: replace with real industrial/training photography */}
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-brand-200 bg-brand-50 px-6 text-center text-sm text-brand-400 lg:h-96">
            

            <div className="relative h-72 w-full overflow-hidden rounded-lg lg:h-96">
              <Image
                src="/hero-img.jpg"
                alt="Ropetech industrial training"
                fill
                sizes="(max-width: 1023px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </section>

        {/* Feature grid — section 2, subtle grey */}
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-md border border-brand-100 bg-white p-6 shadow-sm"
                >
                  <div className="text-2xl">{feature.icon}</div>
                  <h3 className="mt-4 font-semibold text-brand-700">{feature.title}</h3>
                  <p className="mt-2 text-sm text-black">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Explore Courses — section 3, back to white */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-brand-800">Explore Courses</h2>
              <p className="mt-3 text-black">Perfect curated curriculum for you</p>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {previewCourses.map((course) => (
                <div
                  key={course.title}
                  className="overflow-hidden rounded-lg border border-brand-100 shadow-sm"
                >
                  {/* TODO: swap for the real course picture once GET /courses is wired in */}
                  <div className="flex h-40 items-center justify-center bg-brand-50 text-sm text-brand-400">
                    Course Image Example 
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-brand-700">{course.title}</h3>
                    <p className="mt-1 text-sm text-black">{course.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 flex justify-center">
              <LinkButton href="/courses" variant="primary" pill className="px-10 py-4 text-base ">
                View all courses
              </LinkButton>
            </div>
          </div>
        </section>

        {/* How It Works — section 4, subtle grey again */}
        <section className="bg-surface-alt">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-brand-800">How It Works</h2>
            </div>
            <div className="mt-12 flex flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:justify-between lg:gap-3">
              {steps.map((step, index) => (
                <Fragment key={step.number}>
                  <div className="w-full rounded-lg border border-brand-100 bg-white p-6 text-center shadow-sm lg:flex-1">
                    <span className="text-sm font-bold text-accent-500">{step.number}</span>
                    <h3 className="mt-1 font-semibold text-brand-700">{step.title}</h3>
                    <p className="mt-1 text-sm text-black">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <span
                      className="shrink-0 rotate-90 text-2xl text-brand-300 lg:rotate-0"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA — kept as a strong solid color block, not part of the alternation */}
        <section className="bg-brand-700">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Ready to get certified?
            </h2>
            <p className="max-w-xl text-brand-100">
              Create a free account and start browsing our full course library today.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <LinkButton 
                href="/signup" 
                variant="accent" 
                pill 
                className="px-10 py-4 text-base">
                  Get Started
                </LinkButton>
                <EnquiryModal />

            </div>
            
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}