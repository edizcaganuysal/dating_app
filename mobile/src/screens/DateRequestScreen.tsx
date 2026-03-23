import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  createDateRequest,
  getDateRequest,
  getMyDateRequests,
  getTemplates,
  saveTemplate,
  updateDateRequest,
  DateTemplate,
} from '../api/dates';
import { getFriends, Friend } from '../api/friends';
import { ActivityType, TimeWindow, AvailabilitySlot, TIME_WINDOW_HOURS } from '../types';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 56) / 3;

const ACTIVITIES: { value: ActivityType; label: string; emoji: string; desc: string }[] = [
  { value: 'dinner', label: 'Dinner', emoji: '\u{1F37D}', desc: 'Restaurant vibes & good food' },
  { value: 'bar', label: 'Bar / Pub', emoji: '\u{1F37A}', desc: 'Drinks, music & conversation' },
  { value: 'bowling', label: 'Bowling', emoji: '\u{1F3B3}', desc: 'Lanes, shoes & friendly competition' },
  { value: 'karaoke', label: 'Karaoke', emoji: '\u{1F3A4}', desc: 'Private rooms & terrible singing' },
  { value: 'board_games', label: 'Board Game Cafe', emoji: '\u{1F3B2}', desc: 'Cozy cafe with 100+ games' },
  { value: 'cooking_class', label: 'Cooking Class', emoji: '\u{1F468}\u200D\u{1F373}', desc: 'Learn & eat together' },
  { value: 'trivia_night', label: 'Trivia Night', emoji: '\u{1F9E0}', desc: 'Team up & show off your brains' },
  { value: 'mini_golf', label: 'Mini Golf', emoji: '\u26F3', desc: 'Holes, putts & trash talk' },
  { value: 'escape_room', label: 'Escape Room', emoji: '\u{1F510}', desc: 'Solve puzzles as a team' },
  { value: 'arcade', label: 'Arcade', emoji: '\u{1F579}', desc: 'Games, prizes & good times' },
];

