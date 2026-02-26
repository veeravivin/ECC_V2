const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'career_compass.db');
const db = new sqlite3.Database(dbPath);

const sampleQuestions = [
    {
        topic: "React",
        level: "Beginner",
        questions: [
            { question: "What is JSX?", type: "mcq", options: ["A CSS framework", "JavaScript XML", "A database engine", "A React hook"], answer_idx: 1 },
            { question: "Which hook is used for side effects?", type: "mcq", options: ["useState", "useMemo", "useEffect", "useCallback"], answer_idx: 2 },
            { question: "Components in React are...", type: "mcq", options: ["Functions or Classes", "Only Classes", "Only Functions", "HTML tags"], answer_idx: 0 },
            { question: "What is the virtual DOM?", type: "mcq", options: ["A direct copy of the real DOM", "A lightweight representation of the DOM", "A cloud-based DOM", "A React-only browser"], answer_idx: 1 },
            { question: "Props are...", type: "mcq", options: ["Mutable", "Immutable", "Both", "None"], answer_idx: 1 }
        ]
    },
    {
        topic: "Python",
        level: "Beginner",
        questions: [
            { question: "How do you start a comment in Python?", type: "mcq", options: ["//", "/*", "#", "--"], answer_idx: 2 },
            { question: "Which data type is used for key-value pairs?", type: "mcq", options: ["List", "Tuple", "Dictionary", "Set"], answer_idx: 2 },
            { question: "What is the correct extension for Python files?", type: "mcq", options: [".pt", ".py", ".pyt", ".pw"], answer_idx: 1 },
            { question: "How do you define a function in Python?", type: "mcq", options: ["func name():", "define name():", "def name():", "function name():"], answer_idx: 2 },
            { question: "What is used for white-spacing in Python?", type: "mcq", options: ["Brackets", "Parentheses", "Indentation", "Semicolons"], answer_idx: 2 }
        ]
    },
    {
        topic: "JavaScript",
        level: "Beginner",
        questions: [
            { question: "Which keyword is for constant variables?", type: "mcq", options: ["var", "let", "const", "fixed"], answer_idx: 2 },
            { question: "What does '===' check?", type: "mcq", options: ["Only value", "Only type", "Value and type", "None"], answer_idx: 2 },
            { question: "How to write an arrow function?", type: "mcq", options: ["func => {}", "() => {}", "=> func", "function =>"], answer_idx: 1 },
            { question: "Method to add an element at the end of an array?", type: "mcq", options: ["push()", "pop()", "shift()", "unshift()"], answer_idx: 0 },
            { question: "Which is a template literal?", type: "mcq", options: ["'string'", "\"string\"", "`string`", "(string)"], answer_idx: 2 }
        ]
    }
];

db.serialize(() => {
    console.log("Seeding predefined questions for AI optimization...");

    const stmt = db.prepare("INSERT INTO predefined_questions (topic, level, question_data) VALUES (?, ?, ?)");

    sampleQuestions.forEach(group => {
        group.questions.forEach(q => {
            stmt.run(group.topic, group.level, JSON.stringify({
                question: q.question,
                options: q.options,
                correct_idx: q.answer_idx,
                type: q.type
            }));
        });
    });

    stmt.finalize();
    console.log("Seeding complete. Beginner tests for React, Python, and JavaScript now use DB data.");
});

db.close();
