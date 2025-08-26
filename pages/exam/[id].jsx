import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function ExamPage() {
  const router = useRouter();
  const { id } = router.query;

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Auto-submit
  const autoSubmit = useCallback(() => {
    if (!isSubmitted) {
      submitExam();
    }
  }, [isSubmitted]);

  // Load exam data
useEffect(() => {
  if (!id) return;

  const token = sessionStorage.getItem("token");
  if (!token) {
    router.push("/");
    return;
  }

  const fetchExam = async () => {
  try {
    setLoading(true);
    setErrorMsg("");

    const res = await fetch(`http://localhost:3001/api/exams/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Fetch exam response status:", res);

    if (!res.ok) throw new Error("Failed to load exam");

    const examData = await res.json();
    setExam(examData);
    setQuestions(examData.questions || []);

    const savedState = localStorage.getItem(`exam_${id}_state`);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setAnswers(parsed.answers || {});
      setCurrentQuestion(parsed.currentQuestion || 0);
      setTimeRemaining(parsed.timeRemaining || (examData.duration || 30) * 60);
    } else {
      // 👉 fallback: check backend autosave
      const autoRes = await fetch(`http://localhost:3001/api/exams/${id}/autosave`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (autoRes.ok) {
        const { submission } = await autoRes.json();
        if (submission?.answers?.length) {
          const restoredAnswers = {};
          submission.answers.forEach((a) => {
            restoredAnswers[a.questionId] = a.answer;
          });
          setAnswers(restoredAnswers);
          setTimeRemaining((examData.duration || 30) * 60 - (submission.timeSpent || 0));
        } else {
          setTimeRemaining((examData.duration || 30) * 60);
        }
      } else {
        setTimeRemaining((examData.duration || 30) * 60);
      }
    }
  } catch (err) {
    setErrorMsg(err.message || "Error loading exam. Please try again.");
    console.log(err);
  } finally {
    setLoading(false);
  }
};


  fetchExam();
}, [id, router]);


  // Timer effect
  useEffect(() => {
    if (timeRemaining > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          const newTime = prev - 1;

          // Save local state for resume
          if (newTime % 10 === 0) {
            localStorage.setItem(
              `exam_${id}_state`,
              JSON.stringify({
                answers,
                currentQuestion,
                timeRemaining: newTime,
              })
            );
          }

          if (newTime <= 0) {
            autoSubmit();
            return 0;
          }

          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, isSubmitted, id, answers, currentQuestion, autoSubmit]);

  const autosaveExam = async (updatedAnswers) => {
  try {
    const token = sessionStorage.getItem("token");
    const answersArray = Object.entries(updatedAnswers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    const payload = {
      answers: answersArray,
      timeSpent: exam.duration * 60 - timeRemaining,
    };

    await fetch(`http://localhost:3001/api/exams/${id}/autosave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn("Autosave failed:", err.message);
  }
};


  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionId, optionIndex) => {
  setAnswers((prev) => {
    const updated = { ...prev, [questionId]: optionIndex };

    // Save locally
    localStorage.setItem(
      `exam_${id}_state`,
      JSON.stringify({
        answers: updated,
        currentQuestion,
        timeRemaining,
      })
    );

    // Save on backend too
    autosaveExam(updated);

    return updated;
  });
};



  const goToQuestion = (index) => {
    setCurrentQuestion(index);
  };

  const submitExam = async () => {
  try {
    const token = sessionStorage.getItem("token");

    // 🔥 confirmation before submit
    const confirmSubmit = window.confirm("Are you sure you want to submit the exam?");
    if (!confirmSubmit) return; // stop if cancelled

    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));

    const payload = {
      answers: answersArray,
      timeSpent: exam.duration * 60 - timeRemaining,
    };

    console.log("Submitting exam with payload:", payload);

    const res = await fetch(`http://localhost:3001/api/exams/${id}/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Failed to submit exam");
    }

    const data = await res.json();
    // we no longer need to show score, just mark submitted
    setIsSubmitted(true);

    localStorage.removeItem(`exam_${id}_state`);
  } catch (err) {
    alert(err.message || "Error submitting exam. Please try again.");
  }
};



  // -------- UI ----------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading exam...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-xl font-bold text-red-600 mb-4">{errorMsg}</h1>
        <Link
          href="/dashboard"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  if (isSubmitted) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold text-green-600">✅ Exam Submitted Successfully!</h1>
      <Link
        href="/dashboard"
        className="bg-blue-600 text-white px-4 py-2 mt-6 rounded"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}



  if (!exam || !questions.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-xl font-bold">No questions found for this exam</h1>
        <Link
          href="/dashboard"
          className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white shadow px-4 py-3 flex justify-between">
        <div>
          <h1 className="text-xl font-bold">{exam.title}</h1>
          <p>
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>
        <div className={timeRemaining < 300 ? "text-red-600 font-bold" : ""}>
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Question Area */}
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-lg font-semibold mb-4">
          {currentQuestion + 1}. {currentQ.question}
        </h2>
        <div className="space-y-3">
          {currentQ.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(currentQ._id, index)}
              className={`w-full text-left p-3 rounded border ${
                answers[currentQ._id] === index
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-100"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => goToQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          >
            Previous
          </button>
          {currentQuestion < questions.length - 1 ? (
            <button
              onClick={() => goToQuestion(currentQuestion + 1)}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Next
            </button>
          ) : (
            <button
              onClick={submitExam}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Submit Exam
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
