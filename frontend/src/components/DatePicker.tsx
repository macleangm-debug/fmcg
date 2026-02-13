import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  dark: '#111827',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  disabled = false,
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number);
      return { year, month: month - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${MONTHS[month - 1].slice(0, 3)} ${day}, ${year}`;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const isDateDisabled = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  const isSelectedDate = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === value;
  };

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const handleSelectDate = (day: number) => {
    const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setShowPicker(false);
  };

  const navigateMonth = (direction: number) => {
    setViewDate(prev => {
      let newMonth = prev.month + direction;
      let newYear = prev.year;
      
      if (newMonth < 0) {
        newMonth = 11;
        newYear -= 1;
      } else if (newMonth > 11) {
        newMonth = 0;
        newYear += 1;
      }
      
      return { year: newYear, month: newMonth };
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month);
    const firstDay = getFirstDayOfMonth(viewDate.year, viewDate.month);
    const days = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const disabled = isDateDisabled(viewDate.year, viewDate.month, day);
      const selected = isSelectedDate(viewDate.year, viewDate.month, day);
      const today = isToday(viewDate.year, viewDate.month, day);

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            selected && styles.dayCellSelected,
            today && !selected && styles.dayCellToday,
            disabled && styles.dayCellDisabled,
          ]}
          onPress={() => !disabled && handleSelectDate(day)}
          disabled={disabled}
        >
          <Text
            style={[
              styles.dayText,
              selected && styles.dayTextSelected,
              today && !selected && styles.dayTextToday,
              disabled && styles.dayTextDisabled,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setShowPicker(true)}
        disabled={disabled}
      >
        <Ionicons name="calendar-outline" size={18} color={value ? COLORS.primary : COLORS.gray} />
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowPicker(false)}>
          <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(-1)}>
                <Ionicons name="chevron-back" size={20} color={COLORS.dark} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {MONTHS[viewDate.month]} {viewDate.year}
              </Text>
              <TouchableOpacity style={styles.navButton} onPress={() => navigateMonth(1)}>
                <Ionicons name="chevron-forward" size={20} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            {/* Day headers */}
            <View style={styles.daysHeader}>
              {DAYS.map((day) => (
                <View key={day} style={styles.dayHeaderCell}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            <View style={styles.calendarGrid}>
              {renderCalendar()}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => {
                  const today = new Date();
                  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                  onChange(dateStr);
                  setShowPicker(false);
                }}
              >
                <Text style={styles.todayButtonText}>Today</Text>
              </TouchableOpacity>
              {value && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    onChange('');
                    setShowPicker(false);
                  }}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  triggerPlaceholder: {
    color: COLORS.gray,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 340,
    ...(Platform.OS === 'web' ? { boxShadow: '0 8px 32px rgba(0,0,0,0.2)' } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  daysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayHeaderText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  dayCellToday: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  dayTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  dayTextToday: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: COLORS.gray,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
});
