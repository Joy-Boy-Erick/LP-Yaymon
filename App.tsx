import React, { useState, useEffect, createContext, useContext, useCallback, FC, ReactNode, useRef } from 'react';
import { api, LessonPayload, EnrollmentDetails, CourseCreatePayload, CourseUpdatePayload } from './services/mockApi';
import { User, Role, Course, Lesson, Enrollment, EnrollmentStatus, CourseStatus, CourseWithTeacherInfo } from './types';
import { Logo, UsersIcon, BookOpenIcon, ClipboardListIcon, LogoutIcon, DashboardIcon, UserCircleIcon, ChevronDownIcon, EyeIcon, PencilIcon, TrashIcon, ArrowLeftIcon, CameraIcon, CloudUploadIcon, DragHandleIcon, SearchIcon, PlayIcon, LockClosedIcon, DocumentDownloadIcon, ArrowRightIcon } from './components/Icons';

// --- CONTEXTS ---
type AuthContextType = {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, pass: string) => Promise<void>;
  updateUserContext: (user: Partial<User>) => void;
};
const AuthContext = createContext<AuthContextType | null>(null);
const useAuth = () => useContext(AuthContext)!;

type NavContextType = {
  page: string;
  setPage: (page: string, params?: Record<string, any>) => void;
  pageParams: Record<string, any>;
};
const NavContext = createContext<NavContextType | null>(null);
const useNav = () => useContext(NavContext)!;

type ToastContextType = {
  showToast: (message: string, type: 'success' | 'error') => void;
};
const ToastContext = createContext<ToastContextType | null>(null);
const useToast = () => useContext(ToastContext)!;


// --- PROVIDERS ---
const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, pass: string) => {
    const loggedInUser = await api.login(email, pass);
    setUser(loggedInUser);
  };

  const register = async (name: string, email: string, pass: string) => {
    const newUser = await api.register(name, email, pass);
    setUser(newUser);
  };

  const logout = () => setUser(null);
  
  const updateUserContext = (updatedUser: Partial<User>) => {
      setUser(currentUser => currentUser ? {...currentUser, ...updatedUser} : null);
  }

  return <AuthContext.Provider value={{ user, login, logout, register, updateUserContext }}>{children}</AuthContext.Provider>;
};

const NavProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [page, setPageState] = useState('landing');
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  
  const setPage = (newPage: string, params: Record<string, any> = {}) => {
    setPageState(newPage);
    setPageParams(params);
    window.scrollTo(0, 0);
  };

  return <NavContext.Provider value={{ page, setPage, pageParams }}>{children}</NavContext.Provider>;
};

const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </ToastContext.Provider>
  );
};

// --- UI COMPONENTS (reusable) ---
const Button: FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }> = ({ children, className, variant = 'primary', ...props }) => {
  const baseClasses = "px-4 py-2 rounded-md font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };
  return <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>{children}</button>
};

