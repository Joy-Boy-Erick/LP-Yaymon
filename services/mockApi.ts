import { User, Course, Lesson, Enrollment, Review, Role, EnrollmentStatus, CourseStatus, CourseWithTeacherInfo } from '../types';

// --- INDEXEDDB SETUP ---

const DB_NAME = 'YaymonLearningDB';
const DB_VERSION = 1;

// A promise that resolves with the database instance once it's ready.
const dbPromise: Promise<IDBDatabase> = new Promise((resolve, reject) => {
    // Initial data to seed the database if it's empty
    const initialData = {
        users: [
            { id: 'admin1', email: 'erick@gmail.com', password: 'Erick3132!@#', name: 'Erick', role: Role.ADMIN, profilePhotoUrl: 'https://picsum.photos/seed/admin1/200' },
            { id: 'teacher1', email: 'teacher@test.com', password: 'password', name: 'Alice Teacher', role: Role.TEACHER, profilePhotoUrl: 'https://picsum.photos/seed/teacher1/200' },
            { id: 'student1', email: 'student@test.com', password: 'password', name: 'Bob Student', role: Role.STUDENT, profilePhotoUrl: 'https://picsum.photos/seed/student1/200' },
            { id: 'student2', email: 'student2@test.com', password: 'password', name: 'Charlie Student', role: Role.STUDENT, profilePhotoUrl: 'https://picsum.photos/seed/student2/200' },
        ],
        courses: [
            {
                id: 'course1', title: 'Introduction to React', description: 'Learn the fundamentals of React, including components, state, props, and hooks.', teacherId: 'teacher1', imageUrl: 'https://picsum.photos/seed/course1/600/400', status: CourseStatus.PUBLISHED,
                lessons: [
                    { id: 'l1-1', title: 'Welcome to React!', content: 'This is the first lesson, available for everyone to preview. We will cover the very basics.', duration: '5 minutes' },
                    { id: 'l1-2', title: 'Understanding JSX', content: 'JSX is a syntax extension for JavaScript. It allows you to write HTML-like code in your JavaScript files.', duration: '15 minutes' },
                    { id: 'l1-3', title: 'Components and Props', content: 'Components are the building blocks of React applications. Props are how you pass data between them.', duration: '20 minutes' },
                ],
            },
            {
                id: 'course2', title: 'Advanced Tailwind CSS', description: 'Master Tailwind CSS and build beautiful, responsive UIs with utility-first classes.', teacherId: 'teacher1', imageUrl: 'https://picsum.photos/seed/course2/600/400', status: CourseStatus.PUBLISHED,
                lessons: [
                    { id: 'l2-1', title: 'Getting Started with Tailwind', content: 'This is a free preview. Learn how to set up Tailwind CSS in your project.', duration: '10 minutes' },
                    { id: 'l2-2', title: 'Responsive Design', content: 'Learn how to use Tailwind\'s responsive design features to build mobile-first layouts.', duration: '25 minutes' },
                ],
            },
        ],
        enrollments: [
            { id: 'enroll1', studentId: 'student1', courseId: 'course1', status: EnrollmentStatus.APPROVED },
            { id: 'enroll2', studentId: 'student2', courseId: 'course1', status: EnrollmentStatus.PENDING },
        ],
        reviews: [
            {id: 'review1', studentId: 'student1', courseId: 'course1', rating: 5, comment: 'Excellent course! The instructor was very clear.'}
        ]
    };

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(new Error("Error opening database"));
    request.onblocked = () => console.warn("Database upgrade blocked");

    request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'id' });
            usersStore.createIndex('email', 'email', { unique: true });
        }
        if (!db.objectStoreNames.contains('courses')) {
            const coursesStore = db.createObjectStore('courses', { keyPath: 'id' });
            coursesStore.createIndex('teacherId', 'teacherId');
        }
        if (!db.objectStoreNames.contains('enrollments')) {
            const enrollmentsStore = db.createObjectStore('enrollments', { keyPath: 'id' });
            enrollmentsStore.createIndex('studentId_courseId', ['studentId', 'courseId'], { unique: true });
        }
        if (!db.objectStoreNames.contains('reviews')) {
            const reviewsStore = db.createObjectStore('reviews', { keyPath: 'id' });
            reviewsStore.createIndex('courseId', 'courseId');
        }
    };

    const seedInitialData = async (db: IDBDatabase) => {
        console.log("Seeding initial data into IndexedDB...");

        const fetchImageAsBlob = async (url: string): Promise<Blob | null> => {
            try {
                const response = await fetch(url);
                if (!response.ok) return null;
                return await response.blob();
            } catch (e) {
                console.error(`Failed to fetch image for seeding: ${url}`, e);
                return null;
            }
        };

        // Step 1: Fetch all remote assets first.
        const userPromises = initialData.users.map(async (user) => {
            const blob = await fetchImageAsBlob(user.profilePhotoUrl);
            return { ...user, profilePhotoBlob: blob };
        });

        const coursePromises = initialData.courses.map(async (course) => {
            const blob = await fetchImageAsBlob(course.imageUrl);
            return { ...course, imageBlob: blob };
        });

        const [usersWithBlobs, coursesWithBlobs] = await Promise.all([
            Promise.all(userPromises),
            Promise.all(coursePromises),
        ]);

        // Step 2: Now that all assets are fetched, perform the database transaction.
        const tx = db.transaction(['users', 'courses', 'enrollments', 'reviews'], 'readwrite');
        
        const usersStore = tx.objectStore('users');
        usersWithBlobs.forEach(user => usersStore.put(user));

        const coursesStore = tx.objectStore('courses');
        coursesWithBlobs.forEach(course => coursesStore.put(course));

        const enrollmentsStore = tx.objectStore('enrollments');
        initialData.enrollments.forEach(e => enrollmentsStore.put(e));

        const reviewsStore = tx.objectStore('reviews');
        initialData.reviews.forEach(r => reviewsStore.put(r));

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => {
                console.log("Seeding complete.");
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    };

    request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Check if DB is new and needs seeding
        const tx = db.transaction('users', 'readonly');
        const countReq = tx.objectStore('users').count();
        countReq.onsuccess = () => {
            if (countReq.result === 0) {
                seedInitialData(db).then(() => resolve(db)).catch(reject);
            } else {
                resolve(db);
            }
        };
        countReq.onerror = () => reject(countReq.error);
    };
});

