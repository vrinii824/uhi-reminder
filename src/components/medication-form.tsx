
"use client";

import type { Medication } from '@/types/medication';
import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, PlusCircle, Save, CalendarIcon, UploadCloud, FileText, ImageOff } from 'lucide-react';
import { extractScheduleFromText, type ExtractMedicineScheduleOutput } from '@/app/actions';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, isValid, parse } from 'date-fns';

const medicationFormSchema = z.object({
  name: z.string().min(1, { message: "Medicine name is required." }),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Invalid time format. Use HH:MM." }),
  originalInput: z.string().optional().nullable(),
  frequencyDescription: z.string().optional().nullable(),
  durationDays: z.number().int().min(0, "Duration must be 0 or positive").nullable().optional(), // 0 means indefinite
  startDate: z.string().nullable().optional().refine(val => !val || isValid(parseISO(val)), { message: "Invalid date" }),
});

type MedicationFormData = z.infer<typeof medicationFormSchema>;

interface MedicationFormProps {
  onSubmitMedication: (data: Omit<Medication, 'id' | 'lastNotified'>) => void;
  editingMedication: Medication | null;
  onUpdateMedication: (data: Medication) => void;
  clearEditing: () => void;
}

const durationOptions = [
  { label: "Ongoing", value: 0 },
  { label: "1 Day", value: 1 },
  { label: "3 Days", value: 3 },
  { label: "5 Days", value: 5 },
  { label: "1 Week (7 Days)", value: 7 },
  { label: "10 Days", value: 10 },
  { label: "2 Weeks (14 Days)", value: 14 },
  { label: "3 Weeks (21 Days)", value: 21 },
  { label: "1 Month (30 Days)", value: 30 },
  { label: "2 Months (60 Days)", value: 60 },
  { label: "3 Months (90 Days)", value: 90 },
];

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function MedicationForm({ onSubmitMedication, editingMedication, onUpdateMedication, clearEditing }: MedicationFormProps) {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState<string | null>(null);
  const [prescriptionFileType, setPrescriptionFileType] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const { toast } = useToast();

  const form = useForm<MedicationFormData>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      name: '',
      time: '',
      originalInput: '',
      frequencyDescription: '',
      durationDays: 0, // Default to Ongoing
      startDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    if (editingMedication) {
      form.reset({
        name: editingMedication.name,
        time: editingMedication.time,
        originalInput: editingMedication.originalInput || '',
        frequencyDescription: editingMedication.frequencyDescription || '',
        durationDays: editingMedication.durationDays ?? 0,
        startDate: editingMedication.startDate || format(new Date(), 'yyyy-MM-dd'),
      });
      setPrescriptionFile(null);
      setPrescriptionFileType(null);
    } else {
      form.reset({
        name: '',
        time: '',
        originalInput: '',
        frequencyDescription: '',
        durationDays: 0,
        startDate: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [editingMedication, form]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ title: "File Too Large", description: `Please upload a file smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        setPrescriptionFile(null);
        setPrescriptionFileType(null);
        event.target.value = ''; // Clear the file input
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrescriptionFile(reader.result as string);
        setPrescriptionFileType(file.type);
        setNaturalLanguageInput(''); // Clear NL input if file is uploaded
      };
      reader.readAsDataURL(file);
    } else {
      setPrescriptionFile(null);
      setPrescriptionFileType(null);
    }
  };

  const handleExtractSchedule = async () => {
    if (!naturalLanguageInput.trim() && !prescriptionFile) {
      toast({ title: "Input Required", description: "Please enter text or upload a prescription file.", variant: "destructive" });
      return;
    }
    setIsExtracting(true);
    try {
      const result = await extractScheduleFromText({
        naturalLanguageInput: naturalLanguageInput.trim(),
        prescriptionImageDataUri: prescriptionFile || undefined, // Send the data URI
      });

      if ('error'in result) {
        toast({ title: "Extraction Error", description: result.error, variant: "destructive" });
      } else if (result.medicine && result.time) {
        const aiResult = result as ExtractMedicineScheduleOutput;

        const timeMatch = aiResult.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        let formattedTime = aiResult.time;
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const period = timeMatch[3]?.toUpperCase();
            if (period === "PM" && hours < 12) hours += 12;
            if (period === "AM" && hours === 12) hours = 0; // Midnight case
            formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        } else {
             // Try to parse simple hour formats like "9 AM" or "5 PM"
            const simpleTimeMatch = aiResult.time.match(/(\d{1,2})\s*(AM|PM)/i);
            if (simpleTimeMatch) {
                let hours = parseInt(simpleTimeMatch[1], 10);
                const period = simpleTimeMatch[2]?.toUpperCase();
                if (period === "PM" && hours < 12) hours += 12;
                if (period === "AM" && hours === 12) hours = 0; // Midnight case
                formattedTime = `${hours.toString().padStart(2, '0')}:00`; // Default to :00 minutes
            }
        }
        
        form.setValue('name', aiResult.medicine);
        form.setValue('time', formattedTime);
        form.setValue('originalInput', prescriptionFile ? `Extracted from uploaded ${prescriptionFileType?.includes('pdf') ? 'PDF' : 'image'}` : naturalLanguageInput);
        
        if (aiResult.frequencyDescription) {
          form.setValue('frequencyDescription', aiResult.frequencyDescription);
        }
        if (aiResult.durationDays !== undefined) {
          form.setValue('durationDays', aiResult.durationDays ?? 0);
        } else {
          form.setValue('durationDays', 0); // Default to ongoing if not specified
        }

        if (aiResult.startDate) {
           try {
            // Attempt to parse YYYY-MM-DD first
            let parsedDate = parse(aiResult.startDate, 'yyyy-MM-dd', new Date());
            if (!isValid(parsedDate)) {
                 // Try other common formats if AI gives something different, though it's instructed for YYYY-MM-DD
                 parsedDate = parseISO(aiResult.startDate); 
            }

            if (isValid(parsedDate)) {
              form.setValue('startDate', format(parsedDate, 'yyyy-MM-dd'));
            } else {
              form.setValue('startDate', format(new Date(), 'yyyy-MM-dd'));
              toast({ title: "Date Warning", description: "AI provided an unusual start date format, defaulted to today. Please verify.", variant: "default" });
            }
          } catch (e) {
            form.setValue('startDate', format(new Date(), 'yyyy-MM-dd'));
          }
        } else {
           form.setValue('startDate', format(new Date(), 'yyyy-MM-dd'));
        }

        toast({ title: "Schedule Extracted", description: "Review and add the medication." });
      } else {
        toast({ title: "Extraction Incomplete", description: "Could not fully extract medicine and time.", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Extraction Failed", description: "An unexpected error occurred during extraction.", variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  const onSubmit: SubmitHandler<MedicationFormData> = (data) => {
    const submissionData = {
      ...data,
      startDate: data.startDate || format(new Date(), 'yyyy-MM-dd'),
      durationDays: data.durationDays ?? 0, 
    };

    if (editingMedication) {
      onUpdateMedication({ ...editingMedication, ...submissionData });
    } else {
      onSubmitMedication(submissionData);
    }
    form.reset({ name: '', time: '', originalInput: '', frequencyDescription: '', durationDays: 0, startDate: format(new Date(), 'yyyy-MM-dd') });
    setNaturalLanguageInput(''); 
    setPrescriptionFile(null);
    setPrescriptionFileType(null);
    const fileInput = document.getElementById('prescription-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    clearEditing();
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Add Medication</CardTitle>
        <CardDescription>Use AI to extract from text or prescription file (image/PDF), or enter manually. Default start date is today.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="prescription-upload" className="mb-1 block font-medium">Upload Prescription (Image or PDF, max {MAX_FILE_SIZE_MB}MB)</Label>
            <Input
              id="prescription-upload"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
              className="mb-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              aria-label="Upload prescription image or PDF"
            />
            {prescriptionFile && (
              <div className="mt-2 mb-4 p-3 border rounded-md bg-muted/50">
                {prescriptionFileType?.startsWith('image/') ? (
                  <>
                    <p className="text-sm font-medium mb-1">Image Preview:</p>
                    <img src={prescriptionFile} alt="Prescription preview" className="rounded-md border max-h-40 object-contain mx-auto" />
                  </>
                ) : prescriptionFileType === 'application/pdf' ? (
                  <div className="flex items-center space-x-2 text-sm">
                    <FileText className="h-6 w-6 text-primary" />
                    <span>PDF file selected.</span>
                  </div>
                ) : (
                  <p className="text-sm">File selected.</p>
                )}
                <Button variant="outline" size="sm" onClick={() => {
                    setPrescriptionFile(null);
                    setPrescriptionFileType(null);
                    const fileInput = document.getElementById('prescription-upload') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                }} className="mt-2 text-xs">
                  <ImageOff className="mr-1 h-3 w-3" /> Clear File
                </Button>
              </div>
            )}
            
            <Label htmlFor="natural-language-input" className="mb-1 mt-3 block font-medium">Or Enter Details as Text</Label>
            <Textarea
              id="natural-language-input"
              placeholder="e.g., Advil 2 pills every 4 hours for 3 days starting tomorrow"
              value={naturalLanguageInput}
              onChange={(e) => {
                setNaturalLanguageInput(e.target.value);
                if (e.target.value.trim() && prescriptionFile) {
                  setPrescriptionFile(null);
                  setPrescriptionFileType(null);
                  const fileInput = document.getElementById('prescription-upload') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }
              }}
              className="mb-2"
              aria-label="Natural language input for medicine schedule"
              disabled={!!prescriptionFile}
            />
            <Button onClick={handleExtractSchedule} disabled={isExtracting || (!naturalLanguageInput.trim() && !prescriptionFile)} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              {prescriptionFile ? <UploadCloud className="mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {isExtracting ? 'Extracting...' : (prescriptionFile ? 'Extract from File' : 'Extract from Text')}
            </Button>
          </div>

          <div className="flex items-center my-6">
            <span className="flex-grow border-t"></span>
            <span className="mx-4 text-muted-foreground">OR ENTER MANUALLY</span>
            <span className="flex-grow border-t"></span>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Ibuprofen" {...field} aria-required="true" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (HH:MM for first dose)</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} aria-required="true" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequencyDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., once a day, every 8 hours" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="durationDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value, 10))}
                        value={String(field.value ?? 0)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {durationOptions.map(option => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                            >
                              {field.value ? format(parseISO(field.value), "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? parseISO(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                            initialFocus
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1)) && !editingMedication }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingMedication ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {editingMedication ? 'Update Reminder' : 'Add Reminder'}
              </Button>
              {editingMedication && (
                <Button type="button" variant="outline" onClick={() => { 
                  form.reset({ name: '', time: '', originalInput: '', frequencyDescription: '', durationDays: 0, startDate: format(new Date(), 'yyyy-MM-dd') }); 
                  clearEditing(); 
                  setNaturalLanguageInput('');
                  setPrescriptionFile(null);
                  setPrescriptionFileType(null);
                  const fileInput = document.getElementById('prescription-upload') as HTMLInputElement;
                  if (fileInput) fileInput.value = '';
                }} className="w-full mt-2">
                  Cancel Edit
                </Button>
              )}
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
