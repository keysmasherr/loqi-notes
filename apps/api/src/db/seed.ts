import { db } from './index';
import {
  users,
  courses,
  classSchedules,
  assignments,
  studySessions,
  tags,
  notes,
  noteTags,
} from './schema';
import { eq } from 'drizzle-orm';

// Get seed user ID from environment or use default test user
// IMPORTANT: This user must exist in Supabase Auth (auth.users table)
// The public.users table has a FK constraint to auth.users(id)
const SEED_USER_ID = process.env.SEED_USER_ID || 'b44ae072-0502-4574-9a4f-a5e06873b401';
const SEED_USER_EMAIL = process.env.SEED_USER_EMAIL || 'keysmasherr@gmail.com';

// Helper to add days to current date
function addDays(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

// Helper to add hours to a date
function addHours(date: Date, hours: number): Date {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
}

// Helper to set time on a date
function setTime(date: Date, hours: number, minutes: number = 0): Date {
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

async function seed() {
  console.log('🌱 Starting seed...');
  console.log(`Using user ID: ${SEED_USER_ID}`);

  // Check if we should clear existing seed data
  if (process.env.SEED_CLEAR === 'true') {
    console.log('🗑️  Clearing existing seed data...');
    await db.delete(users).where(eq(users.id, SEED_USER_ID));
    console.log('✅ Cleared existing seed data');
  }

  // 1. Create or verify user exists
  console.log('👤 Creating/verifying seed user...');
  const existingUser = await db.select().from(users).where(eq(users.id, SEED_USER_ID));

  if (existingUser.length === 0) {
    await db.insert(users).values({
      id: SEED_USER_ID,
      email: SEED_USER_EMAIL,
      displayName: 'Seed User',
      subscriptionTier: 'pro',
      preferences: {
        theme: 'dark',
        notificationsEnabled: true,
      },
    });
    console.log('✅ Created seed user');
  } else {
    console.log('ℹ️  Seed user already exists');
  }

  // 2. Create courses
  console.log('📚 Creating courses...');
  const courseData = [
    {
      id: '00000000-0000-0000-0001-000000000001',
      userId: SEED_USER_ID,
      name: 'Introduction to Computer Science',
      code: 'CS101',
      section: '001',
      instructor: 'Dr. Smith',
      location: 'Science Building 101',
      color: '#3B82F6',
      term: 'Fall 2024',
      startDate: '2024-09-01',
      endDate: '2024-12-15',
      credits: 3,
      description: 'Fundamentals of programming and computational thinking',
    },
    {
      id: '00000000-0000-0000-0001-000000000002',
      userId: SEED_USER_ID,
      name: 'Calculus II',
      code: 'MATH201',
      section: '002',
      instructor: 'Prof. Johnson',
      location: 'Math Hall 205',
      color: '#10B981',
      term: 'Fall 2024',
      startDate: '2024-09-01',
      endDate: '2024-12-15',
      credits: 4,
      description: 'Integration techniques, sequences, and series',
    },
    {
      id: '00000000-0000-0000-0001-000000000003',
      userId: SEED_USER_ID,
      name: 'Physics I',
      code: 'PHYS101',
      section: '001',
      instructor: 'Dr. Williams',
      location: 'Physics Lab 102',
      color: '#F59E0B',
      term: 'Fall 2024',
      startDate: '2024-09-01',
      endDate: '2024-12-15',
      credits: 4,
      description: 'Mechanics, thermodynamics, and waves',
    },
    {
      id: '00000000-0000-0000-0001-000000000004',
      userId: SEED_USER_ID,
      name: 'English Composition',
      code: 'ENG102',
      section: '003',
      instructor: 'Prof. Davis',
      location: 'Humanities 301',
      color: '#EF4444',
      term: 'Fall 2024',
      startDate: '2024-09-01',
      endDate: '2024-12-15',
      credits: 3,
      description: 'Academic writing and critical analysis',
    },
  ];

  for (const course of courseData) {
    const existing = await db.select().from(courses).where(eq(courses.id, course.id));
    if (existing.length === 0) {
      await db.insert(courses).values(course);
    }
  }
  console.log(`✅ Created ${courseData.length} courses`);

  // 3. Create class schedules
  console.log('📅 Creating class schedules...');
  const scheduleData = [
    // CS101: Mon/Wed 10:00-11:30
    {
      id: '00000000-0000-0000-0002-000000000001',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000001',
      dayOfWeek: 1, // Monday
      startTime: '10:00',
      endTime: '11:30',
      location: 'Science Building 101',
      classType: 'lecture',
    },
    {
      id: '00000000-0000-0000-0002-000000000002',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000001',
      dayOfWeek: 3, // Wednesday
      startTime: '10:00',
      endTime: '11:30',
      location: 'Science Building 101',
      classType: 'lecture',
    },
    // MATH201: Tue/Thu 09:00-10:30
    {
      id: '00000000-0000-0000-0002-000000000003',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000002',
      dayOfWeek: 2, // Tuesday
      startTime: '09:00',
      endTime: '10:30',
      location: 'Math Hall 205',
      classType: 'lecture',
    },
    {
      id: '00000000-0000-0000-0002-000000000004',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000002',
      dayOfWeek: 4, // Thursday
      startTime: '09:00',
      endTime: '10:30',
      location: 'Math Hall 205',
      classType: 'lecture',
    },
    // PHYS101: Mon/Wed 14:00-15:30 (lecture), Fri 14:00-16:00 (lab)
    {
      id: '00000000-0000-0000-0002-000000000005',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000003',
      dayOfWeek: 1, // Monday
      startTime: '14:00',
      endTime: '15:30',
      location: 'Physics Lab 102',
      classType: 'lecture',
    },
    {
      id: '00000000-0000-0000-0002-000000000006',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000003',
      dayOfWeek: 3, // Wednesday
      startTime: '14:00',
      endTime: '15:30',
      location: 'Physics Lab 102',
      classType: 'lecture',
    },
    {
      id: '00000000-0000-0000-0002-000000000007',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000003',
      dayOfWeek: 5, // Friday
      startTime: '14:00',
      endTime: '16:00',
      location: 'Physics Lab 102',
      classType: 'lab',
    },
    // ENG102: Tue/Thu 11:00-12:30
    {
      id: '00000000-0000-0000-0002-000000000008',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000004',
      dayOfWeek: 2, // Tuesday
      startTime: '11:00',
      endTime: '12:30',
      location: 'Humanities 301',
      classType: 'lecture',
    },
    {
      id: '00000000-0000-0000-0002-000000000009',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000004',
      dayOfWeek: 4, // Thursday
      startTime: '11:00',
      endTime: '12:30',
      location: 'Humanities 301',
      classType: 'lecture',
    },
  ];

  for (const schedule of scheduleData) {
    const existing = await db.select().from(classSchedules).where(eq(classSchedules.id, schedule.id));
    if (existing.length === 0) {
      await db.insert(classSchedules).values(schedule);
    }
  }
  console.log(`✅ Created ${scheduleData.length} class schedules`);

  // 4. Create assignments
  console.log('📝 Creating assignments...');
  const assignmentData = [
    {
      id: '00000000-0000-0000-0003-000000000001',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000001',
      title: 'Programming Assignment 1',
      description: 'Implement basic data structures including arrays, linked lists, and stacks.',
      type: 'assignment',
      dueDate: addDays(7),
      priority: 'high',
      status: 'pending',
      weight: '10',
      maxGrade: '100',
      reminderSettings: [{ type: 'before', value: 24, unit: 'hours' }],
    },
    {
      id: '00000000-0000-0000-0003-000000000002',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000002',
      title: 'Midterm Exam',
      description: 'Covers chapters 1-6: Integration techniques, applications of integration.',
      type: 'exam',
      dueDate: addDays(14),
      priority: 'urgent',
      status: 'pending',
      weight: '25',
      maxGrade: '100',
      reminderSettings: [
        { type: 'before', value: 48, unit: 'hours' },
        { type: 'before', value: 24, unit: 'hours' },
      ],
    },
    {
      id: '00000000-0000-0000-0003-000000000003',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000003',
      title: 'Lab Report 1',
      description: 'Write a detailed lab report on the pendulum experiment.',
      type: 'assignment',
      dueDate: addDays(5),
      priority: 'medium',
      status: 'in_progress',
      weight: '5',
      maxGrade: '100',
      reminderSettings: [],
    },
    {
      id: '00000000-0000-0000-0003-000000000004',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000004',
      title: 'Essay Draft',
      description: 'First draft of argumentative essay on technology in education.',
      type: 'paper',
      dueDate: addDays(10),
      priority: 'medium',
      status: 'pending',
      weight: '15',
      maxGrade: '100',
      reminderSettings: [{ type: 'before', value: 72, unit: 'hours' }],
    },
    {
      id: '00000000-0000-0000-0003-000000000005',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000001',
      title: 'Quiz 1',
      description: 'Short quiz on variables, loops, and conditionals.',
      type: 'quiz',
      dueDate: addDays(3),
      priority: 'low',
      status: 'pending',
      weight: '5',
      maxGrade: '20',
      reminderSettings: [],
    },
    {
      id: '00000000-0000-0000-0003-000000000006',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000003',
      title: 'Group Project Proposal',
      description: 'Submit a proposal for the end-of-semester group project.',
      type: 'project',
      dueDate: addDays(21),
      priority: 'high',
      status: 'pending',
      weight: '10',
      maxGrade: '100',
      reminderSettings: [{ type: 'before', value: 168, unit: 'hours' }],
    },
  ];

  for (const assignment of assignmentData) {
    const existing = await db.select().from(assignments).where(eq(assignments.id, assignment.id));
    if (existing.length === 0) {
      await db.insert(assignments).values(assignment);
    }
  }
  console.log(`✅ Created ${assignmentData.length} assignments`);

  // 5. Create study sessions
  console.log('📖 Creating study sessions...');
  const tomorrow = addDays(1);
  const dayAfter = addDays(2);

  const studySessionData = [
    {
      id: '00000000-0000-0000-0004-000000000001',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000001',
      title: 'CS101 Review',
      scheduledStart: setTime(tomorrow, 14, 0),
      scheduledEnd: setTime(tomorrow, 16, 0),
      sessionType: 'review',
      status: 'scheduled',
      goals: [
        { description: 'Review linked list implementation', completed: false },
        { description: 'Practice recursion problems', completed: false },
      ],
    },
    {
      id: '00000000-0000-0000-0004-000000000002',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000002',
      title: 'Math Problem Set',
      scheduledStart: setTime(tomorrow, 18, 0),
      scheduledEnd: setTime(tomorrow, 19, 30),
      sessionType: 'practice',
      status: 'scheduled',
      goals: [
        { description: 'Complete integration exercises 1-10', completed: false },
        { description: 'Review partial fractions', completed: false },
      ],
    },
    {
      id: '00000000-0000-0000-0004-000000000003',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000003',
      title: 'Physics Reading',
      scheduledStart: setTime(addDays(-1), 10, 0),
      scheduledEnd: setTime(addDays(-1), 11, 0),
      actualStart: setTime(addDays(-1), 10, 15),
      actualEnd: setTime(addDays(-1), 11, 5),
      sessionType: 'reading',
      status: 'completed',
      productivityRating: 4,
      notes: 'Finished chapter 4 on circular motion. Need to review centripetal acceleration.',
      goals: [
        { description: 'Read chapter 4', completed: true },
        { description: 'Take notes on key formulas', completed: true },
      ],
    },
    {
      id: '00000000-0000-0000-0004-000000000004',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000004',
      title: 'Essay Writing',
      scheduledStart: setTime(new Date(), 9, 0),
      scheduledEnd: setTime(new Date(), 11, 0),
      actualStart: setTime(new Date(), 9, 10),
      sessionType: 'writing',
      status: 'in_progress',
      goals: [
        { description: 'Write introduction paragraph', completed: true },
        { description: 'Outline main arguments', completed: false },
        { description: 'Draft first body paragraph', completed: false },
      ],
    },
    {
      id: '00000000-0000-0000-0004-000000000005',
      userId: SEED_USER_ID,
      courseId: '00000000-0000-0000-0001-000000000002',
      assignmentId: '00000000-0000-0000-0003-000000000002',
      title: 'Exam Prep',
      scheduledStart: setTime(dayAfter, 13, 0),
      scheduledEnd: setTime(dayAfter, 16, 0),
      sessionType: 'study',
      status: 'scheduled',
      includeReviews: true,
      goals: [
        { description: 'Review integration by parts', completed: false },
        { description: 'Practice trig substitution', completed: false },
        { description: 'Solve past exam problems', completed: false },
      ],
    },
  ];

  for (const session of studySessionData) {
    const existing = await db.select().from(studySessions).where(eq(studySessions.id, session.id));
    if (existing.length === 0) {
      await db.insert(studySessions).values(session);
    }
  }
  console.log(`✅ Created ${studySessionData.length} study sessions`);

  // 6. Create tags
  console.log('🏷️  Creating tags...');
  const tagData = [
    {
      id: '00000000-0000-0000-0005-000000000001',
      userId: SEED_USER_ID,
      name: 'Important',
      color: '#EF4444',
      icon: 'star',
    },
    {
      id: '00000000-0000-0000-0005-000000000002',
      userId: SEED_USER_ID,
      name: 'Review',
      color: '#F59E0B',
      icon: 'refresh',
    },
    {
      id: '00000000-0000-0000-0005-000000000003',
      userId: SEED_USER_ID,
      name: 'Lecture',
      color: '#3B82F6',
      icon: 'book',
    },
    {
      id: '00000000-0000-0000-0005-000000000004',
      userId: SEED_USER_ID,
      name: 'Exam',
      color: '#8B5CF6',
      icon: 'clipboard',
    },
    {
      id: '00000000-0000-0000-0005-000000000005',
      userId: SEED_USER_ID,
      name: 'Project',
      color: '#10B981',
      icon: 'folder',
    },
    {
      id: '00000000-0000-0000-0005-000000000006',
      userId: SEED_USER_ID,
      name: 'Todo',
      color: '#6B7280',
      icon: 'check',
    },
  ];

  for (const tag of tagData) {
    const existing = await db.select().from(tags).where(eq(tags.id, tag.id));
    if (existing.length === 0) {
      await db.insert(tags).values(tag);
    }
  }
  console.log(`✅ Created ${tagData.length} tags`);

  // 7. Create notes
  console.log('📄 Creating notes...');
  const noteData = [
    {
      id: '00000000-0000-0000-0006-000000000001',
      userId: SEED_USER_ID,
      title: 'CS101 - Week 1 Notes',
      content: `# Introduction to Programming

## Variables and Data Types

Variables are containers for storing data values. In Python:

\`\`\`python
# Integer
age = 25

# Float
price = 19.99

# String
name = "John"

# Boolean
is_student = True
\`\`\`

## Control Flow

### If Statements
\`\`\`python
if age >= 18:
    print("Adult")
else:
    print("Minor")
\`\`\`

### Loops
- **For loops**: iterate over sequences
- **While loops**: repeat until condition is false

## Key Takeaways
1. Variables store data
2. Data types determine what operations are valid
3. Control flow directs program execution`,
      wordCount: 85,
      readingTimeMinutes: 1,
    },
    {
      id: '00000000-0000-0000-0006-000000000002',
      userId: SEED_USER_ID,
      title: 'Calculus Integration Rules',
      content: `# Integration Techniques Summary

## Basic Rules

| Rule | Formula |
|------|---------|
| Power Rule | ∫xⁿ dx = xⁿ⁺¹/(n+1) + C |
| Constant | ∫k dx = kx + C |
| Sum Rule | ∫(f+g) dx = ∫f dx + ∫g dx |

## Integration by Parts

**Formula:** ∫u dv = uv - ∫v du

**LIATE Rule** for choosing u:
1. **L**ogarithmic
2. **I**nverse trig
3. **A**lgebraic
4. **T**rigonometric
5. **E**xponential

## Trigonometric Substitution

- √(a² - x²): use x = a sin θ
- √(a² + x²): use x = a tan θ
- √(x² - a²): use x = a sec θ

## Practice Problems
- [ ] Problem set 4.3 #1-15
- [ ] Review examples from lecture`,
      wordCount: 120,
      readingTimeMinutes: 2,
    },
    {
      id: '00000000-0000-0000-0006-000000000003',
      userId: SEED_USER_ID,
      title: 'Physics Formula Sheet',
      content: `# Physics I - Key Formulas

## Kinematics

| Quantity | Formula |
|----------|---------|
| Velocity | v = Δx/Δt |
| Acceleration | a = Δv/Δt |
| Position | x = x₀ + v₀t + ½at² |
| Velocity | v² = v₀² + 2a(x - x₀) |

## Newton's Laws

1. **First Law**: F = 0 → a = 0
2. **Second Law**: F = ma
3. **Third Law**: F₁₂ = -F₂₁

## Energy

- Kinetic Energy: KE = ½mv²
- Potential Energy: PE = mgh
- Work: W = F·d·cos(θ)
- Power: P = W/t = Fv

## Circular Motion

- Centripetal acceleration: a = v²/r
- Centripetal force: F = mv²/r
- Angular velocity: ω = 2πf`,
      wordCount: 100,
      readingTimeMinutes: 1,
    },
    {
      id: '00000000-0000-0000-0006-000000000004',
      userId: SEED_USER_ID,
      title: 'Essay Outline',
      content: `# Technology in Education - Essay Outline

## Thesis Statement
Technology enhances education by increasing accessibility, enabling personalized learning, and preparing students for the digital workforce.

## Introduction
- Hook: Statistics on technology adoption in schools
- Background: Brief history of ed-tech
- Thesis statement

## Body Paragraph 1: Accessibility
- Online courses reach remote students
- Assistive technologies help disabled learners
- 24/7 access to materials

## Body Paragraph 2: Personalized Learning
- Adaptive learning platforms
- Self-paced instruction
- Immediate feedback

## Body Paragraph 3: Workforce Preparation
- Digital literacy skills
- Collaboration tools
- Remote work capabilities

## Counterargument
- Screen time concerns
- Digital divide
- Rebuttal: Solutions and balance

## Conclusion
- Restate thesis
- Call to action`,
      wordCount: 110,
      readingTimeMinutes: 1,
    },
    {
      id: '00000000-0000-0000-0006-000000000005',
      userId: SEED_USER_ID,
      title: 'Midterm Study Guide',
      content: `# MATH201 Midterm Study Guide

## Topics Covered
1. Review of Integration (Ch. 1)
2. Integration Techniques (Ch. 2-3)
3. Applications of Integration (Ch. 4-5)
4. Sequences and Series Intro (Ch. 6)

## Key Concepts to Master

### Integration Techniques
- [ ] U-substitution
- [ ] Integration by parts
- [ ] Trigonometric integrals
- [ ] Trigonometric substitution
- [ ] Partial fractions

### Applications
- [ ] Area between curves
- [ ] Volume by disks/washers
- [ ] Volume by shells
- [ ] Arc length
- [ ] Surface area

## Practice Resources
- Textbook odd problems (answers in back)
- WebAssign practice exam
- Office hours: MW 3-4pm

## Exam Format
- 5 short answer questions (10 pts each)
- 3 long problems (20 pts each)
- Time: 90 minutes
- **No calculator!**`,
      wordCount: 130,
      readingTimeMinutes: 2,
    },
    {
      id: '00000000-0000-0000-0006-000000000006',
      userId: SEED_USER_ID,
      title: 'Lab Report Template',
      content: `# Physics Lab Report Template

## Title
[Experiment Name]

## Abstract
Brief summary of purpose, methods, results, and conclusions (150-200 words).

## Introduction
- Background theory
- Purpose/hypothesis
- Relevance

## Materials and Methods
### Equipment
- List all equipment used
- Include model numbers if relevant

### Procedure
1. Step-by-step instructions
2. Safety precautions noted
3. Data collection method

## Results
### Data Tables
| Trial | Measurement | Uncertainty |
|-------|-------------|-------------|
| 1     |             | ±           |

### Graphs
- Include proper labels
- Error bars where appropriate

## Analysis
- Calculations with uncertainty propagation
- Comparison with theoretical values
- Percent error calculation

## Discussion
- Interpret results
- Sources of error
- Suggestions for improvement

## Conclusion
- Summarize findings
- State whether hypothesis was supported

## References
- Textbook
- Lab manual`,
      wordCount: 140,
      readingTimeMinutes: 2,
    },
    {
      id: '00000000-0000-0000-0006-000000000007',
      userId: SEED_USER_ID,
      title: 'Programming Best Practices',
      content: `# Clean Code Principles

## Naming Conventions
- Use descriptive names: \`calculateTotalPrice()\` not \`calc()\`
- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase

## Code Organization
\`\`\`python
# Good: Single responsibility
def calculate_tax(price, rate):
    return price * rate

def format_currency(amount):
    return f"USD{amount:.2f}"

# Bad: Multiple responsibilities
def calculate_and_format_tax(price, rate):
    tax = price * rate
    return f"USD{tax:.2f}"
\`\`\`

## Comments
- Write self-documenting code
- Comment WHY, not WHAT
- Keep comments updated

## Error Handling
- Use specific exceptions
- Fail fast and loud
- Log errors appropriately

## Testing
- Write tests before fixing bugs
- Test edge cases
- Aim for high coverage`,
      wordCount: 115,
      readingTimeMinutes: 2,
    },
    {
      id: '00000000-0000-0000-0006-000000000008',
      userId: SEED_USER_ID,
      title: 'Reading Notes - Chapter 3',
      content: `# Physics Chapter 3: Vectors

## Vector Basics
- Vectors have magnitude AND direction
- Scalars have magnitude only

## Vector Components
For vector **A** at angle θ:
- Aₓ = A cos(θ)
- Aᵧ = A sin(θ)

## Vector Addition
### Graphical Method
- Tip-to-tail method
- Parallelogram method

### Component Method
**R** = **A** + **B**
- Rₓ = Aₓ + Bₓ
- Rᵧ = Aᵧ + Bᵧ
- |R| = √(Rₓ² + Rᵧ²)
- θ = tan⁻¹(Rᵧ/Rₓ)

## Unit Vectors
- î = unit vector in x direction
- ĵ = unit vector in y direction
- k̂ = unit vector in z direction

## Dot Product
**A** · **B** = |A||B|cos(θ) = AₓBₓ + AᵧBᵧ

## Cross Product
**A** × **B** = |A||B|sin(θ) n̂`,
      wordCount: 120,
      readingTimeMinutes: 2,
    },
    {
      id: '00000000-0000-0000-0006-000000000009',
      userId: SEED_USER_ID,
      title: 'Project Ideas',
      content: `# Group Project Brainstorming

## Potential Topics
1. **Renewable Energy Analysis**
   - Solar panel efficiency study
   - Wind turbine simulation
   - Cost-benefit analysis

2. **Motion Tracking App**
   - Use smartphone accelerometer
   - Analyze human movement
   - Sports applications

3. **Sound Wave Visualization**
   - Build oscilloscope with Arduino
   - Visualize different frequencies
   - Music analysis

## Evaluation Criteria
- [ ] Feasibility with available equipment
- [ ] Alignment with course objectives
- [ ] Interest level of group members
- [ ] Time requirements

## Next Steps
1. Discuss with group (Friday)
2. Research equipment availability
3. Draft proposal outline
4. Schedule meeting with Dr. Williams

## Resources Needed
- Arduino kit (from lab)
- Sensors (request from department)
- Software licenses`,
      wordCount: 110,
      readingTimeMinutes: 1,
    },
    {
      id: '00000000-0000-0000-0006-000000000010',
      userId: SEED_USER_ID,
      title: 'Quick Reference',
      content: `# Quick Reference Guide

## Git Commands
\`\`\`bash
git status              # Check status
git add .               # Stage all changes
git commit -m "msg"     # Commit with message
git push origin main    # Push to remote
git pull                # Pull latest changes
git branch feature      # Create branch
git checkout feature    # Switch branch
\`\`\`

## Terminal Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+C | Cancel command |
| Ctrl+L | Clear screen |
| Tab | Autocomplete |
| ↑/↓ | Command history |

## Python Virtual Environment
\`\`\`bash
python -m venv venv     # Create venv
source venv/bin/activate # Activate (Mac/Linux)
venv\\Scripts\\activate   # Activate (Windows)
pip install -r requirements.txt
\`\`\`

## Markdown Syntax
- **Bold**: \`**text**\`
- *Italic*: \`*text*\`
- Code: \`\\\`code\\\`\`
- Link: \`[text](url)\``,
      wordCount: 100,
      readingTimeMinutes: 1,
    },
  ];

  for (const note of noteData) {
    const existing = await db.select().from(notes).where(eq(notes.id, note.id));
    if (existing.length === 0) {
      await db.insert(notes).values(note);
    }
  }
  console.log(`✅ Created ${noteData.length} notes`);

  // 8. Create note-tag relationships
  console.log('🔗 Creating note-tag relationships...');
  const noteTagData = [
    // CS101 - Week 1 Notes → Lecture
    { noteId: '00000000-0000-0000-0006-000000000001', tagId: '00000000-0000-0000-0005-000000000003' },
    // Calculus Integration Rules → Lecture, Review
    { noteId: '00000000-0000-0000-0006-000000000002', tagId: '00000000-0000-0000-0005-000000000003' },
    { noteId: '00000000-0000-0000-0006-000000000002', tagId: '00000000-0000-0000-0005-000000000002' },
    // Physics Formula Sheet → Important, Exam
    { noteId: '00000000-0000-0000-0006-000000000003', tagId: '00000000-0000-0000-0005-000000000001' },
    { noteId: '00000000-0000-0000-0006-000000000003', tagId: '00000000-0000-0000-0005-000000000004' },
    // Essay Outline → Project
    { noteId: '00000000-0000-0000-0006-000000000004', tagId: '00000000-0000-0000-0005-000000000005' },
    // Midterm Study Guide → Exam, Important
    { noteId: '00000000-0000-0000-0006-000000000005', tagId: '00000000-0000-0000-0005-000000000004' },
    { noteId: '00000000-0000-0000-0006-000000000005', tagId: '00000000-0000-0000-0005-000000000001' },
    // Lab Report Template → Project
    { noteId: '00000000-0000-0000-0006-000000000006', tagId: '00000000-0000-0000-0005-000000000005' },
    // Programming Best Practices → Lecture, Review
    { noteId: '00000000-0000-0000-0006-000000000007', tagId: '00000000-0000-0000-0005-000000000003' },
    { noteId: '00000000-0000-0000-0006-000000000007', tagId: '00000000-0000-0000-0005-000000000002' },
    // Reading Notes - Chapter 3 → Lecture
    { noteId: '00000000-0000-0000-0006-000000000008', tagId: '00000000-0000-0000-0005-000000000003' },
    // Project Ideas → Project, Todo
    { noteId: '00000000-0000-0000-0006-000000000009', tagId: '00000000-0000-0000-0005-000000000005' },
    { noteId: '00000000-0000-0000-0006-000000000009', tagId: '00000000-0000-0000-0005-000000000006' },
    // Quick Reference → Important
    { noteId: '00000000-0000-0000-0006-000000000010', tagId: '00000000-0000-0000-0005-000000000001' },
  ];

  for (const noteTag of noteTagData) {
    try {
      await db.insert(noteTags).values(noteTag).onConflictDoNothing();
    } catch {
      // Ignore duplicate key errors
    }
  }
  console.log(`✅ Created ${noteTagData.length} note-tag relationships`);

  // Update tag counts
  console.log('🔢 Updating tag counts...');
  for (const tag of tagData) {
    const count = noteTagData.filter((nt) => nt.tagId === tag.id).length;
    await db.update(tags).set({ notesCount: count }).where(eq(tags.id, tag.id));
  }
  console.log('✅ Updated tag counts');

  // Update user notes count
  await db.update(users).set({ notesCount: noteData.length }).where(eq(users.id, SEED_USER_ID));
  console.log('✅ Updated user notes count');

  console.log('\n🎉 Seed completed successfully!');
  console.log(`
Summary:
- 1 user
- ${courseData.length} courses
- ${scheduleData.length} class schedules
- ${assignmentData.length} assignments
- ${studySessionData.length} study sessions
- ${tagData.length} tags
- ${noteData.length} notes
- ${noteTagData.length} note-tag relationships
`);
}

seed()
  .then(() => {
    console.log('Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