// Promise-based wrappers for IDBRequest
const promisifyRequest = <T>(request: IDBRequest<T>): Promise<T> =>
    new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

// --- DATA PROCESSING HELPERS ---

// Creates a `blob:` URL from a stored Blob, used for displaying images/videos.
const processBlobUrl = (record: any, blobField: string, urlField: string) => {
    if (record && record[blobField] instanceof Blob) {
        return { ...record, [urlField]: URL.createObjectURL(record[blobField]) };
    }
    return record;
};

const processUser = (user: any) => processBlobUrl(user, 'profilePhotoBlob', 'profilePhotoUrl');
const processCourse = (course: any) => processBlobUrl(course, 'imageBlob', 'imageUrl');
const processLesson = (lesson: any) => {
    let processed = lesson;
    processed = processBlobUrl(processed, 'videoBlob', 'videoUrl');
    processed = processBlobUrl(processed, 'fileBlob', 'fileUrl');
    return processed;
};

// --- API IMPLEMENTATION ---

export type LessonPayload = {
  title: string;
  content: string;
  duration?: string;
  videoUrlInput?: string;
  videoFile?: File | null;
  attachmentFile?: File | null;
  attachmentRemoved?: boolean;
  videoRemoved?: boolean;
};

export interface EnrollmentDetails extends Enrollment {
  studentName: string;
  courseTitle: string;
}

export type CourseCreatePayload = {
    title: string;
    description: string;
    status: CourseStatus;
    imageFile?: File | null;
};

export type CourseUpdatePayload = {
    id: string;
    title?: string;
    description?: string;
    status?: CourseStatus;
    imageFile?: File | null;
};


