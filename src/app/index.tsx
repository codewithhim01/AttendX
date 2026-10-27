
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Student = {
  id: string;
  name: string;
  roll: string;
  course: string;
};

type Subject = {
  id: string;
  name: string;
};

type AttendanceStatus = 'P' | 'A';
type AttendanceRecords = Record<string, AttendanceStatus>;
type Tab = 'Dashboard' | 'Students' | 'Attendance' | 'Reports';

const STORAGE_KEY = 'attendx-final-v1';

const initialStudents: Student[] = [
  { id: 's186', name: 'Himanshu Srivastav', roll: '186', course: 'BCA' },
  { id: 's1', name: 'Aarav Sharma', roll: '101', course: 'BCA' },
  { id: 's2', name: 'Priya Verma', roll: '102', course: 'BCA' },
  { id: 's3', name: 'Rahul Singh', roll: '103', course: 'BCA' },
  { id: 's4', name: 'Ananya Gupta', roll: '104', course: 'BCA' },
];

const initialSubjects: Subject[] = [
  { id: 'sub1', name: 'Data Structures' },
  { id: 'sub2', name: 'Database Management' },
  { id: 'sub3', name: 'Web Development' },
  { id: 'sub4', name: 'Computer Networks' },
];

function todayKey(): string {
  return dateToKey(new Date());
}

function dateToKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function keyToDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function shiftDate(key: string, amount: number): string {
  const date = keyToDate(key);
  date.setDate(date.getDate() + amount);
  return dateToKey(date);
}

