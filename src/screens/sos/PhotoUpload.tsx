import { useEffect, useRef, useState } from 'react';
import type { Screen } from '../../types/navigation';
import Header, { SOSProgress } from '../../components/Header';
import { resizeFileToBase64, useDispatch } from '../../context/DispatchContext';
import { useSymptomTags } from '../../hooks/useServiceCatalog';
import type { DispatchAttachment } from '../../types/dispatch';

interface Props {
  navigate: (s: Screen) => void;
  onBack: () => void;
}

export default function PhotoUpload({ navigate, onBack }: Props) {
  const symptoms = useSymptomTags();
  const { updateSosDraft } = useDispatch();
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ tags: [] as string[], description: '', uploaded: false, uploading: false, error: '', files: [] as File[], attachments: [] as DispatchAttachment[] });

  useEffect(() => {
    updateSosDraft({ symptoms: [], description: '', attachments: [] });
  }, [updateSosDraft]);

  const toggleSymptom = (s: string) => {
    setForm(prev => {
      const tags = prev.tags.includes(s) ? prev.tags.filter(x => x !== s) : [...prev.tags, s];
      updateSosDraft({ symptoms: tags });
      return { ...prev, tags };
    });
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setForm(prev => ({ ...prev, error: 'Files must be smaller than 50 MB.' }));
      return;
    }
    setForm(prev => ({ ...prev, uploading: true, error: '', files: [...prev.files, file] }));
    try {
      const dataUrl = await resizeFileToBase64(file);
      const attachment: DispatchAttachment = { id: `${file.name}-${Date.now()}`, name: file.name, type: file.type.startsWith('video/') ? 'video' : 'image', dataUrl };
      setForm(prev => {
        const attachments = [...prev.attachments, attachment];
        updateSosDraft({ attachments });
        return { ...prev, attachments, uploaded: true, uploading: false };
      });
    } catch {
      setForm(prev => ({ ...prev, uploading: false, error: 'Upload failed. Try again or skip this file.' }));
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="Emergency SOS" onBack={onBack} showNotification={false} />
      <SOSProgress step={4} total={7} label="Describe the problem" />

      <div className="flex-1 px-4 pt-6 pb-28 max-w-md mx-auto w-full">
        <div className="mb-6">
          <h2 className="font-display font-800 text-xl text-gray-900">Help the technician understand the problem</h2>
          <p className="text-gray-500 text-sm mt-1">This helps them arrive prepared with the right tools</p>
        </div>

        {/* Upload area */}
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center bg-gray-50 hover:border-red-300 hover:bg-red-50 transition-all cursor-pointer">
          <div className="text-4xl mb-3">📷</div>
          <p className="font-display font-600 text-gray-700 text-sm">Upload a photo or video</p>
          <p className="text-gray-400 text-xs mt-1">Take a photo or upload from your device</p>
          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => fileInput.current?.click()}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-500 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <span>📷</span> Camera
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-500 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <span>⬆️</span> Upload
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-500 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              <span>🎥</span> Video
            </button>
          </div>
          <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" onChange={event => onFile(event.target.files?.[0])} />
        </div>

        {/* Uploaded thumbnail */}
        {form.uploaded && (
          <div className="mt-3 flex gap-2 fade-in">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-amber-100 border-2 border-emerald-400 flex items-center justify-center">
              <span className="text-3xl">{form.files[form.files.length - 1]?.type.startsWith('video/') ? '🎥' : '⚡'}</span>
              <button
                onClick={() => setForm(prev => ({ ...prev, uploaded: false }))}
                className="absolute top-1 right-1 w-5 h-5 bg-gray-800/70 rounded-full text-white text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-xs font-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Photo uploaded
            </div>
          </div>
        )}

        {/* What do you see */}
        <div className="mt-6">
          <p className="font-display font-700 text-gray-900 mb-3">What do you see? <span className="text-gray-400 text-xs font-400">(select all that apply)</span></p>
          <div className="flex flex-wrap gap-2">
            {symptoms.map((s) => (
              <button
                key={s}
                onClick={() => toggleSymptom(s)}
                className={`px-3 py-2 rounded-xl text-sm font-500 border transition-all active:scale-95 ${
                  form.tags.includes(s)
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <label htmlFor="problem-description" className="font-display font-700 text-gray-900 text-sm">Describe the problem <span className="text-gray-400 text-xs font-400">(optional)</span></label>
          <textarea
            id="problem-description"
            maxLength={500}
            value={form.description}
            onChange={event => {
              const description = event.target.value;
              setForm(prev => ({ ...prev, description }));
              updateSosDraft({ description });
            }}
            placeholder="Tell us more about the issue (optional)..."
            className="mt-3 min-h-28 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <p className="mt-1 text-right text-xs text-gray-400">{form.description.length}/500</p>
        </div>

        {form.uploading && <p className="mt-3 text-xs text-gray-500">Preparing your file...</p>}
        {form.error && (
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-red-600">
            <p className="font-600">{form.error}</p>
            {form.files[form.files.length - 1] && <button onClick={() => onFile(form.files[form.files.length - 1])} className="shrink-0 font-700 underline">Retry</button>}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-5">
          ✓ Photo and description are optional but help the technician come prepared
        </p>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('sos-questionnaire')}
            disabled={form.uploading}
            className="w-full py-4 rounded-xl font-display font-700 text-base bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200 active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue →
          </button>
          <button onClick={() => navigate('sos-questionnaire')} className="w-full text-gray-400 text-sm mt-2 py-2">
            Skip this step
          </button>
        </div>
      </div>
    </div>
  );
}