const Input: FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => (
  <input className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-600 disabled:bg-gray-100 disabled:text-gray-500 ${className}`} {...props} />
);

const Modal: FC<{ isOpen: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }> = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">{children}</div>
                {footer && (
                    <div className="p-4 border-t bg-gray-50 rounded-b-lg flex-shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

const ConfirmationModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: ReactNode;
    confirmButtonText?: string;
    confirmButtonVariant?: 'primary' | 'secondary' | 'danger';
}> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText = 'Confirm',
    confirmButtonVariant = 'danger',
}) => {
    if (!isOpen) return null;

    const footer = (
        <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={onClose}>
                Cancel
            </Button>
            <Button variant={confirmButtonVariant} onClick={onConfirm}>
                {confirmButtonText}
            </Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
            <div className="text-gray-700">{message}</div>
        </Modal>
    );
};

const Toast: FC<{ message: string; type: 'success' | 'error'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div className={`fixed bottom-5 right-5 p-4 rounded-lg text-white shadow-lg z-50 ${bgColor} animate-fade-in-up`}>
      {message}
    </div>
  );
};

// --- LAYOUT COMPONENTS ---
const Header = () => {
  const { user, logout } = useAuth();
  const { setPage } = useNav();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div onClick={() => setPage('landing')} className="flex items-center space-x-2 cursor-pointer">
          <div className="w-10 h-10 bg-primary-600 rounded-full p-1">
             <Logo />
          </div>
          <span className="text-2xl font-bold text-primary-600">Yaymon-Learning</span>
        </div>
        <nav className="hidden md:flex items-center space-x-6">
          <a onClick={() => setPage('landing')} className="text-gray-700 hover:text-primary-600 font-medium cursor-pointer">Home</a>
          <a onClick={() => setPage('landing', { scrollTo: 'courses' })} className="text-gray-700 hover:text-primary-600 font-medium cursor-pointer">Courses</a>
          {user ? (
            <div className="relative">
                <button onClick={() => setMenuOpen(!menuOpen)} onBlur={() => setTimeout(() => setMenuOpen(false), 150)} className="flex items-center space-x-2">
                    <img src={user.profilePhotoUrl} alt="profile" className="w-10 h-10 rounded-full border-2 border-primary-500"/>
                    <ChevronDownIcon />
                </button>
                {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                        <a onClick={() => { setPage('dashboard'); setMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Dashboard</a>
                        <a onClick={() => { setPage('profile'); setMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Profile</a>
                        <a onClick={() => { logout(); setMenuOpen(false); setPage('landing'); }} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">Logout</a>
                    </div>
                )}
            </div>
          ) : (
            <div className="space-x-2">
              <Button onClick={() => setPage('auth', { form: 'login' })} variant="secondary">Login</Button>
              <Button onClick={() => setPage('auth', { form: 'register' })}>Register</Button>
            </div>
          )}
        </nav>
        <div className="md:hidden">
            {/* Mobile menu button can be added here */}
        </div>
      </div>
    </header>
  );
};

const Footer = () => (
    <footer className="bg-gray-800 text-white mt-auto">
        <div className="container mx-auto px-4 py-8 text-center">
            <p>&copy; {new Date().getFullYear()} Yaymon-Learning. All rights reserved.</p>
            <p className="text-sm text-gray-300 mt-2">Modern Learning for a Modern World.</p>
        </div>
    </footer>
);

// --- PAGES / VIEWS ---

const LandingPage = () => {
    const { setPage } = useNav();
    const [courses, setCourses] = useState<CourseWithTeacherInfo[]>([]);
    
    useEffect(() => {
        api.getCourses().then(setCourses);
    }, []);

    return (
        <div className="animate-fade-in">
            {/* Hero Section */}
            <section className="bg-primary-50 py-20">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-primary-700 mb-4">Unlock Your Potential</h1>
                    <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-3xl mx-auto">Join thousands of learners and take the next step in your career with our expert-led courses.</p>
                    <Button onClick={() => document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-3 text-lg">Browse Courses</Button>
                </div>
            </section>
            
            {/* Courses Section */}
            <section id="courses-section" className="py-16 bg-white">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold text-center text-gray-800 mb-10">Featured Courses</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {courses.map(course => (
                           <div key={course.id} onClick={() => setPage('course', { id: course.id })} 
                                className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-all duration-300">
                                
                                <div className="relative h-52 overflow-hidden">
                                    <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                                    <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white leading-tight tracking-wide">{course.title}</h3>
                                </div>
                            
                                <div className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <img src={course.teacherProfilePhotoUrl} alt={course.teacherName} className="w-10 h-10 rounded-full object-cover mr-3"/>
                                            <div>
                                                <span className="text-sm font-semibold text-gray-800 block">{course.teacherName}</span>
                                                <p className="text-xs text-gray-700">Instructor</p>
                                            </div>
                                        </div>
                                        <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-3 py-1 rounded-full">{course.lessons.length} Lessons</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

const AuthPage: FC<{ initialForm: 'login' | 'register' }> = ({ initialForm }) => {
    const [isLogin, setIsLogin] = useState(initialForm === 'login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();
    const { setPage } = useNav();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await register(name, email, password);
            }
            setPage('dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        {isLogin ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    {!isLogin && (
                        <Input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
                    )}
                    <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
                    <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    
                    <div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Register')}
                        </Button>
                    </div>
                     <p className="text-center text-sm text-gray-700">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button type="button" onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary-600 hover:text-primary-500">
                            {isLogin ? 'Register' : 'Sign in'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};

const CoursePage = () => {
    const { pageParams, setPage } = useNav();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [enrollment, setEnrollment] = useState<Enrollment | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const checkEnrollment = useCallback(async () => {
        if (user && user.role === Role.STUDENT && pageParams.id) {
            const enr = await api.getEnrollmentForStudent(user.id, pageParams.id);
            setEnrollment(enr);
        }
    }, [user, pageParams.id]);

    useEffect(() => {
        if (pageParams.id) {
            setLoading(true);
            api.getCourseById(pageParams.id)
                .then(c => setCourse(c || null))
                .finally(() => setLoading(false));
            checkEnrollment();
        }
    }, [pageParams.id, checkEnrollment]);

    const handleEnroll = async () => {
        if (user && user.role === Role.STUDENT && course) {
            try {
                await api.createEnrollment(user.id, course.id);
                checkEnrollment();
            } catch(err) {
                alert((err as Error).message);
            }
        }
    }
    
    const handleLessonClick = (lessonId: string) => {
        if (!user) {
            setPage('auth', { form: 'login' });
            return;
        }
        setPage('lessonView', { courseId: course?.id, lessonId: lessonId });
    };

    if(loading) return <div className="text-center p-10">Loading course...</div>
    if(!course) return <div className="text-center p-10">Course not found.</div>

    const isEnrolledAndApproved = enrollment?.status === EnrollmentStatus.APPROVED;

    return (
        <div className="container mx-auto px-4 py-10">
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <img src={course.imageUrl} alt={course.title} className="w-full h-96 object-cover"/>
                <div className="p-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">{course.title}</h1>
                    <p className="text-gray-700 mb-6">{course.description}</p>
                    
                    <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8">Lessons</h2>
                    <div className="space-y-4">
                        {course.lessons.map((lesson, index) => {
                            const isLocked = index > 0 && (!user || (user.role === Role.STUDENT && !isEnrolledAndApproved));
                            return (
                                <div 
                                    key={lesson.id} 
                                    className={`p-4 rounded-md flex justify-between items-center transition-colors duration-200 ${isLocked ? 'bg-gray-100' : 'bg-primary-50 hover:bg-primary-100 cursor-pointer'}`}
                                    onClick={() => !isLocked && handleLessonClick(lesson.id)}
                                >
                                    <div>
                                        <div className="flex items-center space-x-3">
                                            <h3 className={`font-semibold ${isLocked ? 'text-gray-700' : 'text-primary-800'}`}>{index + 1}. {lesson.title}</h3>
                                            {lesson.duration && <span className={`text-xs px-2 py-0.5 rounded-full ${isLocked ? 'bg-gray-200 text-gray-700' : 'bg-primary-100 text-primary-800'}`}>{lesson.duration}</span>}
                                        </div>
                                        {index === 0 && <div className="text-sm text-gray-700 mt-1 prose-sm line-clamp-2" dangerouslySetInnerHTML={{ __html: lesson.content }}></div>}
                                    </div>
                                    <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                                        {isLocked && <LockClosedIcon className="text-gray-500" />}
                                        {!isLocked && <Button variant="secondary" className="px-3 py-1 text-sm hidden sm:block" onClick={(e) => { e.stopPropagation(); handleLessonClick(lesson.id); }}>Start</Button>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {user?.role === Role.STUDENT && !enrollment && (
                        <div className="mt-8 text-center p-6 bg-gray-50 rounded-lg">
                            <h3 className="text-xl font-semibold mb-2 text-gray-800">Want to learn more?</h3>
                            <p className="text-gray-700 mb-4">Enroll in this course to get access to all lessons and materials.</p>
                            <Button onClick={handleEnroll}>Enroll Now</Button>
                        </div>
                    )}
                     {user?.role === Role.STUDENT && enrollment?.status === EnrollmentStatus.PENDING && (
                        <div className="mt-8 text-center p-6 bg-yellow-100 text-yellow-800 rounded-lg">
                            <h3 className="text-xl font-semibold mb-2">Enrollment Pending</h3>
                            <p>Your enrollment request has been sent and is awaiting admin approval.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LessonViewPage = () => {
    const { pageParams, setPage } = useNav();
    const { user } = useAuth();
    const { showToast } = useToast();
    const [course, setCourse] = useState<Course | null>(null);
    const [enrollment, setEnrollment] = useState<Enrollment | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    const { courseId, lessonId } = pageParams;

    useEffect(() => {
        if (!courseId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const courseData = await api.getCourseById(courseId);
                setCourse(courseData || null);

                if (user && user.role === Role.STUDENT) {
                    const enrollmentData = await api.getEnrollmentForStudent(user.id, courseId);
                    setEnrollment(enrollmentData);
                }
            } catch (err) {
                showToast("Failed to load lesson data.", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [courseId, user, showToast]);

    const handleEnroll = async () => {
        if (user && user.role === Role.STUDENT && course) {
            try {
                const newEnrollment = await api.createEnrollment(user.id, course.id);
                setEnrollment(newEnrollment);
                showToast("Enrollment request sent!", "success");
            } catch(err) {
                showToast((err as Error).message, 'error');
            }
        }
    };

    if (loading) return <div className="text-center p-20">Loading lesson...</div>;
    if (!course || !lessonId) return <div className="text-center p-20">Lesson not found.</div>;

    const currentLessonIndex = course.lessons.findIndex(l => l.id === lessonId);
    const currentLesson = course.lessons[currentLessonIndex];
    if (!currentLesson) return <div className="text-center p-20">Lesson not found in this course.</div>;
    
    const isEnrolledAndApproved = enrollment?.status === EnrollmentStatus.APPROVED;
    const isFirstLesson = currentLessonIndex === 0;
    const isContentLocked = !isFirstLesson && !isEnrolledAndApproved;

    const navigateLesson = (direction: 'next' | 'prev') => {
        const newIndex = direction === 'next' ? currentLessonIndex + 1 : currentLessonIndex - 1;
        if (newIndex >= 0 && newIndex < course.lessons.length) {
            setPage('lessonView', { courseId, lessonId: course.lessons[newIndex].id });
        }
    };
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar - Lesson Playlist */}
                <aside className="w-full md:w-1/4 lg:w-1/5 md:flex-shrink-0">
                    <div className="sticky top-24">
                         <button onClick={() => setPage('course', { id: courseId })} className="flex items-center space-x-2 text-primary-600 font-semibold mb-4 hover:underline">
                            <ArrowLeftIcon className="w-5 h-5" />
                            <span>Back to Course</span>
                        </button>
                        <h3 className="text-lg font-bold text-gray-800 mb-3">{course.title}</h3>
                        <ul className="space-y-1">
                            {course.lessons.map((lesson, index) => {
                                const isLockedForPlaylist = index > 0 && !isEnrolledAndApproved;
                                const isCurrent = lesson.id === currentLesson.id;
                                return (
                                    <li key={lesson.id}>
                                        <button 
                                            onClick={() => setPage('lessonView', { courseId, lessonId: lesson.id })}
                                            className={`w-full text-left p-3 rounded-md flex items-center space-x-3 transition-colors text-sm ${
                                                isCurrent ? 'bg-primary-600 text-white font-semibold' : 'hover:bg-gray-200 text-gray-700'
                                            }`}
                                        >
                                            {isCurrent ? <PlayIcon className="flex-shrink-0"/> : isLockedForPlaylist ? <LockClosedIcon className="text-gray-400 flex-shrink-0"/> : <span className="w-5 h-5 text-gray-400 font-mono flex-shrink-0 text-center">{index + 1}</span>}
                                            <span>{lesson.title}</span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </aside>
    
                {/* Main Content */}
                <main className="w-full md:w-3/4 lg:w-4/5">
                    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{currentLesson.title}</h1>
                        {currentLesson.duration && <p className="text-sm text-gray-600 mb-6">Estimated Duration: {currentLesson.duration}</p>}
                        
                        <div className="aspect-video bg-black rounded-lg mb-6 overflow-hidden">
                            {isContentLocked ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gray-800 p-4">
                                    <LockClosedIcon className="w-16 h-16 text-primary-400 mb-4"/>
                                    <h3 className="text-2xl font-bold">Content Locked</h3>
                                    <p className="text-center text-gray-300 mt-2 mb-4">You must enroll in this course to view this lesson.</p>
                                    {!enrollment && <Button onClick={handleEnroll}>Enroll Now</Button>}
                                    {enrollment?.status === EnrollmentStatus.PENDING && <p className="text-yellow-400">Your enrollment is pending approval.</p>}
                                </div>
                            ) : currentLesson.videoUrl ? (
                                <video key={currentLesson.videoUrl} controls className="w-full h-full">
                                    <source src={currentLesson.videoUrl} />
                                    Your browser does not support the video tag.
                                </video>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gray-100">
                                    <p>No video for this lesson.</p>
                                </div>
                            )}
                        </div>
                        
                        {currentLesson.fileUrl && !isContentLocked && (
                             <a href={currentLesson.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-2 px-4 py-2 mb-6 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                                <DocumentDownloadIcon />
                                <span>Download {currentLesson.fileName || 'Attachment'}</span>
                             </a>
                        )}

                        <div className="prose max-w-none prose-lg" dangerouslySetInnerHTML={{ __html: currentLesson.content }}></div>
                        
                        <div className="mt-8 pt-6 border-t flex justify-between items-center">
                             <Button variant="secondary" onClick={() => navigateLesson('prev')} disabled={currentLessonIndex === 0}>
                                <div className="flex items-center space-x-2">
                                    <ArrowLeftIcon className="w-5 h-5" />
                                    <span>Previous</span>
                                </div>
                            </Button>
                            <Button variant="secondary" onClick={() => navigateLesson('next')} disabled={currentLessonIndex === course.lessons.length - 1}>
                                <div className="flex items-center space-x-2">
                                    <span>Next</span>
                                    <ArrowRightIcon className="w-5 h-5" />
                                </div>
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};


const DashboardPage = () => {
    const { user } = useAuth();
    if (!user) return <div className="p-8 text-center">Please log in to view the dashboard.</div>;

    switch (user.role) {
        case Role.ADMIN: return <AdminDashboard />;
        case Role.TEACHER: return <TeacherDashboard />;
        case Role.STUDENT: return <StudentDashboard />;
        default: return <div>Invalid user role.</div>;
    }
};

const DashboardLayout: FC<{ children: ReactNode, navItems: { label: string; icon: ReactNode; view: string }[], currentView: string, setView: (view: string) => void }> = ({ children, navItems, currentView, setView }) => {
    const { user, logout } = useAuth();
    const { setPage } = useNav();

    return (
        <div className="flex min-h-screen bg-gray-100">
            <aside className="w-64 bg-gray-800 text-white flex-shrink-0 p-4 flex flex-col">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-primary-600 rounded-full p-2 mx-auto">
                        <Logo />
                    </div>
                    <h2 className="text-xl font-semibold mt-2">Yaymon-Learning</h2>
                </div>
                <nav className="flex-grow">
                    <ul>
                        {navItems.map(item => (
                             <li key={item.label}>
                                 <a onClick={() => setView(item.view)} className={`flex items-center space-x-3 px-4 py-3 my-1 rounded-md cursor-pointer transition-colors ${currentView === item.view ? 'bg-primary-600 text-white' : 'hover:bg-gray-700 text-gray-300 hover:text-white'}`}>
                                     {item.icon}
                                     <span>{item.label}</span>
                                 </a>
                             </li>
                        ))}
                    </ul>
                </nav>
                 <div className="mt-auto">
                    <a onClick={() => setPage('profile')} className="flex items-center space-x-3 px-4 py-3 my-1 rounded-md cursor-pointer hover:bg-gray-700 text-gray-300 hover:text-white">
                        <UserCircleIcon /><span>Profile</span>
                    </a>
                    <a onClick={() => { logout(); setPage('landing'); }} className="flex items-center space-x-3 px-4 py-3 my-1 rounded-md cursor-pointer hover:bg-gray-700 text-gray-300 hover:text-white">
                        <LogoutIcon /><span>Logout</span>
                    </a>
                </div>
            </aside>
            <main className="flex-grow p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
};

// --- DASHBOARD COMPONENTS ---

const UserFormModal: FC<{isOpen: boolean, onClose: () => void, onSave: () => void, user: User | null}> = ({ isOpen, onClose, onSave, user }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>(Role.STUDENT);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isEditMode = !!user;
    const formId = "user-form";

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setName(user.name);
                setEmail(user.email);
                setRole(user.role);
                setPassword('');
            } else {
                setName('');
                setEmail('');
                setPassword('');
                setRole(Role.STUDENT);
            }
            setError('');
        }
    }, [isOpen, user, isEditMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEditMode) {
                const updatedUserData: User = { ...user, name, email, role };
                if (password) {
                    updatedUserData.password = password;
                }
                await api.updateUser(updatedUserData);
            } else {
                 if(!password) {
                     setError("Password is required for new users.");
                     setLoading(false);
                     return;
                 }
                await api.createUser({ name, email, password, role });
            }
            onSave();
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };
    
    const footer = (
        <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" form={formId} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit User" : "Create New User"} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="space-y-4">
                 {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded">{error}</p>}
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <Input type="text" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <Input type="password" placeholder={isEditMode ? "Leave blank to keep unchanged" : ""} value={password} onChange={e => setPassword(e.target.value)} required={!isEditMode} />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select value={role} onChange={e => setRole(e.target.value as Role)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500">
                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </form>
        </Modal>
    );
};

const AdminUserManagement = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { showToast } = useToast();

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const fetchedUsers = await api.getUsers();
            setUsers(fetchedUsers);
        } catch (err) {
            setError("Failed to fetch users.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: User) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            try {
                await api.deleteUser(userId);
                setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
                showToast('User deleted successfully', 'success');
            } catch (err) {
                showToast('Failed to delete user.', 'error');
            }
        }
    };
    
    const handleSaveUser = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        fetchUsers();
        showToast('User saved successfully.', 'success');
    }

    if (loading) return <div>Loading users...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <Button onClick={handleOpenCreateModal}>Add New User</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left table-auto">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 font-semibold text-gray-700">User</th>
                            <th className="p-3 font-semibold text-gray-700">Role</th>
                            <th className="p-3 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 flex items-center space-x-3">
                                    <img src={user.profilePhotoUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover"/>
                                    <div>
                                        <div className="font-bold text-gray-800">{user.name}</div>
                                        <div className="text-sm text-gray-700">{user.email}</div>
                                    </div>
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        user.role === Role.ADMIN ? 'bg-red-200 text-red-800' :
                                        user.role === Role.TEACHER ? 'bg-blue-200 text-blue-800' :
                                        'bg-green-200 text-green-800'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    <div className="inline-flex space-x-2">
                                        <Button variant="secondary" className="px-3 py-1 text-sm" onClick={() => handleOpenEditModal(user)}>Edit</Button>
                                        <Button variant="danger" className="px-3 py-1 text-sm" onClick={() => handleDeleteUser(user.id)}>Delete</Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <UserFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveUser}
                user={editingUser}
            />
        </div>
    );
};

const LessonDetailModal: FC<{ lesson: Lesson | null, isOpen: boolean, onClose: () => void }> = ({ lesson, isOpen, onClose }) => {
    if (!lesson) return null;
    const footer = (
        <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
    );
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lesson.title} footer={footer}>
            <div className="space-y-4">
                <div>
                    <h4 className="font-semibold text-gray-700">Content</h4>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md text-gray-800 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: lesson.content }}></div>
                </div>
                {lesson.videoUrl && (
                    <div>
                        <h4 className="font-semibold text-gray-700">Video URL</h4>
                        <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline break-all">{lesson.videoUrl}</a>
                    </div>
                )}
                {lesson.fileUrl && (
                    <div>
                        <h4 className="font-semibold text-gray-700">File</h4>
                        <a href={lesson.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">{lesson.fileName || 'Download File'}</a>
                        {lesson.fileSize && <span className="text-sm text-gray-600 ml-2">({lesson.fileSize.toFixed(2)}MB)</span>}
                    </div>
                )}
            </div>
        </Modal>
    );
};

interface CourseWithTeacher extends Course {
    teacherName: string;
}

const AdminContentAudit = () => {
    const [courses, setCourses] = useState<CourseWithTeacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openCourseId, setOpenCourseId] = useState<string | null>(null);
    
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                setLoading(true);
                const [allCourses, allUsers] = await Promise.all([
                    api.getAllCoursesForAdmin(),
                    api.getUsers()
                ]);

                const usersMap = new Map(allUsers.map(user => [user.id, user.name]));

                const coursesWithTeacherData = allCourses.map(course => ({
                    ...course,
                    teacherName: usersMap.get(course.teacherId) || 'Unknown Teacher'
                }));

                setCourses(coursesWithTeacherData);
            } catch (err) {
                setError("Failed to fetch content data.");
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);
    
    const handleViewLesson = (lesson: Lesson) => {
        setSelectedLesson(lesson);
        setIsModalOpen(true);
    };

    if (loading) return <div>Loading content...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Content Audit</h2>
            <div className="space-y-4">
                {courses.map(course => (
                    <div key={course.id} className="border rounded-lg overflow-hidden">
                        <button 
                            onClick={() => setOpenCourseId(openCourseId === course.id ? null : course.id)}
                            className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 focus:outline-none"
                        >
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 text-left">{course.title}</h3>
                                <p className="text-sm text-gray-700 text-left">By: {course.teacherName} | Status: {course.status}</p>
                            </div>
                            <ChevronDownIcon className={`transform transition-transform ${openCourseId === course.id ? 'rotate-180' : ''}`} />
                        </button>
                        {openCourseId === course.id && (
                            <div className="p-4 border-t">
                                {course.lessons.length > 0 ? (
                                    <ul className="space-y-2">
                                        {course.lessons.map((lesson, index) => (
                                            <li key={lesson.id} className="flex justify-between items-center p-3 bg-white rounded-md border">
                                                <span className="text-gray-800">{index + 1}. {lesson.title}</span>
                                                <Button variant="secondary" className="px-3 py-1 text-sm" onClick={() => handleViewLesson(lesson)}>View Details</Button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-600 text-center py-4">This course has no lessons yet.</p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <LessonDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                lesson={selectedLesson}
            />
        </div>
    );
};

const AdminEnrollmentManagement = () => {
    const [enrollments, setEnrollments] = useState<EnrollmentDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    const fetchEnrollments = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getEnrollmentsForAdmin();
            setEnrollments(data);
        } catch (error) {
            showToast('Failed to fetch enrollment data', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchEnrollments();
    }, [fetchEnrollments]);
    
    const handleStatusUpdate = async (enrollmentId: string, status: EnrollmentStatus) => {
        try {
            await api.updateEnrollmentStatus(enrollmentId, status);
            showToast(`Enrollment ${status.toLowerCase()}.`, 'success');
            // Refresh the list to show the change
            fetchEnrollments();
        } catch (error) {
            showToast('Failed to update status.', 'error');
        }
    };

    if (loading) return <div>Loading enrollments...</div>;

    const getStatusBadge = (status: EnrollmentStatus) => {
        switch (status) {
            case EnrollmentStatus.APPROVED: return 'bg-green-100 text-green-800 border-green-200';
            case EnrollmentStatus.PENDING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case EnrollmentStatus.REJECTED: return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Enrollment Management</h2>
             <div className="overflow-x-auto">
                <table className="w-full text-left table-auto">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 font-semibold text-gray-700">Student</th>
                            <th className="p-3 font-semibold text-gray-700">Course</th>
                            <th className="p-3 font-semibold text-gray-700">Status</th>
                            <th className="p-3 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrollments.map(enrollment => (
                            <tr key={enrollment.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 text-gray-800">{enrollment.studentName}</td>
                                <td className="p-3 text-gray-800">{enrollment.courseTitle}</td>
                                <td className="p-3">
                                    <span className={`inline-block px-3 py-1 text-xs font-bold leading-none text-center whitespace-nowrap align-baseline rounded-full border ${getStatusBadge(enrollment.status)}`}>
                                        {enrollment.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    {enrollment.status === EnrollmentStatus.PENDING && (
                                        <div className="inline-flex space-x-2">
                                            <Button className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(enrollment.id, EnrollmentStatus.APPROVED)}>Approve</Button>
                                            <Button variant="danger" className="px-3 py-1 text-sm" onClick={() => handleStatusUpdate(enrollment.id, EnrollmentStatus.REJECTED)}>Reject</Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const AdminDashboard = () => {
    const [view, setView] = useState('users');
    const navItems = [
        { label: 'Users', icon: <UsersIcon />, view: 'users' },
        { label: 'Enrollments', icon: <ClipboardListIcon />, view: 'enrollments' },
        { label: 'Content Audit', icon: <EyeIcon />, view: 'content' }
    ];

    return (
        <DashboardLayout navItems={navItems} currentView={view} setView={setView}>
            {view === 'users' && <AdminUserManagement />}
            {view === 'enrollments' && <AdminEnrollmentManagement />}
            {view === 'content' && <AdminContentAudit />}
        </DashboardLayout>
    );
};

const CourseFormModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    course: Course | null;
    teacherId: string;
}> = ({ isOpen, onClose, onSave, course, teacherId }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState<CourseStatus>(CourseStatus.DRAFT);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isEditMode = !!course;
    const formId = "course-form";

    useEffect(() => {
        if (isOpen) {
            if (isEditMode && course) {
                setTitle(course.title);
                setDescription(course.description);
                setStatus(course.status);
                setImagePreview(course.imageUrl);
            } else {
                setTitle('');
                setDescription('');
                setStatus(CourseStatus.DRAFT);
                setImagePreview(null);
            }
            setImageFile(null);
            setError('');
        }
    }, [isOpen, course, isEditMode]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isEditMode) {
                 if (!course) throw new Error("Course data is missing for update.");
                const payload: CourseUpdatePayload = { id: course.id, title, description, status, imageFile };
                await api.updateCourse(payload);
            } else {
                const payload: CourseCreatePayload = { title, description, status, imageFile };
                await api.createCourse(payload, teacherId);
            }
            onSave();
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };
    
    const footer = (
        <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" form={formId} disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Course" : "Create New Course"} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="space-y-4">
                 {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded">{error}</p>}
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Course Title</label>
                    <Input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 placeholder:text-gray-600" rows={4}></textarea>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Course Image</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            {imagePreview ? (
                                <img src={imagePreview} alt="Course preview" className="mx-auto h-24 w-auto rounded-md" />
                            ) : (
                                <CloudUploadIcon className="mx-auto h-12 w-12 text-gray-400" />
                            )}
                            <div className="flex text-sm text-gray-600 justify-center">
                                <label htmlFor="course-image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                                    <span>Upload a file</span>
                                    <input id="course-image-upload" name="course-image-upload" type="file" className="sr-only" accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, up to 10MB</p>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value as CourseStatus)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500">
                        {Object.values(CourseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </form>
        </Modal>
    );
};

const LessonFormModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    lesson: Lesson | null;
    courseId: string;
}> = ({ isOpen, onClose, onSave, lesson, courseId }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [duration, setDuration] = useState('');
    const [videoUrlInput, setVideoUrlInput] = useState('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
    const [attachmentRemoved, setAttachmentRemoved] = useState(false);
    const [videoRemoved, setVideoRemoved] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'media' | 'preview'>('content');
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);

    const quillRef = useRef<HTMLDivElement>(null);
    const quillInstanceRef = useRef<any>(null);

    const isEditMode = !!lesson;
    const formId = "lesson-form";

    useEffect(() => {
        if (isOpen) {
            if (quillRef.current && !quillInstanceRef.current) {
                // @ts-ignore
                quillInstanceRef.current = new Quill(quillRef.current, {
                    theme: 'snow',
                    modules: {
                        toolbar: [
                            [{ 'font': [] }, { 'header': [1, 2, 3, false] }],
                            ['bold', 'italic', 'underline', 'strike'],
                            [{ 'color': [] }, { 'background': [] }],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            [{ 'align': [] }],
                            ['link', 'image', 'video', 'clean']
                        ]
                    },
                    placeholder: 'Lesson content...'
                });
                
                quillInstanceRef.current.on('text-change', () => {
                    const editorContent = quillInstanceRef.current.root.innerHTML;
                    const editorText = quillInstanceRef.current.getText();
                    setContent(editorContent);
                    setCharCount(editorText.trim().length);
                    setWordCount(editorText.trim().split(/\s+/).filter(Boolean).length);
                });
            }

            const initialContent = isEditMode && lesson ? lesson.content : '';
            setTitle(isEditMode && lesson ? lesson.title : '');
            setDuration(isEditMode && lesson ? (lesson.duration || '') : '');
            setContent(initialContent);
            setVideoUrlInput(isEditMode && lesson ? (lesson.videoUrl || '') : '');
            setVideoFile(null);
            setAttachmentFile(null);
            setAttachmentRemoved(false);
            setVideoRemoved(false);
            setError('');
            setActiveTab('content');

            if (quillInstanceRef.current) {
                if (quillInstanceRef.current.root.innerHTML !== initialContent) {
                    quillInstanceRef.current.root.innerHTML = initialContent;
                } else {
                    // Manually trigger count update if content is the same but modal reopens
                    const editorText = quillInstanceRef.current.getText();
                    setCharCount(editorText.trim().length);
                    setWordCount(editorText.trim().split(/\s+/).filter(Boolean).length);
                }
            }
        }
    }, [isOpen, lesson, isEditMode]);
    
    useEffect(() => {
        // This effect handles creating/revoking object URLs for file previews
        if (videoFile) {
            const fileUrl = URL.createObjectURL(videoFile);
            setVideoPreviewUrl(fileUrl);
            return () => URL.revokeObjectURL(fileUrl);
        }
    
        // For URL input or existing lesson URL
        if (videoUrlInput) {
            setVideoPreviewUrl(videoUrlInput);
        } else if (isEditMode && lesson?.videoUrl && !videoRemoved) {
            setVideoPreviewUrl(lesson.videoUrl);
        } else {
            setVideoPreviewUrl(null);
        }
    }, [videoFile, videoUrlInput, lesson, isEditMode, videoRemoved]);


    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 250 * 1024 * 1024) {
                setError("Video file is too large. Max size is 250MB.");
                e.target.value = '';
                return;
            }
            setVideoFile(file);
            setVideoRemoved(false);
            setVideoUrlInput('');
            setError('');
        } else {
            setVideoFile(null);
        }
    };

    const handleAttachmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
             if (file.size > 100 * 1024 * 1024) {
                setError("Attachment file is too large. Max size is 100MB.");
                e.target.value = '';
                return;
            }
            setAttachmentFile(file);
            setAttachmentRemoved(false);
            setError('');
        } else {
            setAttachmentFile(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const lessonData: LessonPayload = {
            title,
            content,
            duration,
            videoUrlInput,
            videoFile,
            attachmentFile,
            attachmentRemoved,
            videoRemoved,
        };

        try {
            if (isEditMode && lesson) {
                await api.updateLessonInCourse(courseId, lesson.id, lessonData);
            } else {
                await api.addLessonToCourse(courseId, lessonData);
            }
            onSave();
        } catch(err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };
    
    const handleClearVideo = () => {
        setVideoFile(null);
        setVideoUrlInput('');
        setVideoRemoved(true);
    };

    const tabs: { id: 'content' | 'media' | 'preview', name: string }[] = [
        { id: 'content', name: 'Content' },
        { id: 'media', name: 'Media & Attachments' },
        { id: 'preview', name: 'Preview' },
    ];
    
    const footer = (
        <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" form={formId} disabled={loading}>{loading ? "Saving..." : "Save Lesson"}</Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Lesson" : "Create New Lesson"} footer={footer}>
            <form id={formId} onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded">{error}</p>}
                
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none ${
                                    activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="pt-2">
                    {activeTab === 'content' && (
                        <div className="space-y-4">
                             <Input type="text" placeholder="Lesson Title" value={title} onChange={e => setTitle(e.target.value)} required />
                             <Input type="text" placeholder="Estimated Duration (e.g., 15 minutes)" value={duration} onChange={e => setDuration(e.target.value)} />
                             <div>
                                 <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Content</label>
                                 <div ref={quillRef} style={{ minHeight: '200px' }}></div>
                                 <div className="text-right text-xs text-gray-500 mt-1">
                                     {wordCount} words / {charCount} characters
                                 </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-4">
                            <div className="p-3 border rounded-md space-y-3 bg-gray-50">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-gray-700">Video (Optional)</label>
                                    {(videoFile || videoUrlInput || (isEditMode && lesson?.videoUrl && !videoRemoved)) && (
                                        <Button type="button" variant="secondary" className="px-2 py-1 text-xs" onClick={handleClearVideo}>Clear Video</Button>
                                    )}
                                </div>
                                <Input type="text" placeholder="Video URL (e.g., YouTube)" value={videoUrlInput} onChange={e => {setVideoUrlInput(e.target.value); setVideoFile(null); setVideoRemoved(!e.target.value);}} />
                                <p className="text-center text-xs text-gray-600">OR</p>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Upload Video File (max 250MB)</label>
                                    <Input type="file" accept="video/*" onChange={handleVideoFileChange} />
                                    {videoFile && <div className="text-xs text-gray-600 mt-1"><span>{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</span></div>}
                                    {isEditMode && lesson?.videoUrl && !videoFile && !videoRemoved && <div className="text-xs text-gray-700 mt-1">Current: <a href={lesson.videoUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline truncate inline-block max-w-xs">{lesson.videoUrl}</a></div>}
                                </div>
                                {videoPreviewUrl && (
                                    <div className="mt-4 border-t pt-4">
                                        <video key={videoPreviewUrl} controls className="w-full rounded-lg bg-black aspect-video">
                                            <source src={videoPreviewUrl} />
                                            Your browser does not support the video tag.
                                        </video>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Upload Attachment (optional, max 100MB)</label>
                                <Input type="file" onChange={handleAttachmentFileChange} />
                                {attachmentFile ? (
                                    <div className="text-xs text-gray-600 mt-1 flex items-center">
                                        <span>{attachmentFile.name} ({(attachmentFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                                        <button type="button" onClick={() => setAttachmentFile(null)} className="ml-2 text-red-500 hover:text-red-700">&times;</button>
                                    </div>
                                ) : isEditMode && lesson?.fileUrl && !attachmentRemoved && (
                                    <div className="text-xs text-gray-700 mt-1 flex items-center">
                                        <span>Current file: <a href={lesson.fileUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">{lesson.fileName}</a></span>
                                        <button type="button" onClick={() => { setAttachmentRemoved(true); setAttachmentFile(null); }} className="ml-2 text-red-500 hover:text-red-700 font-bold">&times;</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'preview' && (
                        <div className="p-4 bg-gray-50 rounded-md border min-h-[300px]">
                            <h3 className="text-2xl font-bold text-gray-900">{title || 'Lesson Title Preview'}</h3>
                            {duration && <p className="text-sm text-gray-600 mt-1 mb-4">Est. Duration: {duration}</p>}
                            <hr className="my-3"/>
                            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-500">Start typing in the content tab to see a preview.</p>' }}></div>
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
};

const TeacherCourseDetail: FC<{ course: Course; onBack: () => void }> = ({ course, onBack }) => {
    const [currentCourse, setCurrentCourse] = useState<Course | null>(course);
    const [loading, setLoading] = useState(false);
    const [isLessonFormOpen, setIsLessonFormOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
    const { showToast } = useToast();
    const draggedItemIndex = useRef<number | null>(null);
    const dragOverItemIndex = useRef<number | null>(null);


    const refreshCourse = useCallback(async () => {
        setLoading(true);
        try {
            const freshCourse = await api.getCourseById(course.id);
            setCurrentCourse(freshCourse || null);
        } catch (error) {
            showToast("Failed to refresh course data.", "error");
        } finally {
            setLoading(false);
        }
    }, [course.id, showToast]);

    const handleOpenCreateModal = () => {
        setEditingLesson(null);
        setIsLessonFormOpen(true);
    };

    const handleOpenEditModal = (lesson: Lesson) => {
        setEditingLesson(lesson);
        setIsLessonFormOpen(true);
    };

    const handleSaveLesson = () => {
        setIsLessonFormOpen(false);
        setEditingLesson(null);
        showToast("Lesson saved successfully!", "success");
        refreshCourse();
    };

    const handleDeleteLesson = (lesson: Lesson) => {
        setLessonToDelete(lesson);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!lessonToDelete) return;
        try {
            await api.deleteLessonFromCourse(course.id, lessonToDelete.id);
            showToast("Lesson deleted successfully!", "success");
            refreshCourse();
        } catch (error) {
            showToast("Failed to delete lesson.", "error");
        } finally {
            setIsConfirmModalOpen(false);
            setLessonToDelete(null);
        }
    };
    
    const handleDragStart = (index: number) => {
        draggedItemIndex.current = index;
    };
    
    const handleDragEnter = (index: number) => {
        if (draggedItemIndex.current === null || draggedItemIndex.current === index) return;
    
        dragOverItemIndex.current = index;
    
        setCurrentCourse(prevCourse => {
            if (!prevCourse) return null;
            const newLessons = [...prevCourse.lessons];
            const draggedItem = newLessons.splice(draggedItemIndex.current!, 1)[0];
            newLessons.splice(dragOverItemIndex.current!, 0, draggedItem);
            draggedItemIndex.current = dragOverItemIndex.current;
            return { ...prevCourse, lessons: newLessons };
        });
    };

    const handleDragEnd = async () => {
        if (currentCourse) {
            const newLessonOrder = currentCourse.lessons.map(l => l.id);
            try {
                await api.reorderLessons(currentCourse.id, newLessonOrder);
                showToast("Lesson order saved!", "success");
            } catch (error) {
                showToast("Failed to save new lesson order.", "error");
                // Optionally revert UI changes or refresh from server
                refreshCourse();
            }
        }
        draggedItemIndex.current = null;
        dragOverItemIndex.current = null;
    };

    if (loading) return <div>Loading lesson data...</div>;
    if (!currentCourse) return <div>Course not found.</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <button onClick={onBack} className="flex items-center space-x-2 text-primary-600 font-semibold mb-6 hover:underline">
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to All Courses</span>
            </button>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{currentCourse.title}</h2>
                    <p className="text-gray-700">Manage Lessons</p>
                </div>
                <Button onClick={handleOpenCreateModal}>Add New Lesson</Button>
            </div>
            
            <div className="space-y-3">
                {currentCourse.lessons.length > 0 ? (
                    currentCourse.lessons.map((lesson, index) => (
                         <div 
                            key={lesson.id} 
                            className={`flex items-center p-4 bg-gray-50 rounded-lg border transition-shadow ${draggedItemIndex.current === index ? 'shadow-lg bg-primary-100' : ''}`}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => e.preventDefault()}
                         >
                            <div className="cursor-grab text-gray-500 mr-4">
                               <DragHandleIcon />
                            </div>
                            <div className="flex-grow">
                                <span className="font-medium text-gray-800">{index + 1}. {lesson.title}</span>
                                {lesson.duration && <p className="text-xs text-gray-600">{lesson.duration}</p>}
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => handleOpenEditModal(lesson)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-100"><PencilIcon /></button>
                                <button onClick={() => handleDeleteLesson(lesson)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100"><TrashIcon /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-700 py-8">This course has no lessons yet. Add one to get started!</p>
                )}
            </div>
             <LessonFormModal 
                isOpen={isLessonFormOpen}
                onClose={() => setIsLessonFormOpen(false)}
                onSave={handleSaveLesson}
                lesson={editingLesson}
                courseId={course.id}
            />
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Lesson Deletion"
                message={
                    <p>
                        Are you sure you want to delete the lesson: <strong>"{lessonToDelete?.title}"</strong>?
                        This action cannot be undone.
                    </p>
                }
                confirmButtonText="Delete"
            />
        </div>
    );
};

const TeacherCourseManagement: FC<{ onManageCourse: (course: Course) => void }> = ({ onManageCourse }) => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const { showToast } = useToast();
    
    const fetchCourses = useCallback(async () => {
        if (!user || user.role !== Role.TEACHER) return;
        setLoading(true);
        setError(null);
        try {
            const fetchedCourses = await api.getCoursesByTeacherId(user.id);
            setCourses(fetchedCourses);
        } catch (err) {
            setError("Failed to fetch courses.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchCourses();
    }, [fetchCourses]);

    const handleOpenCreateModal = () => {
        setEditingCourse(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (course: Course) => {
        setEditingCourse(course);
        setIsModalOpen(true);
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (window.confirm("Are you sure you want to delete this course? This will also delete all its lessons.")) {
            try {
                await api.deleteCourse(courseId);
                showToast("Course deleted successfully", "success");
                fetchCourses();
            } catch (err) {
                showToast("Failed to delete course.", "error");
            }
        }
    };
    
    const handleSaveCourse = () => {
        setIsModalOpen(false);
        setEditingCourse(null);
        fetchCourses();
        showToast('Course saved successfully.', 'success');
    };

    const getStatusBadge = (status: CourseStatus) => {
        switch(status) {
            case CourseStatus.DRAFT: return 'bg-gray-200 text-gray-800';
            case CourseStatus.PUBLISHED: return 'bg-green-200 text-green-800';
            case CourseStatus.ARCHIVED: return 'bg-yellow-200 text-yellow-800';
            default: return 'bg-gray-200 text-gray-800';
        }
    }

    if (!user) return null;
    if (loading) return <div>Loading courses...</div>;
    if (error) return <div className="text-red-500">{error}</div>;

    return (
         <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">My Courses</h2>
                <Button onClick={handleOpenCreateModal}>Create New Course</Button>
            </div>
            {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courses.map(course => (
                        <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                            <img src={course.imageUrl} alt={course.title} className="w-full h-48 object-cover"/>
                            <div className="p-4 flex flex-col flex-grow">
                                <div className="flex justify-between items-start">
                                     <h3 className="text-lg font-bold text-gray-800 mb-1">{course.title}</h3>
                                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(course.status)}`}>
                                        {course.status}
                                     </span>
                                </div>
                                <p className="text-gray-700 text-sm mt-1 line-clamp-2 flex-grow">{course.description}</p>
                                <div className="mt-4 pt-4 border-t">
                                    <div className="flex items-center justify-between">
                                        <Button className="flex-grow text-sm" onClick={() => onManageCourse(course)}>Manage Lessons</Button>
                                        <div className="flex ml-2">
                                            <button onClick={() => handleOpenEditModal(course)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors"><PencilIcon /></button>
                                            <button onClick={() => handleDeleteCourse(course.id)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"><TrashIcon /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No courses</h3>
                    <p className="mt-1 text-sm text-gray-700">Get started by creating a new course.</p>
                    <div className="mt-6">
                        <Button onClick={handleOpenCreateModal}>
                            Create Your First Course
                        </Button>
                    </div>
                </div>
            )}
             <CourseFormModal 
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingCourse(null); }}
                onSave={handleSaveCourse}
                course={editingCourse}
                teacherId={user.id}
            />
        </div>
    );
};