function prettyDate(key: string): string {
  return keyToDate(key).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function recordKey(
  date: string,
  subjectId: string,
  studentId: string,
): string {
  return `${date}|${subjectId}|${studentId}`;
}

function putHimanshuFirst(list: Student[]): Student[] {
  const existing = list.find((student) => student.roll.trim() === '186');

  const himanshu: Student = existing
    ? {
        ...existing,
        name: 'Himanshu Srivastav',
        roll: '186',
        course: 'BCA',
      }
    : {
        id: 's186',
        name: 'Himanshu Srivastav',
        roll: '186',
        course: 'BCA',
      };

  return [
    himanshu,
    ...list.filter((student) => student.roll.trim() !== '186'),
  ];
}

function attendancePercentage(
  studentId: string,
  subjectId: string,
  records: AttendanceRecords,
): number | null {
  const matching = Object.entries(records).filter(([key]) => {
    const parts = key.split('|');
    return parts[1] === subjectId && parts[2] === studentId;
  });

  if (matching.length === 0) return null;

  const present = matching.filter(([, value]) => value === 'P').length;
  return Math.round((present / matching.length) * 100);
}

export default function AttendX() {
  const [tab, setTab] = useState<Tab>('Dashboard');
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [records, setRecords] = useState<AttendanceRecords>({});
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [selectedSubject, setSelectedSubject] = useState('sub1');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentCourse, setStudentCourse] = useState('BCA');
  const [subjectName, setSubjectName] = useState('');
  const [search, setSearch] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);

        if (saved) {
          const data = JSON.parse(saved);

          const loadedStudents: Student[] = Array.isArray(data.students)
            ? data.students
            : initialStudents;

          setStudents(putHimanshuFirst(loadedStudents));

          setSubjects(
            Array.isArray(data.subjects) && data.subjects.length > 0
              ? data.subjects
              : initialSubjects,
          );

          setRecords(
            data.records && typeof data.records === 'object'
              ? data.records
              : {},
          );
        } else {
          setStudents(putHimanshuFirst(initialStudents));
          setSubjects(initialSubjects);
        }
      } catch {
        Alert.alert('Storage error', 'Could not load saved data.');
      } finally {
        setHydrated(true);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        students: putHimanshuFirst(students),
        subjects,
        records,
      }),
    ).catch(() => {
      Alert.alert('Storage error', 'Could not save your changes.');
    });
  }, [students, subjects, records, hydrated]);

  useEffect(() => {
    if (
      subjects.length > 0 &&
      !subjects.some((subject) => subject.id === selectedSubject)
    ) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  const orderedStudents = useMemo(
    () => putHimanshuFirst(students),
    [students],
  );

  const currentRecords = useMemo(
    () =>
      orderedStudents.map((student) => ({
        student,
        status: records[
          recordKey(selectedDate, selectedSubject, student.id)
        ] as AttendanceStatus | undefined,
      })),
    [orderedStudents, records, selectedDate, selectedSubject],
  );

  const markedCount = currentRecords.filter((item) => item.status).length;
  const presentCount = currentRecords.filter(
    (item) => item.status === 'P',
  ).length;
  const absentCount = currentRecords.filter(
    (item) => item.status === 'A',
  ).length;

  const filteredStudents = orderedStudents.filter((student) => {
    const query = search.trim().toLowerCase();
    return (
      student.name.toLowerCase().includes(query) ||
      student.roll.toLowerCase().includes(query)
    );
  });

  const totalPresent = Object.values(records).filter(
    (status) => status === 'P',
  ).length;
  const totalMarked = Object.keys(records).length;
  const overallPercentage =
    totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

  function markAttendance(studentId: string, status: AttendanceStatus) {
    const key = recordKey(selectedDate, selectedSubject, studentId);
    setRecords((previous) => ({ ...previous, [key]: status }));
  }

  function markAll(status: AttendanceStatus) {
    const updates: AttendanceRecords = {};

    orderedStudents.forEach((student) => {
      updates[recordKey(selectedDate, selectedSubject, student.id)] = status;
    });

    setRecords((previous) => ({ ...previous, ...updates }));
  }

  function addStudent() {
    const name = studentName.trim();
    const roll = studentRoll.trim();
    const course = studentCourse.trim() || 'BCA';

    if (!name || !roll) {
      Alert.alert(
        'Missing details',
        'Please enter the student name and roll number.',
      );
      return;
    }

    if (orderedStudents.some((student) => student.roll.trim() === roll)) {
      Alert.alert('Duplicate roll number', 'This roll number already exists.');
      return;
    }

    setStudents((previous) =>
      putHimanshuFirst([
        ...previous,
        {
          id: `student-${Date.now()}`,
          name,
          roll,
          course,
        },
      ]),
    );

    setStudentName('');
    setStudentRoll('');
    setStudentCourse('BCA');
    setShowStudentModal(false);
  }

  function addSubject() {
    const name = subjectName.trim();

    if (!name) {
      Alert.alert('Missing subject', 'Please enter a subject name.');
      return;
    }

    if (
      subjects.some(
        (subject) => subject.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      Alert.alert('Duplicate subject', 'This subject already exists.');
      return;
    }

    const newSubject = {
      id: `subject-${Date.now()}`,
      name,
    };

    setSubjects((previous) => [...previous, newSubject]);
    setSelectedSubject(newSubject.id);
    setSubjectName('');
    setShowSubjectModal(false);
  }

  function removeStudent(studentId: string) {
    if (studentId === 's186' || students.find((s) => s.id === studentId)?.roll === '186') {
      Alert.alert(
        'Cannot remove Himanshu',
        'Himanshu is the primary student and will remain first in the list.',
      );
      return;
    }

    Alert.alert(
      'Remove student',
      'Remove this student and their attendance records?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setStudents((previous) =>
              previous.filter((student) => student.id !== studentId),
            );

            setRecords((previous) => {
              const next = { ...previous };

              Object.keys(next).forEach((key) => {
                if (key.split('|')[2] === studentId) delete next[key];
              });

              return next;
            });
          },
        },
      ],
    );
  }

  function renderHeader() {
    return (
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>
            Attend<Text style={styles.brandAccent}>X</Text>
          </Text>
          <Text style={styles.headerSubtitle}>
            Smart attendance management
          </Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AX</Text>
        </View>
      </View>
    );
  }

  function renderStatCard(
    label: string,
    value: string | number,
    detail: string,
    color: string,
  ) {
    return (
      <View style={styles.statCard} key={label}>
        <View style={[styles.statDot, { backgroundColor: color }]} />
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statDetail}>{detail}</Text>
      </View>
    );
  }

  function renderDashboard() {
    return (
      <>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeEyebrow}>YOUR CLASS OVERVIEW</Text>
          <Text style={styles.welcomeTitle}>Welcome back!</Text>
          <Text style={styles.welcomeDescription}>
            Keep track of your class attendance, students and subjects in one
            place.
          </Text>
          <Pressable
            style={styles.primaryButton}
            onPress={() => setTab('Attendance')}
          >
            <Text style={styles.primaryButtonText}>Take attendance →</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Students',
            orderedStudents.length,
            'Enrolled students',
            '#6658E8',
          )}
          {renderStatCard(
            'Subjects',
            subjects.length,
            'Active subjects',
            '#159B83',
          )}
          {renderStatCard(
            'Present',
            presentCount,
            prettyDate(selectedDate),
            '#219A68',
          )}
          {renderStatCard(
            'Absent',
            absentCount,
            'Selected session',
            '#E05D69',
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.cardTitle}>Recent attendance</Text>
            <Pressable onPress={() => setTab('Attendance')}>
              <Text style={styles.linkText}>Open attendance</Text>
            </Pressable>
          </View>
          <Text style={styles.mutedText}>{prettyDate(selectedDate)}</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    markedCount ? (presentCount / markedCount) * 100 : 0
                  }%`,
                },
              ]}
            />
          </View>
          <Text style={styles.bodyText}>
            {markedCount === 0
              ? 'No attendance has been marked for this session.'
              : `${presentCount} present · ${absentCount} absent · ${
                  orderedStudents.length - markedCount
                } unmarked`}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick actions</Text>
          <View style={styles.quickActions}>
            <Pressable
              style={styles.quickAction}
              onPress={() => setShowStudentModal(true)}
            >
              <Text style={styles.quickActionIcon}>＋</Text>
              <Text style={styles.quickActionText}>Add student</Text>
            </Pressable>
            <Pressable
              style={styles.quickAction}
              onPress={() => setShowSubjectModal(true)}
            >
              <Text style={styles.quickActionIcon}>▤</Text>
              <Text style={styles.quickActionText}>Add subject</Text>
            </Pressable>
            <Pressable
              style={styles.quickAction}
              onPress={() => setTab('Reports')}
            >
              <Text style={styles.quickActionIcon}>▥</Text>
              <Text style={styles.quickActionText}>View reports</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  function renderStudents() {
    return (
      <>
        <View style={styles.pageHeadingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Students</Text>
            <Text style={styles.mutedText}>
              {orderedStudents.length} students enrolled
            </Text>
          </View>
          <Pressable
            style={styles.smallPrimaryButton}
            onPress={() => setShowStudentModal(true)}
          >
            <Text style={styles.primaryButtonText}>＋ Add</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or roll number..."
          placeholderTextColor="#8A90A3"
          value={search}
          onChangeText={setSearch}
        />

        {filteredStudents.map((student) => {
          const percentages = subjects
            .map((subject) =>
              attendancePercentage(student.id, subject.id, records),
            )
            .filter((value): value is number => value !== null);

          const average =
            percentages.length > 0
              ? Math.round(
                  percentages.reduce((sum, value) => sum + value, 0) /
                    percentages.length,
                )
              : null;

          return (
            <View style={styles.studentCard} key={student.id}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>
                  {student.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.mutedText}>
                  Roll No. {student.roll} · {student.course}
                </Text>
                <Text style={styles.studentAttendance}>
                  Attendance: {average === null ? 'Not marked' : `${average}%`}
                </Text>
              </View>
              {student.roll.trim() !== '186' && (
                <Pressable
                  style={styles.removeButton}
                  onPress={() => removeStudent(student.id)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {filteredStudents.length === 0 && (
          <Text style={styles.emptyText}>No students found.</Text>
        )}
      </>
    );
  }

  function renderDateControls() {
    const isToday = selectedDate === todayKey();
    const isFuture = selectedDate >= todayKey();

    return (
      <>
        <View style={styles.datePickerRow}>
          <Pressable
            onPress={() => setSelectedDate((date) => shiftDate(date, -1))}
            style={styles.dateArrow}
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowDatePicker(true)}
            style={styles.dateCenter}
          >
            <Text style={styles.dateValue}>{prettyDate(selectedDate)}</Text>
            <Text style={styles.smallMuted}>Tap to choose a date</Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedDate((date) => shiftDate(date, 1))}
            disabled={isFuture}
            style={[styles.dateArrow, isFuture && styles.disabledControl]}
          >
            <Text style={styles.dateArrowText}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedDate(todayKey())}
            style={[styles.todayButton, isToday && styles.todayButtonActive]}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={keyToDate(selectedDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);

              if (event.type === 'set' && date) {
                setSelectedDate(dateToKey(date));
              }
            }}
          />
        )}
      </>
    );
  }

  function renderAttendance() {
    return (
      <>
        <View style={styles.pageHeadingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Attendance</Text>
            <Text style={styles.mutedText}>Mark your class attendance</Text>
          </View>
        </View>

        {renderDateControls()}

        <View style={styles.card}>
          <View style={styles.cardHeadingRow}>
            <Text style={styles.cardTitle}>Select subject</Text>
            <Pressable onPress={() => setShowSubjectModal(true)}>
              <Text style={styles.linkText}>＋ Add subject</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.subjectRow}>
              {subjects.map((subject) => (
                <Pressable
                  key={subject.id}
                  onPress={() => setSelectedSubject(subject.id)}
                  style={[
                    styles.subjectChip,
                    selectedSubject === subject.id &&
                      styles.subjectChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      selectedSubject === subject.id &&
                        styles.subjectChipTextActive,
                    ]}
                  >
                    {subject.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.attendanceSummary}>
          <View>
            <Text style={styles.summaryNumber}>{presentCount}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View>
            <Text style={styles.summaryNumber}>{absentCount}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View>
            <Text style={styles.summaryNumber}>
              {orderedStudents.length - markedCount}
            </Text>
            <Text style={styles.summaryLabel}>Unmarked</Text>
          </View>
          <View>
            <Text style={styles.summaryNumber}>{orderedStudents.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        <View style={styles.bulkActions}>
          <Pressable
            style={styles.bulkPresent}
            onPress={() =>
              Alert.alert(
                'Mark everyone present?',
                'This will mark every student present for this date and subject.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm', onPress: () => markAll('P') },
                ],
              )
            }
          >
            <Text style={styles.bulkPresentText}>✓ All Present</Text>
          </Pressable>

          <Pressable
            style={styles.bulkAbsent}
            onPress={() =>
              Alert.alert(
                'Mark everyone absent?',
                'This will mark every student absent for this date and subject.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm', onPress: () => markAll('A') },
                ],
              )
            }
          >
            <Text style={styles.bulkAbsentText}>× All Absent</Text>
          </Pressable>
        </View>

        {currentRecords.map(({ student, status }) => (
          <View style={styles.attendanceRow} key={student.id}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>
                {student.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.attendanceStudentInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.mutedText}>Roll No. {student.roll}</Text>
            </View>
            <Pressable
              onPress={() => markAttendance(student.id, 'P')}
              style={[
                styles.statusButton,
                styles.presentButton,
                status === 'P' && styles.presentSelected,
              ]}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === 'P' && styles.selectedStatusText,
                ]}
              >
                P
              </Text>
            </Pressable>
            <Pressable
              onPress={() => markAttendance(student.id, 'A')}
              style={[
                styles.statusButton,
                styles.absentButton,
                status === 'A' && styles.absentSelected,
              ]}
            >
              <Text
                style={[
                  styles.statusButtonText,
                  status === 'A' && styles.selectedStatusText,
                ]}
              >
                A
              </Text>
            </Pressable>
          </View>
        ))}

        <View style={styles.saveNote}>
          <Text style={styles.saveNoteText}>
            ✓ Attendance is saved automatically on this device.
          </Text>
        </View>
      </>
    );
  }

  function renderReports() {
    return (
      <>
        <Text style={styles.pageTitle}>Reports</Text>
        <Text style={[styles.mutedText, { marginBottom: 18 }]}>
          Attendance summary across recorded sessions
        </Text>

        <View style={styles.reportHero}>
          <Text style={styles.reportHeroLabel}>OVERALL ATTENDANCE</Text>
          <Text style={styles.reportHeroValue}>{overallPercentage}%</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${overallPercentage}%` },
              ]}
            />
          </View>
          <Text style={styles.reportHeroDetail}>
            {totalPresent} present marks out of {totalMarked} recorded marks
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Subject-wise summary</Text>

        {subjects.map((subject) => {
          const entries = Object.entries(records).filter(([key]) => {
            return key.split('|')[1] === subject.id;
          });

          const present = entries.filter(
            ([, status]) => status === 'P',
          ).length;
          const percentage =
            entries.length > 0
              ? Math.round((present / entries.length) * 100)
              : null;

          return (
            <View style={styles.reportSubjectCard} key={subject.id}>
              <View style={styles.cardHeadingRow}>
                <Text style={styles.studentName}>{subject.name}</Text>
                <Text style={styles.reportPercentage}>
                  {percentage === null ? '—' : `${percentage}%`}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${percentage ?? 0}%` },
                  ]}
                />
              </View>
              <Text style={styles.mutedText}>
                {present} present · {entries.length - present} absent ·{' '}
                {entries.length} marks
              </Text>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Student-wise summary</Text>

        {orderedStudents.map((student) => {
          const percentages = subjects
            .map((subject) =>
              attendancePercentage(student.id, subject.id, records),
            )
            .filter((value): value is number => value !== null);

          const average =
            percentages.length > 0
              ? Math.round(
                  percentages.reduce((sum, value) => sum + value, 0) /
                    percentages.length,
                )
              : null;

          return (
            <View style={styles.reportSubjectCard} key={student.id}>
              <View style={styles.cardHeadingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.mutedText}>Roll No. {student.roll}</Text>
                </View>
                <Text style={styles.reportPercentage}>
                  {average === null ? '—' : `${average}%`}
                </Text>
              </View>
            </View>
          );
        })}

        <Text style={styles.reportDisclaimer}>
          Reports include only attendance that has been marked. Unmarked
          sessions are not counted.
        </Text>
      </>
    );
  }

  function renderTabContent() {
    switch (tab) {
      case 'Dashboard':
        return renderDashboard();
      case 'Students':
        return renderStudents();
      case 'Attendance':
        return renderAttendance();
      case 'Reports':
        return renderReports();
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />

      {renderHeader()}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>

      <View style={styles.bottomNav}>
        {(
          [
            ['Dashboard', '⌂'],
            ['Students', '♙'],
            ['Attendance', '✓'],
            ['Reports', '▥'],
          ] as [Tab, string][]
        ).map(([item, icon]) => (
          <Pressable
            key={item}
            onPress={() => {
              setTab(item);
              setSearch('');
            }}
            style={styles.navItem}
          >
            <Text style={[styles.navIcon, tab === item && styles.navActive]}>
              {icon}
            </Text>
            <Text style={[styles.navLabel, tab === item && styles.navActive]}>
              {item}
            </Text>
            {tab === item && <View style={styles.navIndicator} />}
          </Pressable>
        ))}
      </View>

      <Modal
        visible={showStudentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStudentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.cardHeadingRow}>
              <Text style={styles.modalTitle}>Add student</Text>
              <Pressable onPress={() => setShowStudentModal(false)}>
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter student name"
              placeholderTextColor="#8A90A3"
              value={studentName}
              onChangeText={setStudentName}
            />

            <Text style={styles.inputLabel}>Roll number</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter roll number"
              placeholderTextColor="#8A90A3"
              value={studentRoll}
              onChangeText={setStudentRoll}
            />

            <Text style={styles.inputLabel}>Course</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. BCA"
              placeholderTextColor="#8A90A3"
              value={studentCourse}
              onChangeText={setStudentCourse}
            />

            <Pressable style={styles.modalPrimaryButton} onPress={addStudent}>
              <Text style={styles.primaryButtonText}>Save student</Text>
            </Pressable>

            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setShowStudentModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSubjectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.cardHeadingRow}>
              <Text style={styles.modalTitle}>Add subject</Text>
              <Pressable onPress={() => setShowSubjectModal(false)}>
                <Text style={styles.closeButton}>×</Text>
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Subject name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter subject name"
              placeholderTextColor="#8A90A3"
              value={subjectName}
              onChangeText={setSubjectName}
            />

            <Pressable style={styles.modalPrimaryButton} onPress={addSubject}>
              <Text style={styles.primaryButtonText}>Save subject</Text>
            </Pressable>

            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setShowSubjectModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7FC',
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#20243A',
    letterSpacing: -1,
  },
  brandAccent: {
    color: '#6658E8',
  },
  headerSubtitle: {
    color: '#81869B',
    fontSize: 11,
    marginTop: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8E5FF',
  },
  avatarText: {
    color: '#6658E8',
    fontWeight: '800',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingBottom: 25,
  },
  welcomeCard: {
    backgroundColor: '#29234D',
    borderRadius: 24,
    padding: 22,
    marginTop: 6,
    marginBottom: 24,
  },
  welcomeEyebrow: {
    color: '#BDB5FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    marginTop: 10,
  },
  welcomeDescription: {
    color: '#D0CDE5',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 18,
  },
  primaryButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#7668F4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#22263D',
    marginBottom: 13,
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48.3%',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECEEF5',
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 11,
  },
  statLabel: {
    fontSize: 12,
    color: '#858AA0',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#252940',
    marginTop: 4,
  },
  statDetail: {
    fontSize: 10,
    color: '#9398AA',
    marginTop: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ECEEF5',
  },
  cardHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#252940',
    flexShrink: 1,
  },
  mutedText: {
    fontSize: 11,
    color: '#858AA0',
    marginTop: 5,
  },
  smallMuted: {
    fontSize: 10,
    color: '#858AA0',
    marginTop: 4,
  },
  bodyText: {
    color: '#6E748B',
    fontSize: 12,
    marginTop: 11,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#ECECF5',
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 13,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6658E8',
    borderRadius: 10,
  },
  linkText: {
    color: '#6658E8',
    fontSize: 11,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 9,
  },
  quickAction: {
    flex: 1,
    minHeight: 86,
    padding: 10,
    borderRadius: 13,
    backgroundColor: '#F6F5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionIcon: {
    color: '#6658E8',
    fontSize: 25,
    marginBottom: 8,
  },
  quickActionText: {
    color: '#42445F',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  pageHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
    marginBottom: 18,
    gap: 10,
  },
  pageTitle: {
    fontSize: 25,
    color: '#252940',
    fontWeight: '800',
  },
  smallPrimaryButton: {
    backgroundColor: '#6658E8',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 11,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EAF2',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    color: '#252940',
    fontSize: 12,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEEF5',
    padding: 13,
    marginBottom: 10,
    gap: 11,
  },
  studentAvatar: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#EAE7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    color: '#6658E8',
    fontWeight: '800',
    fontSize: 17,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#252940',
  },
  studentAttendance: {
    fontSize: 11,
    color: '#6658E8',
    marginTop: 5,
    fontWeight: '600',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F1',
  },
  removeButtonText: {
    color: '#D94C5A',
    fontSize: 21,
    lineHeight: 24,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 9,
    borderWidth: 1,
    borderColor: '#ECEEF5',
    marginBottom: 14,
    gap: 4,
  },
  dateArrow: {
    width: 34,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#F1EFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateArrowText: {
    color: '#6658E8',
    fontSize: 27,
    lineHeight: 31,
  },
  dateCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
  },
  dateValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#292C43',
    textAlign: 'center',
  },
  todayButton: {
    paddingHorizontal: 9,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F1EFFF',
  },
  todayButtonActive: {
    backgroundColor: '#E5E1FF',
  },
  todayButtonText: {
    color: '#6658E8',
    fontSize: 10,
    fontWeight: '800',
  },
  disabledControl: {
    opacity: 0.35,
  },
  subjectRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 13,
    paddingBottom: 2,
  },
  subjectChip: {
    paddingVertical: 10,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: '#F4F5FA',
    borderWidth: 1,
    borderColor: '#ECEEF5',
  },
  subjectChipActive: {
    backgroundColor: '#6658E8',
    borderColor: '#6658E8',
  },
  subjectChipText: {
    fontSize: 11,
    color: '#646A80',
    fontWeight: '700',
  },
  subjectChipTextActive: {
    color: '#FFFFFF',
  },
  attendanceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEEF5',
    marginBottom: 13,
  },
  summaryNumber: {
    color: '#252940',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 9,
    color: '#858AA0',
    marginTop: 4,
    textAlign: 'center',
  },
  bulkActions: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 13,
  },
  bulkPresent: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E2F7EC',
    padding: 12,
    borderRadius: 12,
  },
  bulkPresentText: {
    color: '#188452',
    fontWeight: '800',
    fontSize: 11,
  },
  bulkAbsent: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFE9EB',
    padding: 12,
    borderRadius: 12,
  },
  bulkAbsentText: {
    color: '#C74654',
    fontWeight: '800',
    fontSize: 11,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 11,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: '#ECEEF5',
    gap: 9,
  },
  attendanceStudentInfo: {
    flex: 1,
  },
  statusButton: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  presentButton: {
    backgroundColor: '#F0FAF4',
    borderColor: '#D6F0E1',
  },
  absentButton: {
    backgroundColor: '#FFF3F3',
    borderColor: '#F6DDE0',
  },
  presentSelected: {
    backgroundColor: '#219A68',
    borderColor: '#219A68',
  },
  absentSelected: {
    backgroundColor: '#D95360',
    borderColor: '#D95360',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#777D91',
  },
  selectedStatusText: {
    color: '#FFFFFF',
  },
  saveNote: {
    backgroundColor: '#E8F8F0',
    borderRadius: 12,
    padding: 13,
    marginTop: 7,
    marginBottom: 15,
  },
  saveNoteText: {
    color: '#24865B',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  reportHero: {
    backgroundColor: '#29234D',
    borderRadius: 22,
    padding: 22,
    marginTop: 5,
    marginBottom: 25,
  },
  reportHeroLabel: {
    color: '#C3BCFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  reportHeroValue: {
    fontSize: 44,
    color: '#FFFFFF',
    fontWeight: '800',
    marginTop: 8,
  },
  reportHeroDetail: {
    fontSize: 11,
    color: '#D0CDE5',
    marginTop: 12,
  },
  reportSubjectCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#ECEEF5',
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  reportPercentage: {
    color: '#6658E8',
    fontWeight: '800',
    fontSize: 17,
  },
  reportDisclaimer: {
    color: '#858AA0',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#858AA0',
    paddingVertical: 30,
    fontSize: 13,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 6 : 10,
    borderTopWidth: 1,
    borderTopColor: '#ECEEF5',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navIcon: {
    fontSize: 22,
    color: '#A2A6B7',
  },
  navLabel: {
    fontSize: 9,
    color: '#9297AA',
    fontWeight: '600',
  },
  navActive: {
    color: '#6658E8',
    fontWeight: '800',
  },
  navIndicator: {
    width: 17,
    height: 3,
    borderRadius: 5,
    backgroundColor: '#6658E8',
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 24, 45, 0.5)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 21,
  },
  modalTitle: {
    fontSize: 20,
    color: '#252940',
    fontWeight: '800',
  },
  closeButton: {
    fontSize: 27,
    color: '#858AA0',
    paddingHorizontal: 4,
  },
  inputLabel: {
    color: '#4F546A',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 17,
    marginBottom: 7,
  },
  modalInput: {
    backgroundColor: '#F7F8FC',
    borderColor: '#E8EAF2',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 13,
    color: '#252940',
    fontSize: 13,
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#6658E8',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 22,
  },
  modalCancelButton: {
    alignItems: 'center',
    paddingVertical: 13,
    marginTop: 4,
  },
  modalCancelText: {
    color: '#777D91',
    fontSize: 12,
    fontWeight: '700',
  },
});
