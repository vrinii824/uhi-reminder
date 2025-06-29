
// src/hooks/use-medication-store.ts
"use client";

import type { Medication } from '@/types/medication';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';

// Helper to map database record (snake_case) to Medication type (camelCase)
const mapDbRecordToMedication = (dbRecord: any): Medication => ({
  id: dbRecord.id,
  name: dbRecord.name,
  time: dbRecord.time ? dbRecord.time.substring(0,5) : '00:00', // Ensure HH:MM
  originalInput: dbRecord.original_input,
  lastNotified: dbRecord.last_notified,
  frequencyDescription: dbRecord.frequency_description,
  durationDays: dbRecord.duration_days,
  startDate: dbRecord.start_date, // Supabase returns DATE as YYYY-MM-DD string
});

export function useMedicationStore() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // For initial load

  // Fetch initial medications from Supabase
  useEffect(() => {
    const fetchMedications = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .order('time', { ascending: true });

        if (error) {
          console.error('Error fetching medications from Supabase:', error);
          setMedications([]);
        } else if (data) {
          setMedications(data.map(mapDbRecordToMedication));
        }
      } catch (err) {
        console.error('Unexpected error fetching medications:', err);
        setMedications([]);
      } finally {
        setIsInitialized(true);
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') { // Ensure running on client
        fetchMedications();
    }
  }, []);

  const addMedication = useCallback(async (medicationData: Omit<Medication, 'id' | 'lastNotified'>) => {
    try {
      const dbPayload: any = {
        name: medicationData.name,
        time: medicationData.time,
        original_input: medicationData.originalInput,
        frequency_description: medicationData.frequencyDescription,
        duration_days: medicationData.durationDays === 0 ? null : medicationData.durationDays, // Store 0 as null for indefinite
        start_date: medicationData.startDate || format(new Date(), 'yyyy-MM-dd'), // Default to today if not provided
      };
       // Remove undefined fields from payload to avoid Supabase errors
      Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);
      
      const { data: newMedicationDb, error } = await supabase
        .from('medications')
        .insert(dbPayload)
        .select()
        .single();

      if (error) {
        console.error('Error adding medication to Supabase:', error);
        return false;
      }

      if (newMedicationDb) {
        const newMedication = mapDbRecordToMedication(newMedicationDb);
        setMedications((prev) =>
          [...prev, newMedication].sort((a, b) => {
            if (a.startDate && b.startDate && a.startDate !== b.startDate) {
              return a.startDate.localeCompare(b.startDate);
            }
            return a.time.localeCompare(b.time);
          })
        );
        return true;
      }
    } catch (err) {
      console.error('Unexpected error adding medication:', err);
    }
    return false;
  }, []);

  const updateMedication = useCallback(async (updatedMedication: Medication) => {
    try {
       const dbPayload: any = {
        name: updatedMedication.name,
        time: updatedMedication.time,
        original_input: updatedMedication.originalInput,
        last_notified: updatedMedication.lastNotified,
        frequency_description: updatedMedication.frequencyDescription,
        duration_days: updatedMedication.durationDays === 0 ? null : updatedMedication.durationDays,
        start_date: updatedMedication.startDate || format(new Date(), 'yyyy-MM-dd'),
      };
      Object.keys(dbPayload).forEach(key => dbPayload[key] === undefined && delete dbPayload[key]);

      const { data: updatedMedicationDb, error } = await supabase
        .from('medications')
        .update(dbPayload)
        .eq('id', updatedMedication.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating medication in Supabase:', error);
        return false;
      }
      if (updatedMedicationDb) {
        const newlyUpdatedMed = mapDbRecordToMedication(updatedMedicationDb);
        setMedications((prev) =>
          prev
            .map((med) => (med.id === newlyUpdatedMed.id ? newlyUpdatedMed : med))
            .sort((a, b) => {
              if (a.startDate && b.startDate && a.startDate !== b.startDate) {
                return a.startDate.localeCompare(b.startDate);
              }
              return a.time.localeCompare(b.time);
            })
        );
        return true;
      }
    } catch (err) {
      console.error('Unexpected error updating medication:', err);
    }
    return false;
  }, []);

  const deleteMedication = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from('medications').delete().eq('id', id);

      if (error) {
        console.error('Error deleting medication from Supabase:', error);
        return false;
      }
      setMedications((prev) => prev.filter((med) => med.id !== id));
      return true;
    } catch (err) {
      console.error('Unexpected error deleting medication:', err);
    }
    return false;
  }, []);

  const markAsNotified = useCallback(async (id: string) => {
    const todayDateString = format(new Date(), 'yyyy-MM-dd');
    try {
      const { data: updatedMedicationDb, error } = await supabase
        .from('medications')
        .update({ last_notified: todayDateString })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error marking medication as notified in Supabase:', error);
        return false;
      }
      if (updatedMedicationDb) {
        const notifiedMed = mapDbRecordToMedication(updatedMedicationDb);
        setMedications((prev) =>
          prev.map((med) => (med.id === notifiedMed.id ? notifiedMed : med))
        );
        return true;
      }
    } catch (err) {
      console.error('Unexpected error marking as notified:', err);
    }
    return false;
  }, []);

  return {
    medications,
    addMedication,
    updateMedication,
    deleteMedication,
    markAsNotified,
    isInitialized, 
    isLoading, 
  };
}
