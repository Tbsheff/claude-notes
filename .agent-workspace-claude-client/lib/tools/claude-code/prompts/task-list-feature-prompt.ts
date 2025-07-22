export const TASK_LIST_PROMPT = `
/*
FEATURE: Task List

This feature allows users to manage a to-do list within the editor and generate tasks from the document's content.

Core files:
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/task-list/types.ts
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/task-list/prompts.ts
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/task-list/core.tsx
- /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/task-list/index.tsx
*/

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/task-list/types.ts
import { v4 as uuid } from 'uuid';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export const createNewTask = (text: string): Task => ({
  id: uuid(),
  text,
  completed: false,
});

export interface TaskListState {
  tasks: Task[];
  isGenerating: boolean;
}

export interface TaskListConfig {
  enabled: boolean;
}

export interface TaskListFeature {
  state: TaskListState;
  isAvailable: boolean;
  addTask: (text: string) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  generateTasks: (content: string) => Promise<void>;
  renderTaskList: (content: string) => React.ReactElement | null;
  renderGenerateButton: () => React.ReactElement | null;
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/task-list/prompts.ts
export const GENERATE_TASKS_PROMPT = (content: string) => \`
Based on the following content, generate a list of actionable tasks.
Each task should be a short, clear, and concise to-do item.
Return the tasks as a JSON array of strings. Do not include any other text or explanations.

For example, if the content is "We need to set up the project, install dependencies, and then build the UI", the output should be:
["Set up the project", "Install dependencies", "Build the UI"]

Content:
---
\${content}
---
\`
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/task-list/core.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, X } from 'lucide-react';
// Note: createNewTask, Task, TaskListConfig are imported from types.ts
// Note: GENERATE_TASKS_PROMPT is imported from prompts.ts

export class TaskListCore {
  private config: Omit<TaskListConfig, 'onStateChange'>;

  constructor(config: Omit<TaskListConfig, 'onStateChange'>) {
    this.config = config;
  }
  
  get isAvailable(): boolean {
    return this.config.enabled;
  }

  async generateTasks(content: string): Promise<Task[]> {
    if (!content.trim()) {
      return [];
    }
    try {
      const response = await window.electronAPI.llmCall(
        [{ role: 'user', content: GENERATE_TASKS_PROMPT(content) }]
      );
      if (response.success && response.content) {
        const generatedTaskStrings = JSON.parse(response.content) as string[];
        return generatedTaskStrings.map(text => createNewTask(text));
      } else {
        alert('Failed to generate tasks: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      alert('An unexpected error occurred while generating tasks: ' + (error instanceof Error ? error.message : String(error)));
    }
    return [];
  }
  
  renderTaskList({
    tasks,
    isGenerating,
    generateAction,
    addTaskAction,
    toggleTaskAction,
    deleteTaskAction
  }: {
    tasks: Task[];
    isGenerating: boolean;
    generateAction: () => void;
    addTaskAction: (text: string) => void;
    toggleTaskAction: (id: string) => void;
    deleteTaskAction: (id: string) => void;
  }) {
    if (!this.isAvailable) return null;

    const AddTaskForm = () => {
      const [inputValue, setInputValue] = useState('');
      const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        addTaskAction(inputValue);
        setInputValue('');
      };

      return (
        <form onSubmit={handleAddTask} className="flex items-center gap-2">
          <Input 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add a new task..."
            className="h-8"
          />
          <Button type="submit" size="sm" variant="ghost" className="px-3">
            <Plus className="h-4 w-4 text-muted-foreground" />
          </Button>
        </form>
      );
    };

    return (
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Task List</h3>
          <Button 
            onClick={generateAction} 
            size="sm" 
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Generate from content
          </Button>
        </div>
        <div className="space-y-2 mb-4">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 group">
              <Checkbox
                id={task.id}
                className="border-muted-foreground"
                checked={task.completed}
                onCheckedChange={() => toggleTaskAction(task.id)}
              />
              <label htmlFor={task.id} className={'flex-grow ' + (task.completed ? 'line-through text-muted-foreground' : '')}>
                {task.text}
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => deleteTaskAction(task.id)}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <AddTaskForm />
      </div>
    );
  }

  renderGenerateButton() {
    return null;
  }
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/task-list/index.tsx
import React, { useState, useMemo, useCallback } from 'react'
// Note: TaskListCore, Task, createNewTask, TaskListFeature are imported

export function useTaskList(enabled: boolean): TaskListFeature {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const core = useMemo(() => {
    return new TaskListCore({ enabled })
  }, [enabled])

  const addTask = useCallback((text: string) => {
    if (!text.trim()) return;
    setTasks(prev => [...prev, createNewTask(text)]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);
  
  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  }, []);

  const generateTasks = useCallback(async (content: string) => {
    setIsGenerating(true);
    const newTasks = await core.generateTasks(content);
    setTasks(prev => [...prev, ...newTasks]);
    setIsGenerating(false);
  }, [core]);
  
  const renderTaskList = useCallback(
    (content: string) => {
      return core.renderTaskList({
        tasks,
        isGenerating,
        generateAction: () => generateTasks(content),
        addTaskAction: addTask,
        toggleTaskAction: toggleTask,
        deleteTaskAction: deleteTask
      });
    },
    [core, tasks, isGenerating, generateTasks, addTask, toggleTask, deleteTask]
  );

  return {
    isAvailable: enabled,
    renderTaskList,
    addTask,
    toggleTask,
    deleteTask,
    generateTasks,
    state: { tasks, isGenerating },
    renderGenerateButton: () => null,
  }
}

export const taskListFeature = {
  config: {
    key: 'taskList',
    name: 'Task List',
    description: 'Manage a to-do list and generate tasks from content.',
    enabled: true,
    category: 'productivity',
  },
  useFeature: useTaskList,
}
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/features/registry.ts
import { taskListFeature } from './task-list'

export const FEATURES = [
  // ... other features
  taskListFeature,
]
// END FILE

// FILE: /var/folders/km/[id]/T/.agent-workspace-[generated_workspace]/app/modules/editor/pages/editor-page.tsx
import { useTaskList } from '../features/task-list'

function EditorContent() {
  const [taskListEnabled] = useFeatureState('taskList')
  const taskList = useTaskList(taskListEnabled)
  const getMarkdownContent = () => { /* ... */ };

  return (
    // ...
    {taskList.renderTaskList(getMarkdownContent())}
    // ...
  )
}
// END FILE
`;