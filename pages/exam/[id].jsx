import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ExamPage() {
  const router = useRouter();
  const { id } = router.query;

  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null); // ✅ timer state

  // ✅ Helper: get token from sessionStorage
  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  // ✅ Fetch exam
  useEffect(() => {
    if (!id) return;
    const fetchExam = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/exams/${id}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (res.ok) {
          setExam(data.exam);

          // Pre-fill answers if submission exists
          if (data.submission?.answers) {
            const prefilled = {};
            data.submission.answers.forEach((a) => {
              prefilled[a.questionId] = parseInt(a.answer);
            });
            setAnswers(prefilled);
          }

          // ✅ Setup timer once exam is loaded
          setupTimer(data.exam);
        } else {
          toast.error(data.message || "Failed to load exam");
        }
      } catch (err) {
        console.error("Fetch exam error:", err);
        toast.error("Error loading exam");
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [id]);

  // ✅ Setup Timer using localStorage
  const setupTimer = (examData) => {
    if (!examData?.duration) return;

    const storageKey = `exam-${examData._id}-endTime`;
    let endTime = localStorage.getItem(storageKey);

    if (!endTime) {
      // if no saved endTime, create one
      endTime = Date.now() + examData.duration * 60000;
      localStorage.setItem(storageKey, endTime);
    }

    const tick = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setTimeLeft(0);
        clearInterval(timer);
        toast.error("Time is up! Submitting exam...");
        forceSubmit(); // ✅ auto-submit when time ends
      } else {
        setTimeLeft(Math.floor(remaining / 1000)); // in seconds
      }
    };

    tick(); // run immediately
    const timer = setInterval(tick, 1000);

    return () => clearInterval(timer);
  };

  // ✅ Format seconds into MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ✅ Handle selecting an answer (auto-save)
  const handleSelect = async (questionId, optionIndex) => {
    const updated = { ...answers, [questionId]: optionIndex };
    setAnswers(updated);

    try {
      const res = await fetch(
        `http://localhost:3001/api/exams/auto-save/${id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            answers: Object.entries(updated).map(([qid, ans]) => ({
              questionId: qid,
              answer: ans.toString(),
            })),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.message || "Auto-save failed");
      }
    } catch (err) {
      console.error("Auto-save error:", err);
      toast.error("Auto-save error");
    }
  };

  // ✅ Normal Submit exam (only if all questions answered)
  const handleSubmit = () => {
    // check unanswered
    const unanswered = exam.questions.filter((q) => answers[q._id] === undefined);

    if (unanswered.length > 0) {
      toast.error("⚠️ Please answer all questions before submitting!");
      return;
    }

    // all answered -> show modal
    setShowSubmitModal(true);
  };

  // ✅ Force submit (when time is up or modal confirmed)
  const forceSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:3001/api/exams/${id}/submit`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          answers: Object.entries(answers).map(([qid, ans]) => ({
            questionId: qid,
            answer: ans.toString(),
          })),
          timeSpent: 0,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsSubmitting(false);
        localStorage.removeItem(`exam-${id}-endTime`); // ✅ clear after submit
        toast.success("Exam submitted successfully!");
        router.push("/dashboard");
      } else {
        setIsSubmitting(false);
        toast.error(data.message || "Submit failed");
      }
    } catch (err) {
      setIsSubmitting(false);
      console.error("Submit error:", err);
      toast.error("Error submitting exam");
    }
  };

  if (loading)
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading your exams...</p>
      </div>
    );

  if (!exam)
    return (
      <div className="text-center">
        <p className="p-4">Exam not found</p>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{exam.title}</h1>
      <p className="text-gray-600 mb-4">{exam.instructions}</p>

      {/* ✅ Show countdown */}
      {timeLeft !== null && (
        <p className="text-red-600 font-bold mb-6">
          Time Left: {formatTime(timeLeft)}
        </p>
      )}

      {exam.questions.map((q, index) => (
        <div key={q._id} className="mb-6 p-4 border rounded-lg">
          <h2 className="font-semibold mb-3">
            {index + 1}. {q.question}
          </h2>
          <div className="space-y-2">
            {q.options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={q._id}
                  checked={answers[q._id] === i}
                  onChange={() => handleSelect(q._id, i)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        Submit Exam
      </button>

      {/* ✅ Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h2 className="text-lg font-bold mb-4">Submit Exam?</h2>
            <p className="mb-4">
              Are you sure you want to submit? You won’t be able to change
              answers afterwards.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={forceSubmit}
                className="bg-red-600 text-white px-4 py-2 rounded-lg"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