const TeacherDashboard = () => {
    const [view, setView] = useState('courses'); // Main nav view
    const [courseView, setCourseView] = useState('list'); // 'list' or 'detail'
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    
    const navItems = [
        { label: 'My Courses', icon: <BookOpenIcon />, view: 'courses' },
    ];
    
    const handleManageCourse = (course: Course) => {
        setSelectedCourse(course);
        setCourseView('detail');
    };
    
    const handleBackToCourseList = () => {
        setSelectedCourse(null);
        setCourseView('list');
    };

    return (
        <DashboardLayout navItems={navItems} currentView={view} setView={setView}>
            {view === 'courses' && (
                <>
                    {courseView === 'list' && <TeacherCourseManagement onManageCourse={handleManageCourse} />}
                    {courseView === 'detail' && selectedCourse && <TeacherCourseDetail course={selectedCourse} onBack={handleBackToCourseList} />}
                </>
            )}
        </DashboardLayout>
    );
};

// Student Dashboard Components
const StudentEnrolledCourses = () => {
    const { user } = useAuth();
    const { setPage } = useNav();
    const [courses, setCourses] = useState<CourseWithTeacherInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            api.getEnrolledCoursesByStudentId(user.id)
                .then(setCourses)
                .finally(() => setLoading(false));
        }
    }, [user]);

    if (loading) return <div className="text-center p-10">Loading your courses...</div>;

    const EnrolledCourseCard: FC<{ course: CourseWithTeacherInfo }> = ({ course }) => (
        <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
            <img src={course.imageUrl} alt={course.title} className="w-full h-48 object-cover"/>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-lg font-bold text-gray-800 mb-1">{course.title}</h3>
                <p className="text-gray-700 text-sm mt-1 line-clamp-2 flex-grow">by {course.teacherName}</p>
                <div className="mt-4 pt-4 border-t">
                    <Button className="w-full" onClick={() => setPage('course', { id: course.id })}>
                        Continue Learning
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">My Courses</h2>
            {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <EnrolledCourseCard key={course.id} course={course} />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <BookOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No courses yet</h3>
                    <p className="mt-1 text-sm text-gray-700">You haven't enrolled in any courses.</p>
                </div>
            )}
        </div>
    );
};

