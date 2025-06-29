
"use client";

import * as React from 'react';
import type { Medication } from '@/types/medication';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Clock, Pill, CalendarDays, Repeat, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, parseISO, addDays } from 'date-fns';

interface MedicationItemProps {
  medication: Medication;
  onEdit: (medication: Medication) => void;
  onDelete: (id: string) => void;
  isOverdue?: boolean; // This prop might be re-evaluated based on new fields
}

export function MedicationItem({ medication, onEdit, onDelete, isOverdue }: MedicationItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return 'N/A';
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours = parseInt(hoursStr, 10);
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(hours) || isNaN(minutes)) return timeStr; 
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; 
    return `${formattedHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString; // Fallback if not a valid ISO string
    }
  };

  const getDurationText = () => {
    if (medication.durationDays === null || medication.durationDays === undefined || medication.durationDays === 0) {
      return "Ongoing";
    }
    return `For ${medication.durationDays} day${medication.durationDays > 1 ? 's' : ''}`;
  };
  
  const getScheduleSummary = () => {
    let summary = [];
    if (medication.startDate) {
        const startDateObj = parseISO(medication.startDate);
        const today = new Date();
        today.setHours(0,0,0,0); // for date comparison

        if (addDays(startDateObj, medication.durationDays || 0) < today && medication.durationDays) {
             summary.push(<span key="status-completed" className="text-green-600 font-semibold"> (Completed)</span>);
        } else if (startDateObj > today) {
            summary.push(<span key="status-upcoming" className="text-blue-600 font-semibold"> (Starts {formatDate(medication.startDate)})</span>);
        }
    }
    return summary;
  };


  return (
    <Card className={`mb-4 shadow-md animate-slideInFade ${isOverdue ? 'border-destructive ring-2 ring-destructive' : ''}`}>
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-headline flex items-center">
                <Pill className="mr-2 h-5 w-5 text-primary" />
                {medication.name}
                {getScheduleSummary()}
            </CardTitle>
             {isOverdue && <span className="text-xs font-semibold text-destructive rounded-full px-2 py-1 bg-destructive/10">OVERDUE</span>}
        </div>
      </CardHeader>
      <CardContent className="pb-3 space-y-1.5 text-sm">
        <div className="flex items-center text-muted-foreground">
          <Clock className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>Scheduled Time: {formatDisplayTime(medication.time)}</span>
        </div>
        {medication.frequencyDescription && (
          <div className="flex items-center text-muted-foreground">
            <Repeat className="mr-2 h-4 w-4 flex-shrink-0" />
            <span>Frequency: {medication.frequencyDescription}</span>
          </div>
        )}
         <div className="grid grid-cols-2 gap-x-4">
            {medication.startDate && (
            <div className="flex items-center text-muted-foreground">
                <CalendarDays className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Starts: {formatDate(medication.startDate)}</span>
            </div>
            )}
            <div className="flex items-center text-muted-foreground">
                <Info className="mr-2 h-4 w-4 flex-shrink-0" />
                <span>Duration: {getDurationText()}</span>
            </div>
        </div>
        {medication.originalInput && (
          <p className="text-xs text-muted-foreground mt-2 pt-1 border-t border-dashed italic">
            From: "{medication.originalInput}"
          </p>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2 pb-3 pt-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(medication)} aria-label={`Edit ${medication.name}`}>
          <Edit className="mr-1 h-4 w-4" /> Edit
        </Button>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" aria-label={`Delete ${medication.name}`}>
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the reminder for {medication.name}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(medication.id)}>
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
