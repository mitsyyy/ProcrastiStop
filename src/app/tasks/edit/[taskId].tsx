import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { Spacing } from '@/constants/theme';
import { TaskForm, type TaskFormValues } from '@/features/tasks/TaskForm';
import { useSettingsStore } from '@/store/settingsStore';
import { useTaskStore } from '@/store/taskStore';

export default function EditTaskScreen() {
  const insets = useSafeAreaInsets();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const task = useTaskStore((s) => s.tasks.find((item) => item.id === taskId));
  const updateTask = useTaskStore((s) => s.updateTask);
  const showToast = useSettingsStore((s) => s.showToast);

  if (!task) {
    return (
      <ScreenBackground variant="surface">
        <View style={[styles.missingWrap, { paddingTop: insets.top + Spacing.md }]}>
          <AppHeader title="Edit task" onBack={() => router.back()} />
          <ErrorState
            title="Task not found"
            message="This task may have been deleted."
            onRetry={() => router.replace('/(tabs)/tasks')}
          />
        </View>
      </ScreenBackground>
    );
  }

  const handleSubmit = async (values: TaskFormValues) => {
    const startTimeChanged = values.dailySessionStartTime !== task.dailySessionStartTime;
    await updateTask(task.id, {
      ...values,
      ...(startTimeChanged ? { lastAutoStartedDate: null } : {}),
    });
    showToast('Task and anti-procrastination schedule updated.', 'success');
    router.back();
  };

  return (
    <TaskForm
      mode="edit"
      initialTask={task}
      onSubmit={handleSubmit}
      onCancel={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  missingWrap: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
});
