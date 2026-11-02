import Image from 'next/image';
import { apiUrl } from '@/lib/format';

/**
 * The course picture. When a course has no picture, the default Ropetech image is shown
 * (public/logo.png), centered on a light tint so it looks intentional.
 */
export default function CoursePicture({
  pictureUrl,
  sizes,
  priority,
}: {
  pictureUrl: string | null;
  sizes: string;
  priority?: boolean;
}) {
  if (pictureUrl) {
    return (
      <Image
        unoptimized // served by our own API through the /api proxy
        fill
        src={apiUrl(pictureUrl)}
        alt=""
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-brand-50">
      <Image src="/logo.png" alt="" width={96} height={96} className="h-24 w-24 object-contain opacity-80" />
    </div>
  );
}
