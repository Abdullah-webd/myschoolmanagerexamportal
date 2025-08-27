import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const email = sessionStorage.getItem("userEmail");
    if (!token) {
      router.push("/");
      return;
    }
    setUserEmail(email);
    fetchExams();
  }, [router]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token");

      const res = await fetch("http://localhost:3001/api/exams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch exams");

      const data = await res.json();
      setExams(data);
      console.log("Fetched exams:", data);
    } catch (err) {
      console.error("Error fetching exams:", err);
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/");
  };

  const getStatus = (exam) => {
  if (exam.submission) {
    if (exam.submission.status === "submitted") return "submitted";
    if (exam.submission.status === "in-progress" || (exam.submission.answers?.length > 0 && exam.submission.status !== "submitted")) {
      return "in-progress";
    }
  }
  return "available" ;
};


  const getStatusBadge = (status) => {
    switch (status) {
      case "available":
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
            Available
          </span>
        );
      case "submitted":
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
            Submitted
          </span>
        );
      case "in-progress":
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            In Progress
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Available Exams
          </h2>
          <p className="text-gray-600">Your assigned exams from the institution.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const status = getStatus(exam);
            return (
              <div
                key={exam._id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {exam.title}
                  </h3>
                  {getStatusBadge(status)}
                </div>
                <div className="mb-2 text-sm text-gray-700">
                  <div>
                    <span className="font-semibold">Subject:</span>{" "}
                    {exam.subject || "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Class:</span>{" "}
                    {exam.class || "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Teacher:</span>{" "}
                    {exam.teacher
                      ? `${exam.teacher.firstName} ${exam.teacher.lastName}`
                      : "-"}
                  </div>
                  <div>
                    <span className="font-semibold">Total Marks:</span>{" "}
                    {exam.totalMarks || 0}
                  </div>
                  <div>
                    <span className="font-semibold">Duration:</span>{" "}
                    {exam.duration} minutes
                  </div>
                  <div>
                    <span className="font-semibold">Questions:</span>{" "}
                    {exam.questions ? exam.questions.length : 0}
                  </div>
                </div>
                {exam.instructions && (
                  <div className="mb-2 text-xs text-gray-500 italic">
                    {exam.instructions}
                  </div>
                )}
                {exam.description && (
                  <p className="text-gray-600 mb-2">{exam.description}</p>
                )}

                <div className="flex space-x-2">
                  {status === "available" && (
                    <Link
                      href={`/exam/${exam._id}`}
                      className="flex-1 text-center py-2 px-4 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Start Exam
                    </Link>
                  )}
                  {status === "in-progress" && (
                    <Link
                      href={`/exam/${exam._id}`}
                      className="flex-1 text-center py-2 px-4 rounded-md font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                      Resume Exam
                    </Link>
                  )}
                  {status === "submitted" && (
                    <div className="flex-1 text-center py-2 px-4 bg-yellow-100 text-yellow-800 rounded-md">
                      Submitted for grading
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {exams.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No exams available
            </h3>
            <p className="text-gray-600">
              Check back later for new assignments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
