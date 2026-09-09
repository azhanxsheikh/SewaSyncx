import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ConfirmedLocation, DispatchAttachment, DispatchEvent, DispatchJob, DispatchStatus, ExecutionStep, JobStatus, TechnicianProfile } from '../types/dispatch';

const CHANNEL_NAME = 'sos-dispatch';
const STORAGE_KEY = 'sos-dispatch-job';
const EVENT_KEY = 'sos-dispatch-event';

interface DispatchContextValue {
  job: DispatchJob | null;
  activeRequest: DispatchJob | null;
  assignedTechnician: TechnicianProfile | null;
  pendingRequest: DispatchJob | null;
  jobHistory: DispatchJob[];
  technicianOnline: boolean;
  confirmedLocation: ConfirmedLocation;
  setConfirmedLocation: (location: ConfirmedLocation) => void;
  createJob: (input: Pick<DispatchJob, 'service' | 'priority'> & Partial<Pick<DispatchJob, 'symptoms' | 'location' | 'attachments'>>) => DispatchJob;
  submitSOSRequest: (input: Pick<DispatchJob, 'service' | 'priority'> & Partial<Pick<DispatchJob, 'symptoms' | 'location' | 'attachments'>>) => DispatchJob;
  updateJob: (patch: Partial<DispatchJob>) => void;
  setStatus: (status: DispatchStatus) => void;
  setExecutionStep: (step: ExecutionStep) => void;
  acceptJob: () => void;
  declineJob: () => void;
  acceptRequest: () => void;
  declineRequest: () => void;
  updateJobStatus: (status: JobStatus) => void;
  completeJob: () => void;
  setTechOnline: (online: boolean) => void;
  addAttachments: (attachments: DispatchAttachment[]) => void;
}

const DispatchContext = createContext<DispatchContextValue | null>(null);

function readStoredJob(): DispatchJob | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as DispatchJob;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked or full; in-memory state remains usable.
  }
}

function publish(event: DispatchEvent) {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(event);
    channel.close();
  } catch {
    // BroadcastChannel is unavailable in older browsers; storage event handles other tabs.
  }
  try {
    writeStorage(EVENT_KEY, { ...event, sentAt: Date.now() });
  } catch {
    // Storage may be unavailable in private browsing.
  }
}

