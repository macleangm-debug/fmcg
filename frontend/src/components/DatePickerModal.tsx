import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export interface DatePickerModalProps {
  visible: boolean;
  initialStartDate: Date;
  initialEndDate: Date;
  onApply: (startDate: Date, endDate: Date) => void;
  onCancel: () => void;
  primaryColor?: string;
  primaryLightColor?: string;
}

const DEFAULT_PRIMARY = '#2563EB';
const DEFAULT_PRIMARY_LIGHT = '#DBEAFE';

export const DatePickerModal = memo(({
  visible,
  initialStartDate,
  initialEndDate,
  onApply,
  onCancel,
  primaryColor = DEFAULT_PRIMARY,
  primaryLightColor = DEFAULT_PRIMARY_LIGHT,
}: DatePickerModalProps) => {
  const [localStartDate, setLocalStartDate] = useState(initialStartDate);
  const [localEndDate, setLocalEndDate] = useState(initialEndDate);
  const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    if (visible) {
      setLocalStartDate(initialStartDate);
      setLocalEndDate(initialEndDate);
      setActiveField(null);
      setViewDate(initialStartDate);
    }
  }, [visible, initialStartDate, initialEndDate]);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateSelect = (day: number) => {
    const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    if (activeField === 'start') {
      setLocalStartDate(selectedDate);
      if (selectedDate > localEndDate) {
        setLocalEndDate(selectedDate);
      }
    } else if (activeField === 'end') {
      if (selectedDate >= localStartDate) {
        setLocalEndDate(selectedDate);
      }
    }
  };

  const navigateMonth = (direction: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setLocalStartDate(start);
    setLocalEndDate(end);
    setActiveField(null);
  };

  const formatDateDisplay = (date: Date) => {
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const cellDate = new Date(year, month, day);
      const isStart = localStartDate.toDateString() === cellDate.toDateString();
      const isEnd = localEndDate.toDateString() === cellDate.toDateString();
      const isInRange = cellDate > localStartDate && cellDate < localEndDate;
      const isToday = new Date().toDateString() === cellDate.toDateString();

      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isInRange && { backgroundColor: primaryLightColor },
            (isStart || isEnd) && { backgroundColor: primaryColor },
          ]}
          onPress={() => handleDateSelect(day)}
        >
          <Text style={[
            styles.dayText,
            isToday && { fontWeight: '700', color: primaryColor },
            (isStart || isEnd) && styles.dayTextSelected,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return days;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: primaryLightColor }]}>
                <Ionicons name="calendar" size={20} color={primaryColor} />
              </View>
              <View>
                <Text style={styles.title}>Select Date Range</Text>
                <Text style={styles.subtitle}>Choose custom period for reports</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Date Selectors */}
          <View style={styles.dateSelectors}>
            <TouchableOpacity
              style={[
                styles.dateSelector,
                activeField === 'start' && { borderColor: primaryColor, backgroundColor: primaryLightColor }
              ]}
              onPress={() => { setActiveField('start'); setViewDate(localStartDate); }}
            >
              <Text style={styles.dateSelectorLabel}>Start Date</Text>
              <Text style={[
                styles.dateSelectorValue,
                activeField === 'start' && { color: primaryColor }
              ]}>
                {formatDateDisplay(localStartDate)}
              </Text>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={18} color="#6B7280" />
            <TouchableOpacity
              style={[
                styles.dateSelector,
                activeField === 'end' && { borderColor: primaryColor, backgroundColor: primaryLightColor }
              ]}
              onPress={() => { setActiveField('end'); setViewDate(localEndDate); }}
            >
              <Text style={styles.dateSelectorLabel}>End Date</Text>
              <Text style={[
                styles.dateSelectorValue,
                activeField === 'end' && { color: primaryColor }
              ]}>
                {formatDateDisplay(localEndDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          {activeField && (
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navBtn}>
                  <Ionicons name="chevron-back" size={20} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {FULL_MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </Text>
                <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#111827" />
                </TouchableOpacity>
              </View>
              <View style={styles.weekDays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <Text key={i} style={styles.weekDayText}>{d}</Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {renderCalendar()}
              </View>
            </View>
          )}

          {/* Quick Select */}
          <View style={styles.quickSelectSection}>
            <Text style={styles.quickSelectLabel}>Quick Select</Text>
            <View style={styles.quickSelectRow}>
              {[
                { label: 'Last 7 days', days: 7 },
                { label: 'Last 30 days', days: 30 },
                { label: 'Last 90 days', days: 90 },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  style={styles.quickSelectBtn}
                  onPress={() => handleQuickSelect(opt.days)}
                >
                  <Text style={styles.quickSelectBtnText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: primaryColor }]}
              onPress={() => onApply(localStartDate, localEndDate)}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.applyText}>Apply Range</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSelectors: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dateSelector: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateSelectorLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateSelectorValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  calendarContainer: {
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    color: '#111827',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  quickSelectSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  quickSelectLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  quickSelectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DatePickerModal;
