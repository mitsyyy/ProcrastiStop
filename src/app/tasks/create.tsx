import { router } from 'expo-router';

import { TaskForm, type TaskFormValues } from '@/features/tasks/TaskForm';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export default function CreateTaskScreen() {
  const createTask = useTaskStore((s) => s.createTask);
  const showToast = useSettingsStore((s) => s.showToast);

  const handleSubmit = async (values: TaskFormValues) => {
    await createTask({
      ...values,
      status: 'pending',
      lastAutoStartedDate: null,
      completedAt: null,
    });
    showToast(
      `Task scheduled with 24h buffer and ${values.dailyReminderCount} daily nudges.`,
      'success',
    );
    router.back();
  };

  return (
    <TaskForm
      mode="create"
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}