export function resizeFileToBase64(file: File, maxSize = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      if (!file.type.startsWith('image/')) {
        resolve(String(reader.result));
        return;
      }
      const image = new Image();
      image.onerror = () => reject(new Error('Unable to read image'));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function DispatchProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<DispatchJob | null>(() => readStoredJob());
  const [technicianOnline, setTechnicianOnline] = useState(true);
  const [confirmedLocation, setConfirmedLocation] = useState<ConfirmedLocation>({
    id: 'a1',
    label: 'Home',
    fullAddress: 'B-204, Gaur City 2, Greater Noida West',
    area: 'Greater Noida, UP 201318',
  });

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (message: MessageEvent<DispatchEvent>) => {
        const incoming = message.data;
        if (incoming?.job) {
          setJob(incoming.job);
          return;
        }
        if (incoming?.type === 'NEW_REQUEST' && incoming.request) {
          setJob(incoming.request);
          return;
        }
        if ((incoming?.type === 'ACCEPTED' || incoming?.type === 'STATUS') && incoming.requestId) {
          setJob(current => current?.id === incoming.requestId ? { ...current, status: normalizeStatus(incoming.status), updatedAt: Date.now(), ...(incoming.job ?? {}) } : current);
        }
      };
    } catch {
      channel = null;
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as DispatchJob;
          if (parsed && typeof parsed === 'object') setJob(parsed);
        } catch { /* Ignore malformed external storage. */ }
      }
      if (event.key === EVENT_KEY && event.newValue) {
        try {
          const payload = JSON.parse(event.newValue) as DispatchEvent;
          if (payload.job) setJob(payload.job);
          else if (payload.type === 'NEW_REQUEST') setJob(payload.request);
          else if ((payload.type === 'ACCEPTED' || payload.type === 'STATUS') && payload.requestId) {
            setJob(current => current?.id === payload.requestId ? { ...current, status: normalizeStatus(payload.status), updatedAt: Date.now(), ...(payload.job ?? {}) } : current);
          }
        } catch { /* Ignore malformed external events. */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      channel?.close();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const updateJob = useCallback((patch: Partial<DispatchJob>) => {
    setJob(current => {
      if (!current) return current;
      const next = { ...current, ...patch, updatedAt: Date.now() };
      writeStorage(STORAGE_KEY, next);
      publish({ type: 'job-updated', job: next });
      return next;
    });
  }, []);

  const createJob = useCallback((input: Pick<DispatchJob, 'service' | 'priority'> & Partial<Pick<DispatchJob, 'symptoms' | 'location' | 'attachments'>>) => {
    const next: DispatchJob = {
      id: `job-${Date.now()}`,
      service: input.service,
      priority: input.priority,
      symptoms: input.symptoms ?? [],
      location: input.location ?? 'B-204, Gaur City 2, Greater Noida West',
      customerName: 'Azaan Sheikh',
      customerPhone: '+91 98765 00000',
      estimatedTotal: 648,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'requested',
      executionStep: 'accepted',
      attachments: input.attachments ?? [],
    };
    setJob(next);
    writeStorage(STORAGE_KEY, next);
    publish({ type: 'job-created', job: next });
    return next;
  }, []);

  const submitSOSRequest = useCallback((input: Pick<DispatchJob, 'service' | 'priority'> & Partial<Pick<DispatchJob, 'symptoms' | 'location' | 'attachments'>>) => {
    return createJob({ ...input, location: confirmedLocation.fullAddress });
  }, [confirmedLocation.fullAddress, createJob]);

  const value = useMemo<DispatchContextValue>(() => ({
    job,
    activeRequest: job,
    pendingRequest: job?.status === 'requested' || job?.status === 'searching' ? job : null,
    assignedTechnician: job?.technicianId ? {
      id: job.technicianId,
      name: job.technicianName ?? 'Rahul Kumar',
      rating: 4.9,
      vehicle: 'Honda Activa · DL 5S 4521',
      eta: '8 min',
      distance: '1.8 km',
      specializations: ['Electrical', 'Emergency repair'],
    } : null,
    jobHistory: job?.status === 'completed' || job?.status === 'declined' || job?.status === 'cancelled' ? [job] : [],
    technicianOnline,
    confirmedLocation,
    setConfirmedLocation,
    createJob,
    submitSOSRequest,
    updateJob,
    setStatus: (status) => updateJob({ status }),
    setExecutionStep: (executionStep) => updateJob({ executionStep, status: executionStep === 'completed' ? 'completed' : executionStep }),
    acceptJob: () => updateJob({ status: 'accepted', executionStep: 'accepted', technicianId: 't1', technicianName: 'Rahul Kumar' }),
    declineJob: () => updateJob({ status: 'declined' }),
    acceptRequest: () => updateJob({ status: 'accepted', executionStep: 'accepted', technicianId: 't1', technicianName: 'Rahul Kumar' }),
    declineRequest: () => updateJob({ status: 'declined' }),
    updateJobStatus: (status) => updateJob({ status: normalizeStatus(status), executionStep: normalizeStatus(status) as ExecutionStep }),
    completeJob: () => updateJob({ status: 'completed', executionStep: 'completed' }),
    setTechOnline: setTechnicianOnline,
    addAttachments: (attachments) => updateJob({ attachments: [...(job?.attachments ?? []), ...attachments] }),
  }), [createJob, confirmedLocation, job, submitSOSRequest, technicianOnline, updateJob]);

  return <DispatchContext.Provider value={value}>{children}</DispatchContext.Provider>;
}

function normalizeStatus(status: JobStatus): DispatchStatus {
  const statusMap: Record<JobStatus, DispatchStatus> = {
    PENDING_TECHNICIAN_ACCEPTANCE: 'requested',
    ACCEPTED: 'accepted',
    ON_THE_WAY: 'en-route',
    ARRIVED: 'arrived',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    DECLINED: 'declined',
  };
  return statusMap[status];
}

export function useDispatch() {
  const context = useContext(DispatchContext);
  if (!context) throw new Error('useDispatch must be used inside DispatchProvider');
  return context;
}

export function useOptionalDispatch() {
  return useContext(DispatchContext);
}
