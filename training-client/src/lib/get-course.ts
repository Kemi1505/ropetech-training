import { cache } from 'react';
import { CourseDetail } from './course-types';
import { publicApi } from './public-api';

/** The public course, fetched once per request even if several files ask for it. */
export const getCourse = cache((id: string) => publicApi<CourseDetail>(`/courses/${id}`));
