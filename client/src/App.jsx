import { useCallback, useEffect, useMemo, useState } from "react";
import { useOpenAiGlobal } from "./useOpenAiGlobal";
import { apiFetch } from "./lib/api.js";
import { AuthGate } from "./components/AuthGate.jsx";

const ENABLE_AUTH_GATE = (import.meta.env.VITE_ENABLE_AUTH_GATE ?? "true") !== "false";

function TasksApp() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const toolOutput = typeof window !== "undefined" && window.openai
    ? useOpenAiGlobal("toolOutput")
    : null;

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      setError(null);
      const response = await apiFetch("/tasks");
      const nextTasks = Array.isArray(response)
        ? response
        : Array.isArray(response?.tasks)
          ? response.tasks
          : [];
      setTasks(nextTasks);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (toolOutput === null) return;
    loadTasks();
  }, [toolOutput, loadTasks]);

  const handleAddTask = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({ text: trimmed }),
      });
      setText("");
      await loadTasks();
    } catch (err) {
      setError(err);
    }
  }, [text, loadTasks]);

  const handleCompleteTask = useCallback(
    async (id) => {
      try {
        await apiFetch(`/tasks/${id}/complete`, { method: "POST" });
        await loadTasks();
      } catch (err) {
        setError(err);
      }
    },
    [loadTasks]
  );

  const handleKeyPress = useCallback(
    (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleAddTask();
      }
    },
    [handleAddTask]
  );

  const { completedCount, totalCount } = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.completed).length;
    return { completedCount: completed, totalCount: total };
  }, [tasks]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Task Tracker</h1>
          <p className="text-gray-600">Stay organized and productive</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {error ? (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error.code === "UNAUTHENTICATED"
                ? "Your session expired. Please sign in again."
                : error.message || "Unable to load tasks."}
            </div>
          ) : null}

          {totalCount > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Progress</span>
                <span className="text-sm text-gray-600">
                  {completedCount} of {totalCount} completed
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="What needs to be done?"
                disabled={isLoading}
              />
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                onClick={handleAddTask}
                disabled={isLoading}
              >
                Add Task
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Loading tasks…</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">No tasks yet. Add one to get started!</p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${task.completed
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleCompleteTask(task.id)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`flex-1 ${task.completed
                      ? "line-through text-gray-400"
                      : "text-gray-900"
                      }`}
                  >
                    {task.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  if (!ENABLE_AUTH_GATE) {
    return <TasksApp />;
  }

  return (
    <AuthGate>
      <TasksApp />
    </AuthGate>
  );
}
