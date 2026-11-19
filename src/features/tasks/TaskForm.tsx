import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenBackground } from '@/components/ui/ScreenBackground';
import { SecondaryButton } from '@/components/ui/SecondaryButton';
import { TextField } from '@/components/ui/TextField';
import { Layout, Radii, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/useAppTheme';
import type { Task, TaskPriority } from '@/types/task';

export interface TaskFormValues {
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  deadline: string | null;
  estimatedMinutes: number | null;
}

interface TaskFormProps {
  mode: 'create' | 'edit';
  initialTask?: Task;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function TaskForm({ mode, initialTask, onSubmit, onCancel }: TaskFormProps) {
  const palette = useAppTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [description, setDescription] = useState(initialTask?.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(initialTask?.priority ?? 'medium');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category: initialTask?.category ?? 'Work',
        priority,
        deadline: initialTask?.deadline ?? null,
        estimatedMinutes: initialTask?.estimatedMinutes ?? 45,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground variant="surface">
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing.xs, paddingBottom: insets.bottom + 110 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            <AppHeader
              title={mode === 'create' ? 'Create task' : 'Edit task'}
              subtitle="Turn an intention into a clear next step."
              onBack={onCancel}
            />

            <View style={styles.formStack}>
              <TextField
                label="Task title"
                placeholder="What needs to be done?"
                value={title}
                onChangeText={setTitle}
              />
              <TextField
                label="Description"
                optionalTag="Optional"
                placeholder="Add notes, deliverables, or a clear outcome..."
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <View style={styles.fieldGroup}>
                <Text style={[Typography.caption, styles.label, { color: palette.textSecondary }]}>
                  Priority
                </Text>
                <View
                  style={[
                    styles.segmented,
                    { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                  ]}
                >
                  {PRIORITIES.map((item) => {
                    const active = priority === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => setPriority(item.value)}
                        style={[
                          styles.segBtn,
                          active && { backgroundColor: palette.surfaceGlassStrong, borderColor: palette.border },
                        ]}
                      >
                        <Text
                          style={[
                            Typography.caption,
                            {
                              color: active ? palette.accentMint : palette.textMuted,
                              fontWeight: active ? '700' : '600',
                            },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.stickyFooter,
            {
              backgroundColor: palette.stickyBarBg,
              borderTopColor: palette.border,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          <View style={styles.footerInner}>
            <SecondaryButton title="Cancel" onPress={onCancel} style={styles.cancelBtn} />
            <PrimaryButton
              title={mode === 'create' ? 'Save task' : 'Update task'}
              onPress={handleSave}
              loading={saving}
              disabled={!title.trim()}
              fullWidth={false}
              style={styles.saveBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, alignItems: 'center' },
  innerContainer: { width: '100%', maxWidth: Layout.maxContentWidth },
  formStack: { gap: Spacing.lg },
  fieldGroup: { gap: 6 },
  label: { fontWeight: '600' },
  segmented: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: Radii.md, borderWidth: 1 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  stickyFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingTop: Spacing.md, paddingHorizontal: Spacing.xl, alignItems: 'center' },
  footerInner: { width: '100%', maxWidth: Layout.maxContentWidth, flexDirection: 'row', gap: Spacing.md },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 1.5 },
});
