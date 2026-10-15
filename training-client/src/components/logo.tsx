import Image from 'next/image';
import Link from 'next/link';

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-700 text-sm font-bold text-white">
        <Image src="/logo.svg" alt="" width={44} height={44} priority />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-xl font-bold tracking-tight text-brand-700">Ropetech</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-brand-400">
          Learn. Get Certified.
        </span>
      </span>
    </Link>
  );
}
