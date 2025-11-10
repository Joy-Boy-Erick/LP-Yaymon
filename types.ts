export enum Role {
  ADMIN = 'Admin',
  TEACHER = 'Teacher',
  STUDENT = 'Student',
}

export enum EnrollmentStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
}

export enum CourseStatus {
    DRAFT = 'Draft',
    PUBLISHED = 'Published',
    ARCHIVED = 'Archived',
}

export interface User {
  id: string;
  email: string;
  password?: string; // Should not be sent to frontend in real app
  name: string;
  role: Role;
  profilePhotoUrl: string;
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number; // in MB
  videoSize?: number; // in MB
  duration?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  lessons: Lesson[];
  imageUrl: string;
  status: CourseStatus;
}

export interface CourseWithTeacherInfo extends Course {
  teacherName: string;
  teacherProfilePhotoUrl: string;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
}

export interface Review {
  id: string;
  studentId: string;
  courseId: string;
  rating: number; // 1-5
  comment: string;
}