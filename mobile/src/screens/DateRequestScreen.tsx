import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createDateRequest } from '../api/dates';
import { ActivityType, TimeWindow, AvailabilitySlot } from '../types';

const ACTIVITIES: { value: ActivityType; label: string }[] = [
  { value: 'dinner', label: 'Dinner' },
  { value: 'bar', label: 'Bar' },
  { value: 'bowling', label: 'Bowling' },
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'board_games', label: 'Board Games' },
  { value: 'ice_skating', label: 'Ice Skating' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'cooking_class', label: 'Cooking Class' },
  { value: 'trivia_night', label: 'Trivia Night' },
  { value: 'mini_golf', label: 'Mini Golf' },
  { value: 'escape_room', label: 'Escape Room' },
  { value: 'art_gallery', label: 'Art Gallery' },
  { value: 'picnic', label: 'Picnic' },
  { value: 'museum', label: 'Museum' },
];

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

export default function DateRequestScreen() {
  const navigation = useNavigation<any>();
  const [activity, setActivity] = useState<ActivityType | null>(null);
  const [groupSize, setGroupSize] = useState<4 | 6>(4);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [dateInput, setDateInput] = useState('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('evening');
  const [friendId, setFriendId] = useState('');
  const [loading, setLoading] = useState(false);

  const addSlot = () => {
    if (!dateInput.trim()) {
      Alert.alert('Error', 'Please enter a date (YYYY-MM-DD)');
      return;
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateInput.trim())) {
      Alert.alert('Error', 'Date must be in YYYY-MM-DD format');
      return;
    }
    setSlots([...slots, { date: dateInput.trim(), time_window: timeWindow }]);
    setDateInput('');
  };

  const removeSlot = (index: number) => {
    setSlots(slots.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!activity) {
      Alert.alert('Error', 'Please select an activity');
      return;
    }
    if (slots.length === 0) {
      Alert.alert('Error', 'Please add at least one availability slot');
      return;
    }

    setLoading(true);
    try {
      const friendIds = friendId.trim() ? [friendId.trim()] : [];
      await createDateRequest({
        group_size: groupSize,
        activity,
        availability_slots: slots,
        pre_group_friend_ids: friendIds.length > 0 ? friendIds : undefined,
      });
      Alert.alert('Success', 'Date request created!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to create date request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>Create Date Request</Text>

      {/* Activity Picker */}
      <Text style={styles.label}>Activity</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activityScroll}>
        <View style={styles.activityRow}>
          {ACTIVITIES.map(a => (
            <TouchableOpacity
              key={a.value}
              testID={`activity-${a.value}`}
              style={[styles.chip, activity === a.value && styles.chipSelected]}
              onPress={() => setActivity(a.value)}
            >
              <Text style={[styles.chipText, activity === a.value && styles.chipTextSelected]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Group Size */}
      <Text style={styles.label}>Group Size</Text>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          testID="group-size-4"
          style={[styles.toggle, groupSize === 4 && styles.toggleSelected]}
          onPress={() => setGroupSize(4)}
        >
          <Text style={[styles.toggleText, groupSize === 4 && styles.toggleTextSelected]}>
            4 people
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="group-size-6"
          style={[styles.toggle, groupSize === 6 && styles.toggleSelected]}
          onPress={() => setGroupSize(6)}
        >
          <Text style={[styles.toggleText, groupSize === 6 && styles.toggleTextSelected]}>
            6 people
          </Text>
        </TouchableOpacity>
      </View>

      {/* Availability */}
      <Text style={styles.label}>Availability</Text>
      <View style={styles.slotInput}>
        <TextInput
          testID="date-input"
          style={[styles.input, { flex: 1 }]}
          placeholder="YYYY-MM-DD"
          value={dateInput}
          onChangeText={setDateInput}
          keyboardType={Platform.OS === 'ios' ? 'default' : 'default'}
        />
        <View style={styles.timeWindows}>
          {TIME_WINDOWS.map(tw => (
            <TouchableOpacity
              key={tw.value}
              testID={`time-${tw.value}`}
              style={[styles.miniChip, timeWindow === tw.value && styles.miniChipSelected]}
              onPress={() => setTimeWindow(tw.value)}
            >
              <Text style={[styles.miniChipText, timeWindow === tw.value && styles.miniChipTextSelected]}>
                {tw.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity testID="add-slot-button" style={styles.addButton} onPress={addSlot}>
          <Text style={styles.addButtonText}>Add Slot</Text>
        </TouchableOpacity>
      </View>

      {slots.map((slot, i) => (
        <View key={i} style={styles.slotCard}>
          <Text style={styles.slotText}>{slot.date} — {slot.time_window}</Text>
          <TouchableOpacity testID={`remove-slot-${i}`} onPress={() => removeSlot(i)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Bring Friends */}
      <Text style={styles.label}>Bring a Friend (optional)</Text>
      <TextInput
        testID="friend-id-input"
        style={styles.input}
        placeholder="Friend's User ID"
        value={friendId}
        onChangeText={setFriendId}
        autoCapitalize="none"
      />

      {/* Submit */}
      <TouchableOpacity
        testID="submit-button"
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit Date Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#E91E63', marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 16, marginBottom: 12,
  },
  activityScroll: { marginBottom: 8 },
  activityRow: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f5f5f5',
  },
  chipSelected: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  chipText: { fontSize: 14, color: '#333' },
  chipTextSelected: { color: '#fff' },
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  toggle: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center',
  },
  toggleSelected: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  toggleText: { fontSize: 14, color: '#333' },
  toggleTextSelected: { color: '#fff' },
  slotInput: { marginBottom: 12 },
  timeWindows: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  miniChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#ddd',
  },
  miniChipSelected: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  miniChipText: { fontSize: 12, color: '#333' },
  miniChipTextSelected: { color: '#fff' },
  addButton: {
    backgroundColor: '#E91E63', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  slotCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f9f9f9', padding: 12, borderRadius: 8, marginBottom: 8,
  },
  slotText: { fontSize: 14, textTransform: 'capitalize' },
  removeText: { color: '#E91E63', fontSize: 14, fontWeight: '600' },
  submitButton: {
    backgroundColor: '#E91E63', paddingVertical: 16, borderRadius: 8,
    alignItems: 'center', marginTop: 24,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
});
