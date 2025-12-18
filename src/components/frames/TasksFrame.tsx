import React, { useState } from 'react';
import { Frame } from '@/types/dashboard';
import { CheckCircle2, Circle, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { useConfetti } from '@/hooks/useConfetti';

interface Task {
  id: string;
  text: string;
  completed: boolean;
}

// Mock tasks
const INITIAL_TASKS: Task[] = [
  { id: '1', text: 'Buy milk', completed: false },
  { id: '2', text: 'Walk the dog', completed: true },
  { id: '3', text: 'Pay bills', completed: false },
];

export default function TasksFrame() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTask, setNewTask] = useState('');
  const { taskComplete } = useConfetti();

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setTasks(prev => [
      { id: crypto.randomUUID(), text: newTask, completed: false },
      ...prev
    ]);
    setNewTask('');
  };

  const toggleTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    const wasCompleted = task?.completed;

    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));

    // Trigger confetti when marking a task as complete!
    if (!wasCompleted) {
      taskComplete();
    }
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="h-full w-full bg-white dark:bg-zinc-900 p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wide">Tasks</h3>

      <form onSubmit={addTask} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded px-3 py-1 text-sm outline-none focus:ring-2 ring-blue-500/50"
        />
        <button
          type="submit"
          className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-2">
        {tasks.map(task => (
          <div key={task.id} className="group flex items-center gap-3 text-sm">
            <button
              onClick={() => toggleTask(task.id)}
              className={clsx(
                "transition-colors",
                task.completed ? "text-green-500" : "text-zinc-300 hover:text-zinc-400"
              )}
            >
              {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>
            <span className={clsx(
              "flex-1 truncate transition-all",
              task.completed ? "text-zinc-400 line-through decoration-zinc-400/50" : "text-zinc-700 dark:text-zinc-200"
            )}>
              {task.text}
            </span>
            <button
              onClick={() => removeTask(task.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="text-center text-zinc-400 text-xs py-4">
            No tasks yet.
          </div>
        )}
      </div>
    </div>
  );
}