const TIME_OPTIONS: { value: TimeWindow; label: string }[] = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getNext14Days(): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getCalendarGrid(days: Date[]): (Date | null)[][] {
  const rows: (Date | null)[][] = [];
  if (days.length === 0) return rows;

  // dayOfWeek: 0=Sun, we want Mon=0
  const firstDow = (days[0].getDay() + 6) % 7;
  let currentRow: (Date | null)[] = [];

  // pad start
  for (let i = 0; i < firstDow; i++) {
    currentRow.push(null);
  }

  for (const d of days) {
    currentRow.push(d);
    if (currentRow.length === 7) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  // pad end
  if (currentRow.length > 0) {
    while (currentRow.length < 7) {
      currentRow.push(null);
    }
    rows.push(currentRow);
  }

  return rows;
}

export default function DateRequestScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editRequestId: string | undefined = route.params?.editRequestId;
  const isEditMode = !!editRequestId;

  // Step management
  const [step, setStep] = useState(0);

  // Step 1: Activities
  const [selectedActivities, setSelectedActivities] = useState<ActivityType[]>([]);

  // Step 2: Group size + Friends
  const [groupSize, setGroupSize] = useState<4 | 6>(4);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  // Step 3: Availability
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [dateTimeWindows, setDateTimeWindows] = useState<Record<string, Set<TimeWindow>>>({});

  // Step 4: Confirm + Template
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState<DateTemplate[]>([]);

  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(true);

  const next14Days = getNext14Days();
  const calendarGrid = getCalendarGrid(next14Days);

  // Pre-fill: from existing request (edit mode) or last request (create mode)
  useEffect(() => {
    (async () => {
      try {
        const [friendsData, templatesData] = await Promise.all([
          getFriends().catch(() => []),
          getTemplates().catch(() => []),
        ]);
        setFriends(friendsData);
        setTemplates(templatesData);

        if (isEditMode && editRequestId) {
          // Edit mode: load the specific request
          const req = await getDateRequest(editRequestId);
          setSelectedActivities([req.activity]);
          setGroupSize(req.group_size === 6 ? 6 : 4);
          if (req.pre_group_friend_ids?.length > 0) {
            setSelectedFriendIds(req.pre_group_friend_ids);
          }
          // Restore availability slots
          if (req.availability_slots?.length > 0) {
            const dates = new Set<string>();
            const windows: Record<string, Set<TimeWindow>> = {};
            for (const slot of req.availability_slots) {
              dates.add(slot.date);
              if (!windows[slot.date]) windows[slot.date] = new Set();
              if (slot.time_window) windows[slot.date].add(slot.time_window as TimeWindow);
            }
            setSelectedDates(dates);
            setDateTimeWindows(windows);
          }
        } else {
          // Create mode: pre-fill from last request for convenience
          const reqData = await getMyDateRequests().catch(() => []);
          if (reqData.length > 0) {
            const last = reqData[reqData.length - 1];
            setSelectedActivities([last.activity]);
            setGroupSize(last.group_size === 6 ? 6 : 4);
            if (last.pre_group_friend_ids?.length > 0) {
              setSelectedFriendIds(last.pre_group_friend_ids);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setPrefilling(false);
      }
    })();
  }, [editRequestId]);

  const toggleActivity = (activity: ActivityType) => {
    if (isEditMode) {
      // Single-select in edit mode
      setSelectedActivities([activity]);
    } else {
      setSelectedActivities(prev =>
        prev.includes(activity)
          ? prev.filter(a => a !== activity)
          : [...prev, activity]
      );
    }
  };

  const selectAllActivities = () => {
    if (selectedActivities.length === ACTIVITIES.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities(ACTIVITIES.map(a => a.value));
    }
  };

  const maxFriends = groupSize === 4 ? 1 : 2;

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(f => f !== friendId);
      }
      if (prev.length >= maxFriends) {
        Alert.alert('Limit reached', `You can bring at most ${maxFriends} friend${maxFriends > 1 ? 's' : ''} for a group of ${groupSize}`);
        return prev;
      }
      return [...prev, friendId];
    });
  };

  const toggleDate = (dateKey: string) => {
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
        setDateTimeWindows(tw => {
          const copy = { ...tw };
          delete copy[dateKey];
          return copy;
        });
      } else {
        next.add(dateKey);
        // Default to evening
        setDateTimeWindows(tw => ({
          ...tw,
          [dateKey]: new Set(['evening'] as TimeWindow[]),
        }));
      }
      return next;
    });
  };

  const toggleTimeWindow = (dateKey: string, tw: TimeWindow) => {
    setDateTimeWindows(prev => {
      const current = new Set(prev[dateKey] || []);
      if (current.has(tw)) {
        current.delete(tw);
      } else {
        current.add(tw);
      }
      return { ...prev, [dateKey]: current };
    });
  };

  const toggleAllDay = (dateKey: string) => {
    const current = dateTimeWindows[dateKey];
    const allSelected = current && current.size === 4;
    if (allSelected) {
      setDateTimeWindows(prev => ({
        ...prev,
        [dateKey]: new Set(['evening'] as TimeWindow[]),
      }));
    } else {
      setDateTimeWindows(prev => ({
        ...prev,
        [dateKey]: new Set(TIME_OPTIONS.map(t => t.value)),
      }));
    }
  };

  const loadTemplate = (template: DateTemplate) => {
    setSelectedActivities(
      template.activities.filter(a =>
        ACTIVITIES.some(act => act.value === a)
      ) as ActivityType[]
    );
    setGroupSize(template.group_size === 6 ? 6 : 4);
    if (template.friend_ids?.length > 0) {
      setSelectedFriendIds(template.friend_ids);
    }
  };

  const buildSlots = (): AvailabilitySlot[] => {
    const slots: AvailabilitySlot[] = [];
    for (const dateKey of Array.from(selectedDates).sort()) {
      const windows = dateTimeWindows[dateKey];
      if (windows && windows.size > 0) {
        for (const tw of Array.from(windows)) {
          slots.push({ date: dateKey, time_window: tw, time_hours: TIME_WINDOW_HOURS[tw] });
        }
      } else {
        slots.push({ date: dateKey, time_window: 'evening', time_hours: TIME_WINDOW_HOURS.evening });
      }
    }
    return slots;
  };

  const handleSubmit = async () => {
    if (selectedActivities.length === 0) {
      Alert.alert('Error', 'Please select at least one activity');
      return;
    }
    const slots = buildSlots();
    if (slots.length === 0) {
      Alert.alert('Error', 'Please select at least one date');
      return;
    }

    setLoading(true);
    try {
      // Save template if requested
      if (saveAsTemplate && templateName.trim()) {
        await saveTemplate({
          name: templateName.trim(),
          activities: selectedActivities,
          group_size: groupSize,
          friend_ids: selectedFriendIds.length > 0 ? selectedFriendIds : undefined,
        }).catch(() => {});
      }

      if (isEditMode && editRequestId) {
        // Update existing request
        await updateDateRequest(editRequestId, {
          activity: selectedActivities[0],
          group_size: groupSize,
          availability_slots: slots,
          pre_group_friend_ids: selectedFriendIds.length > 0 ? selectedFriendIds : undefined,
        });
        Alert.alert(
          'Updated',
          'Your date request has been updated!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        // Create one request per activity
        for (const activity of selectedActivities) {
          await createDateRequest({
            group_size: groupSize,
            activity,
            availability_slots: slots,
            pre_group_friend_ids: selectedFriendIds.length > 0 ? selectedFriendIds : undefined,
          });
        }
        Alert.alert(
          'Success',
          `Created ${selectedActivities.length} date request${selectedActivities.length > 1 ? 's' : ''}!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail || 'Failed to save date request');
    } finally {
      setLoading(false);
    }
  };

  const canProceedStep0 = selectedActivities.length > 0;
  const canProceedStep2 = selectedDates.size > 0;

  if (prefilling) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={styles.stepDotWrapper}>
            <View style={[styles.stepDot, step >= i && styles.stepDotActive]} />
            {i < 3 && <View style={[styles.stepLine, step > i && styles.stepLineActive]} />}
          </View>
        ))}
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Step 0: Activities */}
        {step === 0 && (
          <>
            <Text style={styles.stepTitle}>{isEditMode ? 'Change activity' : 'What do you want to do?'}</Text>
            {!isEditMode && (
              <TouchableOpacity style={styles.selectAllButton} onPress={selectAllActivities}>
                <Text style={styles.selectAllText}>
                  {selectedActivities.length === ACTIVITIES.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}
            {isEditMode && <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>Pick one activity for this request</Text>}
            <View style={styles.activityGrid}>
              {ACTIVITIES.map(a => {
                const isSelected = selectedActivities.includes(a.value);
                return (
                  <TouchableOpacity
                    key={a.value}
                    style={[styles.activityCard, isSelected && styles.activityCardSelected]}
                    onPress={() => toggleActivity(a.value)}
                  >
                    <Text style={styles.activityEmoji}>{a.emoji}</Text>
                    <Text style={[styles.activityLabel, isSelected && styles.activityLabelSelected]}>
                      {a.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Step 1: Group Size + Friends */}
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>Group Size</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggle, groupSize === 4 && styles.toggleSelected]}
                onPress={() => {
                  setGroupSize(4);
                  // Trim friends if needed
                  if (selectedFriendIds.length > 1) {
                    setSelectedFriendIds(prev => prev.slice(0, 1));
                  }
                }}
              >
                <Text style={[styles.toggleText, groupSize === 4 && styles.toggleTextSelected]}>
                  4 people
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggle, groupSize === 6 && styles.toggleSelected]}
                onPress={() => setGroupSize(6)}
              >
                <Text style={[styles.toggleText, groupSize === 6 && styles.toggleTextSelected]}>
                  6 people
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.stepTitle, { marginTop: 24 }]}>Bring Friends</Text>
            <Text style={styles.constraintNote}>
              Same gender friends only. Max {maxFriends} for group of {groupSize}.
            </Text>

            {friends.length === 0 ? (
              <View style={styles.noFriendsBox}>
                <Ionicons name="people-outline" size={32} color="#ccc" />
                <Text style={styles.noFriendsText}>
                  Add friends in Profile {'>'} Friends
                </Text>
              </View>
            ) : (
              friends.map(friend => {
                const isChecked = selectedFriendIds.includes(friend.user_id);
                return (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendCheckRow}
                    onPress={() => toggleFriend(friend.user_id)}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={isChecked ? '#E91E63' : '#ccc'}
                    />
                    <Text style={styles.friendCheckName}>
                      {friend.first_name} {friend.last_name}
                    </Text>
                    <View style={[
                      styles.genderBadge,
                      { backgroundColor: friend.gender === 'male' ? '#2196F3' : '#E91E63' },
                    ]}>
                      <Text style={styles.genderText}>
                        {friend.gender === 'male' ? 'M' : 'F'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}

        {/* Step 2: Availability */}
        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>When are you free?</Text>

            {/* Calendar Header */}
            <View style={styles.calendarHeader}>
              {DAY_NAMES.map(d => (
                <Text key={d} style={styles.dayName}>{d}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            {calendarGrid.map((row, ri) => (
              <View key={ri} style={styles.calendarRow}>
                {row.map((day, ci) => {
                  if (!day) {
                    return <View key={`empty-${ci}`} style={styles.calendarCell} />;
                  }
                  const dateKey = formatDateKey(day);
                  const isSelected = selectedDates.has(dateKey);
                  const isToday = formatDateKey(new Date()) === dateKey;
                  return (
                    <TouchableOpacity
                      key={dateKey}
                      style={[
                        styles.calendarCell,
                        isSelected && styles.calendarCellSelected,
                        isToday && !isSelected && styles.calendarCellToday,
                      ]}
                      onPress={() => toggleDate(dateKey)}
                    >
                      <Text style={[
                        styles.calendarDateNum,
                        isSelected && styles.calendarDateNumSelected,
                      ]}>
                        {day.getDate()}
                      </Text>
                      <Text style={[
                        styles.calendarMonth,
                        isSelected && styles.calendarMonthSelected,
                      ]}>
                        {day.toLocaleDateString('en-US', { month: 'short' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Time windows per selected date */}
            {Array.from(selectedDates).sort().map(dateKey => {
              const windows = dateTimeWindows[dateKey] || new Set();
              const allSelected = windows.size === 4;
              return (
                <View key={dateKey} style={styles.timeSection}>
                  <View style={styles.timeSectionHeader}>
                    <Text style={styles.timeSectionDate}>
                      {new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                      })}
                    </Text>
                    <TouchableOpacity onPress={() => toggleAllDay(dateKey)}>
                      <Text style={[styles.allDayText, allSelected && styles.allDayTextActive]}>
                        All Day
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.timeChipRow}>
                    {TIME_OPTIONS.map(t => {
                      const isActive = windows.has(t.value);
                      return (
                        <TouchableOpacity
                          key={t.value}
                          style={[styles.timeChip, isActive && styles.timeChipActive]}
                          onPress={() => toggleTimeWindow(dateKey, t.value)}
                        >
                          <Text style={[styles.timeChipText, isActive && styles.timeChipTextActive]}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <>
            {/* Load Template */}
            {templates.length > 0 && (
              <View style={styles.templateSection}>
                <Text style={styles.templateLabel}>Load Template</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.templateRow}>
                    {templates.map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.templateChip}
                        onPress={() => {
                          loadTemplate(t);
                          setStep(0);
                        }}
                      >
                        <Text style={styles.templateChipText}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            <Text style={styles.stepTitle}>{isEditMode ? 'Update Your Request' : 'Confirm Your Request'}</Text>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Activities</Text>
              <View style={styles.summaryChipRow}>
                {selectedActivities.map(a => {
                  const act = ACTIVITIES.find(x => x.value === a);
                  return (
                    <View key={a} style={styles.summaryChip}>
                      <Text style={styles.summaryChipText}>
                        {act?.emoji} {act?.label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.summaryLabel}>Group Size</Text>
              <Text style={styles.summaryValue}>{groupSize} people</Text>

              {selectedFriendIds.length > 0 && (
                <>
                  <Text style={styles.summaryLabel}>Friends</Text>
                  <Text style={styles.summaryValue}>
                    {selectedFriendIds.map(fid => {
                      const f = friends.find(fr => fr.user_id === fid);
                      return f ? `${f.first_name} ${f.last_name}` : fid;
                    }).join(', ')}
                  </Text>
                </>
              )}

              <Text style={styles.summaryLabel}>Dates & Times</Text>
              {Array.from(selectedDates).sort().map(dateKey => {
                const windows = dateTimeWindows[dateKey];
                const timeStr = windows && windows.size > 0
                  ? Array.from(windows).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(', ')
                  : 'Evening';
                return (
                  <Text key={dateKey} style={styles.summaryValue}>
                    {new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })} - {timeStr}
                  </Text>
                );
              })}
            </View>

            {/* Save as template */}
            <View style={styles.templateSaveRow}>
              <Text style={styles.templateSaveLabel}>Save as template</Text>
              <Switch
                value={saveAsTemplate}
                onValueChange={setSaveAsTemplate}
                trackColor={{ true: '#E91E63' }}
                thumbColor="#fff"
              />
            </View>
            {saveAsTemplate && (
              <TextInput
                style={styles.templateNameInput}
                placeholder="Template name"
                value={templateName}
                onChangeText={setTemplateName}
              />
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditMode ? 'Update Date Request' : `Create Date Request${selectedActivities.length > 1 ? 's' : ''}`}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navRow}>
        {step > 0 ? (
          <TouchableOpacity style={styles.navButton} onPress={() => setStep(step - 1)}>
            <Ionicons name="arrow-back" size={20} color="#E91E63" />
            <Text style={styles.navButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        {step < 3 && (
          <TouchableOpacity
            style={[
              styles.navButtonPrimary,
              (step === 0 && !canProceedStep0) && styles.buttonDisabled,
              (step === 2 && !canProceedStep2) && styles.buttonDisabled,
            ]}
            onPress={() => setStep(step + 1)}
            disabled={
              (step === 0 && !canProceedStep0) ||
              (step === 2 && !canProceedStep2)
            }
          >
            <Text style={styles.navButtonPrimaryText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 20 },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 40,
  },
  stepDotWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#ddd',
  },
  stepDotActive: { backgroundColor: '#E91E63' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#ddd', marginHorizontal: 4 },
  stepLineActive: { backgroundColor: '#E91E63' },

  stepTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 16 },

  // Activities
  selectAllButton: { alignSelf: 'flex-end', marginBottom: 12 },
  selectAllText: { color: '#E91E63', fontWeight: '600', fontSize: 14 },
  activityGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start',
  },
  activityCard: {
    width: CARD_SIZE, height: CARD_SIZE * 0.85, backgroundColor: '#f9f9f9',
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  activityCardSelected: { borderColor: '#E91E63', backgroundColor: '#FCE4EC' },
  activityEmoji: { fontSize: 28, marginBottom: 6 },
  activityLabel: { fontSize: 12, color: '#333', textAlign: 'center', fontWeight: '500' },
  activityLabelSelected: { color: '#E91E63', fontWeight: '700' },

  // Group size
  toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  toggle: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#f9f9f9',
  },
  toggleSelected: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  toggleText: { fontSize: 15, color: '#333', fontWeight: '600' },
  toggleTextSelected: { color: '#fff' },

  constraintNote: { fontSize: 13, color: '#888', marginBottom: 12 },

  noFriendsBox: {
    alignItems: 'center', paddingVertical: 24, backgroundColor: '#f9f9f9', borderRadius: 12,
  },
  noFriendsText: { fontSize: 14, color: '#999', marginTop: 8 },

  friendCheckRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  friendCheckName: { flex: 1, fontSize: 15, fontWeight: '500', color: '#333' },
  genderBadge: {
    width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
  },
  genderText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },

  // Calendar
  calendarHeader: {
    flexDirection: 'row', marginBottom: 8,
  },
  dayName: {
    flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#888',
  },
  calendarRow: { flexDirection: 'row', marginBottom: 6 },
  calendarCell: {
    flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center',
    borderRadius: 8, marginHorizontal: 2,
  },
  calendarCellSelected: { backgroundColor: '#E91E63' },
  calendarCellToday: { borderWidth: 1, borderColor: '#E91E63' },
  calendarDateNum: { fontSize: 16, fontWeight: '600', color: '#333' },
  calendarDateNumSelected: { color: '#fff' },
  calendarMonth: { fontSize: 10, color: '#999' },
  calendarMonthSelected: { color: '#fff' },

  // Time sections
  timeSection: {
    backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, marginTop: 12,
  },
  timeSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  timeSectionDate: { fontSize: 14, fontWeight: '600', color: '#333' },
  allDayText: { fontSize: 13, color: '#888', fontWeight: '600' },
  allDayTextActive: { color: '#E91E63' },
  timeChipRow: { flexDirection: 'row', gap: 8 },
  timeChip: {
    flex: 1, paddingVertical: 8, borderRadius: 16,
    borderWidth: 1, borderColor: '#ddd', alignItems: 'center', backgroundColor: '#fff',
  },
  timeChipActive: { backgroundColor: '#E91E63', borderColor: '#E91E63' },
  timeChipText: { fontSize: 12, color: '#333', fontWeight: '500' },
  timeChipTextActive: { color: '#fff' },

  // Templates
  templateSection: { marginBottom: 16 },
  templateLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  templateRow: { flexDirection: 'row', gap: 8 },
  templateChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd',
  },
  templateChipText: { fontSize: 13, color: '#333', fontWeight: '500' },

  // Summary
  summaryCard: {
    backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 16,
  },
  summaryLabel: { fontSize: 13, fontWeight: '600', color: '#888', marginTop: 12, marginBottom: 4 },
  summaryValue: { fontSize: 15, color: '#333' },
  summaryChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  summaryChip: {
    backgroundColor: '#FCE4EC', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
  },
  summaryChipText: { fontSize: 13, color: '#E91E63', fontWeight: '500' },

  templateSaveRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  templateSaveLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  templateNameInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, fontSize: 15, marginBottom: 16, backgroundColor: '#f9f9f9',
  },

  submitButton: {
    backgroundColor: '#E91E63', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },

  // Navigation
  navRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#eee',
  },
  navButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 4,
  },
  navButtonText: { color: '#E91E63', fontSize: 15, fontWeight: '600' },
  navButtonPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E91E63', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20,
  },
  navButtonPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
