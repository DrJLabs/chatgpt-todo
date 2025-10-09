import { useEffect, useState } from "react";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");

  const fetchTasks = async () => {
    const res = await fetch("http://localhost:3000/tasks");
    setTasks(await res.json());
  };

  const addTask = async () => {
    if (!text.trim()) return;
    await fetch("http://localhost:3000/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setText("");
    fetchTasks();
  };

  const completeTask = async (id) => {
    await fetch(`http://localhost:3000/tasks/${id}/complete`, {
      method: "POST",
    });
    fetchTasks();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      addTask();
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Task Tracker
          </h1>
          <p className="text-gray-600">
            Stay organized and productive
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Stats */}
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
                ></div>
              </div>
            </div>
          )}

          {/* Input Section */}
          <div className="mb-6">
            <div className="flex gap-2">
              <input
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="What needs to be done?"
              />
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={addTask}
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">No tasks yet. Add one to get started!</p>
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${t.completed
                    ? "bg-gray-50 border-gray-200"
                    : "bg-white border-gray-200 hover:border-gray-300"
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={t.completed}
                    onChange={() => completeTask(t.id)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={`flex-1 ${t.completed
                      ? "line-through text-gray-400"
                      : "text-gray-900"
                      }`}
                  >
                    {t.text}
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