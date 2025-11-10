import { firestore, auth, storage, firebase } from './firebase';
import { User, Course, Lesson, Enrollment, Review, Role, EnrollmentStatus, CourseStatus, CourseWithTeacherInfo } from '../types';

// --- HELPER FUNCTIONS ---

const uploadFile = async (path: string, file: File): Promise<string> => {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(path);
    await fileRef.put(file);
    return fileRef.getDownloadURL();
};

const mapDocToData = <T extends { id: string }>(doc: firebase.firestore.DocumentSnapshot): T => {
    return { ...doc.data(), id: doc.id } as T;
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
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await firestore.collection('users').doc(firebaseUser.uid).get();
        if (userDoc.exists) {
            const userData = mapDocToData<User>(userDoc);
            callback(userData);
        } else {
             // Handle case where user exists in Auth but not Firestore (should be rare)
            callback(null);
        }
      } else {
        callback(null);
      }
    });
  },

  login: async (email: string, pass: string): Promise<void> => {
    await auth.signInWithEmailAndPassword(email, pass);
  },

  register: async (name: string, email: string, pass: string): Promise<void> => {
    const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
    if (!userCredential.user) throw new Error("Could not create user");

    const newUser: Omit<User, 'id'> = {
      email,
      name,
      role: Role.STUDENT,
      profilePhotoUrl: 'https://picsum.photos/seed/default/200' // default photo
    };
    await firestore.collection('users').doc(userCredential.user.uid).set(newUser);
  },

  logout: async (): Promise<void> => {
      await auth.signOut();
  },

  // --- Real-time Listeners ---
  onUsersUpdate: (callback: (users: User[]) => void) => {
    return firestore.collection('users').onSnapshot(snapshot => {
        const users = snapshot.docs.map(doc => mapDocToData<User>(doc));
        callback(users);
    });
  },

  onPublishedCoursesUpdate: (callback: (courses: CourseWithTeacherInfo[]) => void) => {
    const coursesQuery = firestore.collection('courses').where('status', '==', CourseStatus.PUBLISHED);
    
    // Listen to both courses and users collections to join data
    return coursesQuery.onSnapshot(async courseSnap => {
        const courses = courseSnap.docs.map(doc => mapDocToData<Course>(doc));
        const teacherIds = [...new Set(courses.map(c => c.teacherId))];
        
        if (teacherIds.length === 0) {
            callback([]);
            return;
        }

        const usersSnap = await firestore.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', teacherIds).get();
        const teachersMap = new Map(usersSnap.docs.map(doc => [doc.id, mapDocToData<User>(doc)]));

        const coursesWithTeacherInfo = courses.map(course => {
            const teacher = teachersMap.get(course.teacherId);
            return {
                ...course,
                teacherName: teacher?.name || 'Unknown Teacher',
                teacherProfilePhotoUrl: teacher?.profilePhotoUrl || ''
            };
        });
        callback(coursesWithTeacherInfo);
    });
  },

  onAllCoursesForAdminUpdate: (callback: (courses: Course[]) => void) => {
      return firestore.collection('courses').onSnapshot(snapshot => {
          callback(snapshot.docs.map(doc => mapDocToData<Course>(doc)));
      });
  },

  onTeacherCoursesUpdate: (teacherId: string, callback: (courses: Course[]) => void) => {
      const query = firestore.collection('courses').where('teacherId', '==', teacherId);
      return query.onSnapshot(snapshot => {
          callback(snapshot.docs.map(doc => mapDocToData<Course>(doc)));
      });
  },

  onEnrollmentsForAdminUpdate: (callback: (enrollments: EnrollmentDetails[]) => void) => {
      return firestore.collection('enrollments').onSnapshot(async enrollSnap => {
          const enrollments = enrollSnap.docs.map(doc => mapDocToData<Enrollment>(doc));
          if(enrollments.length === 0) return callback([]);

          const studentIds = [...new Set(enrollments.map(e => e.studentId))];
          const courseIds = [...new Set(enrollments.map(e => e.courseId))];

          const usersSnap = await firestore.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', studentIds).get();
          const coursesSnap = await firestore.collection('courses').where(firebase.firestore.FieldPath.documentId(), 'in', courseIds).get();
          
          const userMap = new Map(usersSnap.docs.map(d => [d.id, d.data().name]));
          const courseMap = new Map(coursesSnap.docs.map(d => [d.id, d.data().title]));

          callback(enrollments.map(e => ({
            ...e,
            studentName: userMap.get(e.studentId) || 'Unknown Student',
            courseTitle: courseMap.get(e.courseId) || 'Unknown Course',
          })));
      });
  },
  
  onStudentEnrolledCoursesUpdate: (studentId: string, callback: (courses: CourseWithTeacherInfo[]) => void) => {
      const query = firestore.collection('enrollments').where('studentId', '==', studentId).where('status', '==', EnrollmentStatus.APPROVED);

      return query.onSnapshot(async enrollSnap => {
          const courseIds = enrollSnap.docs.map(doc => doc.data().courseId);
          if (courseIds.length === 0) {
              callback([]);
              return;
          }

          const coursesSnap = await firestore.collection('courses').where(firebase.firestore.FieldPath.documentId(), 'in', courseIds).get();
          const courses = coursesSnap.docs.map(doc => mapDocToData<Course>(doc));

          const teacherIds = [...new Set(courses.map(c => c.teacherId))];
          if(teacherIds.length === 0) {
            callback(courses.map(c => ({...c, teacherName: 'Unknown', teacherProfilePhotoUrl: ''})));
            return;
          }

          const usersSnap = await firestore.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', teacherIds).get();
          const teachersMap = new Map(usersSnap.docs.map(doc => [doc.id, mapDocToData<User>(doc)]));

          const coursesWithTeacherInfo = courses.map(course => ({
              ...course,
              teacherName: teachersMap.get(course.teacherId)?.name || 'Unknown',
              teacherProfilePhotoUrl: teachersMap.get(course.teacherId)?.profilePhotoUrl || ''
          }));
          callback(coursesWithTeacherInfo);
      });
  },


  // --- Users ---
  updateUser: async (userData: Partial<User> & { id: string; newProfilePhoto?: File | null }): Promise<void> => {
      const { id, newProfilePhoto, ...restUserData } = userData;
      const userRef = firestore.collection('users').doc(id);

      if (newProfilePhoto) {
          const photoURL = await uploadFile(`profilePhotos/${id}`, newProfilePhoto);
          restUserData.profilePhotoUrl = photoURL;
      }
      
      await userRef.update(restUserData);
  },

  createUser: async (userData: Omit<User, 'id'| 'profilePhotoUrl'> & {password: string}): Promise<void> => {
      // Note: In a real app, this should be a cloud function to create the user in Auth.
      // For this UI, we'll just add to Firestore. Admin needs to set password elsewhere.
      const newUser: Omit<User, 'id'> = {
          email: userData.email,
          name: userData.name,
          role: userData.role,
          profilePhotoUrl: 'https://picsum.photos/seed/default/200'
      };
      await firestore.collection('users').add(newUser);
  },

  deleteUser: async (userId: string): Promise<void> => {
      // Note: In a real app, this should be a cloud function to delete from Auth as well.
      await firestore.collection('users').doc(userId).delete();
  },

  // --- Courses ---
  getCourseById: async (courseId: string): Promise<Course | undefined> => {
    const courseDoc = await firestore.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return undefined;
    
    const course = mapDocToData<Course>(courseDoc);
    
    // Fetch lessons from subcollection
    const lessonsSnap = await firestore.collection('courses').doc(courseId).collection('lessons').orderBy('order').get();
    course.lessons = lessonsSnap.docs.map(doc => mapDocToData<Lesson>(doc));
    
    return course;
  },

  createCourse: async (courseData: CourseCreatePayload, teacherId: string): Promise<void> => {
      const { imageFile, ...restData } = courseData;
      let imageUrl = 'https://picsum.photos/seed/course-default/600/400';
      
      const newCourseRef = firestore.collection('courses').doc();

      if (imageFile) {
          imageUrl = await uploadFile(`courseImages/${newCourseRef.id}`, imageFile);
      }
      
      const newCourse: Omit<Course, 'id'|'lessons'> = {
          ...restData,
          teacherId,
          imageUrl,
      };

      await newCourseRef.set(newCourse);
  },

  updateCourse: async (courseData: CourseUpdatePayload): Promise<void> => {
    const { id, imageFile, ...restData } = courseData;
    const courseRef = firestore.collection('courses').doc(id);
    const updateData: any = restData;

    if (imageFile) {
        updateData.imageUrl = await uploadFile(`courseImages/${id}`, imageFile);
    }
    
    await courseRef.update(updateData);
  },

  deleteCourse: async(courseId: string): Promise<void> => {
    // In a real app, use a cloud function to delete subcollections and storage files.
    await firestore.collection('courses').doc(courseId).delete();
  },
  
  // -- Lessons --
  addLessonToCourse: async (courseId: string, lessonData: LessonPayload): Promise<void> => {
    const courseRef = firestore.collection('courses').doc(courseId);
    const lessonsRef = courseRef.collection('lessons');
    
    // Get current lesson count for ordering
    const lessonsSnap = await lessonsRef.get();
    const order = lessonsSnap.size;

    const newLesson: Omit<Lesson, 'id'> & {order: number} = {
        title: lessonData.title,
        content: lessonData.content,
        duration: lessonData.duration || '',
        order,
    };

    const newLessonRef = lessonsRef.doc();
    const lessonId = newLessonRef.id;

    if (lessonData.videoFile) {
        newLesson.videoUrl = await uploadFile(`lessons/${courseId}/${lessonId}/video`, lessonData.videoFile);
        newLesson.videoSize = lessonData.videoFile.size / (1024 * 1024);
    } else if (lessonData.videoUrlInput) {
        newLesson.videoUrl = lessonData.videoUrlInput;
    }

    if (lessonData.attachmentFile) {
        newLesson.fileUrl = await uploadFile(`lessons/${courseId}/${lessonId}/attachment`, lessonData.attachmentFile);
        newLesson.fileName = lessonData.attachmentFile.name;
        newLesson.fileSize = lessonData.attachmentFile.size / (1024 * 1024);
    }
    
    await newLessonRef.set(newLesson);
  },

  updateLessonInCourse: async (courseId: string, lessonId: string, lessonData: LessonPayload): Promise<void> => {
    const lessonRef = firestore.collection('courses').doc(courseId).collection('lessons').doc(lessonId);
    const updateData: any = {
        title: lessonData.title,
        content: lessonData.content,
        duration: lessonData.duration,
    };

    if (lessonData.videoRemoved) {
        updateData.videoUrl = firebase.firestore.FieldValue.delete();
        updateData.videoSize = firebase.firestore.FieldValue.delete();
    } else if (lessonData.videoFile) {
        updateData.videoUrl = await uploadFile(`lessons/${courseId}/${lessonId}/video`, lessonData.videoFile);
        updateData.videoSize = lessonData.videoFile.size / (1024 * 1024);
    } else if (lessonData.videoUrlInput) {
        updateData.videoUrl = lessonData.videoUrlInput;
    }
    
    if (lessonData.attachmentRemoved) {
        updateData.fileUrl = firebase.firestore.FieldValue.delete();
        updateData.fileName = firebase.firestore.FieldValue.delete();
        updateData.fileSize = firebase.firestore.FieldValue.delete();
    } else if (lessonData.attachmentFile) {
        updateData.fileUrl = await uploadFile(`lessons/${courseId}/${lessonId}/attachment`, lessonData.attachmentFile);
        updateData.fileName = lessonData.attachmentFile.name;
        updateData.fileSize = lessonData.attachmentFile.size / (1024 * 1024);
    }

    await lessonRef.update(updateData);
  },
  
  deleteLessonFromCourse: async(courseId: string, lessonId: string): Promise<void> => {
    await firestore.collection('courses').doc(courseId).collection('lessons').doc(lessonId).delete();
  },

  reorderLessons: async (courseId: string, lessonIds: string[]): Promise<void> => {
    const batch = firestore.batch();
    const lessonsRef = firestore.collection('courses').doc(courseId).collection('lessons');
    lessonIds.forEach((id, index) => {
        const docRef = lessonsRef.doc(id);
        batch.update(docRef, { order: index });
    });
    await batch.commit();
  },

  // --- Enrollments ---
  createEnrollment: async(studentId: string, courseId: string): Promise<void> => {
    const query = firestore.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('courseId', '==', courseId);
    
    const existing = await query.get();
    if (!existing.empty) throw new Error("Already enrolled or request pending");

    const newEnrollment: Omit<Enrollment, 'id'> = {
        studentId,
        courseId,
        status: EnrollmentStatus.PENDING
    };
    await firestore.collection('enrollments').add(newEnrollment);
  },

  updateEnrollmentStatus: async (enrollmentId: string, status: EnrollmentStatus): Promise<void> => {
    await firestore.collection('enrollments').doc(enrollmentId).update({ status });
  },
  
  getEnrollmentForStudent: async(studentId: string, courseId: string): Promise<Enrollment | undefined> => {
    const query = firestore.collection('enrollments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .limit(1);
    const snapshot = await query.get();
    if(snapshot.empty) return undefined;
    return mapDocToData<Enrollment>(snapshot.docs[0]);
  },
  
  // -- Reviews --
  getReviewsForCourse: async(courseId: string): Promise<Review[]> => {
    const snapshot = await firestore.collection('reviews').where('courseId', '==', courseId).get();
    return snapshot.docs.map(doc => mapDocToData<Review>(doc));
  },
  
  addReview: async(reviewData: Omit<Review, 'id'>): Promise<void> => {
    await firestore.collection('reviews').add(reviewData);
  }
};
