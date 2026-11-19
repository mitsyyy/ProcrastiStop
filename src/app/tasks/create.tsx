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
      completedAt: null,
    });
    showToast('Task created and saved locally.', 'success');
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