const StudentBrowseCourses = () => {
    const { setPage } = useNav();
    const [courses, setCourses] = useState<CourseWithTeacherInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getCourses()
            .then(setCourses)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center p-10">Loading courses...</div>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Browse All Courses</h2>
            {courses.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {courses.map(course => (
                        <div key={course.id} onClick={() => setPage('course', { id: course.id })} 
                            className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer group transform hover:-translate-y-1 transition-all duration-300">
                            
                            <div className="relative h-52 overflow-hidden">
                                <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                                <h3 className="absolute bottom-4 left-4 text-xl font-bold text-white leading-tight tracking-wide">{course.title}</h3>
                            </div>
                        
                            <div className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <img src={course.teacherProfilePhotoUrl} alt={course.teacherName} className="w-10 h-10 rounded-full object-cover mr-3"/>
                                        <div>
                                            <span className="text-sm font-semibold text-gray-800 block">{course.teacherName}</span>
                                            <p className="text-xs text-gray-700">Instructor</p>
                                        </div>
                                    </div>
                                    <span className="bg-primary-100 text-primary-800 text-xs font-semibold px-3 py-1 rounded-full">{course.lessons.length} Lessons</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-600 py-8">No courses available at the moment.</p>
            )}
        </div>
    );
};


const StudentDashboard = () => {
    const [view, setView] = useState('my-courses');
    const navItems = [
        { label: 'My Courses', icon: <BookOpenIcon />, view: 'my-courses' },
        { label: 'Browse Courses', icon: <SearchIcon />, view: 'browse' },
    ];
    return (
        <DashboardLayout navItems={navItems} currentView={view} setView={setView}>
            {view === 'my-courses' && <StudentEnrolledCourses />}
            {view === 'browse' && <StudentBrowseCourses />}
        </DashboardLayout>
    );
};

const ProfilePage = () => {
    const { user, updateUserContext, logout } = useAuth();
    const { setPage } = useNav();
    const { showToast } = useToast();
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [isEditing, setIsEditing] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profilePhotoUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!user) return <div className="text-center p-8">User not found</div>;

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        try {
            const updatedUserData: Partial<User> & { id: string; newProfilePhoto?: File | null } = { id: user.id, name, email };
            
            if (profilePhoto) {
                updatedUserData.newProfilePhoto = profilePhoto;
            }

            const updatedUser = await api.updateUser(updatedUserData);
            updateUserContext(updatedUser);
            setProfilePhoto(null);
            setPhotoPreview(updatedUser.profilePhotoUrl);
            setIsEditing(false);
            showToast("Profile updated successfully!", "success");
        } catch (error) {
            showToast("Failed to update profile.", "error");
        }
    };

    const handleCancel = () => {
        setName(user.name);
        setEmail(user.email);
        setProfilePhoto(null);
        setPhotoPreview(user.profilePhotoUrl);
        setIsEditing(false);
    }

    const handleLogout = () => {
        logout();
        setPage('landing');
        showToast("You have been successfully logged out.", "success");
    };

    return (
        <div className="container mx-auto max-w-2xl my-10 p-8 bg-white rounded-lg shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">My Profile</h1>
            <div className="flex flex-col items-center">
                <div className="relative">
                    <img src={photoPreview || user.profilePhotoUrl} alt="Profile" className="w-32 h-32 rounded-full border-4 border-primary-500 object-cover" />
                    {isEditing && (
                        <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-primary-600 p-2 rounded-full text-white hover:bg-primary-700 transition-colors">
                           <CameraIcon className="w-5 h-5" />
                        </button>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                </div>
                <div className="w-full space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <Input type="text" value={name} onChange={e => setName(e.target.value)} disabled={!isEditing} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!isEditing} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Role</label>
                        <Input type="text" value={user.role} disabled />
                    </div>
                </div>
                <div className="flex space-x-4 mt-6">
                    {isEditing ? (
                        <>
                            <Button onClick={handleSave}>Save</Button>
                            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                        </>
                    ) : (
                        <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    )}
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                <Button 
                    variant="secondary" 
                    onClick={() => setPage('dashboard')}
                    className="w-full sm:w-auto flex items-center justify-center"
                >
                    <ArrowLeftIcon className="w-5 h-5 mr-2" />
                    Back to Dashboard
                </Button>
                <Button 
                    variant="danger" 
                    onClick={handleLogout}
                    className="w-full sm:w-auto flex items-center justify-center"
                >
                    <LogoutIcon className="w-5 h-5 mr-2" />
                    Logout
                </Button>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---
function App() {
  return (
    <AuthProvider>
      <NavProvider>
        <ToastProvider>
            <Main />
        </ToastProvider>
      </NavProvider>
    </AuthProvider>
  );
}

// Separate component to access contexts
const Main = () => {
  const { page, pageParams } = useNav();
  const { user } = useAuth();

  const renderPage = () => {
    switch (page) {
      case 'landing': return <LandingPage />;
      case 'auth': return <AuthPage initialForm={pageParams.form || 'login'} />;
      case 'course': return <CoursePage />;
      case 'lessonView': return user ? <LessonViewPage /> : <AuthPage initialForm="login" />;
      case 'dashboard': return user ? <DashboardPage /> : <AuthPage initialForm="login" />;
      case 'profile': return user ? <ProfilePage /> : <AuthPage initialForm="login" />;
      default: return <LandingPage />;
    }
  };
  
  const isDashboard = page === 'dashboard' && user;
  const isLessonView = page === 'lessonView' && user;


  return (
    <div className="flex flex-col min-h-screen font-sans text-gray-900 bg-gray-50">
      {!isDashboard && !isLessonView && <Header />}
      <main className={`flex-grow ${isLessonView ? 'bg-gray-100' : ''}`}>
        {renderPage()}
      </main>
      {!isDashboard && !isLessonView && <Footer />}
    </div>
  );
};

export default App;
