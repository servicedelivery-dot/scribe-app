import { pgTable, text, integer, timestamp, uuid, boolean, jsonb, real } from 'drizzle-orm/pg-core'

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const contentItems = pgTable('content_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  type: text('type', { enum: ['image', 'note'] }).notNull(),
  content: text('content'),
  storageKey: text('storage_key'),
  publicUrl: text('public_url'),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const generatedContent = pgTable('generated_content', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  format: text('format', { enum: ['course', 'guide', 'article'] }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── LMS ──────────────────────────────────────────────────────────────────────

export const lmsCourses = pgTable('lms_courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: text('created_by').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  emoji: text('emoji').default('📚').notNull(),
  published: boolean('published').default(false).notNull(),
  sourceGeneratedId: uuid('source_generated_id'),
  passScoreRequired: integer('pass_score_required').default(70).notNull(), // % to pass quiz
  prerequisiteCourseId: uuid('prerequisite_course_id'),                    // must complete this first
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const lmsModules = pgTable('lms_modules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
})

export const lmsLessons = pgTable('lms_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  moduleId: uuid('module_id').notNull().references(() => lmsModules.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').default('').notNull(), // markdown or JSON for scribe
  lessonType: text('lesson_type').default('markdown').notNull(), // 'markdown' | 'scribe'
  orderIndex: integer('order_index').default(0).notNull(),
})

export const lmsEnrollments = pgTable('lms_enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at').defaultNow().notNull(),
})

export const lmsProgress = pgTable('lms_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  lessonId: uuid('lesson_id').notNull().references(() => lmsLessons.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
})

// ── User roles ────────────────────────────────────────────────────────────────
export const lmsUserRoles = pgTable('lms_user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  role: text('role', { enum: ['owner', 'admin', 'manager', 'learner'] }).default('learner').notNull(),
  displayName: text('display_name'),
  email: text('email'),
  assignedBy: text('assigned_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Quizzes ───────────────────────────────────────────────────────────────────
export const lmsQuizQuestions = pgTable('lms_quiz_questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').references(() => lmsLessons.id, { onDelete: 'cascade' }), // null = end-of-course
  question: text('question').notNull(),
  options: jsonb('options').notNull().$type<string[]>(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation'),
  orderIndex: integer('order_index').default(0).notNull(),
})

export const lmsQuizAttempts = pgTable('lms_quiz_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  lessonId: uuid('lesson_id').references(() => lmsLessons.id, { onDelete: 'cascade' }),
  answers: jsonb('answers').notNull().$type<number[]>(),
  score: real('score').notNull(),   // 0–100
  passed: boolean('passed').notNull(),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
})

// ── Certificates ──────────────────────────────────────────────────────────────
export const lmsCertificates = pgTable('lms_certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  certificateNumber: text('certificate_number').notNull().unique(),
  recipientName: text('recipient_name').notNull(),
  courseTitle: text('course_title').notNull(),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
})

// ── User profiles ─────────────────────────────────────────────────────────────
export const lmsUserProfiles = pgTable('lms_user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  department: text('department'),
  jobTitle: text('job_title'),
  phone: text('phone'),
  notes: text('notes'),
  tempPassword: text('temp_password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Course assignments ────────────────────────────────────────────────────────
export const lmsCourseAssignments = pgTable('lms_course_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  assignedBy: text('assigned_by').notNull(),
  dueDate: timestamp('due_date'),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
})

// ── Video progress ────────────────────────────────────────────────────────────
export const lmsVideoProgress = pgTable('lms_video_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  lessonId: uuid('lesson_id').notNull().references(() => lmsLessons.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  watchedSeconds: real('watched_seconds').default(0).notNull(),
  totalSeconds: real('total_seconds').default(0).notNull(),
  lastPosition: real('last_position').default(0).notNull(),  // seconds
  completed: boolean('completed').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ── Course Groups ─────────────────────────────────────────────────────────────
export const lmsGroups = pgTable('lms_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').default('#003CA6').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const lmsCourseGroups = pgTable('lms_course_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  groupId: uuid('group_id').notNull().references(() => lmsGroups.id, { onDelete: 'cascade' }),
})

// ── Activity Log ──────────────────────────────────────────────────────────────
export const lmsActivityLog = pgTable('lms_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  actorName: text('actor_name'),
  action: text('action').notNull(),          // 'enrolled', 'completed', 'passed_quiz', 'certificate', 'assigned', 'login'
  entityType: text('entity_type'),           // 'course' | 'lesson' | 'quiz' | 'user'
  entityId: text('entity_id'),
  entityName: text('entity_name'),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Sign-offs ─────────────────────────────────────────────────────────────────
export const lmsSignoffs = pgTable('lms_signoffs', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => lmsCourses.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  requestedBy: text('requested_by').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
  notes: text('notes'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
})

// ── Scribe Library ───────────────────────────────────────────────────────────
export const lmsScribeLibrary = pgTable('lms_scribe_library', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slidesUrl: text('slides_url').notNull(),
  movieUrl: text('movie_url').notNull(),
  scrollUrl: text('scroll_url').notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ── Announcements ─────────────────────────────────────────────────────────────
export const lmsAnnouncements = pgTable('lms_announcements', {
  id: uuid('id').primaryKey().defaultRandom(),
  createdBy: text('created_by').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  pinned: boolean('pinned').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
