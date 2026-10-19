import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';

// Publishing has its own endpoints, so isPublished is not editable here.
export class UpdateCourseDto extends PartialType(
    OmitType(CreateCourseDto, 
        ['isPublished'] as const)) 
        {}