export const api = {
  // --- Auth ---
  login: async (email: string, password_param: string): Promise<User> => {
    const db = await dbPromise;
    const tx = db.transaction('users', 'readonly');
    const index = tx.objectStore('users').index('email');
    const userRecord = await promisifyRequest(index.get(email));

    if (userRecord && userRecord.password === password_param) {
      const { password, ...userWithoutPassword } = processUser(userRecord);
      return userWithoutPassword;
    }
    throw new Error('Invalid credentials');
  },

  register: async (name: string, email: string, password_param: string): Promise<User> => {
    const db = await dbPromise;
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const index = store.index('email');
    const existing = await promisifyRequest(index.get(email));

    if (existing) throw new Error('User with this email already exists');
    
    const newUser: User & { password?: string } = {
      id: `user${Date.now()}`, name, email, password: password_param, role: Role.STUDENT,
      profilePhotoUrl: '' // will be generated from default blob if any, or empty
    };
    
    await promisifyRequest(store.add(newUser));
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // --- Users ---
  getUsers: async (): Promise<User[]> => {
    const db = await dbPromise;
    const users = await promisifyRequest<any[]>(db.transaction('users', 'readonly').objectStore('users').getAll());
    return users.map(u => {
      const { password, ...user } = processUser(u);
      return user;
    });
  },
  
  updateUser: async (userData: Partial<User> & { id: string; newProfilePhoto?: File | null }): Promise<User> => {
    const db = await dbPromise;
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const existing = await promisifyRequest<any>(store.get(userData.id));
    if (!existing) throw new Error("User not found");

    const { newProfilePhoto, ...restUserData } = userData;
    const updatedRecord = { ...existing, ...restUserData };

    if (newProfilePhoto) {
        updatedRecord.profilePhotoBlob = newProfilePhoto;
    }
    
    if (restUserData.password === '') delete updatedRecord.password;

    await promisifyRequest(store.put(updatedRecord));
    const { password, ...user } = processUser(updatedRecord);
    return user;
  },

  createUser: async (userData: Omit<User, 'id'| 'profilePhotoUrl'> & {password: string}): Promise<User> => {
    const db = await dbPromise;
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const index = store.index('email');
    if (await promisifyRequest(index.get(userData.email))) throw new Error("Email already in use");
    
    const newUser: User & {password?: string} = { ...userData, id: `user${Date.now()}`, profilePhotoUrl: '' };
    await promisifyRequest(store.add(newUser));
    const { password, ...user } = newUser;
    return user;
  },

  deleteUser: async (userId: string): Promise<void> => {
    const db = await dbPromise;
    await promisifyRequest(db.transaction('users', 'readwrite').objectStore('users').delete(userId));
  },

  // --- Courses ---
  getCourses: async (): Promise<CourseWithTeacherInfo[]> => {
    const db = await dbPromise;
    const tx = db.transaction(['courses', 'users'], 'readonly');
    const coursesStore = tx.objectStore('courses');
    const usersStore = tx.objectStore('users');

    const allCourses = (await promisifyRequest<any[]>(coursesStore.getAll())).filter(c => c.status === CourseStatus.PUBLISHED);
    const allUsers = await promisifyRequest<any[]>(usersStore.getAll());
    
    const teacherMap = new Map(allUsers.filter(u => u.role === Role.TEACHER).map(t => [t.id, t]));

    return allCourses.map(course => {
      const teacher = teacherMap.get(course.teacherId);
      const teacherInfo = teacher ? processUser(teacher) : { name: 'Unknown', profilePhotoUrl: ''};
      return {
        ...processCourse(course),
        teacherName: teacherInfo.name,
        teacherProfilePhotoUrl: teacherInfo.profilePhotoUrl
      };
    });
  },
  
  getAllCoursesForAdmin: async (): Promise<Course[]> => {
    const db = await dbPromise;
    const courses = await promisifyRequest<any[]>(db.transaction('courses', 'readonly').objectStore('courses').getAll());
    return courses.map(processCourse);
  },
  
  getCoursesByTeacherId: async (teacherId: string): Promise<Course[]> => {
    const db = await dbPromise;
    const index = db.transaction('courses', 'readonly').objectStore('courses').index('teacherId');
    const courses = await promisifyRequest<any[]>(index.getAll(teacherId));
    return courses.map(processCourse);
  },

  getCourseById: async (courseId: string): Promise<Course | undefined> => {
    const db = await dbPromise;
    const course = await promisifyRequest<any>(db.transaction('courses', 'readonly').objectStore('courses').get(courseId));
    if (!course) return undefined;
    
    const processedCourse = processCourse(course);
    processedCourse.lessons = processedCourse.lessons.map(processLesson);
    return processedCourse;
  },

  createCourse: async (courseData: CourseCreatePayload, teacherId: string): Promise<Course> => {
    const db = await dbPromise;
    const tx = db.transaction('courses', 'readwrite');
    const { imageFile, ...restData } = courseData;
    const newCourse = {
      ...restData,
      id: `course${Date.now()}`,
      teacherId,
      lessons: [],
      imageUrl: '',
      imageBlob: imageFile || null
    };
    await promisifyRequest(tx.objectStore('courses').add(newCourse));
    return processCourse(newCourse);
  },

  updateCourse: async (courseData: CourseUpdatePayload): Promise<Course> => {
    const db = await dbPromise;
    const tx = db.transaction('courses', 'readwrite');
    const store = tx.objectStore('courses');
    const existing = await promisifyRequest<any>(store.get(courseData.id));
    if(!existing) throw new Error("Course not found");

    const { imageFile, ...restData } = courseData;
    const updatedRecord = { ...existing, ...restData };
    if (imageFile) {
        updatedRecord.imageBlob = imageFile;
    }
    
    await promisifyRequest(store.put(updatedRecord));
    return processCourse(updatedRecord);
  },

  deleteCourse: async(courseId: string): Promise<void> => {
    const db = await dbPromise;
    await promisifyRequest(db.transaction('courses', 'readwrite').objectStore('courses').delete(courseId));
  },
  
  // -- Lessons --
  addLessonToCourse: async (courseId: string, lessonData: LessonPayload): Promise<Lesson> => {
    const db = await dbPromise;
    const tx = db.transaction('courses', 'readwrite');
    const store = tx.objectStore('courses');
    const course = await promisifyRequest<any>(store.get(courseId));
    if (!course) throw new Error("Course not found");

    const newLesson: any = {
        id: `lesson${Date.now()}`,
        title: lessonData.title,
        content: lessonData.content,
        duration: lessonData.duration,
    };
    if (lessonData.videoFile) {
        newLesson.videoBlob = lessonData.videoFile;
        newLesson.videoSize = lessonData.videoFile.size / (1024 * 1024);
    } else if (lessonData.videoUrlInput) {
        newLesson.videoUrl = lessonData.videoUrlInput;
    }

    if (lessonData.attachmentFile) {
        newLesson.fileBlob = lessonData.attachmentFile;
        newLesson.fileName = lessonData.attachmentFile.name;
        newLesson.fileSize = lessonData.attachmentFile.size / (1024 * 1024);
    }
    
    course.lessons.push(newLesson);
    await promisifyRequest(store.put(course));
    return processLesson(newLesson);
  },

  updateLessonInCourse: async (courseId: string, lessonId: string, lessonData: LessonPayload): Promise<Lesson> => {
    const db = await dbPromise;
    const tx = db.transaction('courses', 'readwrite');
    const store = tx.objectStore('courses');
    const course = await promisifyRequest<any>(store.get(courseId));
    if (!course) throw new Error("Course not found");

    const lessonIndex = course.lessons.findIndex((l: Lesson) => l.id === lessonId);
    if (lessonIndex === -1) throw new Error("Lesson not found");

    const existingLesson = course.lessons[lessonIndex];
    const updatedLesson: any = {
        ...existingLesson,
        title: lessonData.title,
        content: lessonData.content,
        duration: lessonData.duration,
    };

    if (lessonData.videoRemoved) {
        delete updatedLesson.videoUrl;
        delete updatedLesson.videoBlob;
        delete updatedLesson.videoSize;
    } else if (lessonData.videoFile) {
        updatedLesson.videoBlob = lessonData.videoFile;
        updatedLesson.videoSize = lessonData.videoFile.size / (1024 * 1024);
        delete updatedLesson.videoUrl;
    } else if (lessonData.videoUrlInput) {
        updatedLesson.videoUrl = lessonData.videoUrlInput;
        delete updatedLesson.videoBlob;
        delete updatedLesson.videoSize;
    }
    
    if (lessonData.attachmentRemoved) {
        delete updatedLesson.fileUrl;
        delete updatedLesson.fileBlob;
        delete updatedLesson.fileName;
        delete updatedLesson.fileSize;
    } else if (lessonData.attachmentFile) {
        updatedLesson.fileBlob = lessonData.attachmentFile;
        updatedLesson.fileName = lessonData.attachmentFile.name;
        updatedLesson.fileSize = lessonData.attachmentFile.size / (1024 * 1024);
        delete updatedLesson.fileUrl;
    }

    course.lessons[lessonIndex] = updatedLesson;
    await promisifyRequest(store.put(course));
    return processLesson(updatedLesson);
  },
  
  deleteLessonFromCourse: async(courseId: string, lessonId: string): Promise<void> => {
    const db = await dbPromise;
    const tx = db.transaction('courses', 'readwrite');
    const store = tx.objectStore('courses');
    const course = await promisifyRequest<Course>(store.get(courseId));
    if(!course) throw new Error("Course not found");
    course.lessons = course.lessons.filter(l => l.id !== lessonId);
    await promisifyRequest(store.put(course));
  },

  reorderLessons: async (courseId: string, lessonIds: string[]): Promise<void> => {
    const db = await dbPromise;
    const tx = db.transaction('courses', 'readwrite');
    const store = tx.objectStore('courses');
    const course = await promisifyRequest<Course>(store.get(courseId));
    if (!course) throw new Error("Course not found");
    
    const lessonMap = new Map(course.lessons.map(l => [l.id, l]));
    course.lessons = lessonIds.map(id => lessonMap.get(id)).filter(Boolean) as Lesson[];
    
    await promisifyRequest(store.put(course));
  },

  // --- Enrollments ---
  getEnrollmentsForAdmin: async (): Promise<EnrollmentDetails[]> => {
    const db = await dbPromise;
    const tx = db.transaction(['enrollments', 'users', 'courses'], 'readonly');
    const enrollments = await promisifyRequest<Enrollment[]>(tx.objectStore('enrollments').getAll());
    const users = await promisifyRequest<User[]>(tx.objectStore('users').getAll());
    const courses = await promisifyRequest<Course[]>(tx.objectStore('courses').getAll());

    const userMap = new Map(users.map(u => [u.id, u.name]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    return enrollments.map(e => ({
      ...e,
      studentName: userMap.get(e.studentId) || 'Unknown Student',
      courseTitle: courseMap.get(e.courseId) || 'Unknown Course',
    }));
  },

  createEnrollment: async(studentId: string, courseId: string): Promise<Enrollment> => {
    const db = await dbPromise;
    const tx = db.transaction('enrollments', 'readwrite');
    const store = tx.objectStore('enrollments');
    const index = store.index('studentId_courseId');
    const existing = await promisifyRequest(index.get([studentId, courseId]));

    if (existing) throw new Error("Already enrolled or request pending");
    
    const newEnrollment: Enrollment = {
        id: `enroll${Date.now()}`,
        studentId,
        courseId,
        status: EnrollmentStatus.PENDING
    };
    await promisifyRequest(store.add(newEnrollment));
    return newEnrollment;
  },

  updateEnrollmentStatus: async (enrollmentId: string, status: EnrollmentStatus): Promise<Enrollment> => {
    const db = await dbPromise;
    const tx = db.transaction('enrollments', 'readwrite');
    const store = tx.objectStore('enrollments');
    const enrollment = await promisifyRequest<Enrollment>(store.get(enrollmentId));
    if (!enrollment) throw new Error('Enrollment not found');
    enrollment.status = status;
    await promisifyRequest(store.put(enrollment));
    return enrollment;
  },
  
  getEnrollmentForStudent: async(studentId: string, courseId: string): Promise<Enrollment | undefined> => {
    const db = await dbPromise;
    const index = db.transaction('enrollments', 'readonly').objectStore('enrollments').index('studentId_courseId');
    return await promisifyRequest(index.get([studentId, courseId]));
  },
  
  getEnrolledCoursesByStudentId: async (studentId: string): Promise<CourseWithTeacherInfo[]> => {
    const db = await dbPromise;
    const tx = db.transaction(['enrollments', 'courses', 'users'], 'readonly');
    
    const enrollments = await promisifyRequest<Enrollment[]>(tx.objectStore('enrollments').getAll());
    const studentEnrollments = enrollments.filter(e => e.studentId === studentId && e.status === EnrollmentStatus.APPROVED);
    const enrolledCourseIds = new Set(studentEnrollments.map(e => e.courseId));
    
    const allCourses = await promisifyRequest<any[]>(tx.objectStore('courses').getAll());
    const enrolledCourses = allCourses.filter(c => enrolledCourseIds.has(c.id));
    
    const allUsers = await promisifyRequest<any[]>(tx.objectStore('users').getAll());
    const teacherMap = new Map(allUsers.filter(u => u.role === Role.TEACHER).map(t => [t.id, t]));
    
    return enrolledCourses.map(course => {
      const teacher = teacherMap.get(course.teacherId);
      const teacherInfo = teacher ? processUser(teacher) : { name: 'Unknown', profilePhotoUrl: ''};
      return {
        ...processCourse(course),
        teacherName: teacherInfo.name,
        teacherProfilePhotoUrl: teacherInfo.profilePhotoUrl
      };
    });
  },

  // -- Reviews --
  getReviewsForCourse: async(courseId: string): Promise<Review[]> => {
    const db = await dbPromise;
    const index = db.transaction('reviews', 'readonly').objectStore('reviews').index('courseId');
    return await promisifyRequest(index.getAll(courseId));
  },
  
  addReview: async(reviewData: Omit<Review, 'id'>): Promise<Review> => {
    const db = await dbPromise;
    const newReview: Review = { ...reviewData, id: `review${Date.now()}` };
    await promisifyRequest(db.transaction('reviews', 'readwrite').objectStore('reviews').add(newReview));
    return newReview;
  }
};