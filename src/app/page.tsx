
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/header';
import { MedicationForm } from '@/components/medication-form';
import { MedicationSchedule } from '@/components/medication-schedule';
import type { Medication } from '@/types/medication';
import { useMedicationStore } from '@/hooks/use-medication-store';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BellRing, Loader2 } from 'lucide-react'; 
import { format, parseISO, isToday, isPast, addDays, isFuture, startOfDay } from 'date-fns';

export default function MediMindPage() {
  const { medications, addMedication, updateMedication, deleteMedication, markAsNotified, isInitialized, isLoading } = useMedicationStore();
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === "granted") {
        toast({ title: "Notifications Enabled", description: "You will now receive medication reminders." });
      } else if (permission === "denied") {
        toast({ title: "Notifications Disabled", description: "You have denied notification permissions. Please enable them in your browser settings if you want reminders.", variant: "destructive" });
      }
    } else {
       toast({ title: "Notifications Not Supported", description: "Your browser does not support notifications.", variant: "destructive" });
    }
  }, [toast]);


  const handleAddMedication = async (data: Omit<Medication, 'id' | 'lastNotified'>) => {
    const success = await addMedication(data);
    if (success) {
      toast({ title: "Reminder Added", description: `${data.name} scheduled for ${data.time}.`});
    } else {
      toast({ title: "Error", description: `Failed to add ${data.name}. Please try again.`, variant: "destructive" });
    }
  };

  const handleUpdateMedication = async (data: Medication) => {
    const success = await updateMedication(data);
    if (success) {
      setEditingMedication(null);
      toast({ title: "Reminder Updated", description: `${data.name} details have been updated.`});
    } else {
      toast({ title: "Error", description: `Failed to update ${data.name}. Please try again.`, variant: "destructive" });
    }
  };

  const handleDeleteMedication = async (id: string) => {
    const medToDelete = medications.find(m => m.id === id);
    const success = await deleteMedication(id);
    if (success && medToDelete) {
      toast({ title: "Reminder Deleted", description: `${medToDelete.name} has been removed from your schedule.`});
    } else if (!success && medToDelete) {
      toast({ title: "Error", description: `Failed to delete ${medToDelete.name}. Please try again.`, variant: "destructive" });
    } else if (!success) {
      toast({ title: "Error", description: `Failed to delete reminder. Please try again.`, variant: "destructive" });
    }
  };

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Notification Logic
  useEffect(() => {
    if (!isInitialized || notificationPermission !== "granted" || isLoading) return;

    const checkReminders = () => {
      const now = new Date();
      const currentTimeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      const todayDateString = format(now, 'yyyy-MM-dd');
      const todayStartOfDay = startOfDay(now);

      medications.forEach(med => {
        // Check if medication is active based on start_date and duration_days
        let isActive = true;
        if (med.startDate) {
          const startDateObj = parseISO(med.startDate);
          if (isFuture(startDateObj)) { // If start date is in the future
            isActive = false;
          }
          if (med.durationDays && med.durationDays > 0) {
            const endDate = addDays(startDateObj, med.durationDays -1); // Last day of medication
            if (isPast(endDate) && !isToday(endDate)) { // If duration has passed
                 isActive = false;
            }
          }
        }
        
        if (isActive && med.time === currentTimeString && med.lastNotified !== todayDateString) {
          new Notification('MediMind Reminder', {
            body: `Time to take your ${med.name}!`,
            // icon: '/icon.svg', 
          });
          markAsNotified(med.id); 
        }
      });
    };

    const intervalId = setInterval(checkReminders, 60000); // Check every minute
    if (medications.length > 0) checkReminders(); 

    return () => clearInterval(intervalId);
  }, [medications, markAsNotified, isInitialized, isLoading, notificationPermission]);


  if (!isInitialized || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-primary text-xl">Loading MediMind...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        {notificationPermission === "default" && (
          <Card className="mb-6 max-w-lg mx-auto bg-primary/10 border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-primary-foreground">Enable Notifications</h3>
                  <p className="text-sm text-primary-foreground/80">Get reminders directly in your browser.</p>
                </div>
                <Button onClick={requestNotificationPermission} variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <BellRing className="mr-2 h-4 w-4" /> Enable
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
         {notificationPermission === "denied" && (
          <Card className="mb-6 max-w-lg mx-auto bg-destructive/10 border-destructive/30">
            <CardContent className="pt-6">
                 <h3 className="text-lg font-semibold text-destructive-foreground">Notifications Denied</h3>
                  <p className="text-sm text-destructive-foreground/80">
                    You've blocked notifications. To receive reminders, please enable them in your browser settings for this site.
                  </p>
            </CardContent>
          </Card>
        )}

        <MedicationForm
          onSubmitMedication={handleAddMedication}
          editingMedication={editingMedication}
          onUpdateMedication={handleUpdateMedication}
          clearEditing={() => setEditingMedication(null)}
        />
        <MedicationSchedule
          medications={medications}
          onEditMedication={handleEditMedication}
          onDeleteMedication={handleDeleteMedication}
        />
      </main>
      <footer className="text-center py-4 border-t text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} MediMind. Stay healthy!</p>
      </footer>
    </div>
  );
}
