import diyaPhoto from './assets/diya.jpg';

export const student = {
  name: "Diya Shah",
  photo: diyaPhoto,
  level: 3,
  xp: 520,
  xpTarget: 1000,
  explorerPoints: 980,
  badge: "Active Learner",
  teacherNote: "Great consistency shown.",

  books: [
    { id: 1, title: "Marie's Mysterious Rock", shortTitle: "Marie's Myste...", date: "05 Apr 2026", activity: "Reviewed and completed Book 1", cognitive: 2, creative: 2, communication: 1, socialEmotional: 2, physical: 1, practical: 2, avg: 1.67 },
    { id: 2, title: "Einstein's Wonders", shortTitle: "Einstein's Wo...", date: "12 Apr 2026", activity: "Finished activity on Book 2", cognitive: 2, creative: 2, communication: 2, socialEmotional: 2, physical: 2, practical: 3, avg: 2.17 },
    { id: 3, title: "Archimedes' Explorations", shortTitle: "Archimedes' E...", date: "20 Apr 2026", activity: "Completed reading: Book 3", cognitive: 3, creative: 4, communication: 3, socialEmotional: 3, physical: 2, practical: 3, avg: 3.00 },
    { id: 4, title: "Katherine's Courage", shortTitle: "Katherine's C...", date: "28 Apr 2026", activity: "Explored concepts from Book 4", cognitive: 3, creative: 3, communication: 2, socialEmotional: 3, physical: 3, practical: 3, avg: 2.83 },
    { id: 5, title: "Ada's Algorithm", shortTitle: "Ada's Algo...", date: "10 May 2026", activity: "Finished activity on Book 5", cognitive: 4, creative: 4, communication: 3, socialEmotional: 4, physical: 3, practical: 4, avg: 3.67 }
  ],

  recentActivities: [
    { title: "Finished activity on Book 5", book: "Ada's Algorithm", date: "10 May 2026", icon: "📘" },
    { title: "Explored concepts from Book 4", book: "Katherine's Courage", date: "28 Apr 2026", icon: "📙" },
    { title: "Completed reading: Book 3", book: "Archimedes' Explorations", date: "20 Apr 2026", icon: "📗" }
  ],

  skillAverages: {
    cognitive: 2.8,
    creative: 3.0,
    communication: 2.2,
    socialEmotional: 2.8,
    physical: 2.2,
    practical: 3.0
  },

  milestones: [
    { id: 1, title: "Growing Learner", emoji: "🌱", color: "#bbf7d0", borderColor: "#16a34a", textColor: "#15803d", desc: "Your child has begun their learning journey!", unlocked: true },
    { id: 2, title: "Active Learner", emoji: "⭐", color: "#fef9c3", borderColor: "#ca8a04", textColor: "#a16207", desc: "Your child is actively building new skills!", unlocked: true },
    { id: 3, title: "Star Learner", emoji: "🔒", color: "#f3f4f6", borderColor: "#d1d5db", textColor: "#9ca3af", desc: "Keep going to unlock!", unlocked: false }
  ]
};

export const navLinks = {
  home: "/",
  shop: "https://www.thebeyondbox.org/category/all-products",
  simLab: "https://www.thebeyondbox.org/marie-curie",
  community: "https://www.thebeyondbox.org/group/humans-of-science-1/discussion",
  skillTracker: "https://yashvim1-sketch.github.io/beyond-box-skill-tracker-student/",
  activities: "INTERNAL"
};
