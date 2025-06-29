
"use client";

import type { Medication } from '@/types/medication';
import { MedicationItem } from './medication-item';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarClock } from 'lucide-react';
import { format, parseISO, isToday, isFuture, addDays, isPast, startOfDay } from 'date-fns';

interface MedicationScheduleProps {
  medications: Medication[];
  onEditMedication: (medication: Medication) => void;
  onDeleteMedication: (id: string) => void;
}

export function MedicationSchedule({ medications, onEditMedication, onDeleteMedication }: MedicationScheduleProps) {
  
  const isMedicationOverdueAndActive = (medication: Medication): boolean => {
    if (!medication.time) return false;

    const now = new Date();
    const todayStart = startOfDay(now);
    
    // Check if active based on start_date and duration_days
    let isActive = true;
    if (medication.startDate) {
      const startDateObj = parseISO(medication.startDate);
      if (isFuture(startDateObj)) { // Not started yet
        isActive = false;
      }
      if (medication.durationDays && medication.durationDays > 0) {
        const endDate = addDays(startDateObj, medication.durationDays - 1); // last day of medication
         if (isPast(endDate) && !isToday(endDate)) { // Duration has passed and it's not today
             isActive = false;
         }
      }
    }
    if (!isActive) return false; // Not active, so not overdue

    // Check if overdue
    const [hours, minutes] = medication.time.split(':').map(Number);
    const medicationTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    
    const todayStr = format(now, 'yyyy-MM-dd');
    return now > medicationTimeToday && medication.lastNotified !== todayStr;
  };

  const sortedMedications = [...medications].sort((a, b) => {
    const aStartDate = a.startDate ? a.startDate : '0000-00-00'; // oldest if no start date
    const bStartDate = b.startDate ? b.startDate : '0000-00-00';
    if (aStartDate !== bStartDate) {
        return aStartDate.localeCompare(bStartDate);
    }
    return a.time.localeCompare(b.time);
  });

  if (sortedMedications.length === 0) {
    return (
      <Card className="mt-8 w-full max-w-lg mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-center flex items-center justify-center">
            <CalendarClock className="mr-2 h-6 w-6 text-primary" />
            Your Schedule is Clear
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            Add medications using the form above to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-8 w-full max-w-xl mx-auto">
      <h2 className="text-2xl font-headline mb-6 text-center text-foreground">Your Reminders</h2>
      {sortedMedications.map((med) => (
        <MedicationItem
          key={med.id}
          medication={med}
          onEdit={onEditMedication}
          onDelete={onDeleteMedication}
          isOverdue={isMedicationOverdueAndActive(med)}
        />
      ))}
    </div>
  );
}
