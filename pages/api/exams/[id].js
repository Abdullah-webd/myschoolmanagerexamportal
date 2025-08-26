// API route for real mode exam data
export default function handler(req, res) {
  const { id } = req.query;

  // Mock exam data for API calls
  const examData = {
    101: {
      id: 101,
      title: 'Advanced JavaScript Concepts',
      description: 'Closures, Prototypes, and Async Programming',
      duration: 60,
      questions: [
        {
          id: 1,
          question: "What is a closure in JavaScript?",
          options: [
            "A way to close browser windows",
            "A function that has access to variables in its outer scope",
            "A method to end program execution",
            "A type of loop"
          ],
          correctAnswer: 1
        },
        {
          id: 2,
          question: "What does the 'this' keyword refer to in JavaScript?",
          options: [
            "The current function",
            "The global object",
            "The context in which a function is called",
            "The HTML document"
          ],
          correctAnswer: 2
        }
      ]
    },
    102: {
      id: 102,
      title: 'Node.js Backend Development',
      description: 'Building scalable server-side applications',
      duration: 90,
      questions: [
        {
          id: 1,
          question: "What is Node.js?",
          options: [
            "A JavaScript framework",
            "A JavaScript runtime built on Chrome's V8 engine",
            "A database management system",
            "A web browser"
          ],
          correctAnswer: 1
        }
      ]
    }
  };

  if (req.method === 'GET') {
    const exam = examData[id];
    if (exam) {
      res.status(200).json(exam);
    } else {
      res.status(404).json({ message: 'Exam not found' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}